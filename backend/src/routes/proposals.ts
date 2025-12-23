import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { db } from '../db/client';
import { authenticate } from '../middleware/auth';
import { emailService } from '../services/email'; // <--- Importação do serviço

export async function proposalRoutes(app: FastifyInstance) {
  
  // ===========================================================================
  // ROTA PÚBLICA (VISÃO DO CLIENTE)
  // ===========================================================================
  app.get('/:id/public', async (request, reply) => {
    const paramsSchema = z.object({ id: z.string().uuid() });
    const { id } = paramsSchema.parse(request.params);

    try {
      const result = await db.query(`
        SELECT 
            p.*,
            t.name as tenant_name,
            t.logo_url as tenant_logo,
            t.primary_color as tenant_color,
            t.company_legal_name,
            t.company_document,
            c.name as contact_name,
            c.email as contact_email,
            u.name as user_name,
            u.email as user_email
        FROM proposals p
        JOIN tenants t ON p.tenant_id = t.id
        LEFT JOIN contacts c ON p.contact_id = c.id
        LEFT JOIN users u ON p.user_id = u.id
        WHERE p.id = $1
      `, [id]);

      if (result.rowCount === 0) return reply.status(404).send({ error: 'Proposta não encontrada.' });
      
      const proposal = result.rows[0];

      const itemsRes = await db.query(`
        SELECT * FROM proposal_items WHERE proposal_id = $1 ORDER BY id ASC
      `, [id]);

      return {
        ...proposal,
        items: itemsRes.rows
      };

    } catch (error) {
      console.error(error);
      return reply.status(500).send({ error: 'Erro ao carregar proposta.' });
    }
  });

  // Aceitar Proposta (Público)
  app.post('/:id/public/accept', async (request, reply) => {
    const { id } = z.object({ id: z.string().uuid() }).parse(request.params);

    try {
        const check = await db.query("SELECT status FROM proposals WHERE id = $1", [id]);
        if (check.rowCount === 0) return reply.status(404).send({ error: 'Not found' });
        if (['accepted', 'rejected'].includes(check.rows[0].status)) {
            return reply.status(400).send({ error: 'Proposta já foi respondida.' });
        }

        await db.query(`
            UPDATE proposals 
            SET status = 'accepted', updated_at = NOW() 
            WHERE id = $1
        `, [id]);
        
        return { message: 'Proposta aceita com sucesso!' };
    } catch (error) {
        return reply.status(500).send({ error: 'Erro ao aceitar proposta.' });
    }
  });

  // Rejeitar Proposta (Público)
  app.post('/:id/public/reject', async (request, reply) => {
    const { id } = z.object({ id: z.string().uuid() }).parse(request.params);

    try {
        const check = await db.query("SELECT status FROM proposals WHERE id = $1", [id]);
        if (check.rowCount === 0) return reply.status(404).send({ error: 'Not found' });
        if (['accepted', 'rejected'].includes(check.rows[0].status)) {
            return reply.status(400).send({ error: 'Proposta já foi respondida.' });
        }

        await db.query(`
            UPDATE proposals 
            SET status = 'rejected', updated_at = NOW() 
            WHERE id = $1
        `, [id]);
        
        return { message: 'Proposta rejeitada.' };
    } catch (error) {
        return reply.status(500).send({ error: 'Erro ao rejeitar proposta.' });
    }
  });

  // ===========================================================================
  // ROTAS PROTEGIDAS (ADMIN/VENDEDOR)
  // ===========================================================================
  app.register(async (protectedRoutes) => {
    protectedRoutes.addHook('onRequest', authenticate);

    // GET /api/proposals (Listar)
    protectedRoutes.get('/', async (request, reply) => {
      const { tenantId, role, userId } = request.user!;
      const isAgent = role === 'agent';

      try {
        let query = `
          SELECT 
              p.*,
              c.name as contact_name,
              d.title as deal_title
          FROM proposals p
          LEFT JOIN contacts c ON p.contact_id = c.id
          LEFT JOIN deals d ON p.deal_id = d.id
          WHERE p.tenant_id = $1
        `;
        const params: any[] = [tenantId];

        if (isAgent) {
            query += ' AND p.user_id = $2';
            params.push(userId);
        }

        query += ' ORDER BY p.created_at DESC';

        const result = await db.query(query, params);
        return result.rows;
      } catch (error) {
        return reply.status(500).send({ error: 'Falha ao buscar propostas' });
      }
    });

    // POST /api/proposals (Criar)
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
        })).min(1, 'Adicione pelo menos um item à proposta.')
      });

      const data = createProposalSchema.parse(request.body);
      const tenantId = request.user?.tenantId;
      const userId = request.user?.userId;

      const client = await db.getClient();

      try {
        await client.query('BEGIN'); 

        const totalAmount = data.items.reduce((acc, item) => acc + (item.quantity * item.unit_price), 0);

        const proposalRes = await client.query(`
          INSERT INTO proposals (
            tenant_id, user_id, deal_id, contact_id, 
            title, valid_until, notes, total_amount, status
          )
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'draft')
          RETURNING id
        `, [
          tenantId, userId,
          data.deal_id || null, 
          data.contact_id || null, 
          data.title, 
          data.valid_until || null, 
          data.notes || '',
          totalAmount
        ]);

        const proposalId = proposalRes.rows[0].id;

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
        
        await client.query('COMMIT'); 
        return reply.status(201).send({ message: 'Proposta criada', id: proposalId });

      } catch (error) {
        await client.query('ROLLBACK'); 
        console.error(error);
        return reply.status(500).send({ error: 'Falha ao criar proposta' });
      } finally {
        client.release();
      }
    });

    // PATCH /api/proposals/:id/status (Alterar Status + Disparo de E-mail)
    protectedRoutes.patch('/:id/status', async (request, reply) => {
        const paramsSchema = z.object({ id: z.string().uuid() });
        const bodySchema = z.object({ status: z.enum(['draft', 'sent', 'accepted', 'rejected']) });
        
        const { id } = paramsSchema.parse(request.params);
        const { status } = bodySchema.parse(request.body);
        const { tenantId } = request.user!;

        try {
            const result = await db.query(`
                UPDATE proposals SET status = $1, updated_at = NOW()
                WHERE id = $2 AND tenant_id = $3
                RETURNING *
            `, [status, id, tenantId]);
            
            if (result.rowCount === 0) return reply.status(404).send({ error: 'Proposta não encontrada.' });
            
            const proposal = result.rows[0];

            // --- LÓGICA DE ENVIO DE E-MAIL ---
            if (status === 'sent' && proposal.contact_id) {
                // Busca dados do contato para enviar
                const contactRes = await db.query(`SELECT email, name FROM contacts WHERE id = $1`, [proposal.contact_id]);
                const contact = contactRes.rows[0];

                if (contact && contact.email) {
                    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3001';
                    const publicLink = `${frontendUrl}/proposal/${proposal.id}`;
                    
                    const emailBody = `
                        <div style="font-family: Arial, sans-serif; padding: 20px; border: 1px solid #eee; border-radius: 5px;">
                            <h2 style="color: #333;">Olá, ${contact.name}!</h2>
                            <p>Você recebeu uma nova proposta comercial: <strong>${proposal.title}</strong>.</p>
                            <p style="font-size: 1.1em;">Valor Total: <strong>R$ ${Number(proposal.total_amount).toFixed(2)}</strong></p>
                            <br/>
                            <p>Acesse o link abaixo para visualizar os detalhes, aprovar ou rejeitar:</p>
                            <a href="${publicLink}" style="background-color: #2563eb; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; font-weight: bold;">Ver Proposta Online</a>
                            <br/><br/>
                            <hr style="border: 0; border-top: 1px solid #eee;">
                            <small style="color: #777;">Este é um e-mail automático enviado via CRM SaaS.</small>
                        </div>
                    `;

                    // Envia assincronamente (não trava a resposta)
                    emailService.send(tenantId, contact.email, `Nova Proposta: ${proposal.title}`, emailBody)
                        .catch(err => console.error('Erro ao enviar email de proposta:', err));
                }
            }
            // ---------------------------------
            
            return proposal;
        } catch (error) {
            return reply.status(500).send({ error: 'Erro ao atualizar status.' });
        }
    });

    // DELETE /api/proposals/:id
    protectedRoutes.delete('/:id', async (request, reply) => {
      if (request.user?.role === 'agent') {
          return reply.status(403).send({ error: 'Permissão negada.' });
      }
      const { id } = z.object({ id: z.string().uuid() }).parse(request.params);
      const { tenantId } = request.user!;

      try {
        const result = await db.query(`DELETE FROM proposals WHERE id = $1 AND tenant_id = $2`, [id, tenantId]);
        if (result.rowCount === 0) return reply.status(404).send({ error: 'Proposta não encontrada.' });
        return { message: 'Deletada com sucesso.' };
      } catch (error) {
        return reply.status(500).send({ error: 'Erro ao deletar.' });
      }
    });
  });
}