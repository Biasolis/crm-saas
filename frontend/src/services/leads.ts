import api from './api'; // <--- CORREÇÃO: Sem chaves { } pois é export default
import { Lead, CreateLeadData, LeadLog } from '@/types';

export const leadsService = {
  // --- Listagens ---
  getPool: async (): Promise<Lead[]> => {
    const { data } = await api.get('/leads/pool');
    return data;
  },

  getMyLeads: async (): Promise<Lead[]> => {
    const { data } = await api.get('/leads/mine');
    return data;
  },

  getConverted: async (): Promise<Lead[]> => {
    const { data } = await api.get('/leads/converted');
    return data;
  },

  getLost: async (): Promise<Lead[]> => {
    const { data } = await api.get('/leads/lost');
    return data;
  },

  // Busca logs (histórico)
  getLogs: async (id: string): Promise<LeadLog[]> => {
    const { data } = await api.get(`/leads/${id}/logs`);
    return data;
  },

  // --- Ações ---
  create: async (payload: CreateLeadData): Promise<Lead> => {
    const { data } = await api.post('/leads', payload);
    return data;
  },

  importCSV: async (leads: any[]): Promise<{ count: number }> => {
    const { data } = await api.post('/leads/import', { leads });
    return data;
  },

  claim: async (id: string): Promise<void> => {
    await api.post(`/leads/${id}/claim`);
  },

  convert: async (id: string): Promise<void> => {
    await api.post(`/leads/${id}/convert`);
  },

  lose: async (id: string, reason: string): Promise<void> => {
    await api.post(`/leads/${id}/lose`, { reason });
  },
  
  delete: async (id: string): Promise<void> => {
    await api.delete(`/leads/${id}`);
  }
};