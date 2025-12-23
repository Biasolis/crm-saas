import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { db } from '../db/client';
import { authenticate } from '../middleware/auth';

export async function notificationRoutes(app: FastifyInstance) {
  app.addHook('onRequest', authenticate);

  // GET /api/notifications (Listar não lidas ou todas)
  app.get('/', async (request, reply) => {
    const { userId, tenantId } = request.user!;
    const { unreadOnly } = request.query as { unreadOnly?: string };

    try {
      let query = `
        SELECT * FROM notifications 
        WHERE user_id = $1 AND tenant_id = $2 
      `;
      const params: any[] = [userId, tenantId];

      if (unreadOnly === 'true') {
        query += ` AND is_read = false`;
      }

      query += ` ORDER BY created_at DESC LIMIT 50`;

      const result = await db.query(query, params);
      return result.rows;
    } catch (error) {
      return reply.status(500).send({ error: 'Failed to fetch notifications' });
    }
  });

  // PATCH /api/notifications/:id/read (Marcar como lida)
  app.patch('/:id/read', async (request, reply) => {
    const { id } = z.object({ id: z.string().uuid() }).parse(request.params);
    const { userId } = request.user!;

    try {
      await db.query(`
        UPDATE notifications SET is_read = true 
        WHERE id = $1 AND user_id = $2
      `, [id, userId]);
      return { success: true };
    } catch (error) {
      return reply.status(500).send({ error: 'Failed to update notification' });
    }
  });

  // PATCH /api/notifications/read-all (Marcar todas como lidas)
  app.patch('/read-all', async (request, reply) => {
    const { userId, tenantId } = request.user!;
    try {
      await db.query(`
        UPDATE notifications SET is_read = true 
        WHERE user_id = $1 AND tenant_id = $2 AND is_read = false
      `, [userId, tenantId]);
      return { success: true };
    } catch (error) {
      return reply.status(500).send({ error: 'Failed to update notifications' });
    }
  });
}