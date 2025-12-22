import api from '@/services/api'; 
import { Lead, CreateLeadData, LeadLog } from '@/types';

// Debug para garantir que o axios carregou
if (!api) console.error("API Axios não inicializado!");

export const leadsService = {
  // --- Listagens ---
  getPool: async (): Promise<Lead[]> => {
    // Correção: Adicionado /api/
    const { data } = await api.get('/api/leads/pool');
    return data;
  },

  getMyLeads: async (): Promise<Lead[]> => {
    const { data } = await api.get('/api/leads/mine');
    return data;
  },

  getConverted: async (): Promise<Lead[]> => {
    const { data } = await api.get('/api/leads/converted');
    return data;
  },

  getLost: async (): Promise<Lead[]> => {
    const { data } = await api.get('/api/leads/lost');
    return data;
  },

  // Busca logs (histórico)
  getLogs: async (id: string): Promise<LeadLog[]> => {
    const { data } = await api.get(`/api/leads/${id}/logs`);
    return data;
  },

  // --- Ações ---
  create: async (payload: CreateLeadData): Promise<Lead> => {
    const { data } = await api.post('/api/leads', payload);
    return data;
  },

  importCSV: async (leads: any[]): Promise<{ count: number }> => {
    const { data } = await api.post('/api/leads/import', { leads });
    return data;
  },

  claim: async (id: string): Promise<void> => {
    await api.post(`/api/leads/${id}/claim`);
  },

  convert: async (id: string): Promise<void> => {
    await api.post(`/api/leads/${id}/convert`);
  },

  lose: async (id: string, reason: string): Promise<void> => {
    await api.post(`/api/leads/${id}/lose`, { reason });
  },
  
  delete: async (id: string): Promise<void> => {
    await api.delete(`/api/leads/${id}`);
  }
};