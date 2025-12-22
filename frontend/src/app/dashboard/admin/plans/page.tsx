'use client';

import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { Plus, CreditCard, Check, Trash2, Edit2, X, Users, BookUser } from 'lucide-react';
import api from '@/services/api';

interface Plan { id: string; name: string; price: number; max_users: number; max_contacts: number; }

export default function AdminPlansPage() {
  const [plans, setPlans] = useState<Plan[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [editingPlan, setEditingPlan] = useState<Plan | null>(null);

  const { register, handleSubmit, reset, setValue } = useForm();

  async function fetchPlans() {
    setIsLoading(true);
    try {
      const res = await api.get('/api/admin/plans');
      setPlans(res.data);
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => { fetchPlans(); }, []);

  function prepareEdit(plan: Plan) {
    setEditingPlan(plan);
    setValue('name', plan.name);
    setValue('price', plan.price);
    setValue('max_users', plan.max_users);
    setValue('max_contacts', plan.max_contacts);
    window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' });
  }

  function cancelEdit() {
    setEditingPlan(null);
    reset();
  }

  async function handleSave(data: any) {
    const payload = {
        ...data,
        price: Number(data.price),
        max_users: Number(data.max_users),
        max_contacts: Number(data.max_contacts)
    };

    try {
      if (editingPlan) {
        await api.put(`/api/admin/plans/${editingPlan.id}`, payload);
      } else {
        await api.post('/api/admin/plans', payload);
      }
      cancelEdit();
      fetchPlans();
    } catch (e) {
      alert('Erro ao salvar plano.');
    }
  }

  async function handleDelete(id: string) {
    if (!confirm('Excluir este plano?')) return;
    try {
        await api.delete(`/api/admin/plans/${id}`);
        fetchPlans();
    } catch (error: any) {
        alert(error.response?.data?.error || 'Erro ao excluir. O plano pode estar em uso.');
    }
  }

  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto', paddingBottom: '3rem' }}>
      
      <div style={{ marginBottom: '2rem' }}>
        <h1 style={{ fontSize: '1.5rem', fontWeight: 700, color: '#111827', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <CreditCard color="#2563eb" /> Planos de Assinatura
        </h1>
        <p style={{ color: '#6b7280', marginTop: '0.25rem' }}>Configure os níveis de serviço e precificação do seu SaaS.</p>
      </div>

      {/* Grid de Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1.5rem', marginBottom: '3rem' }}>
        {plans.map(plan => (
          <div key={plan.id} style={{ 
              background: 'white', borderRadius: '12px', border: '1px solid #e5e7eb', 
              boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05)', overflow: 'hidden',
              display: 'flex', flexDirection: 'column'
          }}>
            <div style={{ padding: '1.5rem', borderBottom: '1px solid #f3f4f6', flex: 1 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start' }}>
                    <h3 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#111827' }}>{plan.name}</h3>
                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                        <button onClick={() => prepareEdit(plan)} style={{ border: '1px solid #d1d5db', background: 'white', padding: '4px', borderRadius: '6px', cursor: 'pointer', color: '#4b5563' }}><Edit2 size={14}/></button>
                        <button onClick={() => handleDelete(plan.id)} style={{ border: '1px solid #fee2e2', background: '#fff1f2', padding: '4px', borderRadius: '6px', cursor: 'pointer', color: '#e11d48' }}><Trash2 size={14}/></button>
                    </div>
                </div>
                
                <div style={{ marginTop: '1rem', marginBottom: '1.5rem' }}>
                    <span style={{ fontSize: '2.5rem', fontWeight: 800, color: '#2563eb' }}>R$ {Number(plan.price).toFixed(0)}</span>
                    <span style={{ color: '#6b7280', fontWeight: 500 }}>/mês</span>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', color: '#4b5563', fontSize: '0.95rem' }}>
                        <div style={{ background: '#eff6ff', padding: '6px', borderRadius: '50%', color: '#2563eb' }}><Users size={16} /></div>
                        <span>Até <b>{plan.max_users}</b> usuários</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', color: '#4b5563', fontSize: '0.95rem' }}>
                        <div style={{ background: '#eff6ff', padding: '6px', borderRadius: '50%', color: '#2563eb' }}><BookUser size={16} /></div>
                        <span>Até <b>{plan.max_contacts}</b> contatos</span>
                    </div>
                </div>
            </div>
            <div style={{ background: '#f9fafb', padding: '0.75rem', textAlign: 'center', fontSize: '0.8rem', color: '#9ca3af', fontWeight: 500 }}>
                ID: {plan.id.slice(0, 8)}...
            </div>
          </div>
        ))}
      </div>

      {/* Formulário de Criação/Edição */}
      <div style={{ background: 'white', borderRadius: '12px', border: editingPlan ? '2px solid #2563eb' : '1px solid #e5e7eb', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05)' }}>
        <div style={{ padding: '1.5rem', borderBottom: '1px solid #e5e7eb', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: editingPlan ? '#eff6ff' : 'white', borderTopLeftRadius: '12px', borderTopRightRadius: '12px' }}>
            <h3 style={{ fontWeight: 700, fontSize: '1.1rem', color: '#111827', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                {editingPlan ? <><Edit2 size={20}/> Editando Plano</> : <><Plus size={20}/> Criar Novo Plano</>}
            </h3>
            {editingPlan && <button onClick={cancelEdit} style={{ background: 'white', border: '1px solid #d1d5db', padding: '0.4rem 0.8rem', borderRadius: '6px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.3rem', fontSize: '0.85rem' }}><X size={16}/> Cancelar</button>}
        </div>
        
        <div style={{ padding: '2rem' }}>
            <form onSubmit={handleSubmit(handleSave)} style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1.5rem', alignItems: 'end' }}>
            <div>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.4rem', color: '#374151' }}>Nome do Plano</label>
                <input {...register('name', {required: true})} placeholder="Ex: Premium" style={{ width: '100%', padding: '0.75rem', border: '1px solid #d1d5db', borderRadius: '8px', fontSize: '0.95rem' }} />
            </div>
            <div>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.4rem', color: '#374151' }}>Preço Mensal (R$)</label>
                <input {...register('price', {required: true})} type="number" step="0.01" placeholder="0.00" style={{ width: '100%', padding: '0.75rem', border: '1px solid #d1d5db', borderRadius: '8px', fontSize: '0.95rem' }} />
            </div>
            <div>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.4rem', color: '#374151' }}>Limite Usuários</label>
                <input {...register('max_users', {required: true})} type="number" placeholder="10" style={{ width: '100%', padding: '0.75rem', border: '1px solid #d1d5db', borderRadius: '8px', fontSize: '0.95rem' }} />
            </div>
            <div>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.4rem', color: '#374151' }}>Limite Contatos</label>
                <input {...register('max_contacts', {required: true})} type="number" placeholder="5000" style={{ width: '100%', padding: '0.75rem', border: '1px solid #d1d5db', borderRadius: '8px', fontSize: '0.95rem' }} />
            </div>
            <button type="submit" style={{ background: '#2563eb', color: 'white', border: 'none', padding: '0.75rem 1.5rem', borderRadius: '8px', cursor: 'pointer', fontWeight: 700, fontSize: '0.95rem', height: '46px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}>
                {editingPlan ? 'Salvar Alterações' : 'Criar Plano'}
            </button>
            </form>
        </div>
      </div>

    </div>
  );
}