-- Extensões
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. TENANTS (Empresas Clientes + Branding)
CREATE TABLE IF NOT EXISTS tenants (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    -- Branding e Identidade
    logo_url TEXT,
    primary_color VARCHAR(7) DEFAULT '#000000',
    secondary_color VARCHAR(7) DEFAULT '#ffffff',
    company_legal_name VARCHAR(255),
    company_document VARCHAR(20),
    
    -- Integrações
    chatwoot_url VARCHAR(255),
    chatwoot_account_id INT,
    chatwoot_access_token TEXT,
    
    is_active BOOLEAN DEFAULT TRUE
);

-- 2. USERS (Acesso ao Sistema)
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID REFERENCES tenants(id),
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    role VARCHAR(50) DEFAULT 'user', -- 'owner', 'admin', 'agent'
    name VARCHAR(255),
    
    -- Integração Chatwoot (quem é ele no chat)
    chatwoot_user_id INT,
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 3. CONTACTS (Clientes/Leads)
CREATE TABLE IF NOT EXISTS contacts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID REFERENCES tenants(id),
    
    -- Campos Fixos
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255),
    company_name VARCHAR(255),
    document_number VARCHAR(20),
    phone VARCHAR(20),
    mobile VARCHAR(20),
    
    -- Endereço
    zip_code VARCHAR(10),
    address VARCHAR(255),
    number VARCHAR(20),
    neighborhood VARCHAR(100),
    city VARCHAR(100),
    state VARCHAR(2),
    
    -- Campos Extras Dinâmicos
    custom_attributes JSONB DEFAULT '{}'::jsonb,
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 4. PRODUCTS (Catálogo)
CREATE TABLE IF NOT EXISTS products (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID REFERENCES tenants(id),
    name VARCHAR(255) NOT NULL,
    description TEXT,
    price DECIMAL(15, 2) NOT NULL DEFAULT 0.00,
    sku VARCHAR(50),
    active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 5. PIPELINES (Funis)
CREATE TABLE IF NOT EXISTS pipelines (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID REFERENCES tenants(id),
    name VARCHAR(100) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 6. STAGES (Etapas do Funil)
CREATE TABLE IF NOT EXISTS stages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    pipeline_id UUID REFERENCES pipelines(id),
    name VARCHAR(100) NOT NULL,
    "order" INT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 7. DEALS (Oportunidades)
CREATE TABLE IF NOT EXISTS deals (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID REFERENCES tenants(id),
    contact_id UUID REFERENCES contacts(id),
    stage_id UUID REFERENCES stages(id),
    
    title VARCHAR(255) NOT NULL,
    value DECIMAL(15, 2),
    expected_close_date DATE,
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 8. PROJECTS (Pós-Venda)
CREATE TABLE IF NOT EXISTS projects (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID REFERENCES tenants(id),
    client_id UUID REFERENCES contacts(id),
    deal_id UUID REFERENCES deals(id),
    
    title VARCHAR(255) NOT NULL,
    description TEXT,
    start_date DATE,
    deadline DATE,
    status VARCHAR(50) DEFAULT 'not_started',
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_contacts_tenant ON contacts(tenant_id);
CREATE INDEX IF NOT EXISTS idx_contacts_email ON contacts(email);
CREATE INDEX IF NOT EXISTS idx_contacts_document ON contacts(document_number);
CREATE INDEX IF NOT EXISTS idx_deals_stage ON deals(stage_id);