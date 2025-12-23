-- Atualiza tabela de Planos com novos limites
ALTER TABLE plans 
ADD COLUMN IF NOT EXISTS max_contacts INTEGER DEFAULT 1000,
ADD COLUMN IF NOT EXISTS max_emails_month INTEGER DEFAULT 100;

-- Atualiza tabela de Tenants para controle de uso de e-mail
ALTER TABLE tenants
ADD COLUMN IF NOT EXISTS email_usage_count INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS email_reset_date TIMESTAMP DEFAULT NOW();