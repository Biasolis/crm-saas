import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { db } from '../db/client';
import { authenticate } from '../middleware/auth';

export async function notificationRoutes(app: FastifyInstance) {
  app.addHook('onRequest', authenticate);

  // GET /api/notifications -> Lista as últimas notificações (não lidas primeiro)
  app.get('/', async (request, reply) => {
    const { tenantId, userId } = request.user!;
    try {
      const result = await db.query(`
        SELECT * FROM notifications 
        WHERE tenant_id = $1 AND user_id = $2
        ORDER BY read ASC, created_at DESC
        LIMIT 20
      `, [tenantId, userId]);
      return result.rows;
    } catch (error) {
      return reply.status(500).send({ error: 'Failed to fetch notifications' });
    }
  });

  // POST /api/notifications/:id/read -> Marca como lida
  app.post('/:id/read', async (request, reply) => {
    const { id } = z.object({ id: z.string().uuid() }).parse(request.params);
    const { tenantId, userId } = request.user!;

    try {
      await db.query(`
        UPDATE notifications 
        SET read = TRUE 
        WHERE id = $1 AND tenant_id = $2 AND user_id = $3
      `, [id, tenantId, userId]);
      return { message: 'Marked as read' };
    } catch (error) {
      return reply.status(500).send({ error: 'Failed to update notification' });
    }
  });

  // POST /api/notifications/read-all -> Marca todas como lidas
  app.post('/read-all', async (request, reply) => {
    const { tenantId, userId } = request.user!;
    try {
      await db.query(`
        UPDATE notifications 
        SET read = TRUE 
        WHERE tenant_id = $1 AND user_id = $2 AND read = FALSE
      `, [tenantId, userId]);
      return { message: 'All marked as read' };
    } catch (error) {
      return reply.status(500).send({ error: 'Failed to update notifications' });
    }
  });
}