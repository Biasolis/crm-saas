import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { db } from '../db/client';
import { verifySuperAdmin } from '../middleware/auth';

export async function adminRoutes(app: FastifyInstance) {
  // Protege TODAS as rotas abaixo com Super Admin
  app.addHook('onRequest', verifySuperAdmin);

  // --- DASHBOARD ADMIN ---
  // Resumo geral do SaaS
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

  // --- GERENCIAMENTO DE TENANTS ---
  
  // Listar todas as empresas
  app.get('/tenants', async (req, reply) => {
    const result = await db.query(`
      SELECT t.*, p.name as plan_name 
      FROM tenants t
      LEFT JOIN plans p ON t.plan_id = p.id
      ORDER BY t.created_at DESC
    `);
    return result.rows;
  });

  // Alterar Status ou Plano de um Tenant
  app.put('/tenants/:id', async (req, reply) => {
    const params = z.object({ id: z.string().uuid() }).parse(req.params);
    const body = z.object({
      status: z.enum(['active', 'suspended']).optional(),
      plan_id: z.string().uuid().optional()
    }).parse(req.body);

    const fields: string[] = [];
    const values: any[] = [];
    let idx = 1;

    if (body.status) { fields.push(`status = $${idx++}`); values.push(body.status); }
    if (body.plan_id) { fields.push(`plan_id = $${idx++}`); values.push(body.plan_id); }

    if (fields.length === 0) return reply.send({ message: 'No changes' });

    values.push(params.id);
    await db.query(`UPDATE tenants SET ${fields.join(', ')} WHERE id = $${idx}`, values);

    return { message: 'Tenant updated' };
  });

  // --- GERENCIAMENTO DE PLANOS ---
  
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
}