import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { db } from '../db/client';
import { authenticate } from '../middleware/auth';

export async function proposalRoutes(app: FastifyInstance) {
  
  // ==========================================================
  // ROTA PÚBLICA (Sem Login) - Para o Cliente Final
  // ==========================================================
  app.get('/:id/public', async (request, reply) => {
    const paramsSchema = z.object({ id: z.string().uuid() });
    const { id } = paramsSchema.parse(request.params);

    try {
      // Busca proposta + dados da empresa (Tenant) para o Branding
      const result = await db.query(`
        SELECT 
            p.*,
            t.name as tenant_name,
            t.logo_url as tenant_logo,
            t.primary_color as tenant_color,
            t.company_legal_name,
            t.company_document,
            c.name as contact_name,
            c.email as contact_email
        FROM proposals p
        JOIN tenants t ON p.tenant_id = t.id
        LEFT JOIN contacts c ON p.contact_id = c.id
        WHERE p.id = $1
      `, [id]);

      if (result.rowCount === 0) return reply.status(404).send({ error: 'Proposal not found' });
      
      const proposal = result.rows[0];

      // Busca os itens da proposta
      const itemsRes = await db.query(`
        SELECT * FROM proposal_items WHERE proposal_id = $1
      `, [id]);

      return {
        ...proposal,
        items: itemsRes.rows
      };

    } catch (error) {
      console.error(error);
      return reply.status(500).send({ error: 'Failed to load proposal' });
    }
  });

  // ==========================================================
  // ROTAS PROTEGIDAS (Requer Login no Dashboard)
  // ==========================================================
  app.register(async (protectedRoutes) => {
    // Aplica o middleware de autenticação apenas neste bloco
    protectedRoutes.addHook('onRequest', authenticate);

    // --- GET /api/proposals (Listar Propostas do Tenant) ---
    protectedRoutes.get('/', async (request, reply) => {
      const tenantId = request.user?.tenantId;
      try {
        const result = await db.query(`
          SELECT 
              p.*,
              c.name as contact_name,
              d.title as deal_title
          FROM proposals p
          LEFT JOIN contacts c ON p.contact_id = c.id
          LEFT JOIN deals d ON p.deal_id = d.id
          WHERE p.tenant_id = $1
          ORDER BY p.created_at DESC
        `, [tenantId]);
        return result.rows;
      } catch (error) {
        console.error(error);
        return reply.status(500).send({ error: 'Failed to fetch proposals' });
      }
    });

    // --- POST /api/proposals (Criar Nova Proposta) ---
    protectedRoutes.post('/', async (request, reply) => {
      const createProposalSchema = z.object({
        title: z.string().min(1),
        deal_id: z.string().uuid().optional(),
        contact_id: z.string().uuid().optional(),
        valid_until: z.string().optional(),
        notes: z.string().optional(),
        items: z.array(z.object({
          product_id: z.string().uuid().optional(),
          description: z.string().min(1),
          quantity: z.number().min(0.1),
          unit_price: z.number().min(0)
        })).min(1, 'Adicione pelo menos um item')
      });

      const data = createProposalSchema.parse(request.body);
      const tenantId = request.user?.tenantId;

      const client = await db.getClient();

      try {
        await client.query('BEGIN'); // Inicia Transação

        // 1. Calcula o Total Geral
        const totalAmount = data.items.reduce((acc, item) => acc + (item.quantity * item.unit_price), 0);

        // 2. Insere a Proposta (Cabeçalho)
        const proposalRes = await client.query(`
          INSERT INTO proposals (tenant_id, deal_id, contact_id, title, valid_until, notes, total_amount)
          VALUES ($1, $2, $3, $4, $5, $6, $7)
          RETURNING id
        `, [
          tenantId, 
          data.deal_id || null, 
          data.contact_id || null, 
          data.title, 
          data.valid_until || null, 
          data.notes || '',
          totalAmount
        ]);

        const proposalId = proposalRes.rows[0].id;

        // 3. Insere os Itens
        for (const item of data.items) {
          const itemTotal = item.quantity * item.unit_price;
          await client.query(`
            INSERT INTO proposal_items (proposal_id, product_id, description, quantity, unit_price, total_price)
            VALUES ($1, $2, $3, $4, $5, $6)
          `, [
            proposalId,
            item.product_id || null,
            item.description,
            item.quantity,
            item.unit_price,
            itemTotal
          ]);
        }

        await client.query('COMMIT'); // Salva tudo
        return reply.status(201).send({ message: 'Proposal created', id: proposalId });

      } catch (error) {
        await client.query('ROLLBACK'); // Desfaz se der erro
        console.error(error);
        return reply.status(500).send({ error: 'Failed to create proposal' });
      } finally {
        client.release();
      }
    });

    // --- DELETE /api/proposals/:id (Excluir Proposta) ---
    protectedRoutes.delete('/:id', async (request, reply) => {
      const paramsSchema = z.object({ id: z.string().uuid() });
      const { id } = paramsSchema.parse(request.params);
      const tenantId = request.user?.tenantId;

      try {
        const result = await db.query(`
          DELETE FROM proposals WHERE id = $1 AND tenant_id = $2
        `, [id, tenantId]);
        
        if (result.rowCount === 0) return reply.status(404).send({ error: 'Proposal not found' });
        return { message: 'Deleted' };
      } catch (error) {
        return reply.status(500).send({ error: 'Error deleting' });
      }
    });
  });
}