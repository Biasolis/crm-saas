'use client';

import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Plus, Trash2, User, Shield, Loader2, X } from 'lucide-react';
import api from '@/services/api';
// Reutilize o CSS de contatos ou tasks para consistência
import styles from '../contacts/page.module.css'; 

interface User {
  id: string;
  name: string;
  email: string;
  role: 'owner' | 'admin' | 'agent' | 'user';
  created_at: string;
}

const inviteSchema = z.object({
  name: z.string().min(2, 'Nome obrigatório'),
  email: z.string().email('E-mail inválido'),
  password: z.string().min(6, 'Mínimo 6 caracteres'),
  role: z.enum(['admin', 'agent']),
});

type InviteFormData = z.infer<typeof inviteSchema>;

export default function TeamPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const { register, handleSubmit, reset, formState: { errors } } = useForm<InviteFormData>({
    resolver: zodResolver(inviteSchema),
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

  async function handleInvite(data: InviteFormData) {
    setIsSaving(true);
    try {
      await api.post('/api/users/invite', data);
      setIsModalOpen(false);
      reset();
      fetchUsers();
      alert('Usuário adicionado com sucesso!');
    } catch (error: any) {
      if (error.response?.status === 403) alert('Sem permissão.');
      else if (error.response?.status === 409) alert('E-mail já está em uso.');
      else alert('Erro ao adicionar usuário.');
    } finally {
      setIsSaving(false);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm('Remover este usuário da equipe? Ele perderá o acesso.')) return;
    try {
      await api.delete(`/api/users/${id}`);
      fetchUsers();
    } catch (error: any) {
      alert(error.response?.data?.error || 'Erro ao remover usuário.');
    }
  }

  const getRoleBadge = (role: string) => {
    switch(role) {
        case 'owner': return <span style={{background: '#fef3c7', color: '#d97706', padding: '2px 8px', borderRadius: '12px', fontSize: '0.75rem', fontWeight: 700}}>DONO</span>;
        case 'admin': return <span style={{background: '#dbeafe', color: '#2563eb', padding: '2px 8px', borderRadius: '12px', fontSize: '0.75rem', fontWeight: 700}}>ADMIN</span>;
        default: return <span style={{background: '#f3f4f6', color: '#6b7280', padding: '2px 8px', borderRadius: '12px', fontSize: '0.75rem', fontWeight: 700}}>VENDEDOR</span>;
    }
  };

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h1 className={styles.title}>Gestão de Equipe</h1>
        <button className={styles.addButton} onClick={() => setIsModalOpen(true)}>
          <Plus size={20} /> Adicionar Membro
        </button>
      </div>

      <div className={styles.tableContainer}>
        {isLoading ? (
          <div className={styles.emptyState}><Loader2 className="animate-spin" /></div>
        ) : (
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Nome / E-mail</th>
                <th>Cargo</th>
                <th>Data de Entrada</th>
                <th>Ações</th>
              </tr>
            </thead>
            <tbody>
              {users.map(user => (
                <tr key={user.id}>
                  <td>
                    <div style={{fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.5rem'}}>
                       <div style={{width: '32px', height: '32px', background: '#e5e7eb', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#4b5563'}}>
                          {user.name.charAt(0).toUpperCase()}
                       </div>
                       <div>
                           <div>{user.name}</div>
                           <div style={{fontSize: '0.85rem', color: '#6b7280'}}>{user.email}</div>
                       </div>
                    </div>
                  </td>
                  <td>{getRoleBadge(user.role)}</td>
                  <td style={{fontSize: '0.9rem', color: '#4b5563'}}>
                    {new Date(user.created_at).toLocaleDateString()}
                  </td>
                  <td>
                    {user.role !== 'owner' && (
                        <button onClick={() => handleDelete(user.id)} style={{border: 'none', background: 'none', cursor: 'pointer', color: '#ef4444'}}>
                            <Trash2 size={18} />
                        </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Modal Convite */}
      {isModalOpen && (
        <div className={styles.modalOverlay}>
          <div className={styles.modalContent}>
            <div className={styles.modalHeader}>
              <h3 className={styles.modalTitle}>Novo Membro</h3>
              <button className={styles.closeButton} onClick={() => setIsModalOpen(false)}><X size={20} /></button>
            </div>
            <form onSubmit={handleSubmit(handleInvite)}>
              <div className={styles.modalBody}>
                <div className={styles.formGrid}>
                    <div className={`${styles.formGroup} ${styles.fullWidth}`}>
                        <label className={styles.label}>Nome Completo</label>
                        <input {...register('name')} className={styles.input} />
                        {errors.name && <span className={styles.errorText}>{errors.name.message}</span>}
                    </div>
                    <div className={`${styles.formGroup} ${styles.fullWidth}`}>
                        <label className={styles.label}>E-mail de Acesso</label>
                        <input {...register('email')} className={styles.input} />
                        {errors.email && <span className={styles.errorText}>{errors.email.message}</span>}
                    </div>
                    <div className={styles.formGroup}>
                        <label className={styles.label}>Senha Provisória</label>
                        <input {...register('password')} type="password" className={styles.input} />
                        {errors.password && <span className={styles.errorText}>{errors.password.message}</span>}
                    </div>
                    <div className={styles.formGroup}>
                        <label className={styles.label}>Nível de Acesso</label>
                        <select {...register('role')} className={styles.input}>
                            <option value="agent">Vendedor (Padrão)</option>
                            <option value="admin">Administrador</option>
                        </select>
                    </div>
                </div>
              </div>
              <div className={styles.modalFooter}>
                <button type="button" className={styles.cancelButton} onClick={() => setIsModalOpen(false)}>Cancelar</button>
                <button type="submit" disabled={isSaving} className={styles.saveButton}>
                    {isSaving ? <Loader2 className="animate-spin" size={16} /> : 'Adicionar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}