'use client';

import { useState, useEffect } from 'react';
import { Users, DollarSign, TrendingUp, FileText, Loader2 } from 'lucide-react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend
} from 'recharts';
import api from '@/services/api';
import styles from './page.module.css';

export default function DashboardPage() {
  const [metrics, setMetrics] = useState({
    total_contacts: 0,
    pipeline_value: 0,
    won_value: 0,
    total_proposals: 0
  });
  
  const [chartsData, setChartsData] = useState({
    salesByMonth: [],
    dealsByStage: []
  });

  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      try {
        const [summaryRes, chartsRes] = await Promise.all([
          api.get('/api/dashboard/summary'),
          api.get('/api/dashboard/charts')
        ]);
        
        setMetrics(summaryRes.data);
        setChartsData(chartsRes.data);
      } catch (error) {
        console.error('Erro ao carregar dashboard', error);
      } finally {
        setIsLoading(false);
      }
    }
    loadData();
  }, []);

  if (isLoading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', marginTop: '3rem' }}>
        <Loader2 className="animate-spin" size={32} />
      </div>
    );
  }

  // Cards de Resumo
  const cards = [
    { 
      title: 'Total de Clientes', 
      value: metrics.total_contacts, 
      icon: Users, 
      color: '#2563eb',
      format: (v: number) => v 
    },
    { 
      title: 'Em Negociação', 
      value: metrics.pipeline_value, 
      icon: TrendingUp, 
      color: '#f59e0b',
      format: (v: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v)
    },
    { 
      title: 'Vendas (Total)', 
      value: metrics.won_value, 
      icon: DollarSign, 
      color: '#22c55e',
      format: (v: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v)
    },
    { 
      title: 'Propostas Geradas', 
      value: metrics.total_proposals, 
      icon: FileText, 
      color: '#8b5cf6',
      format: (v: number) => v
    },
  ];

  // Cores para o gráfico de Pizza
  const PIE_COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8', '#82ca9d'];

  return (
    <div>
      <div className={styles.welcomeSection}>
        <h2 className={styles.welcomeTitle}>Visão Geral</h2>
        <p className={styles.welcomeText}>Acompanhe a saúde do seu negócio em tempo real.</p>
      </div>

      {/* Grid de Cards */}
      <div className={styles.grid}>
        {cards.map((card, index) => {
          const Icon = card.icon;
          return (
            <div key={index} className={styles.card}>
              <div className={styles.cardHeader}>
                <span className={styles.cardTitle}>{card.title}</span>
                <div style={{ backgroundColor: `${card.color}20`, padding: '8px', borderRadius: '8px', color: card.color }}>
                  <Icon size={20} />
                </div>
              </div>
              <div className={styles.cardValue}>
                {card.format(Number(card.value))}
              </div>
            </div>
          );
        })}
      </div>

      {/* Seção de Gráficos */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: '1.5rem', marginTop: '2rem' }}>
        
        {/* Gráfico 1: Vendas por Mês */}
        <div className={styles.card} style={{ minHeight: '350px', display: 'flex', flexDirection: 'column' }}>
          <h3 style={{ marginBottom: '1.5rem', fontSize: '1.1rem', fontWeight: 600 }}>Volume de Negócios (6 Meses)</h3>
          <div style={{ flex: 1, width: '100%', minHeight: '250px' }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartsData.salesByMonth}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="name" fontSize={12} />
                <YAxis fontSize={12} />
                <Tooltip 
                    formatter={(value) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(Number(value))}
                    contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 10px rgba(0,0,0,0.1)' }}
                />
                <Bar dataKey="value" fill="#2563eb" radius={[4, 4, 0, 0]} barSize={40} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Gráfico 2: Funil */}
        <div className={styles.card} style={{ minHeight: '350px', display: 'flex', flexDirection: 'column' }}>
          <h3 style={{ marginBottom: '1.5rem', fontSize: '1.1rem', fontWeight: 600 }}>Distribuição do Funil</h3>
          <div style={{ flex: 1, width: '100%', minHeight: '250px' }}>
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={chartsData.dealsByStage}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={80}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {chartsData.dealsByStage.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend verticalAlign="bottom" height={36} iconType="circle" />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

      </div>
    </div>
  );
}