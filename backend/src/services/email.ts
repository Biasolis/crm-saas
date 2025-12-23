import nodemailer from 'nodemailer';
import { db } from '../db/client';

// Configuração do Transporter (Lê do .env)
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: Number(process.env.SMTP_PORT) || 587,
  secure: process.env.SMTP_SECURE === 'true', // true para porta 465, false para outras
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
  tls: {
    rejectUnauthorized: false // Ajuda em alguns ambientes de dev
  }
});

export const emailService = {
  /**
   * Envia um e-mail transacional respeitando os limites do plano do Tenant.
   */
  async send(tenantId: string, to: string, subject: string, htmlBody: string) {
    const client = await db.getClient();
    
    try {
      // Inicia transação para garantir integridade do contador
      await client.query('BEGIN');

      // 1. Buscar dados do Tenant e do Plano para verificar limites
      const tenantRes = await client.query(`
        SELECT t.email_usage_count, t.email_reset_date, p.max_emails_month, t.name as tenant_name
        FROM tenants t
        LEFT JOIN plans p ON t.plan_id = p.id
        WHERE t.id = $1
      `, [tenantId]);

      const tenant = tenantRes.rows[0];
      
      // Se max_emails_month for NULL, consideramos ilimitado (ou um valor alto de segurança)
      const maxEmails = tenant.max_emails_month === null ? 999999 : tenant.max_emails_month;
      
      // Lógica de Renovação Mensal
      const now = new Date();
      const resetDate = new Date(tenant.email_reset_date || now);
      
      let currentUsage = tenant.email_usage_count || 0;

      // Se mudou o mês desde a última atualização, reseta o contador
      if (now.getMonth() !== resetDate.getMonth() || now.getFullYear() !== resetDate.getFullYear()) {
        currentUsage = 0;
        await client.query(`UPDATE tenants SET email_usage_count = 0, email_reset_date = NOW() WHERE id = $1`, [tenantId]);
      }

      // 2. Verificar se excedeu o limite
      if (currentUsage >= maxEmails) {
        // Gera notificação interna para o dono avisando do bloqueio
        await this.notifyOwner(client, tenantId, 'Limite de E-mails Atingido 🚫', `O envio para ${to} falhou. Sua cota mensal de ${maxEmails} e-mails foi atingida.`);
        throw new Error(`Limite mensal de e-mails atingido (${currentUsage}/${maxEmails}). Atualize seu plano.`);
      }

      // 3. Enviar E-mail REAL via Nodemailer
      const mailOptions = {
        from: process.env.SMTP_FROM || `"CRM Notification" <${process.env.SMTP_USER}>`,
        to,
        subject,
        html: htmlBody,
      };

      await transporter.sendMail(mailOptions);

      // 4. Incrementar Contador no Banco
      const newUsage = currentUsage + 1;
      await client.query(`UPDATE tenants SET email_usage_count = $1 WHERE id = $2`, [newUsage, tenantId]);

      // 5. Alertas de Consumo (Avisar quando chegar em 90% ou 100%)
      const percentage = (newUsage / maxEmails) * 100;
      
      if (newUsage === maxEmails) {
          await this.notifyOwner(client, tenantId, 'Limite de E-mails Atingido ⚠️', `Você usou 100% da sua cota (${newUsage}/${maxEmails}). Novos e-mails não serão enviados.`);
      } else if (percentage >= 90 && percentage < 91) { 
          // O range < 91 evita spam de notificação a cada email enviado após os 90%
          await this.notifyOwner(client, tenantId, 'Cota de E-mail Baixa 📧', `Você já usou ${newUsage} de ${maxEmails} e-mails (90%). Considere um upgrade.`);
      }

      await client.query('COMMIT');
      console.log(`[EMAIL] Enviado para ${to} | Uso: ${newUsage}/${maxEmails}`);
      return { success: true, usage: newUsage };

    } catch (error) {
      await client.query('ROLLBACK');
      console.error('[EMAIL ERROR]', error);
      // Retorna sucesso falso mas não quebra a aplicação principal
      return { success: false, error }; 
    } finally {
      client.release();
    }
  },

  // Helper interno para criar notificação no sistema (sininho)
  async notifyOwner(client: any, tenantId: string, title: string, message: string) {
    // Busca o usuário Owner do tenant
    const ownerRes = await client.query(`SELECT id FROM users WHERE tenant_id = $1 AND role = 'owner' LIMIT 1`, [tenantId]);
    
    if (ownerRes.rowCount && ownerRes.rowCount > 0) {
        const ownerId = ownerRes.rows[0].id;
        await client.query(`
            INSERT INTO notifications (tenant_id, user_id, title, message, link)
            VALUES ($1, $2, $3, $4, '/dashboard/settings')
        `, [tenantId, ownerId, title, message]);
    }
  }
};