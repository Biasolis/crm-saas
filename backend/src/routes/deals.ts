import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { db } from '../db/client';
import { authenticate } from '../middleware/auth';
import { emailService } from '../services/email'; // <--- Importação

export async function dealRoutes(app: FastifyInstance) {
  app.addHook('onRequest', authenticate);

  // --- POST /api/deals (Criar) ---
  app.post('/', async (request, reply) => {
    const createDealSchema = z.object({
      title: z.string().min(1),
      contact_id: z.string().uuid(),
      stage_id: z.string().uuid(),
      value: z.number().optional().default(0),
      expected_close_date: z.string().optional(),
      description: z.string().optional(),
      user_id: z.union([z.string().uuid(), z.literal(''), z.null()]).optional(), 
    });

    const data = createDealSchema.parse(request.body);
    const tenantId = request.user?.tenantId;
    
    let userId = (data.user_id === '' ? null : data.user_id);

    if (request.user?.role === 'agent') {
        userId = request.user.userId;
    } else if (!userId) {
        userId = request.user?.userId;
    }

    try {
      const result = await db.query(`
        INSERT INTO deals (tenant_id, contact_id, stage_id, title, value, expected_close_date, description, user_id)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        RETURNING *
      `, [
        tenantId,
        data.contact_id,
        data.stage_id,
        data.title,
        data.value,
        data.expected_close_date,
        data.description || '',
        userId
      ]);

      return reply.status(201).send(result.rows[0]);

    } catch (error) {
      console.error(error);
      return reply.status(500).send({ error: 'Failed to create deal' });
    }
  });

  // --- GET /api/deals (Listar) ---
  app.get('/', async (request, reply) => {
    const { tenantId, role, userId } = request.user!;
    const isAgent = role === 'agent';

    const querySchema = z.object({
      pipeline_id: z.string().uuid().optional(),
    });
    const { pipeline_id } = querySchema.parse(request.query);

    try {
      let queryText = `
        SELECT 
          d.*,
          c.name as contact_name,
          s.name as stage_name,
          u.name as user_name,
          u.email as user_email
        FROM deals d
        LEFT JOIN contacts c ON d.contact_id = c.id
        LEFT JOIN stages s ON d.stage_id = s.id
        LEFT JOIN users u ON d.user_id = u.id
        WHERE d.tenant_id = $1
      `;
      const values: any[] = [tenantId];

      if (isAgent) {
          queryText += ` AND d.user_id = $${values.length + 1}`;
          values.push(userId);
      }

      if (pipeline_id) {
        queryText += ` AND s.pipeline_id = $${values.length + 1}`;
        values.push(pipeline_id);
      }

      queryText += ` ORDER BY d.created_at DESC`;

      const result = await db.query(queryText, values);
      return result.rows;

    } catch (error) {
      console.error(error);
      return reply.status(500).send({ error: 'Failed to fetch deals' });
    }
  });

  // --- PUT /api/deals/:id/move (Mover + Notificação) ---
  app.put('/:id/move', async (request, reply) => {
    const { tenantId, role, userId } = request.user!;
    const isAgent = role === 'agent';
    const paramsSchema = z.object({ id: z.string().uuid() });
    const bodySchema = z.object({ stage_id: z.string().uuid() });

    const { id } = paramsSchema.parse(request.params);
    const { stage_id } = bodySchema.parse(request.body);

    try {
      let query = `UPDATE deals SET stage_id = $1, updated_at = NOW() WHERE id = $2 AND tenant_id = $3`;
      const params = [stage_id, id, tenantId];

      if (isAgent) {
          query += ' AND user_id = $4';
          params.push(userId);
      }
      query += ' RETURNING *';

      const result = await db.query(query, params);

      if (result.rowCount === 0) return reply.status(404).send({ error: 'Deal not found or permission denied' });
      
      const deal = result.rows[0];

      // --- LÓGICA DE E-MAIL (Notificar Cliente sobre Progresso) ---
      const infoRes = await db.query(`
        SELECT 
            s.name as stage_name,
            c.email as contact_email,
            c.name as contact_name
        FROM stages s, contacts c
        WHERE s.id = $1 AND c.id = $2
      `, [stage_id, deal.contact_id]);

      if (infoRes.rowCount && infoRes.rowCount > 0) {
          const info = infoRes.rows[0];
          
          if (info.contact_email) {
              const emailBody = `
                  <div style="font-family: Arial, sans-serif; padding: 20px;">
                    <h3 style="color: #333;">Olá, ${info.contact_name}!</h3>
                    <p>Gostaríamos de informar que o status do seu projeto <strong>"${deal.title}"</strong> foi atualizado.</p>
                    <p><strong>Nova Etapa:</strong> <span style="background:#e0f2fe; color:#0284c7; padding:4px 8px; border-radius:4px;">${info.stage_name}</span></p>
                    <p>Estamos à disposição para qualquer dúvida.</p>
                    <br/>
                    <small style="color: #888;">Atenciosamente,<br/>Equipe de Projetos</small>
                  </div>
              `;

              emailService.send(tenantId, info.contact_email, `Atualização de Projeto: ${deal.title}`, emailBody)
                .catch(e => console.error('Erro ao notificar cliente sobre deal:', e));
          }
      }
      // -------------------------------------------------------------

      return result.rows[0];
    } catch (error) {
      console.error(error);
      return reply.status(500).send({ error: 'Failed to move deal' });
    }
  });

  // --- PUT /api/deals/:id (Editar) ---
  app.put('/:id', async (request, reply) => {
    const { tenantId, role, userId } = request.user!;
    const isAgent = role === 'agent';
    const paramsSchema = z.object({ id: z.string().uuid() });
    
    const updateSchema = z.object({
      title: z.string().min(1).optional(),
      value: z.number().optional(),
      contact_id: z.string().uuid().optional(),
      description: z.string().optional(),
      user_id: z.union([z.string().uuid(), z.literal(''), z.null()]).optional(),
    });

    const { id } = paramsSchema.parse(request.params);
    const data = updateSchema.parse(request.body);

    try {
      let targetUserId = (data.user_id === '' ? null : data.user_id);
      
      if (isAgent) targetUserId = userId; 

      const fields: string[] = [];
      const values: any[] = [];
      let idx = 1;

      if (data.title !== undefined) { fields.push(`title = $${idx++}`); values.push(data.title); }
      if (data.value !== undefined) { fields.push(`value = $${idx++}`); values.push(data.value); }
      if (data.contact_id !== undefined) { fields.push(`contact_id = $${idx++}`); values.push(data.contact_id); }
      if (data.description !== undefined) { fields.push(`description = $${idx++}`); values.push(data.description); }
      
      // Update User ID (Admin Only)
      if (!isAgent && data.user_id !== undefined) {
          fields.push(`user_id = $${idx++}`);
          values.push(targetUserId); 
      }

      // Updated At
      fields.push(`updated_at = NOW()`);

      if (fields.length === 1) return reply.send({ message: 'No changes' }); // Só tem updated_at

      values.push(id, tenantId);
      let query = `UPDATE deals SET ${fields.join(', ')} WHERE id = $${idx++} AND tenant_id = $${idx++}`;

      if (isAgent) {
          values.push(userId);
          query += ` AND user_id = $${idx++}`;
      }
      query += ' RETURNING *';

      const result = await db.query(query, values);

      if (result.rowCount === 0) return reply.status(404).send({ error: 'Deal not found or permission denied' });
      return result.rows[0];
    } catch (error) {
      console.error(error);
      return reply.status(500).send({ error: 'Failed to update deal' });
    }
  });

  // --- DELETE /api/deals/:id (Excluir) ---
  app.delete('/:id', async (request, reply) => {
    if (request.user?.role === 'agent') {
        return reply.status(403).send({ error: 'Permission denied.' });
    }
    const paramsSchema = z.object({ id: z.string().uuid() });
    const { id } = paramsSchema.parse(request.params);
    const tenantId = request.user?.tenantId;

    try {
      const result = await db.query(`
        DELETE FROM deals 
        WHERE id = $1 AND tenant_id = $2
        RETURNING id
      `, [id, tenantId]);

      if (result.rowCount === 0) return reply.status(404).send({ error: 'Deal not found' });
      return { message: 'Deal deleted successfully' };
    } catch (error) {
      console.error(error);
      return reply.status(500).send({ error: 'Failed to delete deal' });
    }
  });

  // --- COMENTÁRIOS ---
  app.get('/:id/comments', async (request, reply) => {
    const { tenantId, role, userId } = request.user!;
    const isAgent = role === 'agent';
    const paramsSchema = z.object({ id: z.string().uuid() });
    const { id } = paramsSchema.parse(request.params);

    try {
      let checkQuery = 'SELECT id FROM deals WHERE id = $1 AND tenant_id = $2';
      const checkParams = [id, tenantId];
      if (isAgent) {
          checkQuery += ' AND user_id = $3';
          checkParams.push(userId);
      }

      const dealCheck = await db.query(checkQuery, checkParams);
      if (dealCheck.rowCount === 0) return reply.status(404).send({ error: 'Deal not found' });

      const result = await db.query(`
        SELECT c.*, u.name as user_name 
        FROM deal_comments c
        JOIN users u ON c.user_id = u.id
        WHERE c.deal_id = $1
        ORDER BY c.created_at ASC
      `, [id]);
      
      return result.rows;
    } catch (error) {
      console.error(error);
      return reply.status(500).send({ error: 'Failed to fetch comments' });
    }
  });

  app.post('/:id/comments', async (request, reply) => {
    const paramsSchema = z.object({ id: z.string().uuid() });
    const bodySchema = z.object({ content: z.string().min(1) });
    
    const { id } = paramsSchema.parse(request.params);
    const { content } = bodySchema.parse(request.body);
    const { tenantId, role, userId } = request.user!;
    const isAgent = role === 'agent';

    try {
       let checkQuery = 'SELECT id FROM deals WHERE id = $1 AND tenant_id = $2';
       const checkParams = [id, tenantId];
       if (isAgent) {
           checkQuery += ' AND user_id = $3';
           checkParams.push(userId);
       }

       const dealCheck = await db.query(checkQuery, checkParams);
       if (dealCheck.rowCount === 0) return reply.status(404).send({ error: 'Deal not found' });

       const result = await db.query(`
         INSERT INTO deal_comments (deal_id, user_id, content)
         VALUES ($1, $2, $3)
         RETURNING id, content, created_at
       `, [id, userId, content]);

       return {
         ...result.rows[0],
         user_name: request.user?.email 
       };

    } catch (error) {
      console.error(error);
      return reply.status(500).send({ error: 'Failed to add comment' });
    }
  });
}