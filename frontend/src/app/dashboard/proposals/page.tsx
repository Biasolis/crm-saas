'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Plus, Loader2, Trash2, Eye } from 'lucide-react';
import api from '@/services/api';

export default function ProposalsPage() {
  const [proposals, setProposals] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Busca propostas ao carregar
  async function fetchProposals() {
    try {
      const response = await api.get('/api/proposals');
      setProposals(response.data);
    } catch (error) {
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => { fetchProposals(); }, []);

  // Deletar Proposta
  async function handleDelete(id: string) {
    if(!confirm('Tem certeza que deseja excluir esta proposta?')) return;
    try {
      await api.delete(`/api/proposals/${id}`);
      fetchProposals(); // Atualiza lista
    } catch (error) {
      alert('Erro ao excluir proposta');
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h1 style={{ fontSize: '1.5rem', fontWeight: 700 }}>Propostas Comerciais</h1>
        <Link 
          href="/dashboard/proposals/new"
          style={{ 
            backgroundColor: '#2563eb', 
            color: 'white', 
            padding: '0.6rem 1rem', 
            borderRadius: '8px', 
            textDecoration: 'none', 
            fontWeight: 600, 
            display: 'flex', 
            alignItems: 'center', 
            gap: '0.5rem'
          }}
        >
          <Plus size={20} /> Nova Proposta
        </Link>
      </div>

      {/* Tabela de Listagem */}
      <div style={{ backgroundColor: 'white', border: '1px solid #e5e7eb', borderRadius: '8px', overflow: 'hidden' }}>
        {isLoading ? (
           <div style={{ padding: '2rem', textAlign: 'center' }}>
             <Loader2 className="animate-spin" style={{ margin: 'auto'}} />
           </div>
        ) : proposals.length === 0 ? (
           <div style={{ padding: '3rem', textAlign: 'center', color: '#6b7280' }}>
             Nenhuma proposta criada.
           </div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
            <thead>
              <tr style={{ backgroundColor: '#f9fafb', borderBottom: '1px solid #e5e7eb' }}>
                <th style={{ padding: '1rem', fontSize: '0.8rem', textTransform: 'uppercase', color: '#6b7280' }}>Título / Cliente</th>
                <th style={{ padding: '1rem', fontSize: '0.8rem', textTransform: 'uppercase', color: '#6b7280' }}>Data</th>
                <th style={{ padding: '1rem', fontSize: '0.8rem', textTransform: 'uppercase', color: '#6b7280' }}>Valor Total</th>
                <th style={{ padding: '1rem', fontSize: '0.8rem', textTransform: 'uppercase', color: '#6b7280' }}>Status</th>
                <th style={{ padding: '1rem', fontSize: '0.8rem', textTransform: 'uppercase', color: '#6b7280' }}>Ações</th>
              </tr>
            </thead>
            <tbody>
              {proposals.map(p => (
                <tr key={p.id} style={{ borderBottom: '1px solid #e5e7eb' }}>
                  <td style={{ padding: '1rem' }}>
                    <div style={{ fontWeight: 600, color: '#111827' }}>{p.title}</div>
                    <div style={{ fontSize: '0.85rem', color: '#6b7280' }}>
                      {p.contact_name || 'Sem cliente vinculado'}
                    </div>
                  </td>
                  <td style={{ padding: '1rem', color: '#4b5563' }}>
                    {new Date(p.created_at).toLocaleDateString()}
                  </td>
                  <td style={{ padding: '1rem', fontWeight: 600, color: '#059669' }}>
                    {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(Number(p.total_amount))}
                  </td>
                  <td style={{ padding: '1rem' }}>
                    <span style={{ 
                      backgroundColor: '#eff6ff', 
                      color: '#2563eb', 
                      padding: '2px 8px', 
                      borderRadius: '12px', 
                      fontSize: '0.75rem', 
                      fontWeight: 600, 
                      textTransform: 'uppercase' 
                    }}>
                      {p.status}
                    </span>
                  </td>
                  <td style={{ padding: '1rem', display: 'flex', gap: '0.75rem' }}>
                    
                    {/* Botão de Visualizar Link Público */}
                    <Link 
                      href={`/proposal/${p.id}`} 
                      target="_blank"
                      title="Ver Proposta Pública"
                      style={{ color: '#2563eb', display: 'flex', alignItems: 'center' }}
                    >
                      <Eye size={18} />
                    </Link>

                    {/* Botão de Excluir */}
                    <button 
                      title="Excluir"
                      style={{ border: 'none', background: 'none', cursor: 'pointer', color: '#ef4444' }} 
                      onClick={() => handleDelete(p.id)}
                    >
                      <Trash2 size={18} />
                    </button>
                    
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}