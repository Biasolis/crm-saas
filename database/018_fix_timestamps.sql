-- Adiciona coluna updated_at para rastrear alterações em Propostas
ALTER TABLE proposals 
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT NOW();

-- Adiciona coluna updated_at para rastrear alterações em Negócios (Deals)
ALTER TABLE deals 
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT NOW();