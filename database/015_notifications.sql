CREATE TABLE IF NOT EXISTS notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  user_id UUID NOT NULL,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  link TEXT, -- Para onde o usuário vai ao clicar (ex: /dashboard/leads)
  read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Índice para buscar rapidamente as não lidas de um usuário
CREATE INDEX IF NOT EXISTS idx_notifications_unread 
ON notifications(user_id) WHERE read = FALSE;