'use client';

import { useState, useEffect } from 'react';
import { Calendar, Search, Trophy, TrendingUp, Users, DollarSign, Loader2 } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import api from '@/services/api';
// Podemos usar um CSS Module novo ou reutilizar o do Dashboard
// Vou criar estilos inline para facilitar a cópia rápida neste exemplo complexo
import styles from '../page.module.css'; // Reutilizando estilos básicos do dashboard

interface ReportData {
  period: { start: string; end: string };
  sales: { count: number; value: number };
  sellers_ranking: { name: string; deals_won: string; total_value: string }[];
  conversion: { total_leads: number; converted_leads: number };
}

export default function ReportsPage() {
  const [data, setData] = useState<ReportData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  
  // Filtros de Data (Padrão: Últimos 30 dias)
  const [startDate, setStartDate] = useState(new Date(new Date().setDate(new Date().getDate() - 30)).toISOString().split('T')[0]);
  const [endDate, setEndDate] = useState(new Date().toISOString().split('T')[0]);

  async function fetchReports() {
    setIsLoading(true);
    try {
      const res = await api.get(`/api/analytics?startDate=${startDate}&endDate=${endDate}`);
      setData(res.data);
    } catch (error) {
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => { fetchReports(); }, []); // Carrega inicial

  if (!data && isLoading) return <div style={{padding:'2rem', textAlign:'center'}}><Loader2 className="animate-spin" /></div>;

  return (
    <div style={{display:'flex', flexDirection:'column', gap:'2rem'}}>
      
      {/* Header com Filtros */}
      <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', flexWrap:'wrap', gap:'1rem'}}>
        <div>
            <h1 style={{fontSize:'1.5rem', fontWeight:700, color:'#111827'}}>Relatórios de Performance</h1>
            <p style={{color:'#6b7280', fontSize:'0.9rem'}}>Análise detalhada de vendas e conversão.</p>
        </div>

        <div style={{display:'flex', gap:'0.5rem', alignItems:'center', background:'white', padding:'0.5rem', borderRadius:'8px', border:'1px solid #e5e7eb'}}>
            <div style={{display:'flex', alignItems:'center', gap:'0.5rem'}}>
                <Calendar size={16} color="#6b7280"/>
                <input 
                    type="date" 
                    value={startDate} 
                    onChange={e => setStartDate(e.target.value)}
                    style={{border:'none', outline:'none', color:'#4b5563', fontSize:'0.9rem'}}
                />
            </div>
            <span style={{color:'#9ca3af'}}>até</span>
            <div style={{display:'flex', alignItems:'center', gap:'0.5rem'}}>
                <input 
                    type="date" 
                    value={endDate} 
                    onChange={e => setEndDate(e.target.value)}
                    style={{border:'none', outline:'none', color:'#4b5563', fontSize:'0.9rem'}}
                />
            </div>
            <button 
                onClick={fetchReports}
                style={{marginLeft:'0.5rem', background:'#2563eb', color:'white', border:'none', padding:'0.4rem 0.8rem', borderRadius:'6px', cursor:'pointer'}}
            >
                <Search size={16} />
            </button>
        </div>
      </div>

      {isLoading ? (
         <div style={{padding:'4rem', textAlign:'center'}}><Loader2 className="animate-spin" style={{margin:'auto'}} /></div>
      ) : data ? (
        <>
            {/* KPI Cards */}
            <div className={styles.grid}> {/* Reutiliza classe grid do dashboard */}
                <div className={styles.card}>
                    <div className={styles.cardHeader}>
                        <span className={styles.cardTitle}>Vendas no Período</span>
                        <DollarSign size={20} color="#22c55e" />
                    </div>
                    <div className={styles.cardValue} style={{color: '#22c55e'}}>
                        {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(data.sales.value)}
                    </div>
                    <div style={{fontSize:'0.8rem', color:'#6b7280', marginTop:'0.5rem'}}>
                        {data.sales.count} negócios fechados
                    </div>
                </div>

                <div className={styles.card}>
                    <div className={styles.cardHeader}>
                        <span className={styles.cardTitle}>Taxa de Conversão</span>
                        <TrendingUp size={20} color="#f59e0b" />
                    </div>
                    <div className={styles.cardValue}>
                        {data.conversion.total_leads > 0 
                            ? ((data.conversion.converted_leads / data.conversion.total_leads) * 100).toFixed(1) 
                            : 0}%
                    </div>
                    <div style={{fontSize:'0.8rem', color:'#6b7280', marginTop:'0.5rem'}}>
                        {data.conversion.converted_leads} de {data.conversion.total_leads} leads
                    </div>
                </div>

                <div className={styles.card}>
                    <div className={styles.cardHeader}>
                        <span className={styles.cardTitle}>Melhor Vendedor</span>
                        <Trophy size={20} color="#8b5cf6" />
                    </div>
                    <div className={styles.cardValue} style={{fontSize:'1.5rem'}}>
                        {data.sellers_ranking[0]?.name || '-'}
                    </div>
                    <div style={{fontSize:'0.8rem', color:'#6b7280', marginTop:'0.5rem'}}>
                        {data.sellers_ranking[0] 
                            ? new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(Number(data.sellers_ranking[0].total_value))
                            : 'Sem vendas'}
                    </div>
                </div>
            </div>

            {/* Ranking Detalhado & Gráfico */}
            <div style={{display:'grid', gridTemplateColumns:'repeat(auto-fit, minmax(400px, 1fr))', gap:'2rem'}}>
                
                {/* Tabela de Vendedores */}
                <div style={{background:'white', padding:'1.5rem', borderRadius:'12px', border:'1px solid #e5e7eb'}}>
                    <h3 style={{fontSize:'1.1rem', fontWeight:600, marginBottom:'1rem', display:'flex', alignItems:'center', gap:'0.5rem'}}>
                        <Users size={18} /> Performance da Equipe
                    </h3>
                    <table style={{width:'100%', borderCollapse:'collapse'}}>
                        <thead>
                            <tr style={{borderBottom:'1px solid #e5e7eb', textAlign:'left'}}>
                                <th style={{padding:'0.8rem', fontSize:'0.8rem', color:'#6b7280'}}>Vendedor</th>
                                <th style={{padding:'0.8rem', fontSize:'0.8rem', color:'#6b7280', textAlign:'center'}}>Negócios</th>
                                <th style={{padding:'0.8rem', fontSize:'0.8rem', color:'#6b7280', textAlign:'right'}}>Valor Total</th>
                            </tr>
                        </thead>
                        <tbody>
                            {data.sellers_ranking.length === 0 && (
                                <tr><td colSpan={3} style={{padding:'1rem', textAlign:'center', color:'#9ca3af'}}>Sem dados no período</td></tr>
                            )}
                            {data.sellers_ranking.map((seller, index) => (
                                <tr key={index} style={{borderBottom:'1px dashed #f3f4f6'}}>
                                    <td style={{padding:'0.8rem', fontWeight:500}}>{seller.name}</td>
                                    <td style={{padding:'0.8rem', textAlign:'center'}}>{seller.deals_won}</td>
                                    <td style={{padding:'0.8rem', textAlign:'right', fontWeight:600, color:'#059669'}}>
                                        {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(Number(seller.total_value))}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                {/* Gráfico Visual */}
                <div style={{background:'white', padding:'1.5rem', borderRadius:'12px', border:'1px solid #e5e7eb', minHeight:'300px', display:'flex', flexDirection:'column'}}>
                    <h3 style={{fontSize:'1.1rem', fontWeight:600, marginBottom:'1rem'}}>Ranking Visual</h3>
                    <div style={{flex:1, width:'100%', minHeight:'250px'}}>
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={data.sellers_ranking} layout="vertical" margin={{top: 5, right: 30, left: 40, bottom: 5}}>
                                <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                                <XAxis type="number" hide />
                                <YAxis dataKey="name" type="category" width={100} style={{fontSize:'0.8rem', fontWeight:500}} />
                                <Tooltip formatter={(value) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(Number(value))} />
                                <Bar dataKey="total_value" fill="#3b82f6" radius={[0, 4, 4, 0]} barSize={20}>
                                    {data.sellers_ranking.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={index === 0 ? '#f59e0b' : '#3b82f6'} />
                                    ))}
                                </Bar>
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>

            </div>
        </>
      ) : null}
    </div>
  );
}