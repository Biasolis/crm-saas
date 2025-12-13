import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { db } from '../db/client';
import { authenticate } from '../middleware/auth';

export async function pipelineRoutes(app: FastifyInstance) {
  app.addHook('onRequest', authenticate);

  // --- GET /api/pipelines (Listar - Permitido para todos) ---
  app.get('/', async (request, reply) => {
    const tenantId = request.user?.tenantId;

    try {
      const pipelinesResult = await db.query(
        'SELECT * FROM pipelines WHERE tenant_id = $1 ORDER BY created_at ASC',
        [tenantId]
      );

      if (pipelinesResult.rowCount === 0) {
        return []; 
      }

      const pipelines = pipelinesResult.rows;
      for (const pipe of pipelines) {
        const stagesRes = await db.query(
          'SELECT * FROM stages WHERE pipeline_id = $1 ORDER BY "order" ASC',
          [pipe.id]
        );
        pipe.stages = stagesRes.rows;
      }
      return pipelines;

    } catch (error) {
      console.error(error);
      return reply.status(500).send({ error: 'Failed to fetch pipelines' });
    }
  });

  // --- PUT /api/pipelines/stages (Atualizar Ordem/Nome - Bloqueado para Agent) ---
  app.put('/stages', async (request, reply) => {
    if (request.user?.role === 'agent') {
        return reply.status(403).send({ error: 'Vendedores não podem alterar a estrutura do funil.' });
    }

    const updateStagesSchema = z.object({
      stages: z.array(z.object({
        id: z.string().uuid(),
        name: z.string().min(1),
        order: z.number()
      }))
    });

    const { stages } = updateStagesSchema.parse(request.body);
    const tenantId = request.user?.tenantId;

    const client = await db.getClient();
    try {
      await client.query('BEGIN');

      for (const stage of stages) {
        await client.query(`
          UPDATE stages s
          SET name = $1, "order" = $2
          FROM pipelines p
          WHERE s.pipeline_id = p.id 
          AND s.id = $3 
          AND p.tenant_id = $4
        `, [stage.name, stage.order, stage.id, tenantId]);
      }

      await client.query('COMMIT');
      return { message: 'Stages updated' };

    } catch (error) {
      await client.query('ROLLBACK');
      console.error(error);
      return reply.status(500).send({ error: 'Failed to update stages' });
    } finally {
      client.release();
    }
  });
  
  // --- POST /api/pipelines/:id/stages (Adicionar Etapa - Bloqueado para Agent) ---
  app.post('/:id/stages', async (request, reply) => {
    if (request.user?.role === 'agent') {
        return reply.status(403).send({ error: 'Permissão negada.' });
    }

    const paramsSchema = z.object({ id: z.string().uuid() });
    const bodySchema = z.object({ name: z.string().min(1) });
    
    const { id } = paramsSchema.parse(request.params);
    const { name } = bodySchema.parse(request.body);
    const tenantId = request.user?.tenantId;

    try {
       const pipeCheck = await db.query('SELECT id FROM pipelines WHERE id = $1 AND tenant_id = $2', [id, tenantId]);
       if(pipeCheck.rowCount === 0) return reply.status(404).send({error: 'Pipeline not found'});

       const maxOrderRes = await db.query('SELECT MAX("order") as max FROM stages WHERE pipeline_id = $1', [id]);
       const nextOrder = (maxOrderRes.rows[0].max || 0) + 1;

       const res = await db.query(`
         INSERT INTO stages (pipeline_id, name, "order")
         VALUES ($1, $2, $3)
         RETURNING *
       `, [id, name, nextOrder]);

       return res.rows[0];
    } catch(err) {
      return reply.status(500).send(err);
    }
  });

  // --- DELETE /api/pipelines/stages/:id (Excluir Etapa - Bloqueado para Agent) ---
  app.delete('/stages/:id', async (request, reply) => {
    if (request.user?.role === 'agent') {
        return reply.status(403).send({ error: 'Permissão negada.' });
    }

    const paramsSchema = z.object({ id: z.string().uuid() });
    const { id } = paramsSchema.parse(request.params);
    const tenantId = request.user?.tenantId;

    try {
      const check = await db.query(`
        SELECT s.id 
        FROM stages s
        JOIN pipelines p ON s.pipeline_id = p.id
        WHERE s.id = $1 AND p.tenant_id = $2
      `, [id, tenantId]);

      if (check.rowCount === 0) {
        return reply.status(404).send({ error: 'Stage not found or permission denied' });
      }

      await db.query('DELETE FROM stages WHERE id = $1', [id]);

      return { message: 'Stage deleted' };

    } catch (error: any) {
      if (error.code === '23503') {
        return reply.status(400).send({ 
          error: 'Cannot delete stage containing deals. Move or delete them first.' 
        });
      }
      console.error(error);
      return reply.status(500).send({ error: 'Failed to delete stage' });
    }
  });
}