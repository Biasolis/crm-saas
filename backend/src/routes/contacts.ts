import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { db } from '../db/client';
import { authenticate } from '../middleware/auth';

export async function contactRoutes(app: FastifyInstance) {
  
  app.addHook('onRequest', authenticate);

  // --- GET /api/contacts (Listar) ---
  app.get('/', async (request, reply) => {
    const { tenantId, role, userId } = request.user!;
    const isAgent = role === 'agent';
    
    const queryParams = z.object({
        page: z.string().transform(Number).default('1'),
        limit: z.string().transform(Number).default('50'),
        search: z.string().optional()
    });

    const { page, limit, search } = queryParams.parse(request.query);
    const offset = (page - 1) * limit;

    try {
      let queryText = `
        SELECT 
          c.*,
          co.name as company_name 
        FROM contacts c
        LEFT JOIN companies co ON c.company_id = co.id
        WHERE c.tenant_id = $1 
      `;
      const queryValues: any[] = [tenantId];

      if (isAgent) {
          queryText += ` AND c.user_id = $${queryValues.length + 1}`;
          queryValues.push(userId);
      }

      if (search) {
        queryText += ` AND (c.name ILIKE $${queryValues.length + 1} OR c.email ILIKE $${queryValues.length + 1})`;
        queryValues.push(`%${search}%`);
      }

      queryText += ` ORDER BY c.created_at DESC LIMIT ${limit} OFFSET ${offset}`;

      const result = await db.query(queryText, queryValues);
      
      return reply.send({
        data: result.rows,
        page,
        limit
      });

    } catch (error) {
      console.error(error);
      return reply.status(500).send({ error: 'Failed to fetch contacts' });
    }
  });

  // --- GET /api/contacts/:id/summary ---
  app.get('/:id/summary', async (request, reply) => {
    const { tenantId, role, userId } = request.user!;
    const isAgent = role === 'agent';
    const paramsSchema = z.object({ id: z.string().uuid() });
    const { id } = paramsSchema.parse(request.params);

    try {
      // 1. Dados do Contato (Com filtro de segurança)
      let query = `
        SELECT c.*, co.name as company_name 
        FROM contacts c
        LEFT JOIN companies co ON c.company_id = co.id
        WHERE c.id = $1 AND c.tenant_id = $2
      `;
      const params: any[] = [id, tenantId];

      if (isAgent) {
          query += ' AND c.user_id = $3';
          params.push(userId);
      }

      const contactRes = await db.query(query, params);

      if (contactRes.rowCount === 0) return reply.status(404).send({ error: 'Contact not found' });
      const contact = contactRes.rows[0];

      // 2. Negócios (Deals) vinculados
      const dealsRes = await db.query(`
        SELECT d.*, s.name as stage_name 
        FROM deals d
        JOIN stages s ON d.stage_id = s.id
        WHERE d.contact_id = $1
        ORDER BY d.created_at DESC
      `, [id]);

      // 3. Tarefas vinculadas
      const tasksRes = await db.query(`
        SELECT * FROM tasks 
        WHERE contact_id = $1
        ORDER BY due_date ASC
      `, [id]);

      return {
        contact,
        deals: dealsRes.rows,
        tasks: tasksRes.rows
      };

    } catch (error) {
      console.error(error);
      return reply.status(500).send({ error: 'Failed to load contact details' });
    }
  });

  // --- POST /api/contacts (Criar) ---
  app.post('/', async (request, reply) => {
    const createContactBody = z.object({
      name: z.string().min(2),
      email: z.string().email().optional().or(z.literal('')),
      phone: z.string().optional(),
      mobile: z.string().optional(),
      document_number: z.string().optional(),
      company_name: z.string().optional(),
      company_id: z.string().uuid().optional().or(z.literal('')),
      
      zip_code: z.string().optional(),
      address: z.string().optional(),
      number: z.string().optional(),
      neighborhood: z.string().optional(),
      city: z.string().optional(),
      state: z.string().optional(),

      custom_attributes: z.record(z.any()).optional().default({})
    });

    const data = createContactBody.parse(request.body);
    const tenantId = request.user?.tenantId;
    const userId = request.user?.userId;

    try {
        // 1. Verificação de Limite do Plano
        const limitCheck = await db.query(`
            SELECT 
                p.max_contacts,
                (SELECT COUNT(*) FROM contacts WHERE tenant_id = $1) as current_count
            FROM tenants t
            LEFT JOIN plans p ON t.plan_id = p.id
            WHERE t.id = $1
        `, [tenantId]);

        if (limitCheck.rows.length > 0 && limitCheck.rows[0].max_contacts !== null) {
            const { max_contacts, current_count } = limitCheck.rows[0];
            if (Number(current_count) >= Number(max_contacts)) {
                return reply.status(403).send({ 
                    error: `Limite de contatos atingido (${current_count}/${max_contacts}). Atualize seu plano.` 
                });
            }
        }

      const companyId = data.company_id || null;

      const query = `
        INSERT INTO contacts (
          tenant_id, user_id, name, email, phone, mobile, document_number, company_name, company_id,
          zip_code, address, number, neighborhood, city, state,
          custom_attributes
        ) VALUES (
          $1, $2, $3, $4, $5, $6, $7, $8, $9,
          $10, $11, $12, $13, $14, $15,
          $16
        )
        RETURNING *;
      `;

      const values = [
        tenantId, userId, data.name, data.email, data.phone, data.mobile, data.document_number, data.company_name, companyId,
        data.zip_code, data.address, data.number, data.neighborhood, data.city, data.state,
        JSON.stringify(data.custom_attributes)
      ];

      const result = await db.query(query, values);
      return reply.status(201).send(result.rows[0]);

    } catch (error) {
      console.error(error);
      return reply.status(500).send({ error: 'Internal Server Error' });
    }
  });

  // --- POST /api/contacts/import (Importação) ---
  app.post('/import', async (request, reply) => {
    const importSchema = z.object({
      contacts: z.array(z.object({
        name: z.string().min(1),
        email: z.string().optional(),
        phone: z.string().optional(),
        mobile: z.string().optional(),
        city: z.string().optional(),
        state: z.string().optional(),
      }))
    });

    const { contacts } = importSchema.parse(request.body);
    const tenantId = request.user?.tenantId;
    const userId = request.user?.userId;
    const client = await db.getClient();

    try {
      await client.query('BEGIN');
      let insertedCount = 0;

      for (const contact of contacts) {
        if (contact.email) {
            const check = await client.query('SELECT id FROM contacts WHERE email = $1 AND tenant_id = $2', [contact.email, tenantId]);
            if (check.rowCount! > 0) continue;
        }

        await client.query(`
          INSERT INTO contacts (tenant_id, user_id, name, email, phone, mobile, city, state)
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        `, [
          tenantId, userId, contact.name, contact.email || null, contact.phone || null,
          contact.mobile || null, contact.city || null, contact.state || null
        ]);
        insertedCount++;
      }

      await client.query('COMMIT');
      return { message: 'Import successful', count: insertedCount };

    } catch (error) {
      await client.query('ROLLBACK');
      console.error(error);
      return reply.status(500).send({ error: 'Failed to import contacts' });
    } finally {
      client.release();
    }
  });

  // --- PUT /api/contacts/:id (Editar) ---
  app.put('/:id', async (request, reply) => {
    const { tenantId, role, userId } = request.user!;
    const isAgent = role === 'agent';

    const paramsSchema = z.object({ id: z.string().uuid() });
    const updateBody = z.object({
      name: z.string().min(2),
      email: z.string().email().optional().or(z.literal('')),
      phone: z.string().optional(),
      mobile: z.string().optional(),
      document_number: z.string().optional(),
      company_id: z.string().uuid().optional().or(z.literal('')),
      city: z.string().optional(),
      state: z.string().optional(),
    });

    const { id } = paramsSchema.parse(request.params);
    const data = updateBody.parse(request.body);

    try {
      const companyId = data.company_id || null;

      let query = `
        UPDATE contacts 
        SET name = $1, email = $2, phone = $3, mobile = $4, 
            document_number = $5, company_id = $6, city = $7, state = $8
        WHERE id = $9 AND tenant_id = $10
      `;
      const params = [
        data.name, data.email, data.phone, data.mobile, 
        data.document_number, companyId, data.city, data.state,
        id, tenantId
      ];

      if (isAgent) {
          query += ' AND user_id = $11';
          params.push(userId);
      }

      query += ' RETURNING *';

      const result = await db.query(query, params);

      if (result.rowCount === 0) return reply.status(404).send({ error: 'Contact not found or permission denied' });
      return result.rows[0];

    } catch (error) {
      console.error(error);
      return reply.status(500).send({ error: 'Failed to update contact' });
    }
  });

  // --- DELETE /api/contacts/:id (Excluir - Bloqueado) ---
  app.delete('/:id', async (request, reply) => {
    if (request.user?.role === 'agent') {
        return reply.status(403).send({ error: 'Permission denied.' });
    }

    const paramsSchema = z.object({ id: z.string().uuid() });
    const { id } = paramsSchema.parse(request.params);
    const tenantId = request.user?.tenantId;

    try {
      const result = await db.query(`
        DELETE FROM contacts WHERE id = $1 AND tenant_id = $2
      `, [id, tenantId]);

      if (result.rowCount === 0) return reply.status(404).send({ error: 'Contact not found' });
      return { message: 'Contact deleted' };

    } catch (error) {
      console.error(error);
      return reply.status(500).send({ error: 'Failed to delete contact' });
    }
  });
}