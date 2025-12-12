import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import bcrypt from 'bcryptjs';
import { db } from '../db/client';

export async function publicApiRoutes(app: FastifyInstance) {
  // NÃO tem hook de autenticação, pois é pública para cadastro

  // --- POST /api/public/register-tenant ---
  // Cria Empresa + Usuário Admin + Vincula Plano Grátis (ou escolhido)
  app.post('/register-tenant', async (request, reply) => {
    const registerSchema = z.object({
      company_name: z.string().min(2),
      user_name: z.string().min(2),
      email: z.string().email(),
      password: z.string().min(6),
      plan_id: z.string().uuid().optional(), // Se não vier, pegamos o FREE
    });

    const data = registerSchema.parse(request.body);
    const client = await db.getClient();

    try {
      await client.query('BEGIN');

      // 1. Verifica se usuário já existe (email único globalmente para simplificar login)
      const userCheck = await client.query('SELECT id FROM users WHERE email = $1', [data.email]);
      if (userCheck.rowCount! > 0) {
        throw new Error('Email already registered');
      }

      // 2. Define o Plano (Se não enviado, busca o mais barato/free)
      let planId = data.plan_id;
      if (!planId) {
        const planRes = await client.query('SELECT id FROM plans ORDER BY price ASC LIMIT 1');
        if (planRes.rowCount! > 0) planId = planRes.rows[0].id;
      }

      // 3. Cria o Tenant (Empresa)
      const tenantRes = await client.query(`
        INSERT INTO tenants (name, plan_id, status) VALUES ($1, $2, 'active') RETURNING id
      `, [data.company_name, planId]);
      const tenantId = tenantRes.rows[0].id;

      // 4. Cria o Usuário Owner
      const salt = await bcrypt.genSalt(10);
      const hash = await bcrypt.hash(data.password, salt);
      
      await client.query(`
        INSERT INTO users (tenant_id, name, email, password_hash, role, is_super_admin)
        VALUES ($1, $2, $3, $4, 'owner', false)
      `, [tenantId, data.user_name, data.email, hash]);

      await client.query('COMMIT');

      return reply.status(201).send({ 
        message: 'Account created successfully', 
        tenant_id: tenantId,
        redirect_url: '/login' 
      });

    } catch (error: any) {
      await client.query('ROLLBACK');
      console.error(error);
      const status = error.message === 'Email already registered' ? 409 : 500;
      return reply.status(status).send({ error: error.message || 'Registration failed' });
    } finally {
      client.release();
    }
  });
}