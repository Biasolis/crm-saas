CREATE TABLE IF NOT EXISTS tasks (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID REFERENCES tenants(id),
    user_id UUID REFERENCES users(id),       -- Quem deve fazer a tarefa
    
    -- Vínculos Opcionais (A tarefa é sobre o que?)
    contact_id UUID REFERENCES contacts(id) ON DELETE SET NULL,
    deal_id UUID REFERENCES deals(id) ON DELETE SET NULL,
    
    title VARCHAR(255) NOT NULL,
    description TEXT,
    due_date TIMESTAMP,                      -- Data e Hora limite
    status VARCHAR(50) DEFAULT 'pending',    -- 'pending', 'completed'
    priority VARCHAR(20) DEFAULT 'medium',   -- 'low', 'medium', 'high'
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Índices para deixar a busca por data rápida (Agenda)
CREATE INDEX IF NOT EXISTS idx_tasks_user_date ON tasks(user_id, due_date);
CREATE INDEX IF NOT EXISTS idx_tasks_tenant ON tasks(tenant_id);