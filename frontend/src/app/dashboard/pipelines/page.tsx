'use client';

import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Plus, X, Loader2, DollarSign, User, Trash2, MessageSquare, Send, Settings, Save } from 'lucide-react';
import { DragDropContext, Droppable, Draggable, DropResult } from '@hello-pangea/dnd';
import api from '@/services/api';
import styles from './page.module.css';

// --- Interfaces ---
interface Stage { id: string; name: string; order: number; }
interface Pipeline { id: string; name: string; stages: Stage[]; }

interface Deal {
  id: string;
  title: string;
  value: number;
  stage_id: string;
  contact_id?: string;
  contact_name?: string;
  user_id?: string;
  user_name?: string;
  description?: string;
}

interface Contact { id: string; name: string; }
interface AppUser { id: string; name: string; }
interface Comment { id: string; content: string; created_at: string; user_name: string; }

// --- Schemas ---
const createDealSchema = z.object({
  title: z.string().min(1, 'Título é obrigatório'),
  value: z.string().transform((val) => Number(val) || 0),
  contact_id: z.string().min(1, 'Selecione um cliente'),
  stage_id: z.string().min(1, 'Selecione uma etapa'),
  user_id: z.string().optional(),
  description: z.string().optional()
});

const editDealSchema = z.object({
  title: z.string().min(1),
  value: z.string().transform((val) => Number(val) || 0),
  contact_id: z.string().min(1),
  user_id: z.string().optional(),
  description: z.string().optional()
});

type CreateDealData = z.infer<typeof createDealSchema>;
type EditDealData = z.infer<typeof editDealSchema>;

export default function KanbanPage() {
  const [pipeline, setPipeline] = useState<Pipeline | null>(null);
  const [deals, setDeals] = useState<Deal[]>([]);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [users, setUsers] = useState<AppUser[]>([]);
  
  const [isLoading, setIsLoading] = useState(true);
  const [isBrowser, setIsBrowser] = useState(false);
  const [userRole, setUserRole] = useState<string>(''); // Novo estado para controle de permissão
  
  // Modals
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);
  
  const [selectedDeal, setSelectedDeal] = useState<Deal | null>(null);
  const [activeTab, setActiveTab] = useState<'details' | 'comments'>('details');
  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState('');
  
  const [isSaving, setIsSaving] = useState(false);
  const [isSendingComment, setIsSendingComment] = useState(false);

  // Estados locais para edição de Stages
  const [editingStages, setEditingStages] = useState<Stage[]>([]);
  const [newStageName, setNewStageName] = useState('');

  const createForm = useForm<CreateDealData>({ resolver: zodResolver(createDealSchema) });
  const editForm = useForm<EditDealData>({ resolver: zodResolver(editDealSchema) });

  useEffect(() => { 
      setIsBrowser(true); 
      
      // Identifica o cargo do usuário para bloquear o botão de configurações
      const userData = localStorage.getItem('crm_user');
      if (userData) {
          try {
              const parsed = JSON.parse(userData);
              setUserRole(parsed.role);
          } catch (e) { console.error(e); }
      }
  }, []);

  async function loadData() {
    try {
      const [pipeRes, dealsRes, contactsRes, usersRes] = await Promise.all([
        api.get('/api/pipelines'),
        api.get('/api/deals'),
        api.get('/api/contacts'),
        api.get('/api/users')
      ]);

      if (pipeRes.data.length > 0) {
        setPipeline(pipeRes.data[0]);
        setEditingStages(pipeRes.data[0].stages);
        if(pipeRes.data[0].stages.length > 0) {
           createForm.setValue('stage_id', pipeRes.data[0].stages[0].id);
        }
      }
      setDeals(dealsRes.data);
      setContacts(contactsRes.data.data || contactsRes.data); // Ajuste robusto para data.data ou data
      setUsers(usersRes.data);
    } catch (error) {
      console.error('Erro ao carregar Kanban:', error);
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => { loadData(); }, []);

  async function fetchComments(dealId: string) {
    try {
      const res = await api.get(`/api/deals/${dealId}/comments`);
      setComments(res.data);
    } catch (error) {
      console.error(error);
    }
  }

  // --- Funnel Configuration Actions ---
  
  function handleStageNameChange(id: string, newName: string) {
    setEditingStages(prev => prev.map(s => s.id === id ? { ...s, name: newName } : s));
  }

  async function handleSaveStages() {
    setIsSaving(true);
    try {
      await api.put('/api/pipelines/stages', { stages: editingStages });
      if (newStageName.trim() && pipeline) {
        await api.post(`/api/pipelines/${pipeline.id}/stages`, { name: newStageName });
      }
      setNewStageName('');
      setIsSettingsModalOpen(false);
      loadData();
    } catch (error) {
      alert('Erro ao salvar configurações do funil.');
    } finally {
      setIsSaving(false);
    }
  }

  async function handleDeleteStage(stageId: string) {
    if (!confirm('Tem certeza que deseja excluir esta etapa?')) return;
    
    setIsSaving(true);
    try {
      await api.delete(`/api/pipelines/stages/${stageId}`);
      setEditingStages(prev => prev.filter(s => s.id !== stageId));
      loadData();
    } catch (error: any) {
      if (error.response?.status === 400) {
        alert('Não é possível excluir: Existem negócios nesta etapa. Mova-os antes.');
      } else {
        alert('Erro ao excluir etapa.');
      }
    } finally {
      setIsSaving(false);
    }
  }

  // --- Drag & Drop ---
  async function onDragEnd(result: DropResult) {
    const { destination, source, draggableId } = result;
    if (!destination) return;
    if (destination.droppableId === source.droppableId && destination.index === source.index) return;

    const oldDeals = [...deals];
    const newStageId = destination.droppableId;

    setDeals(deals.map(deal => deal.id === draggableId ? { ...deal, stage_id: newStageId } : deal));

    try {
      await api.put(`/api/deals/${draggableId}/move`, { stage_id: newStageId });
    } catch (error) {
      console.error('Erro ao mover card:', error);
      setDeals(oldDeals);
    }
  }

  // --- CRUD Deals ---
  async function handleCreateDeal(data: CreateDealData) {
    setIsSaving(true);
    try {
      await api.post('/api/deals', { ...data, expected_close_date: new Date().toISOString().split('T')[0] });
      setIsCreateModalOpen(false);
      createForm.reset();
      loadData();
    } catch (error) {
      alert('Erro ao criar negócio.');
    } finally {
      setIsSaving(false);
    }
  }

  function openEditModal(deal: Deal) {
    setSelectedDeal(deal);
    setActiveTab('details');
    editForm.setValue('title', deal.title);
    editForm.setValue('value', deal.value);
    editForm.setValue('contact_id', deal.contact_id || '');
    editForm.setValue('user_id', deal.user_id || '');
    editForm.setValue('description', deal.description || '');
    setIsEditModalOpen(true);
    fetchComments(deal.id);
  }

  async function handleEditDeal(data: EditDealData) {
    if (!selectedDeal) return;
    setIsSaving(true);
    try {
      await api.put(`/api/deals/${selectedDeal.id}`, data);
      setIsEditModalOpen(false);
      loadData();
    } catch (error) {
      alert('Erro ao editar negócio.');
    } finally {
      setIsSaving(false);
    }
  }

  async function handleDeleteDeal() {
    if (!selectedDeal || !confirm('Tem certeza?')) return;
    setIsSaving(true);
    try {
      await api.delete(`/api/deals/${selectedDeal.id}`);
      setIsEditModalOpen(false);
      loadData();
    } catch (error) {
      alert('Erro ao excluir.');
    } finally {
      setIsSaving(false);
    }
  }

  async function handleSendComment(e: React.FormEvent) {
    e.preventDefault();
    if(!newComment.trim() || !selectedDeal) return;
    setIsSendingComment(true);
    try {
      const res = await api.post(`/api/deals/${selectedDeal.id}/comments`, { content: newComment });
      setComments([...comments, res.data]);
      setNewComment('');
    } catch (error) {
      alert('Erro ao enviar comentário.');
    } finally {
      setIsSendingComment(false);
    }
  }

  // --- Render ---
  if (isLoading) return <div style={{ display: 'flex', justifyContent: 'center', marginTop: '3rem' }}><Loader2 className="animate-spin" /></div>;
  if (!pipeline) return <div className={styles.container}>Nenhum funil encontrado.</div>;

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <div style={{display: 'flex', alignItems: 'center', gap: '1rem'}}>
            <h1 className={styles.title}>{pipeline.name}</h1>
            
            {/* LÓGICA DE PROTEÇÃO: Botão só aparece se NÃO for vendedor (agent) */}
            {userRole !== 'agent' && (
                <button 
                    onClick={() => setIsSettingsModalOpen(true)}
                    style={{background: 'none', border: 'none', cursor: 'pointer', color: '#6b7280'}}
                    title="Configurar Funil"
                >
                    <Settings size={20} />
                </button>
            )}
        </div>
        <button className={styles.addButton} onClick={() => setIsCreateModalOpen(true)}>
          <Plus size={20} /> Novo Negócio
        </button>
      </div>

      {isBrowser && (
        <DragDropContext onDragEnd={onDragEnd}>
          <div className={styles.board}>
            {pipeline.stages.map((stage) => {
              const stageDeals = deals.filter(d => d.stage_id === stage.id);
              return (
                <div key={stage.id} className={styles.column}>
                  <div className={styles.columnHeader}>
                    <span>{stage.name}</span>
                    <span className={styles.columnCount}>{stageDeals.length}</span>
                  </div>
                  
                  <Droppable droppableId={stage.id}>
                    {(provided, snapshot) => (
                      <div
                        className={styles.columnBody}
                        ref={provided.innerRef}
                        {...provided.droppableProps}
                        style={{ backgroundColor: snapshot.isDraggingOver ? '#e2e8f0' : 'transparent' }}
                      >
                        {stageDeals.map((deal, index) => (
                          <Draggable key={deal.id} draggableId={deal.id} index={index}>
                            {(provided, snapshot) => (
                              <div
                                className={styles.card}
                                ref={provided.innerRef}
                                {...provided.draggableProps}
                                {...provided.dragHandleProps}
                                onClick={() => openEditModal(deal)}
                                style={{
                                  ...provided.draggableProps.style,
                                  opacity: snapshot.isDragging ? 0.8 : 1,
                                  transform: snapshot.isDragging ? `${provided.draggableProps.style?.transform} rotate(3deg)` : provided.draggableProps.style?.transform
                                }}
                              >
                                <div className={styles.cardTitle}>{deal.title}</div>
                                {deal.value > 0 && (
                                  <div className={styles.cardValue}>
                                    <DollarSign size={14} />
                                    {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(deal.value)}
                                  </div>
                                )}
                                <div className={styles.cardFooter}>
                                  <div className={styles.contactName}>
                                    <User size={12} /> {deal.contact_name?.split(' ')[0] || 'S/ Contato'}
                                  </div>
                                  {deal.user_name && (
                                    <div className={styles.miniAvatar} title={`Responsável: ${deal.user_name}`}>
                                      {deal.user_name.charAt(0).toUpperCase()}
                                    </div>
                                  )}
                                </div>
                              </div>
                            )}
                          </Draggable>
                        ))}
                        {provided.placeholder}
                      </div>
                    )}
                  </Droppable>
                </div>
              );
            })}
          </div>
        </DragDropContext>
      )}

      {/* --- Modal Configurar Funil (Só aparece via botão, que está protegido) --- */}
      {isSettingsModalOpen && (
        <div className={styles.modalOverlay}>
            <div className={styles.modalContent} style={{maxWidth: '500px'}}>
                <div className={styles.modalHeader}>
                    <h3 className={styles.modalTitle}>Editar Funil</h3>
                    <button className={styles.closeButton} onClick={() => setIsSettingsModalOpen(false)}><X size={20} /></button>
                </div>
                <div className={styles.modalBody}>
                    <p style={{marginBottom: '1rem', color: '#6b7280', fontSize: '0.9rem'}}>Renomeie as etapas atuais ou adicione novas.</p>
                    
                    <div style={{display: 'flex', flexDirection: 'column', gap: '0.8rem'}}>
                        {editingStages.map((stage, index) => (
                            <div key={stage.id} style={{display: 'flex', gap: '0.5rem', alignItems: 'center'}}>
                                <span style={{fontWeight: 700, color: '#9ca3af', width: '20px'}}>{index + 1}</span>
                                <input 
                                    className={styles.input}
                                    value={stage.name}
                                    onChange={(e) => handleStageNameChange(stage.id, e.target.value)}
                                />
                                <button 
                                    type="button"
                                    onClick={() => handleDeleteStage(stage.id)}
                                    title="Excluir Etapa"
                                    style={{
                                        border: '1px solid #ef4444', 
                                        background: '#fef2f2', 
                                        color: '#ef4444', 
                                        borderRadius: '6px', 
                                        padding: '0.6rem', 
                                        cursor: 'pointer',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center'
                                    }}
                                >
                                    <Trash2 size={16} />
                                </button>
                            </div>
                        ))}
                        
                        <div style={{marginTop: '1rem', borderTop: '1px dashed #e5e7eb', paddingTop: '1rem'}}>
                            <label className={styles.label}>Adicionar Nova Etapa</label>
                            <div style={{display: 'flex', gap: '0.5rem', marginTop: '0.5rem'}}>
                                <input 
                                    className={styles.input}
                                    placeholder="Ex: Aguardando Assinatura"
                                    value={newStageName}
                                    onChange={(e) => setNewStageName(e.target.value)}
                                />
                            </div>
                        </div>
                    </div>
                </div>
                <div className={styles.modalFooter}>
                    <button className={styles.cancelButton} onClick={() => setIsSettingsModalOpen(false)}>Cancelar</button>
                    <button className={styles.saveButton} onClick={handleSaveStages} disabled={isSaving}>
                        {isSaving ? <Loader2 className="animate-spin" size={16} /> : <><Save size={16} /> Salvar Alterações</>}
                    </button>
                </div>
            </div>
        </div>
      )}

      {/* --- Modal Criar --- */}
      {isCreateModalOpen && (
        <div className={styles.modalOverlay}>
          <div className={styles.modalContent}>
            <div className={styles.modalHeader}>
              <h3 className={styles.modalTitle}>Novo Negócio</h3>
              <button className={styles.closeButton} onClick={() => setIsCreateModalOpen(false)}><X size={20} /></button>
            </div>
            <form onSubmit={createForm.handleSubmit(handleCreateDeal)}>
              <div className={styles.modalBody}>
                <div className={styles.formGroup}>
                  <label className={styles.label}>Título</label>
                  <input {...createForm.register('title')} className={styles.input} placeholder="Ex: Projeto X" />
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                  <div className={styles.formGroup}>
                    <label className={styles.label}>Valor (R$)</label>
                    <input {...createForm.register('value')} type="number" className={styles.input} />
                  </div>
                  <div className={styles.formGroup}>
                    <label className={styles.label}>Etapa</label>
                    <select {...createForm.register('stage_id')} className={styles.select}>
                      {pipeline?.stages.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                    </select>
                  </div>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                    <div className={styles.formGroup}>
                    <label className={styles.label}>Cliente</label>
                    <select {...createForm.register('contact_id')} className={styles.select}>
                        <option value="">Selecione...</option>
                        {contacts.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                    </select>
                    </div>
                    <div className={styles.formGroup}>
                    <label className={styles.label}>Responsável</label>
                    <select {...createForm.register('user_id')} className={styles.select}>
                        <option value="">Eu mesmo</option>
                        {users.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
                    </select>
                    </div>
                </div>
                <div className={styles.formGroup}>
                    <label className={styles.label}>Descrição</label>
                    <textarea {...createForm.register('description')} className={styles.textarea} placeholder="Detalhes da negociação..." />
                </div>
              </div>
              <div className={styles.modalFooter}>
                <button type="button" className={styles.cancelButton} onClick={() => setIsCreateModalOpen(false)}>Cancelar</button>
                <button type="submit" disabled={isSaving} className={styles.saveButton}>
                  {isSaving ? <Loader2 className="animate-spin" size={16} /> : 'Criar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* --- Modal Editar (Com Abas) --- */}
      {isEditModalOpen && selectedDeal && (
        <div className={styles.modalOverlay}>
          <div className={styles.modalContent}>
            <div className={styles.modalHeader}>
              <h3 className={styles.modalTitle}>Detalhes do Negócio</h3>
              <button className={styles.closeButton} onClick={() => setIsEditModalOpen(false)}><X size={20} /></button>
            </div>
            
            <div className={styles.tabs}>
                <div className={`${styles.tab} ${activeTab === 'details' ? styles.tabActive : ''}`} onClick={() => setActiveTab('details')}>Detalhes</div>
                <div className={`${styles.tab} ${activeTab === 'comments' ? styles.tabActive : ''}`} onClick={() => setActiveTab('comments')}>Comentários</div>
            </div>

            {activeTab === 'details' && (
                <form onSubmit={editForm.handleSubmit(handleEditDeal)} style={{ display: 'flex', flexDirection: 'column', flex: 1, overflow: 'hidden' }}>
                <div className={styles.modalBody}>
                    <div className={styles.formGroup}>
                        <label className={styles.label}>Título</label>
                        <input {...editForm.register('title')} className={styles.input} />
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                        <div className={styles.formGroup}>
                            <label className={styles.label}>Valor</label>
                            <input {...editForm.register('value')} type="number" className={styles.input} />
                        </div>
                        <div className={styles.formGroup}>
                            <label className={styles.label}>Responsável</label>
                            <select {...editForm.register('user_id')} className={styles.select}>
                                <option value="">Selecione...</option>
                                {users.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
                            </select>
                        </div>
                    </div>
                    <div className={styles.formGroup}>
                        <label className={styles.label}>Cliente</label>
                        <select {...editForm.register('contact_id')} className={styles.select}>
                            <option value="">Selecione...</option>
                            {contacts.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                        </select>
                    </div>
                    <div className={styles.formGroup}>
                        <label className={styles.label}>Descrição</label>
                        <textarea {...editForm.register('description')} className={styles.textarea} />
                    </div>
                </div>
                <div className={styles.modalFooter} style={{justifyContent: 'space-between'}}>
                    <button type="button" className={styles.deleteButton} onClick={handleDeleteDeal}><Trash2 size={16} /> Excluir</button>
                    <div style={{display: 'flex', gap: '0.75rem'}}>
                    <button type="button" className={styles.cancelButton} onClick={() => setIsEditModalOpen(false)}>Cancelar</button>
                    <button type="submit" disabled={isSaving} className={styles.saveButton}>
                        {isSaving ? <Loader2 className="animate-spin" size={16} /> : 'Salvar'}
                    </button>
                    </div>
                </div>
                </form>
            )}

            {activeTab === 'comments' && (
                <div className={styles.modalBody}>
                    <div className={styles.commentsSection}>
                        <div className={styles.commentList}>
                            {comments.length === 0 && <p style={{color: '#9ca3af', fontSize: '0.9rem'}}>Nenhum comentário ainda.</p>}
                            {comments.map(comment => (
                                <div key={comment.id} className={styles.commentItem}>
                                    <div className={styles.commentHeader}>
                                        <span className={styles.commentUser}>{comment.user_name || 'Usuário'}</span>
                                        <span>{new Date(comment.created_at).toLocaleDateString()} {new Date(comment.created_at).toLocaleTimeString().slice(0,5)}</span>
                                    </div>
                                    <div className={styles.commentText}>{comment.content}</div>
                                </div>
                            ))}
                        </div>
                        <form className={styles.commentForm} onSubmit={handleSendComment}>
                            <input 
                                className={styles.commentInput} 
                                placeholder="Escreva uma observação..." 
                                value={newComment}
                                onChange={e => setNewComment(e.target.value)}
                            />
                            <button type="submit" disabled={isSendingComment} className={styles.commentSend}>
                                {isSendingComment ? <Loader2 className="animate-spin" size={16} /> : <Send size={16} />}
                            </button>
                        </form>
                    </div>
                </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}