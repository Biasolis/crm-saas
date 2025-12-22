'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/hooks/useAuth'; // Ajuste se seu hook estiver em outro lugar
import { leadsService } from '@/services/leads';
import { Lead } from '@/types';
import { Plus, Download, UserPlus } from 'lucide-react';
import styles from './pool.module.css';

// Importando os Modais
import NewLeadModal from '@/components/leads/NewLeadModal';
import ImportCSVModal from '@/components/leads/ImportCSVModal';

export default function LeadPoolPage() {
  const { user } = useAuth();
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);

  // Estados para controlar a abertura dos modais
  const [isNewLeadOpen, setIsNewLeadOpen] = useState(false);
  const [isImportOpen, setIsImportOpen] = useState(false);

  // Verifica se é Admin ou Dono para mostrar os botões de upload
  const isAdmin = user?.role === 'admin' || user?.role === 'owner';

  const fetchLeads = async () => {
    try {
      setLoading(true);
      const data = await leadsService.getPool();
      setLeads(data);
    } catch (error) {
      console.error('Erro ao buscar leads da piscina:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLeads();
  }, []);

  const handleClaim = async (leadId: string) => {
    if (!confirm('Deseja assumir o atendimento deste lead?')) return;

    try {
      await leadsService.claim(leadId);
      // Remove da lista visualmente para feedback imediato
      setLeads((prev) => prev.filter((l) => l.id !== leadId));
      alert('Lead capturado! Ele agora está na sua aba "Meus Leads".');
    } catch (error) {
      alert('Ops! Este lead já foi pego ou não está mais disponível.');
      fetchLeads(); // Atualiza a lista para garantir
    }
  };

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <div className={styles.title}>
          <h1>🎯 Piscina de Leads</h1>
          <p>Leads aguardando atendimento. Seja rápido!</p>
        </div>
        
        {/* Botões visíveis apenas para Administradores */}
        {isAdmin && (
          <div className={styles.actions}>
            <button 
              className={styles.btnSecondary}
              onClick={() => setIsImportOpen(true)}
            >
              <Download size={16} /> Importar CSV
            </button>
            <button 
              className={styles.btnPrimary}
              onClick={() => setIsNewLeadOpen(true)}
            >
              <Plus size={16} /> Novo Lead
            </button>
          </div>
        )}
      </div>

      {loading ? (
        <div className="p-8 text-center text-gray-500">Carregando leads disponíveis...</div>
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
                      {lead.position || 'Cargo não inf.'}
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

      {/* Renderização dos Modais */}
      {isAdmin && (
        <>
          <NewLeadModal 
            isOpen={isNewLeadOpen} 
            onClose={() => setIsNewLeadOpen(false)} 
            onSuccess={fetchLeads} 
          />
          
          <ImportCSVModal 
            isOpen={isImportOpen} 
            onClose={() => setIsImportOpen(false)} 
            onSuccess={fetchLeads} 
          />
        </>
      )}
    </div>
  );
}