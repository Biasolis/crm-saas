import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import bcrypt from 'bcryptjs';
import { db } from '../db/client';
import { authenticate } from '../middleware/auth';

export async function userRoutes(app: FastifyInstance) {
  
  // ==========================================================
  // ROTA PÚBLICA: Cadastro Inicial / Sign Up
  // ==========================================================
  app.post('/', async (request, reply) => {
    const createUserBody = z.object({
      tenant_id: z.string().uuid(),
      name: z.string().min(2),
      email: z.string().email(),
      password: z.string().min(6),
      role: z.enum(['owner', 'admin', 'agent', 'user']).default('user'),
      chatwoot_user_id: z.number().optional() 
    });

    const data = createUserBody.parse(request.body);

    try {
      const checkUser = await db.query('SELECT id FROM users WHERE email = $1', [data.email]);
      
      if (checkUser.rowCount && checkUser.rowCount > 0) {
        return reply.status(409).send({ error: 'User with this email already exists' });
      }

      const salt = await bcrypt.genSalt(10);
      const passwordHash = await bcrypt.hash(data.password, salt);

      const result = await db.query(`
        INSERT INTO users (
          tenant_id, name, email, password_hash, role, chatwoot_user_id
        ) VALUES ($1, $2, $3, $4, $5, $6)
        RETURNING id, name, email, role, created_at;
      `, [data.tenant_id, data.name, data.email, passwordHash, data.role, data.chatwoot_user_id || null]);

      return reply.status(201).send({
        message: 'User created successfully',
        user: result.rows[0]
      });

    } catch (error: any) {
      console.error(error);
      if (error.code === '23503') { 
         return reply.status(400).send({ error: 'Invalid tenant_id. Company does not exist.' });
      }
      return reply.status(500).send({ error: 'Internal Server Error' });
    }
  });

  // ==========================================================
  // ROTAS PROTEGIDAS: Gestão de Equipe (IAM)
  // ==========================================================
  app.register(async (protectedRoutes) => {
    protectedRoutes.addHook('onRequest', authenticate);

    // --- GET: Listar Equipe ---
    protectedRoutes.get('/', async (request, reply) => {
      const tenantId = request.user?.tenantId;

      try {
          const result = await db.query(`
              SELECT id, name, email, role, created_at 
              FROM users 
              WHERE tenant_id = $1
              ORDER BY name ASC
          `, [tenantId]);

          return result.rows;
      } catch (error) {
          console.error(error);
          return reply.status(500).send({ error: 'Failed to fetch users' });
      }
    });

    // --- POST: Convidar/Adicionar Membro ---
    protectedRoutes.post('/invite', async (request, reply) => {
      if (request.user?.role !== 'owner' && request.user?.role !== 'admin') {
        return reply.status(403).send({ error: 'Permission denied.' });
      }

      const inviteSchema = z.object({
        name: z.string().min(2),
        email: z.string().email(),
        password: z.string().min(6),
        role: z.enum(['admin', 'agent']).default('agent')
      });

      const data = inviteSchema.parse(request.body);
      const tenantId = request.user?.tenantId;

      try {
        const client = await db.getClient();

        // Verifica Limite do Plano
        const limitCheck = await client.query(`
            SELECT 
                p.max_users,
                (SELECT COUNT(*) FROM users WHERE tenant_id = $1) as current_count
            FROM tenants t
            LEFT JOIN plans p ON t.plan_id = p.id
            WHERE t.id = $1
        `, [tenantId]);

        if (limitCheck.rows.length > 0 && limitCheck.rows[0].max_users !== null) {
            const { max_users, current_count } = limitCheck.rows[0];
            if (Number(current_count) >= Number(max_users)) {
                client.release();
                return reply.status(403).send({ 
                    error: `Limite de usuários atingido (${current_count}/${max_users}).` 
                });
            }
        }

        const checkUser = await client.query('SELECT id FROM users WHERE email = $1', [data.email]);
        if (checkUser.rowCount && checkUser.rowCount > 0) {
            client.release();
            return reply.status(409).send({ error: 'Email already used.' });
        }

        const salt = await bcrypt.genSalt(10);
        const hash = await bcrypt.hash(data.password, salt);

        const result = await client.query(`
          INSERT INTO users (tenant_id, name, email, password_hash, role)
          VALUES ($1, $2, $3, $4, $5)
          RETURNING id, name, email, role, created_at
        `, [tenantId, data.name, data.email, hash, data.role]);

        client.release();
        return reply.status(201).send(result.rows[0]);

      } catch (error) {
        console.error(error);
        return reply.status(500).send({ error: 'Failed to add member' });
      }
    });

    // --- PUT: Editar Membro (Novo) ---
    protectedRoutes.put('/:id', async (request, reply) => {
        if (request.user?.role !== 'owner' && request.user?.role !== 'admin') {
            return reply.status(403).send({ error: 'Permission denied' });
        }

        const paramsSchema = z.object({ id: z.string().uuid() });
        const updateSchema = z.object({
            name: z.string().min(2).optional(),
            email: z.string().email().optional(),
            role: z.enum(['admin', 'agent']).optional(),
            password: z.string().min(6).optional()
        });

        const { id } = paramsSchema.parse(request.params);
        const data = updateSchema.parse(request.body);
        const tenantId = request.user?.tenantId;

        // Impede alterar o próprio role se não for Owner (para evitar lock-out)
        // Mas vamos manter simples: Admin pode editar Agent. Owner pode editar Admin/Agent.
        
        try {
            const fields: string[] = [];
            const values: any[] = [];
            let idx = 1;

            if (data.name) { fields.push(`name = $${idx++}`); values.push(data.name); }
            if (data.email) { fields.push(`email = $${idx++}`); values.push(data.email); }
            if (data.role) { fields.push(`role = $${idx++}`); values.push(data.role); }
            
            if (data.password) {
                const salt = await bcrypt.genSalt(10);
                const hash = await bcrypt.hash(data.password, salt);
                fields.push(`password_hash = $${idx++}`); 
                values.push(hash);
            }

            if (fields.length === 0) return reply.send({ message: 'No changes' });

            values.push(id, tenantId);
            const query = `
                UPDATE users SET ${fields.join(', ')} 
                WHERE id = $${idx++} AND tenant_id = $${idx++}
                RETURNING id, name, email, role
            `;

            const result = await db.query(query, values);

            if (result.rowCount === 0) return reply.status(404).send({ error: 'User not found' });
            return result.rows[0];

        } catch (error) {
            console.error(error);
            return reply.status(500).send({ error: 'Failed to update user' });
        }
    });

    // --- DELETE: Remover Membro ---
    protectedRoutes.delete('/:id', async (request, reply) => {
      if (request.user?.role !== 'owner' && request.user?.role !== 'admin') {
        return reply.status(403).send({ error: 'Permission denied' });
      }

      const { id } = z.object({ id: z.string().uuid() }).parse(request.params);
      
      if (id === request.user?.userId) {
        return reply.status(400).send({ error: 'Cannot delete yourself' });
      }

      const tenantId = request.user?.tenantId;

      try {
        const result = await db.query(`
          DELETE FROM users WHERE id = $1 AND tenant_id = $2 RETURNING id
        `, [id, tenantId]);

        if (result.rowCount === 0) return reply.status(404).send({ error: 'User not found' });
        
        return { message: 'User removed successfully' };

      } catch (error) {
        console.error(error);
        return reply.status(500).send({ error: 'Failed to remove user' });
      }
    });
  });
}