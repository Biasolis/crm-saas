'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { 
  LayoutDashboard, Users, CalendarCheck, FileText, DollarSign, 
  ArrowRight, Loader2, Target, Briefcase 
} from 'lucide-react';
import api from '@/services/api';
import styles from './page.module.css';

interface DashboardSummary {
  stats: {
    active_leads: number;
    pending_tasks: number;
    open_proposals: number;
    pipeline_value: number;
  };
  agenda: Array<{
    id: string;
    title: string;
    due_date: string;
    priority: 'low' | 'medium' | 'high';
  }>;
  recent_leads: Array<{
    id: string;
    name: string;
    company_name: string;
    status: string;
    created_at: string;
  }>;
}

export default function DashboardPage() {
  const [data, setData] = useState<DashboardSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [userName, setUserName] = useState('Usuário');

  useEffect(() => {
    // Pega nome do usuário do cache
    const cachedUser = localStorage.getItem('crm_user');
    if (cachedUser) {
        try { setUserName(JSON.parse(cachedUser).name.split(' ')[0]); } catch (e) {}
    }

    async function loadDashboard() {
      try {
        const res = await api.get('/api/dashboard/summary');
        setData(res.data);
      } catch (error) {
        console.error('Erro ao carregar dashboard', error);
      } finally {
        setLoading(false);
      }
    }
    loadDashboard();
  }, []);

  if (loading) return <div style={{display:'flex', justifyContent:'center', padding:'4rem'}}><Loader2 className="animate-spin" /></div>;
  if (!data) return <div style={{padding:'2rem'}}>Erro ao carregar dados.</div>;

  const today = new Date().toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' });

  // Helpers
  const formatCurrency = (val: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);

  return (
    <div className={styles.container}>
      
      {/* HEADER */}
      <div className={styles.header}>
        <div>
            <h1 className={styles.welcomeTitle}>Olá, {userName}! 👋</h1>
            <p className={styles.dateText}>{today}</p>
        </div>
      </div>

      {/* KPI CARDS */}
      <div className={styles.statsGrid}>
        
        <div className={styles.statCard}>
            <div className={styles.iconWrapper} style={{background: '#dbeafe', color: '#2563eb'}}>
                <Target size={24} />
            </div>
            <div className={styles.statInfo}>
                <span className={styles.statValue}>{data.stats.active_leads}</span>
                <span className={styles.statLabel}>Leads Ativos</span>
            </div>
        </div>

        <div className={styles.statCard}>
            <div className={styles.iconWrapper} style={{background: '#fef3c7', color: '#d97706'}}>
                <CalendarCheck size={24} />
            </div>
            <div className={styles.statInfo}>
                <span className={styles.statValue}>{data.stats.pending_tasks}</span>
                <span className={styles.statLabel}>Tarefas Pendentes</span>
            </div>
        </div>

        <div className={styles.statCard}>
            <div className={styles.iconWrapper} style={{background: '#e0e7ff', color: '#4338ca'}}>
                <FileText size={24} />
            </div>
            <div className={styles.statInfo}>
                <span className={styles.statValue}>{data.stats.open_proposals}</span>
                <span className={styles.statLabel}>Propostas Abertas</span>
            </div>
        </div>

        <div className={styles.statCard}>
            <div className={styles.iconWrapper} style={{background: '#dcfce7', color: '#166534'}}>
                <DollarSign size={24} />
            </div>
            <div className={styles.statInfo}>
                <span className={styles.statValue} style={{fontSize: '1.2rem'}}>
                    {formatCurrency(data.stats.pipeline_value)}
                </span>
                <span className={styles.statLabel}>Em Negociação</span>
            </div>
        </div>

      </div>

      {/* CONTENT GRID */}
      <div className={styles.contentGrid}>
        
        {/* AGENDA */}
        <div className={styles.sectionCard}>
            <div className={styles.cardHeader}>
                <div className={styles.cardTitle}><CalendarCheck size={18} /> Minha Agenda</div>
                <Link href="/dashboard/tasks" className={styles.viewAllLink}>Ver todas</Link>
            </div>
            <div className={styles.cardBody}>
                {data.agenda.length === 0 ? (
                    <div className={styles.emptyState}>Sem tarefas pendentes. 🎉</div>
                ) : (
                    <div className={styles.agendaList}>
                        {data.agenda.map(task => (
                            <div key={task.id} className={`${styles.agendaItem} ${styles[task.priority]}`}>
                                <div className={styles.agendaTime}>
                                    {task.due_date ? new Date(task.due_date).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) : '--:--'}
                                </div>
                                <div className={styles.agendaContent}>
                                    <h4>{task.title}</h4>
                                    {task.due_date && (
                                        <p>{new Date(task.due_date).toLocaleDateString()}</p>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>

        {/* LEADS RECENTES */}
        <div className={styles.sectionCard}>
            <div className={styles.cardHeader}>
                <div className={styles.cardTitle}><Users size={18} /> Leads Recentes</div>
                <Link href="/dashboard/leads" className={styles.viewAllLink}>Ver funil</Link>
            </div>
            <div className={styles.cardBody} style={{padding: 0}}>
                {data.recent_leads.length === 0 ? (
                    <div className={styles.emptyState}>Nenhum lead recente.</div>
                ) : (
                    <table className={styles.table}>
                        <thead>
                            <tr>
                                <th>Nome / Empresa</th>
                                <th>Status</th>
                                <th>Data</th>
                            </tr>
                        </thead>
                        <tbody>
                            {data.recent_leads.map(lead => (
                                <tr key={lead.id}>
                                    <td>
                                        <div style={{fontWeight: 600, color: '#374151'}}>{lead.name}</div>
                                        {lead.company_name && <div style={{fontSize: '0.8rem', color: '#6b7280'}}>{lead.company_name}</div>}
                                    </td>
                                    <td>
                                        <span className={`${styles.statusBadge} ${styles[lead.status]}`}>
                                            {lead.status === 'in_progress' ? 'Em Andamento' : lead.status === 'new' ? 'Novo' : lead.status}
                                        </span>
                                    </td>
                                    <td style={{fontSize: '0.85rem', color: '#6b7280'}}>
                                        {new Date(lead.created_at).toLocaleDateString()}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}
            </div>
        </div>

      </div>
    </div>
  );
}