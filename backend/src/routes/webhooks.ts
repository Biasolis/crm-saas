import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { db } from '../db/client';

// Não usamos 'authenticate' aqui porque o Chatwoot não tem nosso JWT
export async function webhookRoutes(app: FastifyInstance) {

  // --- POST /api/webhooks/chatwoot/:token ---
  app.post('/chatwoot/:token', async (request, reply) => {
    const paramsSchema = z.object({ token: z.string().uuid() });
    
    // O payload do Chatwoot varia, vamos pegar o básico
    // Documentação: https://www.chatwoot.com/docs/product/others/webhook-events
    const bodySchema = z.object({
      event: z.string(),
      id: z.number().optional(),
      content: z.string().optional(),
      sender: z.any().optional(),
      contact: z.any().optional(),
      conversation: z.any().optional(),
      account: z.any().optional(),
    }).passthrough(); // Permite outros campos ignorados

    try {
      const { token } = paramsSchema.parse(request.params);
      const payload = bodySchema.parse(request.body);

      // 1. Identificar o Tenant pelo Token
      const tenantRes = await db.query('SELECT id FROM tenants WHERE webhook_token = $1', [token]);
      
      if (tenantRes.rowCount === 0) {
        return reply.status(403).send({ error: 'Invalid Webhook Token' });
      }
      const tenantId = tenantRes.rows[0].id;

      // 2. Processar Eventos
      // Evento: Contato Criado ou Atualizado
      if (payload.event === 'contact_created' || payload.event === 'contact_updated') {
        const contactData = payload; // O payload raiz tem os dados no create/update de contato direto? 
        // Nota: O Chatwoot manda o objeto contact dentro do payload em eventos de mensagem, 
        // mas em eventos de contato, os dados estão na raiz ou dentro de 'payload'.
        // Vamos assumir a estrutura padrão onde os dados vêm no corpo.
        
        const name = contactData.name || contactData.sender?.name || 'Sem Nome';
        const email = contactData.email || contactData.sender?.email;
        const phone = contactData.phone_number || contactData.sender?.phone_number;
        
        // Verifica se já existe no CRM (por email ou telefone)
        let existing = null;
        if (email) {
            const check = await db.query('SELECT id FROM contacts WHERE email = $1 AND tenant_id = $2', [email, tenantId]);
            if (check.rowCount! > 0) existing = check.rows[0];
        }
        
        if (!existing && phone) {
            const check = await db.query('SELECT id FROM contacts WHERE mobile = $1 AND tenant_id = $2', [phone, tenantId]);
            if (check.rowCount! > 0) existing = check.rows[0];
        }

        if (!existing) {
            // Cria Novo Contato Automaticamente
            await db.query(`
                INSERT INTO contacts (tenant_id, name, email, mobile, custom_attributes)
                VALUES ($1, $2, $3, $4, $5)
            `, [tenantId, name, email, phone, JSON.stringify({ source: 'Chatwoot Webhook' })]);
            console.log(`[Webhook] Contato criado: ${name}`);
        } else {
            console.log(`[Webhook] Contato já existe: ${name}`);
        }
      }

      // Evento: Nova Mensagem (Cria Lead se não existir)
      if (payload.event === 'message_created' && payload.message_type === 'incoming') {
         // Lógica similar: se receber msg de alguém desconhecido, cria Lead ou Contato
         // Aqui você pode criar um "Deal" no funil se desejar
      }

      return reply.status(200).send({ received: true });

    } catch (error) {
      console.error('[Webhook Error]', error);
      // Retornamos 200 pro Chatwoot não ficar tentando reenviar infinitamente em caso de erro de lógica nossa
      return reply.status(200).send({ error: 'Processing failed' });
    }
  });
}