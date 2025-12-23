'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { leadsService } from '@/services/leads';
import { Lead } from '@/types';
import { Plus, UserPlus } from 'lucide-react'; 
import styles from './pool.module.css';

import NewLeadModal from '@/components/leads/NewLeadModal';

export default function LeadPoolPage() {
  const { loading: authLoading } = useAuth();
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);

  // Estados dos Modais
  const [isNewLeadOpen, setIsNewLeadOpen] = useState(false);

  const fetchLeads = async () => {
    try {
      setLoading(true);
      const data = await leadsService.getPool();
      setLeads(data);
    } catch (error) {
      console.error('Erro ao buscar leads:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // Aguarda auth carregar para buscar
    if (!authLoading) {
        fetchLeads();
    }
  }, [authLoading]);

  const handleClaim = async (leadId: string) => {
    if (!confirm('Deseja assumir o atendimento deste lead?')) return;
    try {
      await leadsService.claim(leadId);
      setLeads((prev) => prev.filter((l) => l.id !== leadId));
      alert('Lead capturado! Veja em "Meus Leads".');
    } catch (error) {
      alert('Ops! Lead indisponível.');
      fetchLeads();
    }
  };

  if (authLoading) {
    return <div className="p-8 text-center text-gray-500">Carregando...</div>;
  }

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <div className={styles.title}>
          <h1>🎯 Piscina de Leads</h1>
          <p>Leads aguardando atendimento. Seja rápido!</p>
        </div>
        
        <div className={styles.actions}>
          <button 
            className={styles.btnPrimary}
            onClick={() => setIsNewLeadOpen(true)}
          >
            <Plus size={16} /> Novo Lead
          </button>
        </div>
      </div>

      {loading ? (
        <div className="p-8 text-center text-gray-500">Carregando leads disponíveis...</div>
      ) : leads.length === 0 ? (
        <div className={styles.emptyState}>
          <h3>A piscina está vazia! 🏊‍♂️</h3>
          <p>Seja o primeiro a importar leads ou criar um novo.</p>
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
                    <span className={styles.companyName}>{lead.company_name || 'Particular'}</span>
                    <span className={styles.position}>{lead.position || '-'}</span>
                  </td>
                  <td>
                    <span className={styles.leadName}>{lead.name}</span>
                    <span className={styles.leadEmail}>{lead.email}</span>
                  </td>
                  <td><span className={styles.badge}>{lead.source || 'N/A'}</span></td>
                  <td style={{ textAlign: 'right' }}>
                    <button className={styles.btnClaim} onClick={() => handleClaim(lead.id)}>
                      <UserPlus size={16} /> Pegar
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <NewLeadModal 
        isOpen={isNewLeadOpen} 
        onClose={() => setIsNewLeadOpen(false)} 
        onSuccess={fetchLeads} 
      />
    </div>
  );
}