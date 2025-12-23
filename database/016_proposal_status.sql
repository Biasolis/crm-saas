-- Adiciona status na tabela de propostas (se não existir)
ALTER TABLE proposals 
ADD COLUMN IF NOT EXISTS status VARCHAR(20) DEFAULT 'draft'; -- draft, sent, accepted, rejected

-- Índice para filtrar propostas por status rapidamente
CREATE INDEX IF NOT EXISTS idx_proposals_status ON proposals(status);