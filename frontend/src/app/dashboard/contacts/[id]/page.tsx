'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { 
  ArrowLeft, User, Phone, Mail, MapPin, Building2, 
  Briefcase, Calendar, Loader2, CheckCircle2 
} from 'lucide-react';
import api from '@/services/api';
import styles from './page.module.css';

// Interfaces (Simplificadas para exibição)
interface Deal { id: string; title: string; value: number; stage_name: string; }
interface Task { id: string; title: string; due_date: string; status: string; priority: string; }
interface Contact {
  id: string; name: string; email: string; phone: string; mobile: string;
  city: string; state: string; company_name: string;
}

export default function ContactDetailsPage() {
  const { id } = useParams();
  const [data, setData] = useState<{ contact: Contact; deals: Deal[]; tasks: Task[] } | null>(null);
  const [activeTab, setActiveTab] = useState<'deals' | 'tasks'>('deals');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const res = await api.get(`/api/contacts/${id}/summary`);
        setData(res.data);
      } catch (error) {
        console.error(error);
      } finally {
        setIsLoading(false);
      }
    }
    load();
  }, [id]);

  if (isLoading) return <div style={{display:'flex', justifyContent:'center', marginTop:'3rem'}}><Loader2 className="animate-spin" /></div>;
  if (!data) return <div>Contato não encontrado.</div>;

  const { contact, deals, tasks } = data;

  return (
    <div>
      <Link href="/dashboard/contacts" className={styles.backLink}>
        <ArrowLeft size={18} /> Voltar para Contatos
      </Link>

      <div className={styles.container}>
        
        {/* Sidebar: Dados do Contato */}
        <aside className={styles.sidebar}>
          <div className={styles.avatarBox}>
            {contact.name.charAt(0).toUpperCase()}
          </div>
          <h1 className={styles.name}>{contact.name}</h1>
          
          {contact.company_name && (
            <div className={styles.company}>
              <Building2 size={14} /> {contact.company_name}
            </div>
          )}

          <hr className={styles.divider} />

          <div className={styles.infoGroup}>
            {contact.email && (
              <div className={styles.infoItem}>
                <Mail size={18} /> <span>{contact.email}</span>
              </div>
            )}
            {(contact.phone || contact.mobile) && (
              <div className={styles.infoItem}>
                <Phone size={18} /> <span>{contact.mobile || contact.phone}</span>
              </div>
            )}
            {contact.city && (
              <div className={styles.infoItem}>
                <MapPin size={18} /> <span>{contact.city} {contact.state ? `- ${contact.state}` : ''}</span>
              </div>
            )}
          </div>
        </aside>

        {/* Conteúdo Principal */}
        <div className={styles.content}>
          
          {/* Abas */}
          <div className={styles.tabs}>
            <div 
              className={`${styles.tab} ${activeTab === 'deals' ? styles.tabActive : ''}`} 
              onClick={() => setActiveTab('deals')}
            >
              Negócios ({deals.length})
            </div>
            <div 
              className={`${styles.tab} ${activeTab === 'tasks' ? styles.tabActive : ''}`} 
              onClick={() => setActiveTab('tasks')}
            >
              Tarefas ({tasks.length})
            </div>
          </div>

          {/* Lista de Negócios */}
          {activeTab === 'deals' && (
            <div className={styles.listContainer}>
              {deals.length === 0 ? (
                <div className={styles.emptyState}>Nenhum negócio em andamento para este cliente.</div>
              ) : (
                deals.map(deal => (
                  <div key={deal.id} className={styles.cardItem}>
                    <div className={styles.cardMain}>
                      <span className={styles.cardTitle}>{deal.title}</span>
                      <span className={styles.cardSub}>Etapa: {deal.stage_name}</span>
                    </div>
                    <div style={{fontWeight: 700, color: '#059669'}}>
                      {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(deal.value)}
                    </div>
                  </div>
                ))
              )}
            </div>
          )}

          {/* Lista de Tarefas */}
          {activeTab === 'tasks' && (
            <div className={styles.listContainer}>
              {tasks.length === 0 ? (
                <div className={styles.emptyState}>Nenhuma tarefa pendente.</div>
              ) : (
                tasks.map(task => (
                  <div key={task.id} className={styles.cardItem} style={{opacity: task.status === 'completed' ? 0.6 : 1}}>
                    <div className={styles.cardMain}>
                      <span className={styles.cardTitle} style={{textDecoration: task.status === 'completed' ? 'line-through' : 'none'}}>
                        {task.title}
                      </span>
                      {task.due_date && (
                        <span className={styles.cardSub}>
                          Vence em: {new Date(task.due_date).toLocaleDateString()}
                        </span>
                      )}
                    </div>
                    {task.status === 'completed' ? (
                      <CheckCircle2 size={20} color="#22c55e" />
                    ) : (
                      <span className={styles.statusBadge} style={{background: '#fef3c7', color: '#d97706'}}>
                        {task.priority}
                      </span>
                    )}
                  </div>
                ))
              )}
            </div>
          )}

        </div>
      </div>
    </div>
  );
}