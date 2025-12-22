-- Adicionar coluna user_id para rastrear o dono do registro
ALTER TABLE leads ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES users(id);
ALTER TABLE contacts ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES users(id);
ALTER TABLE companies ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES users(id);
ALTER TABLE proposals ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES users(id);

-- Opcional: Atribuir dados antigos ao Owner da empresa (para não sumirem)
-- (Substitua a lógica abaixo se quiser deixar null, mas o ideal é ter dono)
UPDATE leads SET user_id = (SELECT id FROM users WHERE tenant_id = leads.tenant_id AND role = 'owner' LIMIT 1) WHERE user_id IS NULL;
UPDATE contacts SET user_id = (SELECT id FROM users WHERE tenant_id = contacts.tenant_id AND role = 'owner' LIMIT 1) WHERE user_id IS NULL;
UPDATE companies SET user_id = (SELECT id FROM users WHERE tenant_id = companies.tenant_id AND role = 'owner' LIMIT 1) WHERE user_id IS NULL;