import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { db } from '../db/client';
import { authenticate } from '../middleware/auth';

export async function companyRoutes(app: FastifyInstance) {
  app.addHook('onRequest', authenticate);

  // --- GET /api/companies (Listar) ---
  app.get('/', async (request, reply) => {
    const tenantId = request.user?.tenantId;
    
    // Opcional: Buscar contatos vinculados
    const query = `
      SELECT 
        c.*,
        (SELECT COUNT(*) FROM contacts WHERE company_id = c.id) as contact_count
      FROM companies c
      WHERE c.tenant_id = $1
      ORDER BY c.name ASC
    `;

    try {
      const result = await db.query(query, [tenantId]);
      return result.rows;
    } catch (error) {
      console.error(error);
      return reply.status(500).send({ error: 'Failed to fetch companies' });
    }
  });

  // --- POST /api/companies (Criar) ---
  app.post('/', async (request, reply) => {
    const createSchema = z.object({
      name: z.string().min(2),
      document_number: z.string().optional(),
      website: z.string().optional(),
      phone: z.string().optional(),
      address: z.string().optional(),
    });

    const data = createSchema.parse(request.body);
    const tenantId = request.user?.tenantId;

    try {
      const result = await db.query(`
        INSERT INTO companies (tenant_id, name, document_number, website, phone, address)
        VALUES ($1, $2, $3, $4, $5, $6)
        RETURNING *
      `, [tenantId, data.name, data.document_number, data.website, data.phone, data.address]);

      return reply.status(201).send(result.rows[0]);
    } catch (error) {
      console.error(error);
      return reply.status(500).send({ error: 'Failed to create company' });
    }
  });

  // --- PUT /api/companies/:id (Editar) ---
  app.put('/:id', async (request, reply) => {
    const paramsSchema = z.object({ id: z.string().uuid() });
    const updateSchema = z.object({
      name: z.string().min(2),
      document_number: z.string().optional(),
      website: z.string().optional(),
      phone: z.string().optional(),
      address: z.string().optional(),
    });

    const { id } = paramsSchema.parse(request.params);
    const data = updateSchema.parse(request.body);
    const tenantId = request.user?.tenantId;

    try {
      const result = await db.query(`
        UPDATE companies 
        SET name = $1, document_number = $2, website = $3, phone = $4, address = $5
        WHERE id = $6 AND tenant_id = $7
        RETURNING *
      `, [data.name, data.document_number, data.website, data.phone, data.address, id, tenantId]);

      if (result.rowCount === 0) return reply.status(404).send({ error: 'Company not found' });
      return result.rows[0];
    } catch (error) {
      console.error(error);
      return reply.status(500).send({ error: 'Failed to update company' });
    }
  });

  // --- DELETE /api/companies/:id (Excluir) ---
  app.delete('/:id', async (request, reply) => {
    const paramsSchema = z.object({ id: z.string().uuid() });
    const { id } = paramsSchema.parse(request.params);
    const tenantId = request.user?.tenantId;

    try {
      // Verifica se existem contatos vinculados antes de deletar
      const checkContacts = await db.query('SELECT id FROM contacts WHERE company_id = $1', [id]);
      if (checkContacts.rowCount && checkContacts.rowCount > 0) {
          return reply.status(400).send({ error: 'Cannot delete company with linked contacts.' });
      }

      const result = await db.query(`
        DELETE FROM companies WHERE id = $1 AND tenant_id = $2
      `, [id, tenantId]);

      if (result.rowCount === 0) return reply.status(404).send({ error: 'Company not found' });
      return { message: 'Company deleted' };
    } catch (error) {
      console.error(error);
      return reply.status(500).send({ error: 'Failed to delete company' });
    }
  });
}