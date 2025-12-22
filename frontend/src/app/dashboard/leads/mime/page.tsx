'use client';

import { useEffect, useState } from 'react';
import { leadsService } from '@/services/leads';
import { Lead } from '@/types';
import { CheckCircle, XCircle, Phone, Mail, MapPin, Globe } from 'lucide-react';
import styles from './mine.module.css'; // CSS Modules

export default function MyLeadsPage() {
  const [leads, setLeads] = useState<Lead[]>([]);
  
  const fetchMyLeads = async () => {
    try {
      const data = await leadsService.getMyLeads();
      setLeads(data);
    } catch (error) {
      console.error(error);
    }
  };

  useEffect(() => {
    fetchMyLeads();
  }, []);

  const handleConvert = async (id: string) => {
    if (!confirm('Confirmar conversão em cliente? Isso criará registros em Contatos e Empresas.')) return;
    try {
      await leadsService.convert(id);
      setLeads((p) => p.filter((l) => l.id !== id));
      alert('Lead convertido com sucesso!');
    } catch (e) {
      alert('Erro ao converter lead.');
    }
  };

  const handleLost = async (id: string) => {
    const reason = prompt('Qual o motivo da perda?');
    if (!reason) return;
    
    try {
      await leadsService.lose(id, reason);
      setLeads((p) => p.filter((l) => l.id !== id));
    } catch (e) {
      alert('Erro ao marcar como perdido.');
    }
  };

  return (
    <div className={styles.container}>
      <h1 className={styles.title}>💼 Meus Leads em Atendimento</h1>
      
      <div className={styles.grid}>
        {leads.map((lead) => (
          <div key={lead.id} className={styles.card}>
            <div>
              <div className={styles.cardHeader}>
                <h3 className={styles.cardTitle}>{lead.name}</h3>
                <span className={styles.statusBadge}>Em andamento</span>
              </div>
              
              <div className={styles.cardSubtitle}>
                {lead.company_name || 'Sem empresa'} 
                {lead.position && <span> • {lead.position}</span>}
              </div>
              
              <div className={styles.infoList}>
                {lead.email && (
                  <div className={styles.infoItem}>
                    <Mail size={14}/> {lead.email}
                  </div>
                )}
                {lead.mobile && (
                  <div className={styles.infoItem}>
                    <Phone size={14}/> {lead.mobile}
                  </div>
                )}
                {lead.address && (
                  <div className={styles.infoItem}>
                    <MapPin size={14}/> {lead.address}
                  </div>
                )}
              </div>

              {lead.notes && (
                <div className={styles.notes}>
                  📝 {lead.notes}
                </div>
              )}
            </div>

            <div className={styles.cardActions}>
               <button 
                 className={styles.btnLost}
                 onClick={() => handleLost(lead.id)}
               >
                 <XCircle size={16} /> Perder
               </button>
               <button 
                 className={styles.btnConvert}
                 onClick={() => handleConvert(lead.id)}
               >
                 <CheckCircle size={16} /> Converter
               </button>
            </div>
          </div>
        ))}
        
        {leads.length === 0 && (
          <p style={{ gridColumn: '1/-1', textAlign: 'center', color: '#666' }}>
            Você não possui leads ativos no momento.
          </p>
        )}
      </div>
    </div>
  );
}