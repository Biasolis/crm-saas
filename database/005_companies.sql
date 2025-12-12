-- 1. Tabela de EMPRESAS
CREATE TABLE IF NOT EXISTS companies (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID REFERENCES tenants(id),
    
    name VARCHAR(255) NOT NULL,          -- Razão Social ou Nome Fantasia
    document_number VARCHAR(50),         -- CNPJ
    website VARCHAR(255),
    phone VARCHAR(50),
    address TEXT,
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 2. Vínculo: Contato pertence a uma Empresa
ALTER TABLE contacts ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES companies(id);

-- 3. Índices
CREATE INDEX IF NOT EXISTS idx_companies_tenant ON companies(tenant_id);
CREATE INDEX IF NOT EXISTS idx_contacts_company ON contacts(company_id);