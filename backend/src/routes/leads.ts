import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { db } from '../db/client';
import { authenticate } from '../middleware/auth';

export async function leadRoutes(app: FastifyInstance) {
  // Protege todas as rotas
  app.addHook('onRequest', authenticate);

  // ===========================================================================
  // 1. LISTAGEM E FILTROS (AS 4 TELAS)
  // ===========================================================================
  
  // GET /api/leads/pool
  app.get('/pool', async (request, reply) => {
    const { tenantId } = request.user!;
    try {
      const result = await db.query(`
        SELECT * FROM leads 
        WHERE tenant_id = $1 
          AND status = 'new' 
          AND user_id IS NULL
        ORDER BY created_at DESC
      `, [tenantId]);
      return result.rows;
    } catch (error) {
      return reply.status(500).send({ error: 'Failed to fetch lead pool' });
    }
  });

  // GET /api/leads/mine
  app.get('/mine', async (request, reply) => {
    const { tenantId, userId } = request.user!;
    try {
      const result = await db.query(`
        SELECT * FROM leads 
        WHERE tenant_id = $1 
          AND user_id = $2 
          AND status = 'in_progress'
        ORDER BY captured_at DESC
      `, [tenantId, userId]);
      return result.rows;
    } catch (error) {
      return reply.status(500).send({ error: 'Failed to fetch your leads' });
    }
  });

  // GET /api/leads/converted
  app.get('/converted', async (request, reply) => {
    const { tenantId } = request.user!;
    try {
      const query = `
        SELECT * FROM leads 
        WHERE tenant_id = $1 AND status = 'converted'
        ORDER BY converted_at DESC
      `;
      const result = await db.query(query, [tenantId]);
      return result.rows;
    } catch (error) {
      return reply.status(500).send({ error: 'Failed to fetch converted leads' });
    }
  });

  // GET /api/leads/lost
  app.get('/lost', async (request, reply) => {
    const { tenantId } = request.user!;
    try {
      const result = await db.query(`
        SELECT * FROM leads 
        WHERE tenant_id = $1 AND status = 'lost'
        ORDER BY created_at DESC
      `, [tenantId]);
      return result.rows;
    } catch (error) {
      return reply.status(500).send({ error: 'Failed to fetch lost leads' });
    }
  });

  // GET /api/leads/:id/logs (Histórico)
  app.get('/:id/logs', async (request, reply) => {
    const { id } = z.object({ id: z.string().uuid() }).parse(request.params);
    const { tenantId } = request.user!;
    
    // Verificação de segurança básica: O lead deve pertencer ao tenant
    const check = await db.query('SELECT id FROM leads WHERE id = $1 AND tenant_id = $2', [id, tenantId]);
    if (check.rowCount === 0) return reply.status(404).send({ error: 'Lead not found' });

    try {
        const result = await db.query(`
            SELECT l.*, u.name as user_name 
            FROM lead_logs l
            LEFT JOIN users u ON l.user_id = u.id
            WHERE l.lead_id = $1
            ORDER BY l.created_at DESC
        `, [id]);
        return result.rows;
    } catch (error) {
        return reply.status(500).send({ error: 'Failed to fetch logs' });
    }
  });

  // ===========================================================================
  // 2. AÇÕES DE FLUXO (PEGAR, CONVERTER, PERDER)
  // ===========================================================================

  // POST /api/leads/:id/claim -> Vendedor "Pega" o Lead
  app.post('/:id/claim', async (request, reply) => {
    const { id } = z.object({ id: z.string().uuid() }).parse(request.params);
    const { tenantId, userId } = request.user!;

    try {
      // Tenta atualizar SOMENTE SE user_id for NULL
      const result = await db.query(`
        UPDATE leads 
        SET user_id = $1, status = 'in_progress', captured_at = NOW()
        WHERE id = $2 AND tenant_id = $3 AND user_id IS NULL
        RETURNING *
      `, [userId, id, tenantId]);

      if (result.rowCount === 0) {
        return reply.status(409).send({ error: 'Este lead já foi pego ou não está disponível.' });
      }

      // LOG
      await db.query(`INSERT INTO lead_logs (lead_id, user_id, action) VALUES ($1, $2, 'claimed')`, [id, userId]);

      return { message: 'Lead capturado com sucesso!', lead: result.rows[0] };
    } catch (error) {
      console.error(error);
      return reply.status(500).send({ error: 'Failed to claim lead' });
    }
  });

  // POST /api/leads/:id/lose -> Marcar como Perdido
  app.post('/:id/lose', async (request, reply) => {
    const { id } = z.object({ id: z.string().uuid() }).parse(request.params);
    const bodySchema = z.object({ reason: z.string().min(1) });
    const { reason } = bodySchema.parse(request.body);
    const { tenantId, userId, role } = request.user!;

    try {
      let query = `
        UPDATE leads 
        SET status = 'lost', loss_reason = $1 
        WHERE id = $2 AND tenant_id = $3
      `;
      const params: any[] = [reason, id, tenantId];

      if (role === 'agent') {
        query += ` AND user_id = $4`;
        params.push(userId);
      }

      const result = await db.query(query, params);
      
      if (result.rowCount === 0) return reply.status(404).send({ error: 'Lead not found or permission denied' });
      
      // LOG
      await db.query(`
        INSERT INTO lead_logs (lead_id, user_id, action, details) 
        VALUES ($1, $2, 'lost', $3)
      `, [id, userId, JSON.stringify({ reason })]);

      return { message: 'Lead marked as lost' };
    } catch (error) {
      return reply.status(500).send({ error: 'Failed to update lead' });
    }
  });

  // POST /api/leads/:id/convert -> Converter em Cliente
  app.post('/:id/convert', async (request, reply) => {
    const { id } = z.object({ id: z.string().uuid() }).parse(request.params);
    const { tenantId, userId, role } = request.user!;
    
    const client = await db.getClient();
    try {
      await client.query('BEGIN');

      let leadQuery = 'SELECT * FROM leads WHERE id = $1 AND tenant_id = $2';
      const params: any[] = [id, tenantId];
      if (role === 'agent') {
         leadQuery += ' AND user_id = $3';
         params.push(userId);
      }

      const leadRes = await client.query(leadQuery, params);
      if (leadRes.rowCount === 0) throw new Error('Lead not found or permission denied');
      const lead = leadRes.rows[0];

      if (lead.status === 'converted') throw new Error('Lead already converted');

      let companyId = null;
      if (lead.company_name) {
        const compRes = await client.query(`
            INSERT INTO companies (tenant_id, user_id, name, website, address) 
            VALUES ($1, $2, $3, $4, $5) RETURNING id
        `, [tenantId, userId, lead.company_name, lead.website, lead.address]);
        companyId = compRes.rows[0].id;
      }

      const contactRes = await client.query(`
        INSERT INTO contacts (tenant_id, user_id, name, email, phone, mobile, company_id, address)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        RETURNING id
      `, [tenantId, userId, lead.name, lead.email, lead.phone, lead.mobile, companyId, lead.address]);

      await client.query(`
        UPDATE leads 
        SET status = 'converted', converted_at = NOW() 
        WHERE id = $1
      `, [id]);

      // LOG
      await client.query(`
         INSERT INTO lead_logs (lead_id, user_id, action, details) 
         VALUES ($1, $2, 'converted', $3)
      `, [id, userId, JSON.stringify({ contact_id: contactRes.rows[0].id })]);

      await client.query('COMMIT');
      
      return { 
        message: 'Lead converted successfully', 
        contact_id: contactRes.rows[0].id,
        company_id: companyId 
      };

    } catch (error: any) {
      await client.query('ROLLBACK');
      console.error(error);
      return reply.status(500).send({ error: error.message || 'Failed to convert lead' });
    } finally {
      client.release();
    }
  });

  // ===========================================================================
  // 3. CRIAÇÃO E IMPORTAÇÃO (APENAS ADMIN/OWNER)
  // ===========================================================================

  // POST /api/leads
  app.post('/', async (request, reply) => {
    if (request.user?.role === 'agent') {
        return reply.status(403).send({ error: 'Apenas administradores podem cadastrar leads.' });
    }

    const createSchema = z.object({
      name: z.string().min(2),
      email: z.string().email().optional().or(z.literal('')),
      phone: z.string().optional(),
      mobile: z.string().optional(),
      company_name: z.string().optional(),
      position: z.string().optional(),
      website: z.string().optional(),
      address: z.string().optional(),
      source: z.string().optional(),
      notes: z.string().optional(),
    });

    const data = createSchema.parse(request.body);
    const { tenantId } = request.user!;

    try {
      const result = await db.query(`
        INSERT INTO leads (
            tenant_id, user_id, status, 
            name, email, phone, mobile, company_name, 
            position, website, address, source, notes
        )
        VALUES ($1, NULL, 'new', $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
        RETURNING *
      `, [
        tenantId, data.name, data.email, data.phone, data.mobile, 
        data.company_name, data.position, data.website, data.address, 
        data.source, data.notes
      ]);

      return reply.status(201).send(result.rows[0]);
    } catch (error) {
      console.error(error);
      return reply.status(500).send({ error: 'Failed to create lead' });
    }
  });

  // POST /api/leads/import
  app.post('/import', async (request, reply) => {
    if (request.user?.role === 'agent') {
        return reply.status(403).send({ error: 'Apenas administradores podem importar leads.' });
    }

    const importSchema = z.object({
      leads: z.array(z.object({
        name: z.string().min(1),
        email: z.string().optional(),
        phone: z.string().optional(),
        mobile: z.string().optional(),
        company_name: z.string().optional(),
        position: z.string().optional(),
        address: z.string().optional(),
        website: z.string().optional(),
        source: z.string().optional(),
      }))
    });

    const { leads } = importSchema.parse(request.body);
    const { tenantId } = request.user!;
    const client = await db.getClient();

    try {
      await client.query('BEGIN'); 
      let insertedCount = 0;

      for (const lead of leads) {
        if (lead.email) {
            const check = await client.query('SELECT id FROM leads WHERE email = $1 AND tenant_id = $2', [lead.email, tenantId]);
            if (check.rowCount && check.rowCount > 0) continue; 
        }

        await client.query(`
          INSERT INTO leads (
            tenant_id, user_id, status,
            name, email, phone, mobile, company_name, 
            position, address, website, source
          )
          VALUES ($1, NULL, 'new', $2, $3, $4, $5, $6, $7, $8, $9, $10)
        `, [
          tenantId, 
          lead.name, 
          lead.email || null, 
          lead.phone || null, 
          lead.mobile || null,
          lead.company_name || null, 
          lead.position || null,
          lead.address || null,
          lead.website || null,
          lead.source || 'Importado via CSV'
        ]);
        insertedCount++;
      }

      await client.query('COMMIT');
      return { message: 'Import successful', count: insertedCount };

    } catch (error) {
      await client.query('ROLLBACK');
      return reply.status(500).send({ error: 'Failed to import leads' });
    } finally {
      client.release();
    }
  });

  // ===========================================================================
  // 4. EDIÇÃO E REMOÇÃO
  // ===========================================================================

  // PUT /api/leads/:id
  app.put('/:id', async (request, reply) => {
    const { tenantId, role, userId } = request.user!;
    const paramsSchema = z.object({ id: z.string().uuid() });
    
    const updateSchema = z.object({
      name: z.string().optional(),
      email: z.string().optional(),
      phone: z.string().optional(),
      mobile: z.string().optional(),
      company_name: z.string().optional(),
      position: z.string().optional(),
      website: z.string().optional(),
      address: z.string().optional(),
      notes: z.string().optional()
    });

    const { id } = paramsSchema.parse(request.params);
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

      if (fields.length === 0) return reply.send({ message: 'No changes' });

      values.push(id, tenantId);
      let query = `UPDATE leads SET ${fields.join(', ')} WHERE id = $${idx} AND tenant_id = $${idx+1}`;

      if (role === 'agent') {
          values.push(userId);
          query += ` AND user_id = $${idx+2}`;
      }

      const result = await db.query(`${query} RETURNING *`, values);
      
      if (result.rowCount === 0) {
          return reply.status(404).send({ error: 'Lead not found or permission denied' });
      }

      return result.rows[0];
    } catch (error) {
      return reply.status(500).send({ error: 'Failed to update lead' });
    }
  });

  // DELETE /api/leads/:id
  app.delete('/:id', async (request, reply) => {
      if (request.user?.role === 'agent') {
          return reply.status(403).send({ error: 'Vendedores não podem excluir leads.' });
      }

      const { id } = z.object({ id: z.string().uuid() }).parse(request.params);
      const { tenantId } = request.user!;

      try {
        await db.query('DELETE FROM leads WHERE id = $1 AND tenant_id = $2', [id, tenantId]);
        return { message: 'Deleted' };
      } catch (error) {
        return reply.status(500).send({ error: 'Failed to delete lead' });
      }
  });
}