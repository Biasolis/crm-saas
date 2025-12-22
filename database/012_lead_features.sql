-- 1. Tabela de Histórico de Atividades do Lead
CREATE TABLE IF NOT EXISTS lead_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    lead_id UUID NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id), -- Quem fez a ação
    action VARCHAR(50) NOT NULL, -- 'created', 'claimed', 'status_change', 'note', 'task', 'call'
    details JSONB DEFAULT '{}'::jsonb, -- Detalhes extras (ex: o que mudou)
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 2. Atualizar Tabela de Tarefas para suportar Leads
ALTER TABLE tasks 
ADD COLUMN IF NOT EXISTS lead_id UUID REFERENCES leads(id) ON DELETE CASCADE;

-- Criar índice para busca rápida
CREATE INDEX IF NOT EXISTS idx_lead_logs_lead ON lead_logs(lead_id);
CREATE INDEX IF NOT EXISTS idx_tasks_lead ON tasks(lead_id);