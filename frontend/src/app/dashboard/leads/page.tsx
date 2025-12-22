'use client';

import { useState, useEffect, useRef } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Plus, Filter, ArrowRightCircle, Trash2, Mail, Phone, Building, Upload, Download, Loader2 } from 'lucide-react';
import Papa from 'papaparse';
import api from '@/services/api';
import styles from './page.module.css';

// --- Interfaces ---
interface Lead {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  company_name: string | null;
  status: string;
  source: string | null;
}

// --- Schema de Validação (O que estava faltando) ---
const leadSchema = z.object({
  name: z.string().min(2, 'Nome obrigatório'),
  email: z.string().email('E-mail inválido').optional().or(z.literal('')),
  phone: z.string().optional(),
  company_name: z.string().optional(),
  source: z.string().optional(),
});

type LeadFormData = z.infer<typeof leadSchema>;

export default function LeadsPage() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  
  // Referência para o input de arquivo oculto
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { register, handleSubmit, reset, formState: { errors } } = useForm<LeadFormData>({
    resolver: zodResolver(leadSchema)
  });

  // --- Carregar Leads ---
  async function fetchLeads() {
    setIsLoading(true);
    try {
      const res = await api.get('/api/leads');
      setLeads(res.data);
    } catch (error) {
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => { fetchLeads(); }, []);

  // --- Ações ---

  async function handleCreate(data: LeadFormData) {
    try {
      await api.post('/api/leads', data);
      setIsModalOpen(false);
      reset();
      fetchLeads();
    } catch (e) {
      alert('Erro ao criar lead');
    }
  }

  async function handleConvert(id: string) {
    if (!confirm('Converter este Lead em Cliente e Empresa?')) return;
    try {
      await api.post(`/api/leads/${id}/convert`);
      alert('Lead convertido com sucesso!');
      fetchLeads();
    } catch (e) {
      alert('Erro ao converter');
    }
  }

  async function handleDelete(id: string) {
    if(!confirm('Excluir?')) return;
    await api.delete(`/api/leads/${id}`);
    fetchLeads();
  }

  // --- Importação CSV ---
  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: async (results) => {
        const parsedData = results.data;
        
        // Normalização dos dados do CSV
        const normalizedLeads = parsedData.map((row: any) => ({
            name: row['nome'] || row['name'] || row['Nome'] || 'Sem Nome',
            email: row['email'] || row['e-mail'] || row['Email'],
            phone: row['telefone'] || row['phone'] || row['celular'],
            company_name: row['empresa'] || row['company'],
            source: row['origem'] || row['source'] || 'Importação CSV'
        })).filter((l: any) => l.name !== 'Sem Nome');

        if (normalizedLeads.length === 0) {
            alert('Nenhum dado válido encontrado.');
            return;
        }

        try {
            const res = await api.post('/api/leads/import', { leads: normalizedLeads });
            alert(`${res.data.count} leads importados com sucesso!`);
            fetchLeads();
        } catch (error) {
            console.error(error);
            alert('Erro ao importar leads.');
        } finally {
            if (fileInputRef.current) fileInputRef.current.value = '';
        }
      }
    });
  };

  const downloadTemplate = () => {
    const csvContent = "data:text/csv;charset=utf-8,nome,email,telefone,empresa,origem\nJoão Silva,joao@teste.com,11999999999,Empresa Teste,Google";
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", "modelo_leads.csv");
    document.body.appendChild(link);
    link.click();
  };

  // Badge Status
  const getStatusBadge = (status: string) => {
    const colors: any = { new: '#3b82f6', contacted: '#f59e0b', qualified: '#10b981', disqualified: '#ef4444', converted: '#8b5cf6' };
    return <span style={{ backgroundColor: `${colors[status] || '#ccc'}20`, color: colors[status] || '#666', padding: '2px 8px', borderRadius: '12px', fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase' }}>{status}</span>;
  };

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h1 className={styles.title}>Leads (Pré-vendas)</h1>
        
        <div style={{ display: 'flex', gap: '0.5rem' }}>
            <input type="file" accept=".csv" ref={fileInputRef} style={{ display: 'none' }} onChange={handleFileUpload} />
            
            <button onClick={downloadTemplate} style={{ background: 'white', border: '1px solid #e5e7eb', color: '#6b7280', padding: '0.6rem 1rem', borderRadius: '8px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 500 }}>
                <Download size={18} /> <span style={{ fontSize: '0.9rem' }}>Modelo</span>
            </button>

            <button onClick={() => fileInputRef.current?.click()} style={{ background: 'white', border: '1px solid #e5e7eb', color: '#2563eb', padding: '0.6rem 1rem', borderRadius: '8px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 600 }}>
                <Upload size={18} /> Importar CSV
            </button>

            <button className={styles.addButton} onClick={() => setIsModalOpen(true)}>
                <Plus size={20} /> Novo Lead
            </button>
        </div>
      </div>

      <div className={styles.tableContainer}>
        {isLoading ? (
           <div style={{ padding: '2rem', textAlign: 'center' }}><Loader2 className="animate-spin" style={{ margin: '0 auto' }} /></div>
        ) : leads.length === 0 ? (
           <div className={styles.emptyState}>Nenhum lead encontrado.</div>
        ) : (
            <table className={styles.table}>
                <thead>
                    <tr>
                        <th>Nome / Empresa</th>
                        <th>Contatos</th>
                        <th>Status</th>
                        <th>Origem</th>
                        <th>Ações</th>
                    </tr>
                </thead>
                <tbody>
                    {leads.map(lead => (
                        <tr key={lead.id} style={{opacity: lead.status === 'converted' ? 0.6 : 1}}>
                            <td>
                                <div style={{fontWeight: 600}}>{lead.name}</div>
                                {lead.company_name && (
                                    <div style={{fontSize: '0.8rem', color: '#6b7280', display: 'flex', alignItems: 'center', gap: '4px'}}>
                                        <Building size={12} /> {lead.company_name}
                                    </div>
                                )}
                            </td>
                            <td>
                                <div style={{display: 'flex', flexDirection: 'column', gap: '2px', fontSize: '0.85rem'}}>
                                    {lead.email && <span><Mail size={12} style={{display:'inline'}}/> {lead.email}</span>}
                                    {lead.phone && <span><Phone size={12} style={{display:'inline'}}/> {lead.phone}</span>}
                                </div>
                            </td>
                            <td>{getStatusBadge(lead.status)}</td>
                            <td style={{fontSize: '0.85rem', color: '#6b7280'}}>{lead.source || '-'}</td>
                            <td style={{display: 'flex', gap: '0.5rem'}}>
                                {lead.status !== 'converted' && (
                                    <button onClick={() => handleConvert(lead.id)} title="Converter em Cliente" style={{border: 'none', background: 'none', cursor: 'pointer', color: '#8b5cf6'}}>
                                        <ArrowRightCircle size={20} />
                                    </button>
                                )}
                                <button onClick={() => handleDelete(lead.id)} style={{border: 'none', background: 'none', cursor: 'pointer', color: '#ef4444'}}>
                                    <Trash2 size={18} />
                                </button>
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        )}
      </div>

      {isModalOpen && (
        <div className={styles.modalOverlay}>
            <div className={styles.modalContent}>
                <div className={styles.modalHeader}><h3>Novo Lead</h3></div>
                <form onSubmit={handleSubmit(handleCreate)}>
                    <div className={styles.modalBody}>
                        <div className={styles.formGroup}>
                            <label className={styles.label}>Nome *</label>
                            <input {...register('name')} className={styles.input} />
                            {errors.name && <span style={{color:'red', fontSize:'0.8rem'}}>{errors.name.message}</span>}
                        </div>
                        <div className={styles.formGroup}><label className={styles.label}>Empresa</label><input {...register('company_name')} className={styles.input} /></div>
                        <div className={styles.formGroup}><label className={styles.label}>Email</label><input {...register('email')} className={styles.input} /></div>
                        <div className={styles.formGroup}><label className={styles.label}>Origem</label><input {...register('source')} className={styles.input} placeholder="Ex: LinkedIn" /></div>
                    </div>
                    <div className={styles.modalFooter}>
                        <button type="button" className={styles.cancelButton} onClick={() => setIsModalOpen(false)}>Cancelar</button>
                        <button type="submit" className={styles.saveButton}>Salvar</button>
                    </div>
                </form>
            </div>
        </div>
      )}
    </div>
  );
}