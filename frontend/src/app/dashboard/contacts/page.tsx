'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Plus, Search, X, Loader2, Phone, Mail, MapPin, MessageSquare, Edit2, Trash2, Building2, Upload, Download } from 'lucide-react';
import Papa from 'papaparse';
import api from '@/services/api';
import styles from './page.module.css';

// --- Tipos ---
interface Contact {
  id: string;
  name: string;
  email: string | null;
  mobile: string | null;
  city: string | null;
  state: string | null;
  company_id: string | null;
  company_name?: string;
}

interface Company {
  id: string;
  name: string;
}

// --- Schema ---
const contactSchema = z.object({
  name: z.string().min(2, 'Nome é obrigatório'),
  email: z.string().email('E-mail inválido').optional().or(z.literal('')),
  mobile: z.string().optional(),
  city: z.string().optional(),
  state: z.string().length(2, 'UF deve ter 2 letras').optional().or(z.literal('')),
  company_id: z.string().optional(),
});

type ContactFormData = z.infer<typeof contactSchema>;

export default function ContactsPage() {
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [companies, setCompanies] = useState<Company[]>([]);
  
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  
  // Estado para Edição
  const [editingContact, setEditingContact] = useState<Contact | null>(null);
  
  // Controle de Permissão (Novo)
  const [userRole, setUserRole] = useState<string>('');

  const [chatwootUrl, setChatwootUrl] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { 
    register, 
    handleSubmit, 
    reset,
    setValue,
    formState: { errors } 
  } = useForm<ContactFormData>({
    resolver: zodResolver(contactSchema)
  });

  // --- Loads ---
  async function fetchContacts() {
    try {
      const response = await api.get('/api/contacts');
      setContacts(response.data.data || response.data); // Ajuste para garantir array
    } catch (error) {
      console.error('Erro ao buscar contatos:', error);
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

    fetchContacts();
    api.get('/api/companies').then(res => setCompanies(res.data)).catch(console.error);
    api.get('/api/tenants/current')
      .then(res => { if (res.data.chatwoot_url) setChatwootUrl(res.data.chatwoot_url); })
      .catch(console.error);
  }, []);

  // --- Actions ---

  function handleOpenModal(contact?: Contact) {
    if (contact) {
      setEditingContact(contact);
      setValue('name', contact.name);
      setValue('email', contact.email || '');
      setValue('mobile', contact.mobile || '');
      setValue('city', contact.city || '');
      setValue('state', contact.state || '');
      setValue('company_id', contact.company_id || '');
    } else {
      setEditingContact(null);
      reset();
    }
    setIsModalOpen(true);
  }

  async function handleSaveContact(data: ContactFormData) {
    setIsSaving(true);
    try {
      if (editingContact) {
        await api.put(`/api/contacts/${editingContact.id}`, data);
      } else {
        await api.post('/api/contacts', data);
      }
      setIsModalOpen(false);
      reset();
      fetchContacts();
    } catch (error) {
      console.error(error);
      alert('Erro ao salvar contato.');
    } finally {
      setIsSaving(false);
    }
  }

  async function handleDeleteContact(id: string) {
    if (!confirm('Tem certeza que deseja excluir este contato?')) return;
    try {
      await api.delete(`/api/contacts/${id}`);
      fetchContacts();
    } catch (error) {
      alert('Erro ao excluir contato (Talvez você não tenha permissão).');
    }
  }

  function openChatwoot(email: string) {
    if (!chatwootUrl) return;
    window.open(chatwootUrl, '_blank');
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
        const normalizedContacts = parsedData.map((row: any) => ({
            name: row['nome'] || row['name'] || row['Nome'] || 'Sem Nome',
            email: row['email'] || row['e-mail'] || row['Email'],
            mobile: row['telefone'] || row['phone'] || row['celular'],
            city: row['cidade'] || row['city'],
            state: row['estado'] || row['state'] || row['uf']
        })).filter((l: any) => l.name !== 'Sem Nome');

        if (normalizedContacts.length === 0) {
            alert('Nenhum dado válido encontrado.');
            return;
        }

        try {
            const res = await api.post('/api/contacts/import', { contacts: normalizedContacts });
            alert(`${res.data.count} contatos importados com sucesso!`);
            fetchContacts();
        } catch (error) {
            alert('Erro ao importar contatos.');
        } finally {
            if (fileInputRef.current) fileInputRef.current.value = '';
        }
      }
    });
  };

  const downloadTemplate = () => {
    const csvContent = "data:text/csv;charset=utf-8,nome,email,telefone,cidade,estado\nMaria Silva,maria@email.com,11999999999,São Paulo,SP";
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", "modelo_contatos.csv");
    document.body.appendChild(link);
    link.click();
  };

  return (
    <div className={styles.container}>
      
      <div className={styles.header}>
        <h1 className={styles.title}>Meus Contatos</h1>
        
        <div style={{ display: 'flex', gap: '0.5rem' }}>
            <input type="file" accept=".csv" ref={fileInputRef} style={{ display: 'none' }} onChange={handleFileUpload} />
            <button onClick={downloadTemplate} style={{ background: 'white', border: '1px solid #e5e7eb', color: '#6b7280', padding: '0.6rem 1rem', borderRadius: '8px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 500 }}>
                <Download size={18} /> <span style={{ fontSize: '0.9rem' }}>Modelo</span>
            </button>
            <button onClick={() => fileInputRef.current?.click()} style={{ background: 'white', border: '1px solid #e5e7eb', color: '#2563eb', padding: '0.6rem 1rem', borderRadius: '8px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 600 }}>
                <Upload size={18} /> Importar CSV
            </button>
            <button className={styles.addButton} onClick={() => handleOpenModal()}>
                <Plus size={20} /> Novo Contato
            </button>
        </div>
      </div>

      <div className={styles.tableContainer}>
        {isLoading ? (
          <div className={styles.emptyState}><Loader2 className="animate-spin" style={{ margin: '0 auto' }} /></div>
        ) : contacts.length === 0 ? (
          <div className={styles.emptyState}>Nenhum contato encontrado.</div>
        ) : (
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Nome / Empresa</th>
                <th>Contato</th>
                <th>Localização</th>
                <th>Ações</th>
              </tr>
            </thead>
            <tbody>
              {contacts.map((contact) => (
                <tr key={contact.id}>
                  <td>
                    {/* Link para a página de detalhes 360º */}
                    <Link href={`/dashboard/contacts/${contact.id}`} style={{textDecoration: 'none', color: 'inherit'}}>
                        <strong style={{cursor: 'pointer'}}>{contact.name}</strong>
                    </Link>
                    {contact.company_name && (
                      <div style={{display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.8rem', color: '#6b7280', marginTop: '2px'}}>
                        <Building2 size={12} /> {contact.company_name}
                      </div>
                    )}
                  </td>
                  <td>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', fontSize: '0.85rem' }}>
                      {contact.email && <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><Mail size={14} color="#6b7280" /> {contact.email}</div>}
                      {contact.mobile && <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><Phone size={14} color="#6b7280" /> {contact.mobile}</div>}
                    </div>
                  </td>
                  <td>
                    {contact.city && <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><MapPin size={14} color="#6b7280" /> {contact.city} {contact.state ? `- ${contact.state}` : ''}</div>}
                  </td>
                  <td>
                    <div style={{ display: 'flex', gap: '0.8rem', alignItems: 'center' }}>
                      {chatwootUrl && contact.email && (
                        <button onClick={() => openChatwoot(contact.email!)} title="Abrir no Chatwoot" style={{ border: 'none', background: 'none', cursor: 'pointer', color: '#2563eb' }}>
                          <MessageSquare size={18} />
                        </button>
                      )}
                      <button onClick={() => handleOpenModal(contact)} style={{ border: 'none', background: 'none', cursor: 'pointer', color: '#6b7280' }} title="Editar">
                        <Edit2 size={18} />
                      </button>
                      
                      {/* Oculta botão de excluir para vendedores */}
                      {userRole !== 'agent' && (
                        <button onClick={() => handleDeleteContact(contact.id)} style={{ border: 'none', background: 'none', cursor: 'pointer', color: '#ef4444' }} title="Excluir">
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

      {/* Modal Criar/Editar */}
      {isModalOpen && (
        <div className={styles.modalOverlay}>
          <div className={styles.modalContent}>
            <div className={styles.modalHeader}>
              <h3 className={styles.modalTitle}>{editingContact ? 'Editar Contato' : 'Novo Contato'}</h3>
              <button className={styles.closeButton} onClick={() => setIsModalOpen(false)}><X size={20} /></button>
            </div>
            <form onSubmit={handleSubmit(handleSaveContact)}>
              <div className={styles.modalBody}>
                <div className={styles.formGrid}>
                  <div className={`${styles.formGroup} ${styles.fullWidth}`}>
                    <label className={styles.label}>Nome Completo *</label>
                    <input {...register('name')} className={styles.input} />
                    {errors.name && <span className={styles.errorText}>{errors.name.message}</span>}
                  </div>
                  <div className={`${styles.formGroup} ${styles.fullWidth}`}>
                    <label className={styles.label}>Empresa Vinculada</label>
                    <select {...register('company_id')} className={styles.input}>
                      <option value="">Sem empresa / Pessoa Física</option>
                      {companies.map(comp => (
                        <option key={comp.id} value={comp.id}>{comp.name}</option>
                      ))}
                    </select>
                  </div>
                  <div className={`${styles.formGroup} ${styles.fullWidth}`}>
                    <label className={styles.label}>E-mail</label>
                    <input {...register('email')} type="email" className={styles.input} />
                  </div>
                  <div className={styles.formGroup}>
                    <label className={styles.label}>Celular</label>
                    <input {...register('mobile')} className={styles.input} />
                  </div>
                  <div className={styles.formGroup}>
                    <label className={styles.label}>Cidade</label>
                    <input {...register('city')} className={styles.input} />
                  </div>
                  <div className={styles.formGroup}>
                    <label className={styles.label}>Estado</label>
                    <input {...register('state')} className={styles.input} placeholder="SP" maxLength={2} />
                  </div>
                </div>
              </div>
              <div className={styles.modalFooter}>
                <button type="button" className={styles.cancelButton} onClick={() => setIsModalOpen(false)}>Cancelar</button>
                <button type="submit" disabled={isSaving} className={styles.saveButton}>
                  {isSaving ? <Loader2 className="animate-spin" size={18} /> : (editingContact ? 'Salvar' : 'Criar')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}