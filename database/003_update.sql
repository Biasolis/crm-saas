-- 1. Garante que a tabela de PROPOSTAS existe
CREATE TABLE IF NOT EXISTS proposals (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID REFERENCES tenants(id),
    deal_id UUID REFERENCES deals(id),
    contact_id UUID REFERENCES contacts(id),
    
    title VARCHAR(255) NOT NULL,
    status VARCHAR(50) DEFAULT 'draft',
    total_amount DECIMAL(15, 2) DEFAULT 0.00,
    valid_until DATE,
    notes TEXT,
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 2. Garante que a tabela de ITENS DA PROPOSTA existe
CREATE TABLE IF NOT EXISTS proposal_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    proposal_id UUID REFERENCES proposals(id) ON DELETE CASCADE,
    product_id UUID REFERENCES products(id),
    
    description VARCHAR(255) NOT NULL,
    quantity DECIMAL(10, 2) DEFAULT 1,
    unit_price DECIMAL(15, 2) NOT NULL,
    total_price DECIMAL(15, 2) NOT NULL
);

-- 3. Atualiza a tabela TENANTS (Adiciona colunas de Branding/Chatwoot se não existirem)
-- O Postgres não tem "ADD COLUMN IF NOT EXISTS" nativo simples em uma linha para todas versões,
-- então rodamos estes comandos um por um. Se der erro dizendo "column already exists", ignore.

ALTER TABLE tenants ADD COLUMN IF NOT EXISTS logo_url TEXT;
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS primary_color VARCHAR(7) DEFAULT '#000000';
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS company_legal_name VARCHAR(255);
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS company_document VARCHAR(20);
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS chatwoot_url VARCHAR(255);
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS chatwoot_access_token TEXT;
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS chatwoot_account_id INT;

-- 4. Garante que PRODUCTS tem a coluna SKU
ALTER TABLE products ADD COLUMN IF NOT EXISTS sku VARCHAR(50);