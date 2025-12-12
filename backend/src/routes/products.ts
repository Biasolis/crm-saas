import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { db } from '../db/client';
import { authenticate } from '../middleware/auth';

export async function productRoutes(app: FastifyInstance) {
  app.addHook('onRequest', authenticate);

  // --- GET /api/products (Listar) ---
  app.get('/', async (request, reply) => {
    const tenantId = request.user?.tenantId;
    const searchSchema = z.object({
      search: z.string().optional(),
    });
    const { search } = searchSchema.parse(request.query);

    try {
      let queryText = `
        SELECT * FROM products 
        WHERE tenant_id = $1 AND active = true
      `;
      const values: any[] = [tenantId];

      if (search) {
        queryText += ` AND (name ILIKE $2 OR sku ILIKE $2)`;
        values.push(`%${search}%`);
      }

      queryText += ` ORDER BY name ASC`;

      const result = await db.query(queryText, values);
      return result.rows;
    } catch (error) {
      console.error(error);
      return reply.status(500).send({ error: 'Failed to fetch products' });
    }
  });

  // --- POST /api/products (Criar) ---
  app.post('/', async (request, reply) => {
    const createProductSchema = z.object({
      name: z.string().min(2),
      description: z.string().optional(),
      price: z.number().min(0),
      sku: z.string().optional(),
    });

    const data = createProductSchema.parse(request.body);
    const tenantId = request.user?.tenantId;

    try {
      const result = await db.query(`
        INSERT INTO products (tenant_id, name, description, price, sku)
        VALUES ($1, $2, $3, $4, $5)
        RETURNING *
      `, [tenantId, data.name, data.description, data.price, data.sku]);

      return reply.status(201).send(result.rows[0]);
    } catch (error) {
      console.error(error);
      return reply.status(500).send({ error: 'Failed to create product' });
    }
  });

  // --- PUT /api/products/:id (Editar) ---
  app.put('/:id', async (request, reply) => {
    const paramsSchema = z.object({ id: z.string().uuid() });
    const updateSchema = z.object({
      name: z.string().min(2),
      description: z.string().optional(),
      price: z.number().min(0),
      sku: z.string().optional(),
    });

    const { id } = paramsSchema.parse(request.params);
    const data = updateSchema.parse(request.body);
    const tenantId = request.user?.tenantId;

    try {
      const result = await db.query(`
        UPDATE products 
        SET name = $1, description = $2, price = $3, sku = $4
        WHERE id = $5 AND tenant_id = $6
        RETURNING *
      `, [data.name, data.description, data.price, data.sku, id, tenantId]);

      if (result.rowCount === 0) return reply.status(404).send({ error: 'Product not found' });
      return result.rows[0];
    } catch (error) {
      console.error(error);
      return reply.status(500).send({ error: 'Failed to update product' });
    }
  });

  // --- DELETE /api/products/:id (Arquivar/Excluir) ---
  // Em vez de deletar fisicamente, vamos marcar como inativo para não quebrar propostas antigas
  app.delete('/:id', async (request, reply) => {
    const paramsSchema = z.object({ id: z.string().uuid() });
    const { id } = paramsSchema.parse(request.params);
    const tenantId = request.user?.tenantId;

    try {
      const result = await db.query(`
        UPDATE products SET active = false
        WHERE id = $1 AND tenant_id = $2
        RETURNING id
      `, [id, tenantId]);

      if (result.rowCount === 0) return reply.status(404).send({ error: 'Product not found' });
      return { message: 'Product archived successfully' };
    } catch (error) {
      console.error(error);
      return reply.status(500).send({ error: 'Failed to delete product' });
    }
  });
}