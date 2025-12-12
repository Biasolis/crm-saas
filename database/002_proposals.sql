-- Tabela de PROPOSTAS
CREATE TABLE IF NOT EXISTS proposals (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID REFERENCES tenants(id),
    deal_id UUID REFERENCES deals(id),      -- Opcional: Vínculo com o Card do Kanban
    contact_id UUID REFERENCES contacts(id), -- Opcional: Para quem é a proposta
    
    title VARCHAR(255) NOT NULL,            -- Ex: "Orçamento #1023"
    status VARCHAR(50) DEFAULT 'draft',     -- 'draft', 'sent', 'accepted', 'rejected'
    
    total_amount DECIMAL(15, 2) DEFAULT 0.00,
    valid_until DATE,                       -- Validade da proposta
    notes TEXT,                             -- Observações finais
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Tabela de ITENS DA PROPOSTA
CREATE TABLE IF NOT EXISTS proposal_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    proposal_id UUID REFERENCES proposals(id) ON DELETE CASCADE,
    product_id UUID REFERENCES products(id), -- Vínculo com o produto (se houver)
    
    description VARCHAR(255) NOT NULL,       -- Nome do item na proposta
    quantity DECIMAL(10, 2) DEFAULT 1,
    unit_price DECIMAL(15, 2) NOT NULL,
    total_price DECIMAL(15, 2) NOT NULL      -- (quantity * unit_price) cacheado
);