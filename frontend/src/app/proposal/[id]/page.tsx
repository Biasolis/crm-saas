'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { CheckCircle2, XCircle, Download, Loader2, Calendar, FileText, Building2 } from 'lucide-react';
import styles from './page.module.css';

// URL da API (Fallback para localhost se não definido)
const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

interface ProposalItem {
  id: string;
  description: string;
  quantity: number;
  unit_price: number;
  total_price: number;
}

interface ProposalData {
  id: string;
  title: string;
  status: 'draft' | 'sent' | 'accepted' | 'rejected';
  total_amount: number;
  valid_until?: string;
  notes?: string;
  created_at: string;
  tenant_name: string;
  tenant_logo?: string;
  tenant_color?: string;
  tenant_email?: string;
  contact_name?: string;
  user_name?: string;
  items: ProposalItem[];
}

export default function PublicProposalPage() {
  const params = useParams();
  const id = params.id as string;
  
  const [data, setData] = useState<ProposalData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [actionLoading, setActionLoading] = useState(false);

  useEffect(() => {
    async function loadProposal() {
      try {
        // Fetch direto sem interceptors de auth
        const res = await fetch(`${API_URL}/api/proposals/${id}/public`);
        if (!res.ok) throw new Error('Proposta não encontrada ou expirada.');
        const json = await res.json();
        setData(json);
      } catch (err) {
        setError('Não foi possível carregar a proposta.');
      } finally {
        setLoading(false);
      }
    }
    if (id) loadProposal();
  }, [id]);

  async function handleAction(action: 'accept' | 'reject') {
    if (!confirm(action === 'accept' ? 'Deseja aprovar este orçamento?' : 'Deseja rejeitar este orçamento?')) return;
    
    setActionLoading(true);
    try {
        const res = await fetch(`${API_URL}/api/proposals/${id}/public/${action}`, { method: 'POST' });
        if (!res.ok) throw new Error('Erro ao processar ação');
        
        // Atualiza estado local
        setData(prev => prev ? { ...prev, status: action === 'accept' ? 'accepted' : 'rejected' } : null);
        alert(action === 'accept' ? 'Obrigado! Proposta aprovada com sucesso.' : 'Proposta rejeitada.');
    } catch (error) {
        alert('Erro de conexão. Tente novamente.');
    } finally {
        setActionLoading(false);
    }
  }

  if (loading) return <div className={styles.loading}><Loader2 className="animate-spin" size={32} /></div>;
  if (error || !data) return <div className={styles.errorContainer}><h3>{error || '404 - Proposta não encontrada'}</h3></div>;

  // Customização de Cor
  const primaryColor = data.tenant_color || '#2563eb';

  return (
    <div className={styles.container}>
      
      {/* HEADER DA EMPRESA */}
      <header className={styles.header}>
        <div className={styles.brand}>
            {data.tenant_logo ? (
                <img src={data.tenant_logo} alt="Logo" className={styles.logo} />
            ) : (
                <div className={styles.logoPlaceholder} style={{ background: primaryColor }}>
                    <Building2 color="white" size={24} />
                </div>
            )}
            <div>
                <h2 className={styles.companyName}>{data.tenant_name}</h2>
                <div className={styles.meta}>Proposta #{data.id.slice(0, 8).toUpperCase()}</div>
            </div>
        </div>
        
        <div className={styles.statusBadge} data-status={data.status}>
            {data.status === 'accepted' ? 'APROVADA' : data.status === 'rejected' ? 'REJEITADA' : 'AGUARDANDO APROVAÇÃO'}
        </div>
      </header>

      {/* DETALHES PRINCIPAIS */}
      <main className={styles.paper}>
        <div className={styles.topInfo}>
            <div>
                <h1 className={styles.title}>{data.title}</h1>
                <p className={styles.clientInfo}>
                    Preparado para: <strong>{data.contact_name || 'Cliente'}</strong>
                </p>
                <p className={styles.dateInfo}>
                    <Calendar size={14} /> Data: {new Date(data.created_at).toLocaleDateString()}
                    {data.valid_until && ` • Válida até: ${new Date(data.valid_until).toLocaleDateString()}`}
                </p>
            </div>
            {data.user_name && (
                <div className={styles.consultant}>
                    <small>Consultor Responsável:</small>
                    <strong>{data.user_name}</strong>
                </div>
            )}
        </div>

        {/* TABELA DE ITENS */}
        <div className={styles.tableContainer}>
            <table className={styles.table}>
                <thead>
                    <tr>
                        <th>Descrição</th>
                        <th style={{textAlign: 'center'}}>Qtd</th>
                        <th style={{textAlign: 'right'}}>Preço Unit.</th>
                        <th style={{textAlign: 'right'}}>Total</th>
                    </tr>
                </thead>
                <tbody>
                    {data.items.map((item) => (
                        <tr key={item.id}>
                            <td>{item.description}</td>
                            <td style={{textAlign: 'center'}}>{item.quantity}</td>
                            <td style={{textAlign: 'right'}}>
                                {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(Number(item.unit_price))}
                            </td>
                            <td style={{textAlign: 'right', fontWeight: 600}}>
                                {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(Number(item.total_price))}
                            </td>
                        </tr>
                    ))}
                </tbody>
                <tfoot>
                    <tr>
                        <td colSpan={3} className={styles.totalLabel}>Total Geral</td>
                        <td className={styles.totalValue} style={{ color: primaryColor }}>
                            {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(Number(data.total_amount))}
                        </td>
                    </tr>
                </tfoot>
            </table>
        </div>

        {/* NOTAS */}
        {data.notes && (
            <div className={styles.notesSection}>
                <h3>Notas e Observações</h3>
                <p>{data.notes}</p>
            </div>
        )}

        {/* ÁREA DE AÇÃO (SÓ APARECE SE AINDA NÃO FOI RESPONDIDA) */}
        {(data.status === 'draft' || data.status === 'sent') ? (
            <div className={styles.actionArea}>
                <button 
                    onClick={() => handleAction('reject')} 
                    disabled={actionLoading}
                    className={styles.btnReject}
                >
                    <XCircle size={20} /> Rejeitar
                </button>
                <button 
                    onClick={() => handleAction('accept')} 
                    disabled={actionLoading}
                    className={styles.btnAccept}
                    style={{ backgroundColor: primaryColor }}
                >
                    {actionLoading ? <Loader2 className="animate-spin" /> : <><CheckCircle2 size={20} /> Aprovar Orçamento</>}
                </button>
            </div>
        ) : (
            <div className={styles.finalStatus} style={{ 
                backgroundColor: data.status === 'accepted' ? '#f0fdf4' : '#fef2f2',
                color: data.status === 'accepted' ? '#15803d' : '#b91c1c',
                borderColor: data.status === 'accepted' ? '#bbf7d0' : '#fecaca'
            }}>
                {data.status === 'accepted' ? (
                    <>
                        <CheckCircle2 size={32} />
                        <div>
                            <h3>Orçamento Aprovado!</h3>
                            <p>Obrigado pela confiança. Em breve entraremos em contato.</p>
                        </div>
                    </>
                ) : (
                    <>
                        <XCircle size={32} />
                        <div>
                            <h3>Orçamento Rejeitado</h3>
                            <p>Agradecemos a oportunidade.</p>
                        </div>
                    </>
                )}
            </div>
        )}
      </main>

      <footer className={styles.footer}>
        <p>Documento gerado automaticamente via CRM SaaS.</p>
      </footer>
    </div>
  );
}