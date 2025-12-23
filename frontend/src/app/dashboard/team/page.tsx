'use client';

import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Plus, Trash2, Edit2, Loader2, X, Shield } from 'lucide-react';
import api from '@/services/api';
import styles from './page.module.css';

interface User {
  id: string;
  name: string;
  email: string;
  role: 'owner' | 'admin' | 'agent' | 'user';
  created_at: string;
}

const userFormSchema = z.object({
  name: z.string().min(2, 'Nome obrigatório'),
  email: z.string().email('E-mail inválido'),
  password: z.string().min(6).optional().or(z.literal('')),
  role: z.enum(['admin', 'agent']),
});

type UserFormData = z.infer<typeof userFormSchema>;

export default function TeamPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  // Modal States
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const { register, handleSubmit, reset, setValue, formState: { errors } } = useForm<UserFormData>({
    resolver: zodResolver(userFormSchema),
    defaultValues: { role: 'agent' }
  });

  async function fetchUsers() {
    try {
      const res = await api.get('/api/users');
      setUsers(res.data);
    } catch (error) {
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => { fetchUsers(); }, []);

  function handleOpenModal(user?: User) {
    if (user) {
        setEditingUser(user);
        setValue('name', user.name);
        setValue('email', user.email);
        // Cast forçado pois o select espera 'admin' | 'agent'
        setValue('role', user.role as 'admin' | 'agent');
        setValue('password', ''); // Senha vazia na edição
    } else {
        setEditingUser(null);
        reset();
        setValue('role', 'agent');
    }
    setIsModalOpen(true);
  }

  async function handleSave(data: UserFormData) {
    setIsSaving(true);
    try {
      // Limpa senha vazia para não enviar
      const payload = { ...data };
      if (!payload.password) delete payload.password;

      if (editingUser) {
        await api.put(`/api/users/${editingUser.id}`, payload);
        alert('Usuário atualizado!');
      } else {
        // Na criação a senha é obrigatória, o backend ou o zod validariam, 
        // mas aqui garantimos que se for criação e sem senha, avisa.
        if (!payload.password && !editingUser) {
            alert('Senha é obrigatória para novos usuários.');
            setIsSaving(false);
            return;
        }
        await api.post('/api/users/invite', payload);
        alert('Convite enviado/Usuário criado!');
      }
      
      setIsModalOpen(false);
      reset();
      fetchUsers();
    } catch (error: any) {
      if (error.response?.status === 403) alert('Sem permissão.');
      else if (error.response?.status === 409) alert('E-mail já está em uso.');
      else alert('Erro ao salvar usuário.');
    } finally {
      setIsSaving(false);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm('Remover este usuário da equipe? Ele perderá o acesso imediatamente.')) return;
    try {
      await api.delete(`/api/users/${id}`);
      setUsers(users.filter(u => u.id !== id));
    } catch (error: any) {
      alert(error.response?.data?.error || 'Erro ao remover usuário.');
    }
  }

  const getRoleBadge = (role: string) => {
    switch(role) {
        case 'owner': return <span style={{background: '#fef3c7', color: '#d97706', padding: '2px 8px', borderRadius: '12px', fontSize: '0.7rem', fontWeight: 700, border: '1px solid #fcd34d'}}>DONO</span>;
        case 'admin': return <span style={{background: '#dbeafe', color: '#1e40af', padding: '2px 8px', borderRadius: '12px', fontSize: '0.7rem', fontWeight: 700, border: '1px solid #bfdbfe'}}>ADMIN</span>;
        default: return <span style={{background: '#f3f4f6', color: '#4b5563', padding: '2px 8px', borderRadius: '12px', fontSize: '0.7rem', fontWeight: 700, border: '1px solid #e5e7eb'}}>VENDEDOR</span>;
    }
  };

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <div>
            <h1 className={styles.title}>Equipe</h1>
            <p style={{color: '#6b7280', fontSize: '0.9rem'}}>Gerencie o acesso dos colaboradores ao CRM.</p>
        </div>
        <button className={styles.addButton} onClick={() => handleOpenModal()}>
          <Plus size={20} /> Adicionar Membro
        </button>
      </div>

      <div className={styles.tableContainer}>
        {isLoading ? (
          <div className={styles.emptyState}><Loader2 className="animate-spin" style={{margin: '0 auto'}} /></div>
        ) : (
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Membro</th>
                <th>Cargo</th>
                <th>Data de Entrada</th>
                <th style={{textAlign: 'right'}}>Ações</th>
              </tr>
            </thead>
            <tbody>
              {users.map(user => (
                <tr key={user.id}>
                  <td>
                    <div className={styles.userInfo}>
                       <div className={styles.avatar}>
                          {user.name.charAt(0).toUpperCase()}
                       </div>
                       <div>
                           <div style={{fontWeight: 600, color: '#1f2937'}}>{user.name}</div>
                           <div className={styles.emailText}>{user.email}</div>
                       </div>
                    </div>
                  </td>
                  <td>{getRoleBadge(user.role)}</td>
                  <td style={{fontSize: '0.9rem', color: '#6b7280'}}>
                    {new Date(user.created_at).toLocaleDateString()}
                  </td>
                  <td style={{textAlign: 'right'}}>
                    {/* Não permite editar/excluir Dono, a menos que seja gestão de Tenant (outro módulo) */}
                    {user.role !== 'owner' && (
                        <div className={styles.actions} style={{justifyContent: 'flex-end'}}>
                            <button className={styles.iconBtn} onClick={() => handleOpenModal(user)} title="Editar">
                                <Edit2 size={18} />
                            </button>
                            <button className={`${styles.iconBtn} ${styles.danger}`} onClick={() => handleDelete(user.id)} title="Remover">
                                <Trash2 size={18} />
                            </button>
                        </div>
                    )}
                    {user.role === 'owner' && <Shield size={18} color="#d1d5db" style={{marginLeft: 'auto', display: 'block'}} title="Conta Principal" />}
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
              <h3 className={styles.modalTitle}>{editingUser ? 'Editar Membro' : 'Novo Membro'}</h3>
              <button className={styles.closeButton} onClick={() => setIsModalOpen(false)}><X size={20} /></button>
            </div>
            <form onSubmit={handleSubmit(handleSave)}>
              <div className={styles.formGrid}>
                <div className={styles.formGroup}>
                    <label className={styles.label}>Nome Completo</label>
                    <input {...register('name')} className={styles.input} placeholder="Ex: Maria Silva" />
                    {errors.name && <span className={styles.errorText}>{errors.name.message}</span>}
                </div>
                <div className={styles.formGroup}>
                    <label className={styles.label}>E-mail</label>
                    <input {...register('email')} className={styles.input} placeholder="maria@empresa.com" />
                    {errors.email && <span className={styles.errorText}>{errors.email.message}</span>}
                </div>
                
                <div style={{display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem'}}>
                    <div className={styles.formGroup}>
                        <label className={styles.label}>Nível de Acesso</label>
                        <select {...register('role')} className={styles.input}>
                            <option value="agent">Vendedor</option>
                            <option value="admin">Administrador</option>
                        </select>
                    </div>
                    <div className={styles.formGroup}>
                        <label className={styles.label}>Senha {editingUser && '(Opcional)'}</label>
                        <input {...register('password')} type="password" className={styles.input} placeholder={editingUser ? "Manter atual" : "Mínimo 6 caracteres"} />
                        {errors.password && <span className={styles.errorText}>{errors.password.message}</span>}
                    </div>
                </div>
              </div>
              
              <div className={styles.modalFooter}>
                <button type="button" className={styles.cancelButton} onClick={() => setIsModalOpen(false)}>Cancelar</button>
                <button type="submit" disabled={isSaving} className={styles.saveButton}>
                    {isSaving ? <Loader2 className="animate-spin" size={16} /> : (editingUser ? 'Salvar Alterações' : 'Adicionar Usuário')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}