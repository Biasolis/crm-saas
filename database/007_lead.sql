CREATE TABLE IF NOT EXISTS leads (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID REFERENCES tenants(id),
    
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255),
    phone VARCHAR(50),
    company_name VARCHAR(255),       -- Nome da empresa (texto, pois ainda não existe na tabela companies)
    
    status VARCHAR(50) DEFAULT 'new', -- 'new', 'contacted', 'qualified', 'disqualified', 'converted'
    source VARCHAR(100),              -- Origem: 'site', 'linkedin', 'indicação'
    
    notes TEXT,
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_leads_tenant ON leads(tenant_id);
CREATE INDEX IF NOT EXISTS idx_leads_email ON leads(email);