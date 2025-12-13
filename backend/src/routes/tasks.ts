import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { db } from '../db/client';
import { authenticate } from '../middleware/auth';

export async function taskRoutes(app: FastifyInstance) {
  app.addHook('onRequest', authenticate);

  // --- GET /api/tasks (Listar) ---
  app.get('/', async (request, reply) => {
    const { tenantId, role, userId } = request.user!;
    const isAgent = role === 'agent';
    
    const querySchema = z.object({
        status: z.enum(['pending', 'in_progress', 'completed', 'all']).default('pending')
    });
    
    const { status } = querySchema.parse(request.query);

    try {
      let queryText = `
        SELECT 
            t.*,
            c.name as contact_name
        FROM tasks t
        LEFT JOIN contacts c ON t.contact_id = c.id
        WHERE t.tenant_id = $1
      `;
      const values: any[] = [tenantId];

      // Filtro de Segurança
      if (isAgent) {
          queryText += ` AND t.user_id = $${values.length + 1}`;
          values.push(userId);
      }

      if (status !== 'all') {
          queryText += ` AND t.status = $${values.length + 1}`;
          values.push(status);
      }

      queryText += ` ORDER BY t.due_date ASC NULLS LAST, t.created_at DESC`;

      const result = await db.query(queryText, values);
      return result.rows;

    } catch (error) {
      console.error(error);
      return reply.status(500).send({ error: 'Failed to fetch tasks' });
    }
  });

  // --- POST /api/tasks (Criar) ---
  app.post('/', async (request, reply) => {
    const createSchema = z.object({
      title: z.string().min(1),
      description: z.string().optional(),
      due_date: z.string().optional(),
      priority: z.enum(['low', 'medium', 'high']).default('medium'),
      contact_id: z.string().uuid().optional(),
    });

    const data = createSchema.parse(request.body);
    const tenantId = request.user?.tenantId;
    const userId = request.user?.userId;

    try {
      const result = await db.query(`
        INSERT INTO tasks (tenant_id, user_id, title, description, due_date, priority, contact_id)
        VALUES ($1, $2, $3, $4, $5, $6, $7)
        RETURNING *
      `, [
        tenantId, userId, data.title, data.description || '', 
        data.due_date || null, data.priority, data.contact_id || null
      ]);

      return reply.status(201).send(result.rows[0]);

    } catch (error) {
      console.error(error);
      return reply.status(500).send({ error: 'Failed to create task' });
    }
  });

  // --- PUT /api/tasks/:id (Editar) ---
  app.put('/:id', async (request, reply) => {
    const { tenantId, role, userId } = request.user!;
    const isAgent = role === 'agent';
    const paramsSchema = z.object({ id: z.string().uuid() });
    const updateSchema = z.object({
      title: z.string().min(1),
      description: z.string().optional(),
      due_date: z.string().optional(),
      priority: z.enum(['low', 'medium', 'high']),
      contact_id: z.string().uuid().optional(),
      status: z.enum(['pending', 'in_progress', 'completed']).optional() 
    });

    const { id } = paramsSchema.parse(request.params);
    const data = updateSchema.parse(request.body);

    try {
      let query = `
        UPDATE tasks 
        SET title = $1, description = $2, due_date = $3, priority = $4, contact_id = $5
        WHERE id = $6 AND tenant_id = $7
      `;
      const params = [data.title, data.description || '', data.due_date || null, data.priority, data.contact_id || null, id, tenantId];

      if (isAgent) {
          query += ' AND user_id = $8';
          params.push(userId);
      }
      query += ' RETURNING *';

      const result = await db.query(query, params);

      if (result.rowCount === 0) return reply.status(404).send({ error: 'Task not found' });
      return result.rows[0];

    } catch (error) {
      console.error(error);
      return reply.status(500).send({ error: 'Failed to update task' });
    }
  });

  // --- PATCH /api/tasks/:id/status ---
  app.patch('/:id/status', async (request, reply) => {
    const { tenantId, role, userId } = request.user!;
    const isAgent = role === 'agent';
    const paramsSchema = z.object({ id: z.string().uuid() });
    const bodySchema = z.object({
        status: z.enum(['pending', 'in_progress', 'completed'])
    });

    const { id } = paramsSchema.parse(request.params);
    const { status } = bodySchema.parse(request.body);

    try {
      let query = `UPDATE tasks SET status = $1 WHERE id = $2 AND tenant_id = $3`;
      const params = [status, id, tenantId];

      if (isAgent) {
          query += ' AND user_id = $4';
          params.push(userId);
      }
      query += ' RETURNING id, status';

      const result = await db.query(query, params);

      if (result.rowCount === 0) return reply.status(404).send({ error: 'Task not found' });
      return result.rows[0];

    } catch (error) {
        return reply.status(500).send({ error: 'Error updating task status' });
    }
  });

  // --- DELETE /api/tasks/:id ---
  app.delete('/:id', async (request, reply) => {
    const { tenantId, role, userId } = request.user!;
    const isAgent = role === 'agent';
    const paramsSchema = z.object({ id: z.string().uuid() });
    const { id } = paramsSchema.parse(request.params);

    try {
        let query = 'DELETE FROM tasks WHERE id = $1 AND tenant_id = $2';
        const params = [id, tenantId];

        // Vendedor só pode deletar SUAS tarefas
        if (isAgent) {
            query += ' AND user_id = $3';
            params.push(userId);
        }

        const result = await db.query(query, params);
        
        if (result.rowCount === 0) return reply.status(404).send({ error: 'Task not found or permission denied' });
        return { message: 'Deleted successfully' };

    } catch (error) {
        return reply.status(500).send({ error: 'Error deleting task' });
    }
  });
}