-- Adiciona a configuração global de distribuição na tabela da empresa
ALTER TABLE tenants 
ADD COLUMN IF NOT EXISTS round_robin_active BOOLEAN DEFAULT FALSE;