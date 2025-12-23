-- database/013_round_robin.sql

-- Adiciona coluna para controlar a vez na distribuição
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS last_lead_assigned_at TIMESTAMP DEFAULT NULL;

-- Índice para otimizar a busca do "próximo da fila"
CREATE INDEX IF NOT EXISTS idx_users_last_assigned 
ON users(tenant_id, last_lead_assigned_at ASC NULLS FIRST);