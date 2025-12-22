'use client';

import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { Loader2, Ban, CheckCircle, ShieldAlert, Edit2, Trash2, X, Plus, Building2, Mail, Lock } from 'lucide-react';
import api from '@/services/api';

interface Tenant { 
    id: string; 
    name: string; 
    status: string; 
    created_at: string; 
    plan_id: string; 
    plan_name?: string; 
    owner_email?: string;
}
interface Plan { id: string; name: string; price: number; }

export default function AdminTenantsPage() {
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [plans, setPlans] = useState<Plan[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  // Modais
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingTenant, setEditingTenant] = useState<Tenant | null>(null);
  
  // Forms
  const { register: registerCreate, handleSubmit: handleSubmitCreate, reset: resetCreate } = useForm();
  const { register: registerEdit, handleSubmit: handleSubmitEdit, setValue: setValueEdit } = useForm();

  async function loadData() {
    setIsLoading(true);
    try {
      const [tRes, pRes] = await Promise.all([
        api.get('/api/admin/tenants'),
        api.get('/api/admin/plans')
      ]);
      setTenants(tRes.data);
      setPlans(pRes.data);
    } catch (error) {
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => { loadData(); }, []);

  // --- CRIAR EMPRESA ---
  async function handleCreate(data: any) {
    try {
        await api.post('/api/admin/tenants', data);
        alert('Empresa criada com sucesso!');
        setIsCreateOpen(false);
        resetCreate();
        loadData();
    } catch (error: any) {
        alert(error.response?.data?.error || 'Erro ao criar empresa');
    }
  }

  // --- EDITAR EMPRESA ---
  function openEditModal(tenant: Tenant) {
    setEditingTenant(tenant);
    setValueEdit('name', tenant.name);
    setValueEdit('plan_id', tenant.plan_id || '');
    setValueEdit('status', tenant.status);
  }

  async function saveEdit(data: any) {
    if (!editingTenant) return;
    try {
        await api.put(`/api/admin/tenants/${editingTenant.id}`, data);
        setEditingTenant(null);
        loadData();
    } catch (e) { alert('Erro ao salvar'); }
  }

  // --- EXCLUIR EMPRESA ---
  async function handleDelete(id: string) {
    if (!confirm('PERIGO: Isso apagará PERMANENTEMENTE todos os dados desta empresa (usuários, leads, etc). Continuar?')) return;
    try {
        await api.delete(`/api/admin/tenants/${id}`);
        loadData();
    } catch (e) { alert('Erro ao excluir'); }
  }

  if (isLoading) return <div style={{padding:'4rem', display:'flex', justifyContent:'center'}}><Loader2 className="animate-spin" size={32} color="#2563eb"/></div>;

  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto', paddingBottom: '2rem' }}>
      
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <div>
            <h1 style={{ fontSize: '1.5rem', fontWeight: 700, color: '#111827', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <ShieldAlert color="#2563eb" /> Gestão de Empresas
            </h1>
            <p style={{ color: '#6b7280', marginTop: '0.25rem' }}>Visualize e gerencie todos os seus clientes.</p>
        </div>
        <button 
            onClick={() => setIsCreateOpen(true)}
            style={{ 
                background: '#2563eb', color: 'white', border: 'none', padding: '0.75rem 1.25rem', 
                borderRadius: '8px', cursor: 'pointer', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.5rem',
                boxShadow: '0 4px 6px -1px rgba(37, 99, 235, 0.1), 0 2px 4px -1px rgba(37, 99, 235, 0.06)'
            }}
        >
            <Plus size={20} /> Nova Empresa
        </button>
      </div>

      {/* Tabela */}
      <div style={{ background: 'white', border: '1px solid #e5e7eb', borderRadius: '12px', overflow: 'hidden', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
          <thead style={{ background: '#f9fafb', borderBottom: '1px solid #e5e7eb' }}>
            <tr>
              <th style={{ padding: '1rem 1.5rem', color: '#4b5563', fontSize: '0.85rem', fontWeight: 600, textTransform: 'uppercase' }}>Empresa / Dono</th>
              <th style={{ padding: '1rem 1.5rem', color: '#4b5563', fontSize: '0.85rem', fontWeight: 600, textTransform: 'uppercase' }}>Plano</th>
              <th style={{ padding: '1rem 1.5rem', color: '#4b5563', fontSize: '0.85rem', fontWeight: 600, textTransform: 'uppercase' }}>Status</th>
              <th style={{ padding: '1rem 1.5rem', color: '#4b5563', fontSize: '0.85rem', fontWeight: 600, textTransform: 'uppercase' }}>Cadastro</th>
              <th style={{ padding: '1rem 1.5rem', textAlign: 'right' }}></th>
            </tr>
          </thead>
          <tbody>
            {tenants.map(t => (
              <tr key={t.id} style={{ borderBottom: '1px solid #f3f4f6', transition: 'background 0.2s' }} onMouseOver={(e) => e.currentTarget.style.background = '#f9fafb'} onMouseOut={(e) => e.currentTarget.style.background = 'white'}>
                <td style={{ padding: '1rem 1.5rem' }}>
                    <div style={{fontWeight: 600, color: '#111827'}}>{t.name}</div>
                    <div style={{fontSize: '0.85rem', color: '#6b7280', display: 'flex', alignItems: 'center', gap: '4px', marginTop: '2px'}}>
                        <Mail size={12}/> {t.owner_email || 'Sem dono'}
                    </div>
                </td>
                <td style={{ padding: '1rem 1.5rem' }}>
                  <span style={{ 
                      background: t.plan_name ? '#eff6ff' : '#f3f4f6', 
                      color: t.plan_name ? '#2563eb' : '#6b7280', 
                      padding: '4px 10px', borderRadius: '20px', fontSize: '0.75rem', fontWeight: 700, border: `1px solid ${t.plan_name ? '#bfdbfe' : '#e5e7eb'}`
                  }}>
                    {t.plan_name || 'Free'}
                  </span>
                </td>
                <td style={{ padding: '1rem 1.5rem' }}>
                  {t.status === 'active' 
                    ? <span style={{color:'#16a34a', background: '#dcfce7', padding: '4px 10px', borderRadius: '20px', fontSize: '0.75rem', fontWeight: 700, display:'inline-flex', alignItems:'center', gap:'4px'}}><CheckCircle size={12}/> ATIVO</span>
                    : <span style={{color:'#dc2626', background: '#fee2e2', padding: '4px 10px', borderRadius: '20px', fontSize: '0.75rem', fontWeight: 700, display:'inline-flex', alignItems:'center', gap:'4px'}}><Ban size={12}/> SUSPENSO</span>
                  }
                </td>
                <td style={{ padding: '1rem 1.5rem', color: '#6b7280', fontSize: '0.9rem' }}>
                    {new Date(t.created_at).toLocaleDateString()}
                </td>
                <td style={{ padding: '1rem 1.5rem', display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
                  <button onClick={() => openEditModal(t)} title="Editar" style={{ border: '1px solid #d1d5db', background: 'white', padding: '6px', borderRadius: '6px', cursor: 'pointer', color: '#4b5563' }}><Edit2 size={16} /></button>
                  <button onClick={() => handleDelete(t.id)} title="Excluir" style={{ border: '1px solid #fee2e2', background: '#fff1f2', color: '#e11d48', padding: '6px', borderRadius: '6px', cursor: 'pointer' }}><Trash2 size={16} /></button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Modal Criar */}
      {isCreateOpen && (
        <div style={{position:'fixed', inset:0, background:'rgba(0,0,0,0.5)', display:'flex', alignItems:'center', justifyContent:'center', zIndex:50}}>
            <div style={{background:'white', padding:'2rem', borderRadius:'12px', width:'450px', maxWidth:'95%', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)'}}>
                <div style={{display:'flex', justifyContent:'space-between', marginBottom:'1.5rem', alignItems:'center'}}>
                    <h3 style={{fontWeight:700, fontSize:'1.25rem', color: '#111827'}}>Nova Empresa</h3>
                    <button onClick={() => setIsCreateOpen(false)} style={{background:'none', border:'none', cursor:'pointer', color:'#6b7280'}}><X size={20}/></button>
                </div>
                <form onSubmit={handleSubmitCreate(handleCreate)} style={{display:'flex', flexDirection:'column', gap:'1rem'}}>
                    <div>
                        <label style={{display:'block', fontSize:'0.85rem', fontWeight:600, marginBottom:'0.4rem', color:'#374151'}}>Nome da Empresa</label>
                        <div style={{position: 'relative'}}>
                            <Building2 size={18} style={{position:'absolute', left:'10px', top:'10px', color:'#9ca3af'}} />
                            <input {...registerCreate('name', {required:true})} placeholder="Ex: Acme Corp" style={{width:'100%', padding:'0.6rem 0.6rem 0.6rem 2.2rem', border:'1px solid #d1d5db', borderRadius:'6px'}} />
                        </div>
                    </div>
                    <div>
                        <label style={{display:'block', fontSize:'0.85rem', fontWeight:600, marginBottom:'0.4rem', color:'#374151'}}>Plano Inicial</label>
                        <select {...registerCreate('plan_id')} style={{width:'100%', padding:'0.6rem', border:'1px solid #d1d5db', borderRadius:'6px', background:'white'}}>
                            <option value="">Plano Free (Padrão)</option>
                            {plans.map(p => <option key={p.id} value={p.id}>{p.name} - R$ {Number(p.price).toFixed(2)}</option>)}
                        </select>
                    </div>
                    
                    <div style={{borderTop: '1px dashed #e5e7eb', margin: '0.5rem 0'}}></div>
                    <p style={{fontSize: '0.8rem', color: '#6b7280', fontStyle:'italic'}}>Dados do Usuário Dono (Owner)</p>

                    <div>
                        <label style={{display:'block', fontSize:'0.85rem', fontWeight:600, marginBottom:'0.4rem', color:'#374151'}}>Nome do Responsável</label>
                        <input {...registerCreate('owner_name', {required:true})} placeholder="Ex: João Silva" style={{width:'100%', padding:'0.6rem', border:'1px solid #d1d5db', borderRadius:'6px'}} />
                    </div>
                    <div>
                        <label style={{display:'block', fontSize:'0.85rem', fontWeight:600, marginBottom:'0.4rem', color:'#374151'}}>E-mail de Acesso</label>
                        <div style={{position: 'relative'}}>
                            <Mail size={18} style={{position:'absolute', left:'10px', top:'10px', color:'#9ca3af'}} />
                            <input {...registerCreate('email', {required:true})} type="email" placeholder="joao@acme.com" style={{width:'100%', padding:'0.6rem 0.6rem 0.6rem 2.2rem', border:'1px solid #d1d5db', borderRadius:'6px'}} />
                        </div>
                    </div>
                    <div>
                        <label style={{display:'block', fontSize:'0.85rem', fontWeight:600, marginBottom:'0.4rem', color:'#374151'}}>Senha Provisória</label>
                        <div style={{position: 'relative'}}>
                            <Lock size={18} style={{position:'absolute', left:'10px', top:'10px', color:'#9ca3af'}} />
                            <input {...registerCreate('password', {required:true, minLength: 6})} type="password" placeholder="******" style={{width:'100%', padding:'0.6rem 0.6rem 0.6rem 2.2rem', border:'1px solid #d1d5db', borderRadius:'6px'}} />
                        </div>
                    </div>

                    <button type="submit" style={{marginTop:'1rem', background:'#2563eb', color:'white', padding:'0.75rem', border:'none', borderRadius:'6px', fontWeight:600, cursor:'pointer', width:'100%'}}>Criar Empresa e Usuário</button>
                </form>
            </div>
        </div>
      )}

      {/* Modal Editar */}
      {editingTenant && (
        <div style={{position:'fixed', inset:0, background:'rgba(0,0,0,0.5)', display:'flex', alignItems:'center', justifyContent:'center', zIndex:50}}>
            <div style={{background:'white', padding:'2rem', borderRadius:'12px', width:'400px', maxWidth:'95%', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)'}}>
                <div style={{display:'flex', justifyContent:'space-between', marginBottom:'1.5rem'}}>
                    <h3 style={{fontWeight:700, fontSize:'1.2rem', color: '#111827'}}>Editar Empresa</h3>
                    <button onClick={() => setEditingTenant(null)} style={{background:'none', border:'none', cursor:'pointer', color:'#6b7280'}}><X size={20}/></button>
                </div>
                <form onSubmit={handleSubmitEdit(saveEdit)} style={{display:'flex', flexDirection:'column', gap:'1rem'}}>
                    <div>
                        <label style={{display:'block', fontSize:'0.85rem', fontWeight:600, marginBottom:'0.4rem', color:'#374151'}}>Nome</label>
                        <input {...registerEdit('name')} style={{width:'100%', padding:'0.6rem', border:'1px solid #d1d5db', borderRadius:'6px'}} />
                    </div>
                    <div>
                        <label style={{display:'block', fontSize:'0.85rem', fontWeight:600, marginBottom:'0.4rem', color:'#374151'}}>Plano de Assinatura</label>
                        <select {...registerEdit('plan_id')} style={{width:'100%', padding:'0.6rem', border:'1px solid #d1d5db', borderRadius:'6px', background:'white'}}>
                            <option value="">Sem Plano (Free)</option>
                            {plans.map(p => <option key={p.id} value={p.id}>{p.name} - R$ {Number(p.price).toFixed(2)}</option>)}
                        </select>
                    </div>
                    <div>
                        <label style={{display:'block', fontSize:'0.85rem', fontWeight:600, marginBottom:'0.4rem', color:'#374151'}}>Status da Conta</label>
                        <select {...registerEdit('status')} style={{width:'100%', padding:'0.6rem', border:'1px solid #d1d5db', borderRadius:'6px', background:'white'}}>
                            <option value="active">✅ Ativa</option>
                            <option value="suspended">🚫 Suspensa (Bloqueada)</option>
                        </select>
                    </div>
                    <button type="submit" style={{marginTop:'1rem', background:'#2563eb', color:'white', padding:'0.75rem', border:'none', borderRadius:'6px', fontWeight:600, cursor:'pointer', width: '100%'}}>Salvar Alterações</button>
                </form>
            </div>
        </div>
      )}
    </div>
  );
}