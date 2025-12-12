import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { db } from '../db/client';
import { authenticate } from '../middleware/auth';

export async function leadRoutes(app: FastifyInstance) {
  // Protege todas as rotas deste arquivo
  app.addHook('onRequest', authenticate);

  // --- GET /api/leads (Listar) ---
  app.get('/', async (request, reply) => {
    const tenantId = request.user?.tenantId;
    const querySchema = z.object({
        status: z.string().optional()
    });
    const { status } = querySchema.parse(request.query);

    try {
      let queryText = `SELECT * FROM leads WHERE tenant_id = $1`;
      const values: any[] = [tenantId];

      if (status && status !== 'all') {
          queryText += ` AND status = $2`;
          values.push(status);
      }

      queryText += ` ORDER BY created_at DESC`;

      const result = await db.query(queryText, values);
      return result.rows;
    } catch (error) {
      return reply.status(500).send({ error: 'Failed to fetch leads' });
    }
  });

  // --- POST /api/leads (Criar Individual) ---
  app.post('/', async (request, reply) => {
    const createSchema = z.object({
      name: z.string().min(2),
      email: z.string().email().optional().or(z.literal('')),
      phone: z.string().optional(),
      company_name: z.string().optional(),
      source: z.string().optional(),
      notes: z.string().optional(),
    });

    const data = createSchema.parse(request.body);
    const tenantId = request.user?.tenantId;

    try {
      const result = await db.query(`
        INSERT INTO leads (tenant_id, name, email, phone, company_name, source, notes)
        VALUES ($1, $2, $3, $4, $5, $6, $7)
        RETURNING *
      `, [tenantId, data.name, data.email, data.phone, data.company_name, data.source, data.notes]);

      return reply.status(201).send(result.rows[0]);
    } catch (error) {
      return reply.status(500).send({ error: 'Failed to create lead' });
    }
  });

  // --- POST /api/leads/import (Importação em Massa - CSV) ---
  app.post('/import', async (request, reply) => {
    const importSchema = z.object({
      leads: z.array(z.object({
        name: z.string().min(1),
        email: z.string().optional(),
        phone: z.string().optional(),
        company_name: z.string().optional(),
        source: z.string().optional(),
      }))
    });

    const { leads } = importSchema.parse(request.body);
    const tenantId = request.user?.tenantId;

    const client = await db.getClient();

    try {
      await client.query('BEGIN'); 

      let insertedCount = 0;

      for (const lead of leads) {
        // Verifica duplicidade por email se existir
        if (lead.email) {
            const check = await client.query('SELECT id FROM leads WHERE email = $1 AND tenant_id = $2', [lead.email, tenantId]);
            if (check.rowCount && check.rowCount > 0) continue; 
        }

        await client.query(`
          INSERT INTO leads (tenant_id, name, email, phone, company_name, source)
          VALUES ($1, $2, $3, $4, $5, $6)
        `, [
          tenantId, 
          lead.name, 
          lead.email || null, 
          lead.phone || null, 
          lead.company_name || null, 
          lead.source || 'Importado via CSV'
        ]);
        insertedCount++;
      }

      await client.query('COMMIT');
      return { message: 'Import successful', count: insertedCount };

    } catch (error) {
      await client.query('ROLLBACK');
      console.error(error);
      return reply.status(500).send({ error: 'Failed to import leads' });
    } finally {
      client.release();
    }
  });

  // --- PUT /api/leads/:id (Editar) ---
  app.put('/:id', async (request, reply) => {
    const paramsSchema = z.object({ id: z.string().uuid() });
    const updateSchema = z.object({
      name: z.string().optional(),
      email: z.string().optional(),
      phone: z.string().optional(),
      company_name: z.string().optional(),
      status: z.enum(['new', 'contacted', 'qualified', 'disqualified', 'converted']).optional(),
      notes: z.string().optional()
    });

    const { id } = paramsSchema.parse(request.params);
    const data = updateSchema.parse(request.body);
    const tenantId = request.user?.tenantId;

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

      if (fields.length === 0) return reply.send({ message: 'No changes' });

      values.push(id, tenantId);
      const query = `UPDATE leads SET ${fields.join(', ')} WHERE id = $${idx} AND tenant_id = $${idx+1} RETURNING *`;

      const result = await db.query(query, values);
      return result.rows[0];
    } catch (error) {
      return reply.status(500).send({ error: 'Failed to update lead' });
    }
  });

  // --- POST /api/leads/:id/convert (Converter em Cliente) ---
  app.post('/:id/convert', async (request, reply) => {
    const { id } = z.object({ id: z.string().uuid() }).parse(request.params);
    const tenantId = request.user?.tenantId;

    const client = await db.getClient();
    try {
      await client.query('BEGIN');

      const leadRes = await client.query('SELECT * FROM leads WHERE id = $1 AND tenant_id = $2', [id, tenantId]);
      if (leadRes.rowCount === 0) throw new Error('Lead not found');
      const lead = leadRes.rows[0];

      if (lead.status === 'converted') throw new Error('Lead already converted');

      // 1. Criar Empresa (se houver nome)
      let companyId = null;
      if (lead.company_name) {
        const compRes = await client.query(`
            INSERT INTO companies (tenant_id, name) VALUES ($1, $2) RETURNING id
        `, [tenantId, lead.company_name]);
        companyId = compRes.rows[0].id;
      }

      // 2. Criar Contato
      const contactRes = await client.query(`
        INSERT INTO contacts (tenant_id, name, email, phone, company_id)
        VALUES ($1, $2, $3, $4, $5)
        RETURNING id
      `, [tenantId, lead.name, lead.email, lead.phone, companyId]);

      // 3. Atualizar Lead
      await client.query(`UPDATE leads SET status = 'converted' WHERE id = $1`, [id]);

      await client.query('COMMIT');
      
      return { 
        message: 'Lead converted successfully', 
        contact_id: contactRes.rows[0].id,
        company_id: companyId 
      };

    } catch (error) {
      await client.query('ROLLBACK');
      console.error(error);
      return reply.status(500).send({ error: 'Failed to convert lead' });
    } finally {
      client.release();
    }
  });
  
  // --- DELETE /api/leads/:id ---
  app.delete('/:id', async (request, reply) => {
      const { id } = z.object({ id: z.string().uuid() }).parse(request.params);
      const tenantId = request.user?.tenantId;
      try {
        await db.query('DELETE FROM leads WHERE id = $1 AND tenant_id = $2', [id, tenantId]);
        return { message: 'Deleted' };
      } catch (error) {
        return reply.status(500).send({ error: 'Failed to delete lead' });
      }
  });
}