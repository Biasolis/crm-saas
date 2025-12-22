'use client';

import { useEffect, useState } from 'react';
import { leadsService } from '@/services/leads';
import { Lead } from '@/types';
import { CheckCircle } from 'lucide-react';
import styles from '../pool/pool.module.css'; // Reutilizando CSS da Piscina para manter padrão

export default function ConvertedLeadsPage() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const data = await leadsService.getConverted();
        setLeads(data);
      } catch (error) {
        console.error(error);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  if (loading) return <div className="p-8 text-center">Carregando histórico...</div>;

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <div className={styles.title}>
          <h1>🏆 Leads Convertidos</h1>
          <p>Histórico de sucessos e novos clientes gerados.</p>
        </div>
      </div>

      <div className={styles.tableContainer}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th>Cliente / Empresa</th>
              <th>Contato</th>
              <th>Data Conversão</th>
              <th style={{ textAlign: 'right' }}>Status</th>
            </tr>
          </thead>
          <tbody>
            {leads.map((lead) => (
              <tr key={lead.id}>
                <td>
                  <span className={styles.companyName}>{lead.company_name || lead.name}</span>
                  <span className={styles.position}>{lead.position || 'Cliente'}</span>
                </td>
                <td>
                  <span className={styles.leadName}>{lead.email}</span>
                  <span className={styles.leadEmail}>{lead.phone || lead.mobile}</span>
                </td>
                <td>
                  {/* Formatação simples de data */}
                  {new Date(lead.converted_at || lead.created_at).toLocaleDateString('pt-BR')}
                </td>
                <td style={{ textAlign: 'right' }}>
                  <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-green-100 text-green-800 text-xs font-medium">
                    <CheckCircle size={12} /> Cliente
                  </span>
                </td>
              </tr>
            ))}
            {leads.length === 0 && (
              <tr>
                <td colSpan={4} className="text-center py-8 text-gray-500">
                  Nenhum lead convertido ainda.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}