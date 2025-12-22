-- Adiciona campos extras de contato solicitados
ALTER TABLE leads 
ADD COLUMN IF NOT EXISTS mobile VARCHAR(50),        -- Celular/WhatsApp
ADD COLUMN IF NOT EXISTS position VARCHAR(100),     -- Cargo
ADD COLUMN IF NOT EXISTS address TEXT,              -- Endereço
ADD COLUMN IF NOT EXISTS website VARCHAR(255),      -- LinkedIn ou Site
ADD COLUMN IF NOT EXISTS loss_reason TEXT,          -- Motivo da Perda
ADD COLUMN IF NOT EXISTS captured_at TIMESTAMP,     -- Data que o vendedor pegou
ADD COLUMN IF NOT EXISTS converted_at TIMESTAMP;    -- Data que virou cliente

-- Garante que user_id possa ser NULO (NULL = Lead na Piscina/Geral)
ALTER TABLE leads ALTER COLUMN user_id DROP NOT NULL;

-- Atualiza status antigos para compatibilidade (opcional)
-- Se status for 'new', garante que não tem dono
UPDATE leads SET user_id = NULL WHERE status = 'new';