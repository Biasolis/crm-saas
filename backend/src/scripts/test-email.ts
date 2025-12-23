import nodemailer from 'nodemailer';
import dotenv from 'dotenv';
import path from 'path';

// Carrega as variáveis de ambiente do .env na raiz do backend
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

async function testEmail() {
  console.log('--- Teste de Envio de E-mail (SMTP) ---');
  
  const host = process.env.SMTP_HOST;
  const port = Number(process.env.SMTP_PORT);
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;
  const secure = process.env.SMTP_SECURE === 'true';
  
  // E-mail de destino solicitado
  const toEmail = 'biasolileonardo@gmail.com'; 

  if (!host || !user || !pass) {
    console.error('❌ Erro: Variáveis SMTP não encontradas no arquivo .env');
    console.error('Verifique se as chaves SMTP_HOST, SMTP_USER e SMTP_PASS estão definidas.');
    process.exit(1);
  }

  console.log(`📡 Configuração: Host=${host}:${port} | User=${user} | Secure=${secure}`);
  console.log(`📨 Enviando para: ${toEmail}...`);

  const transporter = nodemailer.createTransport({
    host,
    port,
    secure, 
    auth: { user, pass },
    tls: { rejectUnauthorized: false } // Ajuda em alguns servidores SMTP de desenvolvimento
  });

  try {
    // Verifica conexão primeiro
    await transporter.verify();
    console.log('✅ Conexão SMTP: OK');

    // Envia o e-mail
    const info = await transporter.sendMail({
      from: process.env.SMTP_FROM || `"Teste CRM" <${user}>`,
      to: toEmail,
      subject: 'Teste de Integração CRM SaaS 🚀',
      text: 'Se você recebeu este e-mail, a configuração SMTP do seu CRM está funcionando perfeitamente!',
      html: `
        <div style="font-family: Arial, sans-serif; padding: 20px; border: 1px solid #e0e0e0; border-radius: 8px;">
          <h2 style="color: #2563eb;">Teste de Integração Bem-sucedido!</h2>
          <p>Olá! Este é um teste de envio do seu sistema <strong>CRM SaaS</strong>.</p>
          <p>Seus dados de envio:</p>
          <ul>
            <li><strong>Host:</strong> ${host}</li>
            <li><strong>Porta:</strong> ${port}</li>
            <li><strong>Usuário:</strong> ${user}</li>
          </ul>
          <hr style="border: 0; border-top: 1px solid #eee; margin: 20px 0;" />
          <small style="color: #666;">Enviado automaticamente pelo script de teste em ${new Date().toLocaleString()}.</small>
        </div>
      `
    });

    console.log(`✅ E-mail enviado com sucesso!`);
    console.log(`🆔 Message ID: ${info.messageId}`);

  } catch (error) {
    console.error('❌ Falha ao enviar e-mail:');
    console.error(error);
  }
}

testEmail();