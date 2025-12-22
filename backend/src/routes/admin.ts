import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import bcrypt from 'bcryptjs';
import { db } from '../db/client';
import { verifySuperAdmin } from '../middleware/auth';

export async function adminRoutes(app: FastifyInstance) {
  // Protege TODAS as rotas abaixo com Super Admin
  app.addHook('onRequest', verifySuperAdmin);

  // --- DASHBOARD ADMIN ---
  app.get('/stats', async (req, reply) => {
    try {
      const tenants = await db.query('SELECT COUNT(*) FROM tenants');
      const users = await db.query('SELECT COUNT(*) FROM users');
      const paying = await db.query("SELECT COUNT(*) FROM tenants WHERE plan_id IS NOT NULL AND status = 'active'");
      
      return {
        total_tenants: Number(tenants.rows[0].count),
        total_users: Number(users.rows[0].count),
        active_subscriptions: Number(paying.rows[0].count)
      };
    } catch (err) {
      return reply.status(500).send(err);
    }
  });

  // ==========================
  // TENANTS (EMPRESAS)
  // ==========================
  
  // Listar
  app.get('/tenants', async (req, reply) => {
    const result = await db.query(`
      SELECT 
        t.*, 
        p.name as plan_name,
        (SELECT email FROM users WHERE tenant_id = t.id AND role = 'owner' LIMIT 1) as owner_email
      FROM tenants t
      LEFT JOIN plans p ON t.plan_id = p.id
      ORDER BY t.created_at DESC
    `);
    return result.rows;
  });

  // CRIAR EMPRESA (NOVO - COM CORREÇÃO DE UUID)
  app.post('/tenants', async (request, reply) => {
    const createSchema = z.object({
      name: z.string().min(2),
      owner_name: z.string().min(2),
      email: z.string().email(),
      password: z.string().min(6),
      // CORREÇÃO AQUI: Aceita UUID, string vazia ou null
      plan_id: z.union([z.string().uuid(), z.literal(''), z.null()]).optional()
    });

    const data = createSchema.parse(request.body);
    const client = await db.getClient();

    try {
      await client.query('BEGIN');

      // 1. Verifica duplicidade de email
      const userCheck = await client.query('SELECT id FROM users WHERE email = $1', [data.email]);
      if (userCheck.rowCount! > 0) {
        throw new Error('Email já cadastrado no sistema.');
      }

      // 2. Cria o Tenant (Trata string vazia como null)
      const planId = data.plan_id === '' ? null : data.plan_id;

      const tenantRes = await client.query(`
        INSERT INTO tenants (name, plan_id, status) 
        VALUES ($1, $2, 'active') 
        RETURNING id
      `, [data.name, planId || null]);
      const tenantId = tenantRes.rows[0].id;

      // --- CRIA FUNIL PADRÃO ---
      const pipeRes = await client.query(`
        INSERT INTO pipelines (tenant_id, name) VALUES ($1, 'Funil de Vendas') RETURNING id
      `, [tenantId]);
      const pipelineId = pipeRes.rows[0].id;

      const stages = ['Novo Lead', 'Em Contato', 'Proposta', 'Negociação', 'Ganho', 'Perdido'];
      let order = 1;
      for (const stageName of stages) {
          await client.query(`
            INSERT INTO stages (pipeline_id, name, "order") VALUES ($1, $2, $3)
          `, [pipelineId, stageName, order++]);
      }
      // -------------------------------

      // 3. Cria o Usuário Owner
      const salt = await bcrypt.genSalt(10);
      const hash = await bcrypt.hash(data.password, salt);

      await client.query(`
        INSERT INTO users (tenant_id, name, email, password_hash, role)
        VALUES ($1, $2, $3, $4, 'owner')
      `, [tenantId, data.owner_name, data.email, hash]);

      await client.query('COMMIT');
      return reply.status(201).send({ message: 'Empresa criada com sucesso' });

    } catch (error: any) {
      await client.query('ROLLBACK');
      console.error(error);
      return reply.status(400).send({ error: error.message || 'Falha ao criar empresa' });
    } finally {
      client.release();
    }
  });

  // Editar
  app.put('/tenants/:id', async (req, reply) => {
    const params = z.object({ id: z.string().uuid() }).parse(req.params);
    const body = z.object({
      name: z.string().optional(),
      status: z.enum(['active', 'suspended']).optional(),
      plan_id: z.union([z.string().uuid(), z.literal(''), z.null()]).optional()
    }).parse(req.body);

    const fields: string[] = [];
    const values: any[] = [];
    let idx = 1;

    if (body.name) { fields.push(`name = $${idx++}`); values.push(body.name); }
    if (body.status) { fields.push(`status = $${idx++}`); values.push(body.status); }
    
    if (body.plan_id !== undefined) { 
        fields.push(`plan_id = $${idx++}`); 
        // Se vier string vazia, salva como NULL no banco
        values.push(body.plan_id === '' ? null : body.plan_id); 
    }

    if (fields.length === 0) return reply.send({ message: 'No changes' });

    values.push(params.id);
    await db.query(`UPDATE tenants SET ${fields.join(', ')} WHERE id = $${idx}`, values);

    return { message: 'Tenant updated' };
  });

  // Excluir
  app.delete('/tenants/:id', async (req, reply) => {
    const { id } = z.object({ id: z.string().uuid() }).parse(req.params);
    
    const client = await db.getClient();
    try {
        await client.query('BEGIN');
        
        // Limpeza em cascata
        await client.query('DELETE FROM tasks WHERE tenant_id = $1', [id]);
        
        const dealsRes = await client.query('SELECT id FROM deals WHERE tenant_id = $1', [id]);
        if (dealsRes.rowCount! > 0) {
            const dealIds = dealsRes.rows.map(d => d.id);
            await client.query('DELETE FROM deal_comments WHERE deal_id = ANY($1::uuid[])', [dealIds]);
        }
        await client.query('DELETE FROM deals WHERE tenant_id = $1', [id]);
        
        const pipeRes = await client.query('SELECT id FROM pipelines WHERE tenant_id = $1', [id]);
        if (pipeRes.rowCount! > 0) {
            const pipeIds = pipeRes.rows.map(p => p.id);
            await client.query('DELETE FROM stages WHERE pipeline_id = ANY($1::uuid[])', [pipeIds]);
            await client.query('DELETE FROM pipelines WHERE tenant_id = $1', [id]);
        }

        await client.query('DELETE FROM contacts WHERE tenant_id = $1', [id]);
        await client.query('DELETE FROM leads WHERE tenant_id = $1', [id]);
        await client.query('DELETE FROM users WHERE tenant_id = $1', [id]);
        await client.query('DELETE FROM tenants WHERE id = $1', [id]);
        
        await client.query('COMMIT');
        return { message: 'Tenant deleted completely' };
    } catch (error) {
        await client.query('ROLLBACK');
        console.error(error);
        return reply.status(500).send({ error: 'Failed to delete tenant' });
    } finally {
        client.release();
    }
  });

  // ==========================
  // PLANOS
  // ==========================
  
  app.get('/plans', async () => {
    const res = await db.query('SELECT * FROM plans ORDER BY price ASC');
    return res.rows;
  });

  app.post('/plans', async (req, reply) => {
    const schema = z.object({
      name: z.string(),
      price: z.number(),
      max_users: z.number(),
      max_contacts: z.number()
    });
    const data = schema.parse(req.body);
    
    const res = await db.query(`
      INSERT INTO plans (name, price, max_users, max_contacts)
      VALUES ($1, $2, $3, $4) RETURNING *
    `, [data.name, data.price, data.max_users, data.max_contacts]);
    
    return res.rows[0];
  });

  app.put('/plans/:id', async (req, reply) => {
    const { id } = z.object({ id: z.string().uuid() }).parse(req.params);
    const schema = z.object({
        name: z.string().optional(),
        price: z.number().optional(),
        max_users: z.number().optional(),
        max_contacts: z.number().optional()
    });
    const data = schema.parse(req.body);

    const fields: string[] = [];
    const values: any[] = [];
    let idx = 1;
    Object.entries(data).forEach(([k,v]) => {
        if(v !== undefined) { fields.push(`${k} = $${idx++}`); values.push(v); }
    });
    values.push(id);

    if (fields.length > 0) {
        await db.query(`UPDATE plans SET ${fields.join(', ')} WHERE id = $${idx}`, values);
    }
    return { message: 'Plan updated' };
  });

  app.delete('/plans/:id', async (req, reply) => {
    const { id } = z.object({ id: z.string().uuid() }).parse(req.params);
    const check = await db.query('SELECT id FROM tenants WHERE plan_id = $1', [id]);
    if (check.rowCount! > 0) {
        return reply.status(400).send({ error: 'Este plano está sendo usado por empresas ativas.' });
    }
    await db.query('DELETE FROM plans WHERE id = $1', [id]);
    return { message: 'Plan deleted' };
  });
}