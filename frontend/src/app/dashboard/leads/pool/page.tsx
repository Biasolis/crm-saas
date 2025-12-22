'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/hooks/useAuth'; // Ajuste o import conforme seu hook
import { leadsService } from '@/services/leads';
import { Lead } from '@/types';
import { Plus, Download, UserPlus } from 'lucide-react';
import styles from './pool.module.css'; // Importando o CSS Module

export default function LeadPoolPage() {
  const { user } = useAuth();
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);

  // Verificação simples de permissão (ajuste conforme seu AuthContext)
  const isAdmin = user?.role === 'admin' || user?.role === 'owner';

  const fetchLeads = async () => {
    try {
      setLoading(true);
      const data = await leadsService.getPool();
      setLeads(data);
    } catch (error) {
      console.error('Erro ao buscar piscina de leads', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLeads();
  }, []);

  const handleClaim = async (leadId: string) => {
    // Feedback otimista ou loading local poderia ser adicionado aqui
    if (!confirm('Deseja assumir o atendimento deste lead?')) return;

    try {
      await leadsService.claim(leadId);
      // Remove da lista localmente para dar feedback instantâneo
      setLeads((prev) => prev.filter((l) => l.id !== leadId));
      alert('Lead capturado com sucesso! Verifique a aba "Meus Leads".');
    } catch (error) {
      alert('Erro: Este lead pode já ter sido pego por outro vendedor.');
      fetchLeads(); // Recarrega para garantir consistência
    }
  };

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <div className={styles.title}>
          <h1>🎯 Piscina de Leads</h1>
          <p>Leads aguardando atendimento. Seja rápido!</p>
        </div>
        
        {isAdmin && (
          <div className={styles.actions}>
            <button 
              className={styles.btnSecondary}
              onClick={() => alert('Implementar Modal de Importação CSV')}
            >
              <Download size={16} /> Importar CSV
            </button>
            <button 
              className={styles.btnPrimary}
              onClick={() => alert('Implementar Modal de Novo Lead')}
            >
              <Plus size={16} /> Novo Lead
            </button>
          </div>
        )}
      </div>

      {loading ? (
        <p>Carregando leads...</p>
      ) : leads.length === 0 ? (
        <div className={styles.emptyState}>
          <h3>A piscina está vazia! 🏊‍♂️</h3>
          <p>Aguarde o administrador disponibilizar novos leads.</p>
        </div>
      ) : (
        <div className={styles.tableContainer}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Empresa / Cargo</th>
                <th>Contato</th>
                <th>Origem</th>
                <th style={{ textAlign: 'right' }}>Ação</th>
              </tr>
            </thead>
            <tbody>
              {leads.map((lead) => (
                <tr key={lead.id}>
                  <td>
                    <span className={styles.companyName}>
                      {lead.company_name || 'Particular'}
                    </span>
                    <span className={styles.position}>
                      {lead.position || 'Cargo não informado'}
                    </span>
                  </td>
                  <td>
                    <span className={styles.leadName}>{lead.name}</span>
                    <span className={styles.leadEmail}>{lead.email}</span>
                  </td>
                  <td>
                    <span className={styles.badge}>
                      {lead.source || 'N/A'}
                    </span>
                  </td>
                  <td style={{ textAlign: 'right' }}>
                    <button
                      className={styles.btnClaim}
                      onClick={() => handleClaim(lead.id)}
                    >
                      <UserPlus size={16} /> Pegar
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}