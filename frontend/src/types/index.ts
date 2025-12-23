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
  // Campos novos
  loss_reason?: string | null;
  converted_at?: string | null;
  updated_at?: string;
}

export interface LeadLog {
  id: string;
  lead_id: string;
  user_id?: string;
  user_name?: string; // Vem do join
  action: 'created' | 'claimed' | 'status_change' | 'note' | 'task_created' | 'lost' | 'converted';
  details?: any;
  created_at: string;
}

export interface Task {
  id: string;
  title: string;
  description?: string;
  due_date?: string;
  priority: 'low' | 'medium' | 'high';
  status: 'pending' | 'in_progress' | 'completed';
  contact_id?: string;
  lead_id?: string; // Novo
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
  auto_distribute?: boolean; // Novo campo para Round Robin
}