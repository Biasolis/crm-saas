-- 1. Melhorar a tabela de Negócios
ALTER TABLE deals ADD COLUMN IF NOT EXISTS description TEXT;
ALTER TABLE deals ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES users(id); -- O "Dono" do negócio

-- 2. Tabela de Comentários (Histórico do Negócio)
CREATE TABLE IF NOT EXISTS deal_comments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    deal_id UUID REFERENCES deals(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id), -- Quem comentou
    content TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 3. Índices para performance
CREATE INDEX IF NOT EXISTS idx_deal_comments_deal ON deal_comments(deal_id);