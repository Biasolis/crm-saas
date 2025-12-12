-- 1. Tabela de PLANOS
CREATE TABLE IF NOT EXISTS plans (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(50) NOT NULL,           -- Ex: Free, Starter, Pro
    price DECIMAL(10, 2) DEFAULT 0.00,
    description TEXT,
    
    -- Limites do Plano (Feature Flags / Quotas)
    max_users INTEGER DEFAULT 1,
    max_contacts INTEGER DEFAULT 100,
    features JSONB DEFAULT '{}',         -- Ex: {"kanban": true, "reports": false}
    
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 2. Atualizar TENANTS com dados de Assinatura
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS plan_id UUID REFERENCES plans(id);
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS status VARCHAR(20) DEFAULT 'active'; -- 'active', 'suspended', 'trial'
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS subscription_ends_at TIMESTAMP;

-- 3. Atualizar USERS para suportar o cargo 'super_admin'
-- O Postgres não deixa alterar ENUM facilmente. Vamos adicionar uma flag booleana para simplificar e ser mais seguro.
ALTER TABLE users ADD COLUMN IF NOT EXISTS is_super_admin BOOLEAN DEFAULT false;

-- 4. Inserir Planos Padrão (Seed)
INSERT INTO plans (name, price, max_users, max_contacts) VALUES 
('Free', 0.00, 1, 50),
('Pro', 99.00, 5, 1000),
('Enterprise', 299.00, 9999, 999999);