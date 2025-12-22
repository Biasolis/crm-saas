-- 1. Garante que a extensão de UUID existe
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 2. Adiciona a coluna user_id se não existir
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='leads' AND column_name='user_id') THEN 
        ALTER TABLE leads ADD COLUMN user_id UUID REFERENCES users(id);
    END IF;
END $$;

-- 3. Adiciona as colunas de controle de tempo e contato
ALTER TABLE leads 
ADD COLUMN IF NOT EXISTS mobile VARCHAR(50),
ADD COLUMN IF NOT EXISTS position VARCHAR(100),
ADD COLUMN IF NOT EXISTS address TEXT,
ADD COLUMN IF NOT EXISTS website VARCHAR(255),
ADD COLUMN IF NOT EXISTS loss_reason TEXT,
ADD COLUMN IF NOT EXISTS captured_at TIMESTAMP,
ADD COLUMN IF NOT EXISTS converted_at TIMESTAMP;

-- 4. Garante que user_id pode ser NULO (para a Piscina funcionar)
ALTER TABLE leads ALTER COLUMN user_id DROP NOT NULL;

-- 5. Se status for 'new', remove o dono (correção de dados antigos)
UPDATE leads SET user_id = NULL WHERE status = 'new';