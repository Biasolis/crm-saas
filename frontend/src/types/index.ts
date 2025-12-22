export interface Lead {
  id: string;
  name: string;
  email?: string | null;
  phone?: string | null;
  mobile?: string | null;
  company_name?: string | null;
  position?: string | null;
  website?: string | null;
  address?: string | null;
  status: 'new' | 'in_progress' | 'converted' | 'lost';
  source?: string | null;
  notes?: string | null;
  user_id?: string | null;
  created_at: string;
  // Campos adicionados para o histórico (Perdidos/Convertidos)
  loss_reason?: string | null;
  converted_at?: string | null;
  updated_at?: string;
}

export interface CreateLeadData {
  name: string;
  email?: string;
  phone?: string;
  mobile?: string;
  company_name?: string;
  position?: string;
  website?: string;
  address?: string;
  source?: string;
  notes?: string;
}