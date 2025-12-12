import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { db } from '../db/client';
import { authenticate } from '../middleware/auth';

export async function taskRoutes(app: FastifyInstance) {
  // Protege todas as rotas com autenticação JWT
  app.addHook('onRequest', authenticate);

  // --- GET /api/tasks (Listar Minhas Tarefas) ---
  app.get('/', async (request, reply) => {
    const tenantId = request.user?.tenantId;
    
    // Schema de validação dos filtros da URL (Query Params)
    const querySchema = z.object({
        // Aceita 'all' para trazer tudo ou um status específico
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

      // Se não for 'all', filtra pelo status específico
      if (status !== 'all') {
          queryText += ` AND t.status = $2`;
          values.push(status);
      }

      // Ordenação: 
      // 1. Data de Vencimento (mais urgentes primeiro)
      // 2. NULLS LAST (tarefas sem data ficam no final)
      // 3. Data de criação (mais novas primeiro como critério de desempate)
      queryText += ` ORDER BY t.due_date ASC NULLS LAST, t.created_at DESC`;

      const result = await db.query(queryText, values);
      return result.rows;

    } catch (error) {
      console.error(error);
      return reply.status(500).send({ error: 'Failed to fetch tasks' });
    }
  });

  // --- POST /api/tasks (Criar Tarefa) ---
  app.post('/', async (request, reply) => {
    const createSchema = z.object({
      title: z.string().min(1),
      description: z.string().optional(),
      due_date: z.string().optional(), // Espera string ISO
      priority: z.enum(['low', 'medium', 'high']).default('medium'),
      contact_id: z.string().uuid().optional(),
    });

    const data = createSchema.parse(request.body);
    const tenantId = request.user?.tenantId;
    const userId = request.user?.userId; // Atribui ao usuário logado

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

  // --- PUT /api/tasks/:id (Editar Tarefa Completa) ---
  app.put('/:id', async (request, reply) => {
    const paramsSchema = z.object({ id: z.string().uuid() });
    
    const updateSchema = z.object({
      title: z.string().min(1),
      description: z.string().optional(),
      due_date: z.string().optional(),
      priority: z.enum(['low', 'medium', 'high']),
      contact_id: z.string().uuid().optional(),
      // Status também pode vir aqui se quiser, mas temos rota específica abaixo
      status: z.enum(['pending', 'in_progress', 'completed']).optional() 
    });

    const { id } = paramsSchema.parse(request.params);
    const data = updateSchema.parse(request.body);
    const tenantId = request.user?.tenantId;

    try {
      // Montagem dinâmica simples ou update fixo. Faremos fixo para segurança dos campos.
      // Se o campo status vier, atualizamos, se não, mantém o atual (usando COALESCE ou lógica no SQL seria ideal, 
      // mas aqui vamos assumir que o front manda os dados atuais se não mudou, ou tratamos null).
      
      // Neste caso, vamos atualizar os dados principais. O status geralmente vai via PATCH, 
      // mas se vier aqui, atualizamos também.
      
      const result = await db.query(`
        UPDATE tasks 
        SET title = $1, description = $2, due_date = $3, priority = $4, contact_id = $5
        WHERE id = $6 AND tenant_id = $7
        RETURNING *
      `, [
        data.title, 
        data.description || '', 
        data.due_date || null, 
        data.priority, 
        data.contact_id || null, 
        id, 
        tenantId
      ]);

      if (result.rowCount === 0) return reply.status(404).send({ error: 'Task not found' });
      return result.rows[0];

    } catch (error) {
      console.error(error);
      return reply.status(500).send({ error: 'Failed to update task' });
    }
  });

  // --- PATCH /api/tasks/:id/status (Mudar Status - Drag & Drop / Checkbox) ---
  app.patch('/:id/status', async (request, reply) => {
    const paramsSchema = z.object({ id: z.string().uuid() });
    
    // Aceita os 3 estados para suportar o Kanban e a Lista
    const bodySchema = z.object({
        status: z.enum(['pending', 'in_progress', 'completed'])
    });

    const { id } = paramsSchema.parse(request.params);
    const { status } = bodySchema.parse(request.body);
    const tenantId = request.user?.tenantId;

    try {
      const result = await db.query(`
        UPDATE tasks 
        SET status = $1
        WHERE id = $2 AND tenant_id = $3
        RETURNING id, status
      `, [status, id, tenantId]);

      if (result.rowCount === 0) return reply.status(404).send({ error: 'Task not found' });
      return result.rows[0];

    } catch (error) {
        return reply.status(500).send({ error: 'Error updating task status' });
    }
  });

  // --- DELETE /api/tasks/:id (Excluir Tarefa) ---
  app.delete('/:id', async (request, reply) => {
    const paramsSchema = z.object({ id: z.string().uuid() });
    const { id } = paramsSchema.parse(request.params);
    const tenantId = request.user?.tenantId;

    try {
        const result = await db.query('DELETE FROM tasks WHERE id = $1 AND tenant_id = $2', [id, tenantId]);
        
        if (result.rowCount === 0) return reply.status(404).send({ error: 'Task not found' });
        return { message: 'Deleted successfully' };

    } catch (error) {
        return reply.status(500).send({ error: 'Error deleting task' });
    }
  });
}