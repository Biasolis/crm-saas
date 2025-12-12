-- Adiciona um token único para webhooks na tabela de tenants
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS webhook_token UUID DEFAULT uuid_generate_v4();

-- Garante que todos os tenants existentes tenham um token gerado
UPDATE tenants SET webhook_token = uuid_generate_v4() WHERE webhook_token IS NULL;