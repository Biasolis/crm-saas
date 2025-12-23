'use client';

import { useState, useEffect } from 'react';
import { BarChart3, TrendingUp, Users, DollarSign, Target, Loader2, AlertCircle } from 'lucide-react';
import api from '@/services/api';
import styles from './page.module.css';

interface AnalyticsData {
  leads: {
    new: number;
    in_progress: number;
    converted: number;
    lost: number;
    total: number;
  };
  revenue: {
    sent: number;
    accepted: number;
    rejected: number;
  };
  conversionRate: string;
  agents: Array<{
    id: string;
    name: string;
    converted_leads: string;
    completed_tasks: string;
  }>;
}

export default function ReportsPage() {
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      try {
        const res = await api.get('/api/analytics/dashboard');
        setData(res.data);
      } catch (error) {
        console.error('Erro ao carregar relatórios', error);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  if (loading) return <div style={{display:'flex', justifyContent:'center', padding:'4rem'}}><Loader2 className="animate-spin" /></div>;
  if (!data) return <div style={{padding:'2rem', textAlign:'center'}}><AlertCircle style={{margin:'0 auto'}}/> Erro ao carregar dados.</div>;

  // Formatter
  const formatBRL = (val: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);

  // Cálculos para o Funil (Porcentagens visuais)
  const maxLeads = Math.max(data.leads.total, 1); // Evita divisão por zero
  const pctNew = (data.leads.total / maxLeads) * 100; // Topo do funil (Todos)
  const pctProgress = ((data.leads.in_progress + data.leads.converted) / maxLeads) * 100; // Meio do funil
  const pctConverted = (data.leads.converted / maxLeads) * 100; // Fundo do funil

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h1 className={styles.title}>
            <BarChart3 color="#2563eb" /> Visão Geral & Relatórios
        </h1>
        <p className={styles.subtitle}>Métricas de desempenho em tempo real.</p>
      </div>

      {/* --- GRID DE KPIS --- */}
      <div className={styles.kpiGrid}>
        {/* Total Leads */}
        <div className={styles.kpiCard}>
            <div className={styles.kpiLabel}>Total de Leads</div>
            <div className={styles.kpiValue}>{data.leads.total}</div>
            <div className={styles.kpiSub} style={{color: '#2563eb'}}>
                <Users size={14} style={{display:'inline', marginRight:4}}/>
                Na base de dados
            </div>
        </div>

        {/* Taxa de Conversão */}
        <div className={styles.kpiCard}>
            <div className={styles.kpiLabel}>Taxa de Conversão</div>
            <div className={styles.kpiValue}>{data.conversionRate}%</div>
            <div className={styles.kpiSub} style={{color: Number(data.conversionRate) > 10 ? '#059669' : '#d97706'}}>
                <Target size={14} style={{display:'inline', marginRight:4}}/>
                Leads convertidos
            </div>
        </div>

        {/* Receita Garantida */}
        <div className={styles.kpiCard}>
            <div className={styles.kpiLabel}>Receita Fechada</div>
            <div className={styles.kpiValue} style={{color: '#059669'}}>
                {formatBRL(data.revenue.accepted)}
            </div>
            <div className={styles.kpiSub}>
                <DollarSign size={14} style={{display:'inline', marginRight:4}}/>
                Propostas aceitas
            </div>
        </div>

        {/* Pipeline (Em Negociação) */}
        <div className={styles.kpiCard}>
            <div className={styles.kpiLabel}>Em Negociação</div>
            <div className={styles.kpiValue} style={{color: '#4b5563'}}>
                {formatBRL(data.revenue.sent)}
            </div>
            <div className={styles.kpiSub}>
                <TrendingUp size={14} style={{display:'inline', marginRight:4}}/>
                Propostas enviadas
            </div>
        </div>
      </div>

      {/* --- SECTIONS GRID --- */}
      <div className={styles.sectionsGrid}>
        
        {/* FUNIL DE VENDAS */}
        <div className={styles.sectionCard}>
            <h3 className={styles.sectionTitle}>Funil de Vendas</h3>
            
            <div className={styles.funnelContainer}>
                {/* Etapa 1: Visitantes/Total */}
                <div className={styles.funnelStep}>
                    <div className={styles.funnelBar} style={{width: `${pctNew}%`, background: '#dbeafe'}}></div>
                    <div className={styles.funnelLabel}>
                        <span>Leads Totais</span>
                        <span>{data.leads.total}</span>
                    </div>
                </div>

                {/* Etapa 2: Em Atendimento */}
                <div className={styles.funnelStep}>
                    <div className={styles.funnelBar} style={{width: `${pctProgress}%`, background: '#93c5fd'}}></div>
                    <div className={styles.funnelLabel}>
                        <span>Em Atendimento</span>
                        <span>{data.leads.in_progress + data.leads.converted}</span>
                    </div>
                </div>

                {/* Etapa 3: Convertidos */}
                <div className={styles.funnelStep}>
                    <div className={styles.funnelBar} style={{width: `${pctConverted}%`, background: '#86efac'}}></div>
                    <div className={styles.funnelLabel}>
                        <span>Vendas Realizadas</span>
                        <span>{data.leads.converted}</span>
                    </div>
                </div>

                {/* Perdidos (Visualmente separado) */}
                <div style={{marginTop: '1rem', paddingTop: '0.5rem', borderTop: '1px dashed #e5e7eb', fontSize: '0.85rem', color: '#ef4444', display: 'flex', justifyContent: 'space-between'}}>
                    <span>Perdidos / Desqualificados</span>
                    <strong>{data.leads.lost}</strong>
                </div>
            </div>
        </div>

        {/* PERFORMANCE EQUIPE */}
        <div className={styles.sectionCard}>
            <h3 className={styles.sectionTitle}>Top Performance</h3>
            
            {data.agents.length === 0 ? (
                <p style={{color:'#9ca3af', textAlign:'center', padding:'2rem'}}>Sem dados de equipe ainda.</p>
            ) : (
                <table className={styles.table}>
                    <thead>
                        <tr>
                            <th>Vendedor</th>
                            <th style={{textAlign:'center'}}>Vendas</th>
                            <th style={{textAlign:'center'}}>Tarefas</th>
                        </tr>
                    </thead>
                    <tbody>
                        {data.agents.map(agent => (
                            <tr key={agent.id}>
                                <td>
                                    <div className={styles.agentName}>
                                        <div className={styles.avatar}>{agent.name.charAt(0)}</div>
                                        {agent.name}
                                    </div>
                                </td>
                                <td style={{textAlign:'center', fontWeight:700, color: '#059669'}}>
                                    {agent.converted_leads}
                                </td>
                                <td style={{textAlign:'center', color: '#6b7280'}}>
                                    {agent.completed_tasks}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            )}
        </div>

      </div>
    </div>
  );
}