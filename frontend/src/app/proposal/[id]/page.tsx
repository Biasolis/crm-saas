'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { Loader2, Printer, CheckCircle, XCircle, Calendar, Mail } from 'lucide-react';
import api from '@/services/api';
import styles from './page.module.css'; // Vamos criar esse CSS abaixo

interface ProposalItem {
  description: string;
  quantity: number;
  unit_price: string; // Vem como string do banco
  total_price: string;
}

interface PublicProposal {
  id: string;
  title: string;
  created_at: string;
  valid_until: string | null;
  total_amount: string;
  notes: string | null;
  status: string;
  
  // Branding e Dados do Tenant
  tenant_name: string;
  tenant_logo: string | null;
  tenant_color: string;
  company_legal_name: string | null;
  company_document: string | null;
  
  // Cliente
  contact_name: string;
  contact_email: string;
  
  items: ProposalItem[];
}

export default function PublicProposalPage() {
  const params = useParams();
  const [proposal, setProposal] = useState<PublicProposal | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        // Usamos api.get mas sem o token (a rota é pública)
        // O axios interceptor manda o token se tiver, mas aqui não atrapalha
        const res = await api.get(`/api/proposals/${params.id}/public`);
        setProposal(res.data);
      } catch (error) {
        console.error(error);
      } finally {
        setIsLoading(false);
      }
    }
    load();
  }, [params.id]);

  if (isLoading) return <div className={styles.loading}><Loader2 className="animate-spin" /></div>;
  if (!proposal) return <div className={styles.error}>Proposta não encontrada ou expirada.</div>;

  // Aplica cor do tenant dinamicamente
  const primaryColor = proposal.tenant_color || '#000000';

  return (
    <div className={styles.wrapper}>
      
      {/* Barra de Ações (Fixo no topo) */}
      <div className={styles.topBar}>
        <div className={styles.statusBadge}>
          Status: <strong>{proposal.status === 'draft' ? 'Pendente' : proposal.status}</strong>
        </div>
        <div className={styles.actions}>
          <button className={styles.printButton} onClick={() => window.print()}>
            <Printer size={18} /> Imprimir / Salvar PDF
          </button>
          <button 
            className={styles.acceptButton}
            style={{ backgroundColor: primaryColor }}
            onClick={() => alert('Em breve: Aceite Digital!')}
          >
            <CheckCircle size={18} /> Aprovar Proposta
          </button>
        </div>
      </div>

      {/* Folha A4 da Proposta */}
      <div className={styles.paper}>
        
        {/* Cabeçalho */}
        <header className={styles.header}>
          <div className={styles.brand}>
            {proposal.tenant_logo ? (
              <img src={proposal.tenant_logo} alt="Logo" className={styles.logo} />
            ) : (
              <div className={styles.logoPlaceholder} style={{ backgroundColor: primaryColor }}>
                {proposal.tenant_name.charAt(0)}
              </div>
            )}
            <div className={styles.companyInfo}>
              <h1 className={styles.companyName}>{proposal.tenant_name}</h1>
              <p>{proposal.company_legal_name}</p>
              <p>{proposal.company_document}</p>
            </div>
          </div>
          
          <div className={styles.proposalMeta}>
            <h2 style={{ color: primaryColor }}>PROPOSTA</h2>
            <p>#{proposal.id.slice(0, 8).toUpperCase()}</p>
            <div className={styles.metaRow}>
              <Calendar size={14} /> 
              {new Date(proposal.created_at).toLocaleDateString()}
            </div>
            {proposal.valid_until && (
              <div className={styles.metaRow} style={{ color: '#ef4444' }}>
                Válido até: {new Date(proposal.valid_until).toLocaleDateString()}
              </div>
            )}
          </div>
        </header>

        <hr className={styles.divider} style={{ borderColor: primaryColor }} />

        {/* Cliente e Título */}
        <section className={styles.intro}>
          <div className={styles.clientBox}>
            <span className={styles.label}>Preparado para:</span>
            <h3 className={styles.clientName}>{proposal.contact_name || 'Cliente'}</h3>
            {proposal.contact_email && (
              <div className={styles.metaRow}>
                <Mail size={14} /> {proposal.contact_email}
              </div>
            )}
          </div>
          <div className={styles.projectBox}>
            <span className={styles.label}>Projeto / Referência:</span>
            <h3 className={styles.projectTitle}>{proposal.title}</h3>
          </div>
        </section>

        {/* Tabela de Itens */}
        <section className={styles.itemsSection}>
          <table className={styles.table}>
            <thead style={{ backgroundColor: primaryColor, color: 'white' }}>
              <tr>
                <th>Descrição</th>
                <th style={{ textAlign: 'center' }}>Qtd</th>
                <th style={{ textAlign: 'right' }}>Valor Unit.</th>
                <th style={{ textAlign: 'right' }}>Total</th>
              </tr>
            </thead>
            <tbody>
              {proposal.items.map((item, index) => (
                <tr key={index}>
                  <td>{item.description}</td>
                  <td style={{ textAlign: 'center' }}>{item.quantity}</td>
                  <td style={{ textAlign: 'right' }}>
                    {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(Number(item.unit_price))}
                  </td>
                  <td style={{ textAlign: 'right', fontWeight: 600 }}>
                    {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(Number(item.total_price))}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>

        {/* Totais */}
        <section className={styles.totalSection}>
          <div className={styles.totalRow}>
            <span>Subtotal</span>
            <span>{new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(Number(proposal.total_amount))}</span>
          </div>
          <div className={styles.totalRowFinal} style={{ color: primaryColor }}>
            <span>Total Geral</span>
            <span>{new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(Number(proposal.total_amount))}</span>
          </div>
        </section>

        {/* Observações */}
        {proposal.notes && (
          <section className={styles.notes}>
            <h4>Observações e Condições:</h4>
            <p>{proposal.notes}</p>
          </section>
        )}

        {/* Rodapé */}
        <footer className={styles.footer}>
          <p>Este documento foi gerado eletronicamente por <strong>CRM SaaS</strong>.</p>
        </footer>

      </div>
    </div>
  );
}