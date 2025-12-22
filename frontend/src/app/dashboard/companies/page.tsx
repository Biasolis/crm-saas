'use client';

import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Plus, Building2, Globe, Phone, MapPin, Edit2, Trash2, X, Loader2 } from 'lucide-react';
import api from '@/services/api';
// Podemos reutilizar o CSS de contatos ou criar um novo
import styles from '../contacts/page.module.css'; 

interface Company {
  id: string;
  name: string;
  document_number: string | null;
  website: string | null;
  phone: string | null;
  address: string | null;
  contact_count?: number;
}

const companySchema = z.object({
  name: z.string().min(2, 'Nome obrigatório'),
  document_number: z.string().optional(),
  website: z.string().optional(),
  phone: z.string().optional(),
  address: z.string().optional(),
});

type CompanyFormData = z.infer<typeof companySchema>;

export default function CompaniesPage() {
  const [companies, setCompanies] = useState<Company[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [editingCompany, setEditingCompany] = useState<Company | null>(null);
  
  // Controle de Permissão (Novo)
  const [userRole, setUserRole] = useState<string>('');

  const { register, handleSubmit, reset, setValue, formState: { errors } } = useForm<CompanyFormData>({
    resolver: zodResolver(companySchema)
  });

  async function fetchCompanies() {
    try {
      const res = await api.get('/api/companies');
      setCompanies(res.data);
    } catch (error) {
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => { 
      // 1. Identificar Role do Usuário
      const userData = localStorage.getItem('crm_user');
      if (userData) {
          try { setUserRole(JSON.parse(userData).role); } catch (e) { console.error(e); }
      }
      fetchCompanies(); 
  }, []);

  function handleOpenModal(company?: Company) {
    if (company) {
      setEditingCompany(company);
      setValue('name', company.name);
      setValue('document_number', company.document_number || '');
      setValue('website', company.website || '');
      setValue('phone', company.phone || '');
      setValue('address', company.address || '');
    } else {
      setEditingCompany(null);
      reset();
    }
    setIsModalOpen(true);
  }

  async function handleSave(data: CompanyFormData) {
    setIsSaving(true);
    try {
      if (editingCompany) {
        await api.put(`/api/companies/${editingCompany.id}`, data);
      } else {
        await api.post('/api/companies', data);
      }
      setIsModalOpen(false);
      fetchCompanies();
    } catch (error) {
      alert('Erro ao salvar empresa.');
    } finally {
      setIsSaving(false);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm('Deseja excluir esta empresa?')) return;
    try {
      await api.delete(`/api/companies/${id}`);
      fetchCompanies();
    } catch (error: any) {
      if (error.response?.status === 400) {
        alert('Não é possível excluir empresa com contatos vinculados.');
      } else {
        alert('Erro ao excluir (Talvez você não tenha permissão).');
      }
    }
  }

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h1 className={styles.title}>Empresas</h1>
        <button className={styles.addButton} onClick={() => handleOpenModal()}>
          <Plus size={20} /> Nova Empresa
        </button>
      </div>

      <div className={styles.tableContainer}>
        {isLoading ? (
          <div className={styles.emptyState}><Loader2 className="animate-spin" /></div>
        ) : companies.length === 0 ? (
          <div className={styles.emptyState}>Nenhuma empresa cadastrada.</div>
        ) : (
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Empresa</th>
                <th>Contato</th>
                <th>Site / Doc</th>
                <th>Vínculos</th>
                <th>Ações</th>
              </tr>
            </thead>
            <tbody>
              {companies.map(company => (
                <tr key={company.id}>
                  <td>
                    <div style={{fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.5rem'}}>
                        <Building2 size={16} color="#6b7280" />
                        {company.name}
                    </div>
                  </td>
                  <td>{company.phone || '-'}</td>
                  <td>
                    <div style={{display: 'flex', flexDirection: 'column', gap: '0.2rem', fontSize: '0.85rem'}}>
                        {company.website && (
                            <div style={{display: 'flex', gap: '0.3rem', alignItems: 'center'}}>
                                <Globe size={12} /> <a href={company.website} target="_blank" style={{color: '#2563eb'}}>{company.website}</a>
                            </div>
                        )}
                        {company.document_number && <span style={{color: '#6b7280'}}>{company.document_number}</span>}
                    </div>
                  </td>
                  <td>
                    <span style={{background: '#f3f4f6', padding: '2px 8px', borderRadius: '12px', fontSize: '0.75rem', color: '#4b5563'}}>
                        {company.contact_count || 0} contatos
                    </span>
                  </td>
                  <td>
                    <div style={{display: 'flex', gap: '0.5rem'}}>
                        <button onClick={() => handleOpenModal(company)} style={{border: 'none', background: 'none', cursor: 'pointer', color: '#6b7280'}}>
                            <Edit2 size={18} />
                        </button>
                        
                        {/* Oculta botão de excluir para vendedores */}
                        {userRole !== 'agent' && (
                            <button onClick={() => handleDelete(company.id)} style={{border: 'none', background: 'none', cursor: 'pointer', color: '#ef4444'}}>
                                <Trash2 size={18} />
                            </button>
                        )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Modal */}
      {isModalOpen && (
        <div className={styles.modalOverlay}>
          <div className={styles.modalContent}>
            <div className={styles.modalHeader}>
              <h3 className={styles.modalTitle}>{editingCompany ? 'Editar Empresa' : 'Nova Empresa'}</h3>
              <button className={styles.closeButton} onClick={() => setIsModalOpen(false)}><X size={20} /></button>
            </div>
            <form onSubmit={handleSubmit(handleSave)}>
              <div className={styles.modalBody}>
                <div className={styles.formGrid}>
                    <div className={`${styles.formGroup} ${styles.fullWidth}`}>
                        <label className={styles.label}>Nome da Empresa *</label>
                        <input {...register('name')} className={styles.input} placeholder="Ex: Tech Solutions Ltda" />
                        {errors.name && <span className={styles.errorText}>{errors.name.message}</span>}
                    </div>
                    <div className={styles.formGroup}>
                        <label className={styles.label}>CNPJ / Documento</label>
                        <input {...register('document_number')} className={styles.input} />
                    </div>
                    <div className={styles.formGroup}>
                        <label className={styles.label}>Telefone</label>
                        <input {...register('phone')} className={styles.input} />
                    </div>
                    <div className={`${styles.formGroup} ${styles.fullWidth}`}>
                        <label className={styles.label}>Website</label>
                        <input {...register('website')} className={styles.input} placeholder="https://" />
                    </div>
                    <div className={`${styles.formGroup} ${styles.fullWidth}`}>
                        <label className={styles.label}>Endereço</label>
                        <input {...register('address')} className={styles.input} />
                    </div>
                </div>
              </div>
              <div className={styles.modalFooter}>
                <button type="button" className={styles.cancelButton} onClick={() => setIsModalOpen(false)}>Cancelar</button>
                <button type="submit" disabled={isSaving} className={styles.saveButton}>
                    {isSaving ? <Loader2 className="animate-spin" size={16} /> : 'Salvar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}