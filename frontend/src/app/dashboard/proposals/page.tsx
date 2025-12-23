'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Plus, FileText, Calendar, ExternalLink, Trash2, Check, X, Send, Copy, Loader2, MoreVertical } from 'lucide-react';
import api from '@/services/api';
import styles from './page.module.css';

interface Proposal {
  id: string;
  title: string;
  contact_name?: string;
  deal_title?: string;
  total_amount: string | number;
  status: 'draft' | 'sent' | 'accepted' | 'rejected';
  created_at: string;
  valid_until?: string;
}

export default function ProposalsPage() {
  const [proposals, setProposals] = useState<Proposal[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  useEffect(() => {
    fetchProposals();
  }, []);

  async function fetchProposals() {
    setIsLoading(true);
    try {
      const res = await api.get('/api/proposals');
      setProposals(res.data);
    } catch (error) {
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  }

  async function updateStatus(id: string, newStatus: string) {
    if(!confirm(`Mudar status para ${newStatus.toUpperCase()}?`)) return;
    try {
        await api.patch(`/api/proposals/${id}/status`, { status: newStatus });
        fetchProposals();
    } catch (error) {
        alert('Erro ao atualizar status');
    }
  }

  async function deleteProposal(id: string) {
    if(!confirm('Excluir proposta permanentemente?')) return;
    try {
        await api.delete(`/api/proposals/${id}`);
        setProposals(prev => prev.filter(p => p.id !== id));
    } catch (error) {
        alert('Erro ao excluir');
    }
  }

  function copyPublicLink(id: string) {
    const url = `${window.location.origin}/proposal/${id}`;
    navigator.clipboard.writeText(url);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  }

  // Helpers de UI
  const getStatusColor = (status: string) => {
    switch(status) {
        case 'accepted': return { bg: '#dcfce7', text: '#166534', label: 'Aceita' };
        case 'rejected': return { bg: '#fee2e2', text: '#991b1b', label: 'Rejeitada' };
        case 'sent': return { bg: '#dbeafe', text: '#1e40af', label: 'Enviada' };
        default: return { bg: '#f3f4f6', text: '#4b5563', label: 'Rascunho' };
    }
  };

  if (isLoading) return <div style={{display:'flex', justifyContent:'center', padding:'4rem'}}><Loader2 className="animate-spin" /></div>;

  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <div>
            <h1 style={{ fontSize: '1.5rem', fontWeight: 700, color: '#1f2937' }}>Propostas Comerciais</h1>
            <p style={{ color: '#6b7280' }}>Crie orçamentos e acompanhe o fechamento.</p>
        </div>
        <Link href="/dashboard/proposals/new" style={{ textDecoration: 'none' }}>
            <button style={{ 
                background: '#2563eb', color: 'white', border: 'none', padding: '0.75rem 1.25rem', 
                borderRadius: '8px', cursor: 'pointer', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.5rem'
            }}>
                <Plus size={20} /> Nova Proposta
            </button>
        </Link>
      </div>

      <div style={{ display: 'grid', gap: '1rem' }}>
        {proposals.length === 0 && (
            <div style={{ textAlign: 'center', padding: '3rem', background: '#f9fafb', borderRadius: '12px', border: '1px dashed #d1d5db' }}>
                <FileText size={48} color="#9ca3af" style={{marginBottom: '1rem'}} />
                <h3 style={{color: '#374151'}}>Nenhuma proposta criada</h3>
                <p style={{color: '#6b7280'}}>Comece criando uma proposta para um de seus clientes.</p>
            </div>
        )}

        {proposals.map(proposal => {
            const statusStyle = getStatusColor(proposal.status);
            return (
                <div key={proposal.id} style={{ 
                    background: 'white', padding: '1.5rem', borderRadius: '12px', 
                    border: '1px solid #e5e7eb', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem'
                }}>
                    <div style={{ flex: 1, minWidth: '250px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.5rem' }}>
                            <h3 style={{ fontWeight: 600, fontSize: '1.1rem', color: '#111827', margin: 0 }}>{proposal.title}</h3>
                            <span style={{ 
                                background: statusStyle.bg, color: statusStyle.text, 
                                padding: '2px 8px', borderRadius: '12px', fontSize: '0.75rem', fontWeight: 600, textTransform: 'uppercase' 
                            }}>
                                {statusStyle.label}
                            </span>
                        </div>
                        <div style={{ fontSize: '0.9rem', color: '#6b7280', display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                            <span>Cliente: <strong>{proposal.contact_name || 'N/A'}</strong></span>
                            {proposal.deal_title && <span>Negócio: {proposal.deal_title}</span>}
                        </div>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '2rem' }}>
                        <div style={{ textAlign: 'right' }}>
                            <div style={{ fontSize: '0.85rem', color: '#6b7280' }}>Valor Total</div>
                            <div style={{ fontSize: '1.25rem', fontWeight: 700, color: '#059669' }}>
                                {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(Number(proposal.total_amount))}
                            </div>
                            {proposal.valid_until && (
                                <div style={{ fontSize: '0.75rem', color: '#ef4444', marginTop: '0.2rem' }}>
                                    Válida até {new Date(proposal.valid_until).toLocaleDateString()}
                                </div>
                            )}
                        </div>

                        <div style={{ display: 'flex', gap: '0.5rem' }}>
                            <button 
                                onClick={() => copyPublicLink(proposal.id)}
                                title="Copiar Link Público"
                                style={{ padding: '8px', borderRadius: '6px', border: '1px solid #d1d5db', background: 'white', cursor: 'pointer', color: copiedId === proposal.id ? '#059669' : '#374151' }}
                            >
                                {copiedId === proposal.id ? <Check size={18} /> : <Copy size={18} />}
                            </button>
                            
                            <a href={`/proposal/${proposal.id}`} target="_blank" rel="noopener noreferrer" style={{ textDecoration: 'none' }}>
                                <button title="Ver Proposta" style={{ padding: '8px', borderRadius: '6px', border: '1px solid #d1d5db', background: 'white', cursor: 'pointer', color: '#2563eb' }}>
                                    <ExternalLink size={18} />
                                </button>
                            </a>

                            {proposal.status === 'draft' && (
                                <button 
                                    onClick={() => updateStatus(proposal.id, 'sent')}
                                    title="Marcar como Enviada"
                                    style={{ padding: '8px', borderRadius: '6px', border: '1px solid #bfdbfe', background: '#eff6ff', cursor: 'pointer', color: '#1d4ed8' }}
                                >
                                    <Send size={18} />
                                </button>
                            )}
                            
                            <button 
                                onClick={() => deleteProposal(proposal.id)}
                                title="Excluir"
                                style={{ padding: '8px', borderRadius: '6px', border: '1px solid #fee2e2', background: '#fef2f2', cursor: 'pointer', color: '#ef4444' }}
                            >
                                <Trash2 size={18} />
                            </button>
                        </div>
                    </div>
                </div>
            );
        })}
      </div>
    </div>
  );
}