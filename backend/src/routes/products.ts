import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { db } from '../db/client';
import { authenticate } from '../middleware/auth';

export async function productRoutes(app: FastifyInstance) {
  app.addHook('onRequest', authenticate);

  // GET /api/products
  app.get('/', async (request, reply) => {
    const { tenantId } = request.user!;
    const { search } = request.query as { search?: string };

    try {
      let query = `
        SELECT * FROM products 
        WHERE tenant_id = $1 
      `;
      const params: any[] = [tenantId];

      if (search) {
        query += ` AND (name ILIKE $2 OR description ILIKE $2)`;
        params.push(`%${search}%`);
      }

      query += ` ORDER BY name ASC`;

      const result = await db.query(query, params);
      return result.rows;
    } catch (error) {
      return reply.status(500).send({ error: 'Failed to fetch products' });
    }
  });

  // POST /api/products
  app.post('/', async (request, reply) => {
    const schema = z.object({
      name: z.string().min(2),
      description: z.string().optional(),
      price: z.number().min(0),
      active: z.boolean().default(true)
    });

    const data = schema.parse(request.body);
    const { tenantId } = request.user!;

    try {
      const result = await db.query(`
        INSERT INTO products (tenant_id, name, description, price, active)
        VALUES ($1, $2, $3, $4, $5)
        RETURNING *
      `, [tenantId, data.name, data.description || '', data.price, data.active]);

      return reply.status(201).send(result.rows[0]);
    } catch (error) {
      return reply.status(500).send({ error: 'Failed to create product' });
    }
  });

  // PUT /api/products/:id
  app.put('/:id', async (request, reply) => {
    const paramsSchema = z.object({ id: z.string().uuid() });
    const bodySchema = z.object({
      name: z.string().optional(),
      description: z.string().optional(),
      price: z.number().optional(),
      active: z.boolean().optional()
    });

    const { id } = paramsSchema.parse(request.params);
    const data = bodySchema.parse(request.body);
    const { tenantId } = request.user!;

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
      const query = `
        UPDATE products 
        SET ${fields.join(', ')} 
        WHERE id = $${idx} AND tenant_id = $${idx+1}
        RETURNING *
      `;

      const result = await db.query(query, values);
      
      if (result.rowCount === 0) return reply.status(404).send({ error: 'Product not found' });
      return result.rows[0];

    } catch (error) {
      return reply.status(500).send({ error: 'Failed to update product' });
    }
  });

  // DELETE /api/products/:id
  app.delete('/:id', async (request, reply) => {
    const { id } = z.object({ id: z.string().uuid() }).parse(request.params);
    const { tenantId } = request.user!;

    try {
      // Soft delete ou Hard delete? 
      // Se já estiver em propostas, não deveríamos apagar.
      // Por simplicidade, vamos tentar apagar. O banco deve ter FKs com ON DELETE SET NULL ou restrict.
      // Se der erro de FK, retornamos erro amigável.
      
      const check = await db.query('SELECT id FROM proposal_items WHERE product_id = $1 LIMIT 1', [id]);
      if (check.rowCount && check.rowCount > 0) {
          // Se já usado, apenas desativa
          await db.query('UPDATE products SET active = FALSE WHERE id = $1 AND tenant_id = $2', [id, tenantId]);
          return { message: 'Produto arquivado (já utilizado em propostas).' };
      }

      const result = await db.query('DELETE FROM products WHERE id = $1 AND tenant_id = $2', [id, tenantId]);
      
      if (result.rowCount === 0) return reply.status(404).send({ error: 'Product not found' });
      return { message: 'Deleted successfully' };

    } catch (error) {
      return reply.status(500).send({ error: 'Failed to delete product' });
    }
  });
}