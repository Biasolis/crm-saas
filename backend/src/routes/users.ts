import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import bcrypt from 'bcryptjs';
import { db } from '../db/client';
import { authenticate } from '../middleware/auth';

export async function userRoutes(app: FastifyInstance) {
  
  // ==========================================================
  // ROTA PÚBLICA: Cadastro Inicial / Sign Up
  // ==========================================================
  // Permite criar o primeiro usuário (Owner) ao registrar uma nova empresa
  app.post('/', async (request, reply) => {
    const createUserBody = z.object({
      tenant_id: z.string().uuid(), // ID da empresa criada previamente
      name: z.string().min(2),
      email: z.string().email(),
      password: z.string().min(6),
      role: z.enum(['owner', 'admin', 'agent', 'user']).default('user'),
      chatwoot_user_id: z.number().optional() 
    });

    const data = createUserBody.parse(request.body);

    try {
      // Verifica se o email já existe no sistema
      const checkUser = await db.query('SELECT id FROM users WHERE email = $1', [data.email]);
      
      if (checkUser.rowCount && checkUser.rowCount > 0) {
        return reply.status(409).send({ error: 'User with this email already exists' });
      }

      // Criptografa a senha
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
      // Tratamento de chave estrangeira (se tenant_id não existir)
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

      if (!tenantId) {
          return reply.status(401).send({ error: 'Unauthorized' });
      }

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
      // Apenas Admins/Owners podem adicionar novos membros
      if (request.user?.role !== 'owner' && request.user?.role !== 'admin') {
        return reply.status(403).send({ error: 'Permission denied. Only Admins can invite users.' });
      }

      const inviteSchema = z.object({
        name: z.string().min(2),
        email: z.string().email(),
        password: z.string().min(6),
        role: z.enum(['admin', 'agent']).default('agent')
      });

      const data = inviteSchema.parse(request.body);
      const tenantId = request.user.tenantId;

      try {
        const checkUser = await db.query('SELECT id FROM users WHERE email = $1', [data.email]);
        if (checkUser.rowCount && checkUser.rowCount > 0) {
            return reply.status(409).send({ error: 'Email already used in the system' });
        }

        const salt = await bcrypt.genSalt(10);
        const hash = await bcrypt.hash(data.password, salt);

        const result = await db.query(`
          INSERT INTO users (tenant_id, name, email, password_hash, role)
          VALUES ($1, $2, $3, $4, $5)
          RETURNING id, name, email, role, created_at
        `, [tenantId, data.name, data.email, hash, data.role]);

        return reply.status(201).send(result.rows[0]);

      } catch (error) {
        console.error(error);
        return reply.status(500).send({ error: 'Failed to add member' });
      }
    });

    // --- DELETE: Remover Membro ---
    protectedRoutes.delete('/:id', async (request, reply) => {
      // Apenas Admins/Owners podem remover
      if (request.user?.role !== 'owner' && request.user?.role !== 'admin') {
        return reply.status(403).send({ error: 'Permission denied' });
      }

      const { id } = z.object({ id: z.string().uuid() }).parse(request.params);
      
      // Impede de se auto-deletar
      if (id === request.user.userId) {
        return reply.status(400).send({ error: 'Cannot delete yourself' });
      }

      const tenantId = request.user.tenantId;

      try {
        // Garante que o usuário deletado pertença ao mesmo tenant do admin
        const result = await db.query(`
          DELETE FROM users WHERE id = $1 AND tenant_id = $2 RETURNING id
        `, [id, tenantId]);

        if (result.rowCount === 0) return reply.status(404).send({ error: 'User not found or access denied' });
        
        return { message: 'User removed successfully' };

      } catch (error) {
        console.error(error);
        return reply.status(500).send({ error: 'Failed to remove user' });
      }
    });
  });
}