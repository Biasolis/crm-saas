import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { db } from '../db/client';
import { authenticate } from '../middleware/auth';

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
      user_id: z.string().uuid().optional(), 
    });

    const data = createDealSchema.parse(request.body);
    const tenantId = request.user?.tenantId;
    
    // Se for agent, FORÇA o userId dele. Se for admin, pode atribuir a outro (data.user_id)
    let userId = data.user_id;
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

  // --- PUT /api/deals/:id/move (Mover) ---
  app.put('/:id/move', async (request, reply) => {
    const { tenantId, role, userId } = request.user!;
    const isAgent = role === 'agent';
    const paramsSchema = z.object({ id: z.string().uuid() });
    const bodySchema = z.object({ stage_id: z.string().uuid() });

    const { id } = paramsSchema.parse(request.params);
    const { stage_id } = bodySchema.parse(request.body);

    try {
      let query = `UPDATE deals SET stage_id = $1 WHERE id = $2 AND tenant_id = $3`;
      const params = [stage_id, id, tenantId];

      if (isAgent) {
          query += ' AND user_id = $4';
          params.push(userId);
      }
      query += ' RETURNING *';

      const result = await db.query(query, params);

      if (result.rowCount === 0) return reply.status(404).send({ error: 'Deal not found or permission denied' });
      return result.rows[0];
    } catch (error) {
      console.error(error);
      return reply.status(500).send({ error: 'Failed to move deal' });
    }
  });

  // --- PUT /api/deals/:id (Editar) ---
  app.put('/:id', async (request, reply) => {
    // Mesma lógica de segurança
    const { tenantId, role, userId } = request.user!;
    const isAgent = role === 'agent';
    const paramsSchema = z.object({ id: z.string().uuid() });
    const updateSchema = z.object({
      title: z.string().min(1),
      value: z.number().optional(),
      contact_id: z.string().uuid().optional(),
      description: z.string().optional(),
      user_id: z.string().uuid().optional(),
    });

    const { id } = paramsSchema.parse(request.params);
    const data = updateSchema.parse(request.body);

    try {
      // Agent não pode mudar o dono (user_id)
      let targetUserId = data.user_id;
      if (isAgent) targetUserId = userId; 

      let query = `
        UPDATE deals 
        SET title = $1, value = $2, contact_id = $3, description = $4, user_id = $5
        WHERE id = $6 AND tenant_id = $7
      `;
      const params = [data.title, data.value, data.contact_id, data.description, targetUserId, id, tenantId];

      if (isAgent) {
          query += ' AND user_id = $8';
          params.push(userId);
      }
      query += ' RETURNING *';

      const result = await db.query(query, params);

      if (result.rowCount === 0) return reply.status(404).send({ error: 'Deal not found or permission denied' });
      return result.rows[0];
    } catch (error) {
      console.error(error);
      return reply.status(500).send({ error: 'Failed to update deal' });
    }
  });

  // --- DELETE /api/deals/:id (Excluir - Bloqueado) ---
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

  // ==========================================
  // SUB-ROTAS DE COMENTÁRIOS
  // ==========================================
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