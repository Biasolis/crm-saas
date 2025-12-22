'use client';

import { useEffect, useState } from 'react';
import { leadsService } from '@/services/leads';
import { Lead } from '@/types';
import { XCircle } from 'lucide-react';
import styles from '../pool/pool.module.css'; // Reutilizando CSS

export default function LostLeadsPage() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const data = await leadsService.getLost();
        setLeads(data);
      } catch (error) {
        console.error(error);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  if (loading) return <div className="p-8 text-center">Carregando...</div>;

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <div className={styles.title}>
          <h1>🚫 Leads Perdidos</h1>
          <p>Leads desqualificados ou perdidos.</p>
        </div>
      </div>

      <div className={styles.tableContainer}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th>Lead</th>
              <th>Motivo da Perda</th>
              <th>Data</th>
              <th style={{ textAlign: 'right' }}>Ação</th>
            </tr>
          </thead>
          <tbody>
            {leads.map((lead) => (
              <tr key={lead.id}>
                <td>
                  <span className={styles.companyName}>{lead.name}</span>
                  <span className={styles.position}>{lead.company_name}</span>
                </td>
                <td>
                  <span className="text-red-600 font-medium text-sm">
                    {lead.loss_reason || 'Motivo não informado'}
                  </span>
                </td>
                <td>
                  {new Date(lead.updated_at || lead.created_at).toLocaleDateString('pt-BR')}
                </td>
                <td style={{ textAlign: 'right' }}>
                  {/* Futuramente: Botão para "Reativar" lead */}
                  <span className="text-gray-400 text-xs">Arquivado</span>
                </td>
              </tr>
            ))}
            {leads.length === 0 && (
              <tr>
                <td colSpan={4} className="text-center py-8 text-gray-500">
                  Nenhum lead perdido. Ótimo trabalho!
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}