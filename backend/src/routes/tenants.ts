import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { db } from '../db/client';
import { authenticate } from '../middleware/auth'; // <--- Importação Crítica

export async function tenantRoutes(app: FastifyInstance) {
  
  // --- Rotas Públicas (Criação de Conta / Admin) ---
  
  app.post('/', async (request, reply) => {
    const createTenantBody = z.object({
      name: z.string().min(3),
      company_legal_name: z.string().optional(),
      company_document: z.string().optional(),
      email: z.string().email(),
      primary_color: z.string().regex(/^#[0-9A-F]{6}$/i).optional().default('#000000'),
      logo_url: z.string().url().optional(),
    });

    const data = createTenantBody.parse(request.body);

    try {
      const query = `
        INSERT INTO tenants (name, company_legal_name, company_document, primary_color, logo_url) 
        VALUES ($1, $2, $3, $4, $5)
        RETURNING id, name, created_at;
      `;
      const values = [data.name, data.company_legal_name || data.name, data.company_document, data.primary_color, data.logo_url];
      const result = await db.query(query, values);
      return reply.status(201).send({
        message: 'Tenant created successfully',
        tenant: result.rows[0],
        next_step: 'Create admin user'
      });
    } catch (error) {
      console.error(error);
      return reply.status(500).send({ error: 'Internal Server Error' });
    }
  });

  // --- Rotas Protegidas (Requer Login) ---
  
  app.register(async (protectedRoutes) => {
    // AQUI ESTAVA O ERRO: Se authenticate for undefined, o servidor cai.
    protectedRoutes.addHook('onRequest', authenticate);

    // GET /api/tenants/current -> Pega dados da empresa do usuário logado
    protectedRoutes.get('/current', async (request, reply) => {
      const tenantId = request.user?.tenantId;
      try {
        const result = await db.query(
          'SELECT * FROM tenants WHERE id = $1',
          [tenantId]
        );
        if (result.rowCount === 0) return reply.status(404).send({ error: 'Tenant not found' });
        return result.rows[0];
      } catch (error) {
        console.error(error);
        return reply.status(500).send({ error: 'Failed to fetch tenant settings' });
      }
    });

    // PUT /api/tenants/current -> Atualiza Branding
    protectedRoutes.put('/current', async (request, reply) => {
      const tenantId = request.user?.tenantId;
      
      const updateSchema = z.object({
        name: z.string().min(3).optional(),
        company_legal_name: z.string().optional(),
        company_document: z.string().optional(),
        primary_color: z.string().regex(/^#[0-9A-F]{6}$/i).optional(),
        logo_url: z.string().url().optional().or(z.literal('')),
        chatwoot_url: z.string().url().optional().or(z.literal('')),
        chatwoot_access_token: z.string().optional().or(z.literal('')),
      });

      const data = updateSchema.parse(request.body);

      try {
        const fields: string[] = [];
        const values: any[] = [];
        let idx = 1;

        Object.entries(data).forEach(([key, value]) => {
          if (value !== undefined) {
            fields.push(`${key} = $${idx}`);
            values.push(value);
            idx++;
          }
        });

        if (fields.length === 0) return reply.send({ message: 'Nothing to update' });

        values.push(tenantId);
        const query = `
          UPDATE tenants 
          SET ${fields.join(', ')} 
          WHERE id = $${idx}
          RETURNING *
        `;

        const result = await db.query(query, values);
        return result.rows[0];

      } catch (error) {
        console.error(error);
        return reply.status(500).send({ error: 'Failed to update settings' });
      }
    });
  });
}