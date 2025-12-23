'use client';

import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Plus, Edit2, Trash2, Check, X, Loader2, CreditCard, Mail, Users, Database } from 'lucide-react';
import api from '@/services/api';
import styles from './page.module.css';

interface Plan {
  id: string;
  name: string;
  description?: string;
  price: number;
  max_users?: number;
  max_leads?: number;
  max_contacts?: number;
  max_emails_month?: number;
  active: boolean;
}

const planSchema = z.object({
  name: z.string().min(1, 'Nome obrigatório'),
  description: z.string().optional(),
  price: z.coerce.number().min(0, 'Preço deve ser positivo'),
  max_users: z.coerce.number().nullable().optional(),
  max_leads: z.coerce.number().nullable().optional(),
  max_contacts: z.coerce.number().nullable().optional(),
  max_emails_month: z.coerce.number().nullable().optional(),
});

type PlanFormData = z.infer<typeof planSchema>;

export default function AdminPlansPage() {
  const [plans, setPlans] = useState<Plan[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingPlan, setEditingPlan] = useState<Plan | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const { register, handleSubmit, reset, setValue } = useForm<PlanFormData>({
    resolver: zodResolver(planSchema)
  });

  useEffect(() => { loadPlans(); }, []);

  async function loadPlans() {
    setLoading(true);
    try {
      const res = await api.get('/api/admin/plans');
      setPlans(res.data);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  }

  function handleOpenModal(plan?: Plan) {
    if (plan) {
      setEditingPlan(plan);
      setValue('name', plan.name);
      setValue('description', plan.description || '');
      setValue('price', plan.price);
      setValue('max_users', plan.max_users);
      setValue('max_leads', plan.max_leads);
      setValue('max_contacts', plan.max_contacts);
      setValue('max_emails_month', plan.max_emails_month);
    } else {
      setEditingPlan(null);
      reset();
      // Defaults
      setValue('max_users', 5);
      setValue('max_leads', 1000);
      setValue('max_contacts', 2000);
      setValue('max_emails_month', 100);
    }
    setIsModalOpen(true);
  }

  async function onSave(data: PlanFormData) {
    setIsSaving(true);
    try {
      const payload = {
         ...data,
         max_users: data.max_users || null,
         max_leads: data.max_leads || null,
         max_contacts: data.max_contacts || null,
         max_emails_month: data.max_emails_month || null,
      };

      if (editingPlan) {
        await api.put(`/api/admin/plans/${editingPlan.id}`, payload);
      } else {
        await api.post('/api/admin/plans', payload);
      }
      setIsModalOpen(false);
      loadPlans();
    } catch (error) {
      alert('Erro ao salvar plano.');
    } finally {
      setIsSaving(false);
    }
  }

  async function onDelete(id: string) {
    if (!confirm('Excluir este plano?')) return;
    try {
      await api.delete(`/api/admin/plans/${id}`);
      loadPlans();
    } catch (error: any) {
      alert(error.response?.data?.error || 'Erro ao excluir.');
    }
  }

  if (loading) return <div className={styles.loading}><Loader2 className="animate-spin" /></div>;

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <div>
            <h1 className={styles.title}><CreditCard size={24} color="#2563eb"/> Planos & Assinaturas</h1>
            <p className={styles.subtitle}>Defina as opções comerciais do seu SaaS.</p>
        </div>
        <button className={styles.addButton} onClick={() => handleOpenModal()}>
          <Plus size={20} /> Novo Plano
        </button>
      </div>

      <div className={styles.grid}>
        {plans.map(plan => (
          <div key={plan.id} className={styles.card}>
             <div className={styles.cardHeader}>
                <h3 className={styles.planName}>{plan.name}</h3>
                <div className={styles.planPrice}>
                    {new Intl.NumberFormat('pt-BR', {style: 'currency', currency: 'BRL'}).format(plan.price)}
                    <span className={styles.period}>/mês</span>
                </div>
             </div>
             
             <p className={styles.description}>{plan.description || 'Sem descrição'}</p>
             
             <div className={styles.limits}>
                <div className={styles.limitItem}>
                    <span><Users size={14}/> Usuários:</span>
                    <strong>{plan.max_users === null ? 'Ilimitado' : plan.max_users}</strong>
                </div>
                <div className={styles.limitItem}>
                    <span><Database size={14}/> Leads:</span>
                    <strong>{plan.max_leads === null ? 'Ilimitado' : plan.max_leads}</strong>
                </div>
                <div className={styles.limitItem}>
                    <span><Database size={14}/> Contatos:</span>
                    <strong>{plan.max_contacts === null ? 'Ilimitado' : plan.max_contacts}</strong>
                </div>
                <div className={styles.limitItem}>
                    <span><Mail size={14}/> E-mails/mês:</span>
                    <strong>{plan.max_emails_month === null ? 'Ilimitado' : plan.max_emails_month}</strong>
                </div>
             </div>

             <div className={styles.actions}>
                <button className={styles.btnEdit} onClick={() => handleOpenModal(plan)}>
                    <Edit2 size={16} /> Editar
                </button>
                <button className={styles.btnDelete} onClick={() => onDelete(plan.id)}>
                    <Trash2 size={16} />
                </button>
             </div>
          </div>
        ))}
      </div>

      {isModalOpen && (
        <div className={styles.modalOverlay}>
            <div className={styles.modalContent}>
                <div className={styles.modalHeader}>
                    <h3>{editingPlan ? 'Editar Plano' : 'Novo Plano'}</h3>
                    <button onClick={() => setIsModalOpen(false)} className={styles.closeBtn}><X size={20}/></button>
                </div>
                <form onSubmit={handleSubmit(onSave)}>
                    <div className={styles.formGroup}>
                        <label>Nome do Plano</label>
                        <input {...register('name')} className={styles.input} placeholder="Ex: Pro" />
                    </div>
                    <div className={styles.formGroup}>
                        <label>Preço (R$)</label>
                        <input {...register('price')} type="number" step="0.01" className={styles.input} />
                    </div>
                    <div className={styles.formGroup}>
                        <label>Descrição</label>
                        <textarea {...register('description')} className={styles.textarea} />
                    </div>
                    
                    <div className={styles.row}>
                        <div className={styles.formGroup}>
                            <label>Max Usuários (0 = Infinito)</label>
                            <input {...register('max_users')} type="number" className={styles.input} />
                        </div>
                        <div className={styles.formGroup}>
                            <label>Max Leads (0 = Infinito)</label>
                            <input {...register('max_leads')} type="number" className={styles.input} />
                        </div>
                    </div>
                    
                    <div className={styles.row}>
                        <div className={styles.formGroup}>
                            <label>Max Contatos (0 = Infinito)</label>
                            <input {...register('max_contacts')} type="number" className={styles.input} />
                        </div>
                        <div className={styles.formGroup}>
                            <label>Max E-mails/Mês (0 = Infinito)</label>
                            <input {...register('max_emails_month')} type="number" className={styles.input} />
                        </div>
                    </div>

                    <div className={styles.modalFooter}>
                        <button type="button" className={styles.btnCancel} onClick={() => setIsModalOpen(false)}>Cancelar</button>
                        <button type="submit" disabled={isSaving} className={styles.btnSave}>
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