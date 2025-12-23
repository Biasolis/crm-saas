import { db } from '../db/client';

export const emailService = {
  /**
   * Envia um e-mail transacional respeitando os limites do plano do Tenant.
   */
  async send(tenantId: string, to: string, subject: string, body: string) {
    const client = await db.getClient();
    
    try {
      await client.query('BEGIN');

      // 1. Buscar dados do Tenant e do Plano
      const tenantRes = await client.query(`
        SELECT t.email_usage_count, t.email_reset_date, p.max_emails_month, t.id, t.name
        FROM tenants t
        LEFT JOIN plans p ON t.plan_id = p.id
        WHERE t.id = $1
      `, [tenantId]);

      const tenant = tenantRes.rows[0];
      const maxEmails = tenant.max_emails_month || 0; // 0 = sem envio ou ilimitado? Vamos assumir que NULL é ilimitado, 0 é bloqueado.
      
      // Lógica de Renovação Mensal (Dia 1 ou data de cadastro)
      // Aqui simplificamos: Se o mês atual da data de reset for diferente do mês atual, reseta.
      const now = new Date();
      const resetDate = new Date(tenant.email_reset_date);
      
      let currentUsage = tenant.email_usage_count;

      if (now.getMonth() !== resetDate.getMonth() || now.getFullYear() !== resetDate.getFullYear()) {
        currentUsage = 0;
        await client.query(`UPDATE tenants SET email_usage_count = 0, email_reset_date = NOW() WHERE id = $1`, [tenantId]);
      }

      // 2. Verificar Limite
      if (maxEmails !== null && currentUsage >= maxEmails) {
        // Envia notificação de bloqueio se tentar enviar estourado
        await this.notifyOwner(client, tenantId, 'Limite de E-mails Atingido 🚫', `Sua cota mensal de ${maxEmails} e-mails foi atingida. O envio falhou.`);
        throw new Error(`Limite mensal de e-mails atingido (${currentUsage}/${maxEmails}). Faça upgrade do plano.`);
      }

      // 3. Enviar E-mail (Simulação / Integração Futura com AWS SES/SendGrid)
      console.log(`[EMAIL SENT] To: ${to} | Subject: ${subject}`);
      // Aqui entraria a chamada real: await ses.sendEmail(...)

      // 4. Incrementar Contador
      const newUsage = currentUsage + 1;
      await client.query(`UPDATE tenants SET email_usage_count = $1 WHERE id = $2`, [newUsage, tenantId]);

      // 5. Verificar Alertas (90% e 100%)
      if (maxEmails !== null) {
        const percentage = (newUsage / maxEmails) * 100;
        
        if (newUsage === maxEmails) {
            await this.notifyOwner(client, tenantId, 'Limite de E-mails Atingido ⚠️', `Você usou 100% da sua cota de e-mails (${newUsage}/${maxEmails}). Novos envios serão bloqueados.`);
        } else if (percentage >= 90 && percentage < 91) { // Garante que avisa uma vez perto dos 90
            await this.notifyOwner(client, tenantId, 'Cota de E-mail Baixa 📧', `Você já usou ${newUsage} de ${maxEmails} e-mails (90%). Considere um upgrade.`);
        }
      }

      await client.query('COMMIT');
      return { success: true, usage: newUsage, max: maxEmails };

    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  },

  // Helper interno para notificar o dono
  async notifyOwner(client: any, tenantId: string, title: string, message: string) {
    // Busca o Owner
    const ownerRes = await client.query(`SELECT id FROM users WHERE tenant_id = $1 AND role = 'owner' LIMIT 1`, [tenantId]);
    if (ownerRes.rowCount > 0) {
        const ownerId = ownerRes.rows[0].id;
        await client.query(`
            INSERT INTO notifications (tenant_id, user_id, title, message, link)
            VALUES ($1, $2, $3, $4, '/dashboard/settings')
        `, [tenantId, ownerId, title, message]);
    }
  }
};