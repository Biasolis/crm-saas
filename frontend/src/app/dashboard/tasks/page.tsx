'use client';

import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Plus, Trash2, Calendar, User, CheckCircle2, Search, X, ClipboardList, Loader2, Edit2, AlignLeft, LayoutList, Kanban as KanbanIcon, Users } from 'lucide-react';
import { DragDropContext, Droppable, Draggable, DropResult } from '@hello-pangea/dnd';
import api from '@/services/api';
import styles from './page.module.css';

// Interfaces
interface Task {
  id: string;
  title: string;
  description?: string;
  due_date: string | null;
  priority: 'low' | 'medium' | 'high';
  status: 'pending' | 'in_progress' | 'completed';
  contact_id?: string;
  contact_name?: string;
  lead_id?: string;
  lead_name?: string;
  user_name?: string;
}

interface Option { id: string; name: string; } // Para Contacts e Leads

const taskSchema = z.object({
  title: z.string().min(1, 'Título obrigatório'),
  description: z.string().optional(),
  due_date: z.string().optional(),
  priority: z.enum(['low', 'medium', 'high']),
  contact_id: z.string().optional(),
  lead_id: z.string().optional(), // Adicionado
  status: z.enum(['pending', 'in_progress', 'completed']).default('pending'),
});

type TaskFormData = z.infer<typeof taskSchema>;

export default function TasksPage() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [contacts, setContacts] = useState<Option[]>([]);
  const [leads, setLeads] = useState<Option[]>([]); // Novo estado para Leads
  
  const [viewMode, setViewMode] = useState<'list' | 'board'>('list');
  const [searchTerm, setSearchTerm] = useState('');
  const [isBrowser, setIsBrowser] = useState(false);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  
  const { register, handleSubmit, reset, setValue } = useForm<TaskFormData>({
    resolver: zodResolver(taskSchema),
    defaultValues: { priority: 'medium', status: 'pending' }
  });

  useEffect(() => { setIsBrowser(true); }, []);

  // --- Loads ---
  async function fetchTasks() {
    setIsLoading(true);
    try {
      const query = searchTerm ? `?status=all&search=${searchTerm}` : `?status=all`;
      const res = await api.get(`/api/tasks${query}`);
      setTasks(res.data);
    } catch (error) {
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  }

  // Debounce para busca
  useEffect(() => {
    const timeout = setTimeout(fetchTasks, 500);
    return () => clearTimeout(timeout);
  }, [searchTerm]);

  // Carrega opções de contatos e leads
  useEffect(() => {
    Promise.all([
        api.get('/api/contacts'),
        api.get('/api/leads/pool'), // Pega leads disponíveis (pode ajustar para pegar todos dependendo da regra)
        api.get('/api/leads/mine')  // Pega leads do usuário
    ]).then(([resContacts, resPool, resMine]) => {
        setContacts(resContacts.data.data || resContacts.data);
        
        // Combina leads da piscina e meus leads para o select
        const allLeads = [...(resPool.data || []), ...(resMine.data || [])];
        // Remove duplicatas por ID
        const uniqueLeads = Array.from(new Map(allLeads.map(item => [item.id, item])).values());
        setLeads(uniqueLeads as Option[]);
    }).catch(console.error);
  }, []);

  // --- Actions ---

  async function changeTaskStatus(id: string, newStatus: 'pending' | 'in_progress' | 'completed') {
    // Optimistic Update
    setTasks(prev => prev.map(t => t.id === id ? { ...t, status: newStatus } : t));
    try {
        await api.patch(`/api/tasks/${id}/status`, { status: newStatus });
    } catch (error) {
        console.error(error);
        fetchTasks(); // Reverte em erro
    }
  }

  function onDragEnd(result: DropResult) {
    const { destination, draggableId } = result;
    if (!destination) return;
    const newStatus = destination.droppableId as 'pending' | 'in_progress' | 'completed';
    if (newStatus === tasks.find(t => t.id === draggableId)?.status) return;

    changeTaskStatus(draggableId, newStatus);
  }

  async function handleSave(data: TaskFormData) {
    setIsSaving(true);
    try {
      const payload = {
        ...data,
        contact_id: data.contact_id || null, // Garante null se string vazia
        lead_id: data.lead_id || null
      };

      if (editingTask) {
        await api.put(`/api/tasks/${editingTask.id}`, payload);
      } else {
        await api.post('/api/tasks', payload);
      }
      setIsModalOpen(false);
      fetchTasks();
    } catch (error) {
      alert('Erro ao salvar tarefa');
    } finally {
      setIsSaving(false);
    }
  }

  function handleOpenModal(task?: Task) {
    if (task) {
      setEditingTask(task);
      setValue('title', task.title);
      setValue('description', task.description || '');
      setValue('priority', task.priority);
      setValue('status', task.status);
      setValue('contact_id', task.contact_id || '');
      setValue('lead_id', task.lead_id || '');
      
      if (task.due_date) {
        const date = new Date(task.due_date);
        // Ajuste fuso horário simples para input datetime-local
        const isoString = new Date(date.getTime() - (date.getTimezoneOffset() * 60000)).toISOString().slice(0, 16);
        setValue('due_date', isoString);
      } else {
        setValue('due_date', '');
      }
    } else {
      setEditingTask(null);
      reset();
      setValue('status', 'pending');
      setValue('priority', 'medium');
    }
    setIsModalOpen(true);
  }

  async function deleteTask(id: string) {
    if (!confirm('Excluir tarefa permanentemente?')) return;
    try {
        setTasks(prev => prev.filter(t => t.id !== id));
        await api.delete(`/api/tasks/${id}`);
    } catch (error) { fetchTasks(); }
  }

  // --- Renders ---

  const columns = [
    { id: 'pending', title: 'A Fazer', color: '#3b82f6', bg: '#eff6ff' },
    { id: 'in_progress', title: 'Em Andamento', color: '#f59e0b', bg: '#fffbeb' },
    { id: 'completed', title: 'Concluído', color: '#10b981', bg: '#f0fdf4' }
  ];

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <div style={{display:'flex', flexDirection:'column', gap:'0.5rem'}}>
            <h1 className={styles.title}>Minha Agenda</h1>
            <p className={styles.subtitle}>Gerencie suas atividades diárias e acompanhamentos.</p>
        </div>

        <div style={{display:'flex', alignItems:'center', gap:'1rem'}}>
            {/* Busca */}
            <div className={styles.searchWrapper}>
                <Search size={16} className={styles.searchIcon} />
                <input 
                    placeholder="Buscar tarefa..." 
                    value={searchTerm}
                    onChange={e => setSearchTerm(e.target.value)}
                    className={styles.searchInput}
                />
            </div>

            {/* Toggle View */}
            <div className={styles.viewToggle}>
                <button 
                    className={`${styles.viewBtn} ${viewMode === 'list' ? styles.viewBtnActive : ''}`}
                    onClick={() => setViewMode('list')}
                    title="Lista"
                >
                    <LayoutList size={18} />
                </button>
                <button 
                    className={`${styles.viewBtn} ${viewMode === 'board' ? styles.viewBtnActive : ''}`}
                    onClick={() => setViewMode('board')}
                    title="Kanban"
                >
                    <KanbanIcon size={18} />
                </button>
            </div>

            <button className={styles.addButton} onClick={() => handleOpenModal()}>
                <Plus size={20} /> Nova Tarefa
            </button>
        </div>
      </div>

      {isLoading ? (
         <div className={styles.loadingState}><Loader2 className="animate-spin" size={32} /></div>
      ) : (
        <>
            {/* --- MODO LISTA --- */}
            {viewMode === 'list' && (
                <div className={styles.taskList}>
                    {tasks.length === 0 && (
                        <div className={styles.emptyState}>
                            <ClipboardList size={48} strokeWidth={1}/>
                            <h3>Tudo limpo por aqui!</h3>
                            <p>Você não tem tarefas pendentes com esse filtro.</p>
                        </div>
                    )}
                    
                    {tasks.map(task => (
                    <div key={task.id} className={`${styles.taskItem} ${task.status === 'completed' ? styles.completed : ''}`}>
                        <div 
                            className={styles.checkbox} 
                            onClick={() => changeTaskStatus(task.id, task.status === 'completed' ? 'pending' : 'completed')}
                            style={{
                                borderColor: task.status === 'completed' ? '#22c55e' : '#cbd5e1',
                                backgroundColor: task.status === 'completed' ? '#22c55e' : 'transparent',
                                color: 'white'
                            }}
                        >
                            {task.status === 'completed' && <CheckCircle2 size={16} />}
                        </div>
                        
                        <div className={styles.taskContent}>
                            <div className={styles.taskHeaderLine}>
                                <span className={styles.taskTitle}>{task.title}</span>
                                {task.status === 'in_progress' && <span className={styles.badgeProgress}>EM ANDAMENTO</span>}
                                <span className={`${styles.priorityBadge} ${styles[`priority-${task.priority}`]}`}>
                                    {task.priority === 'high' ? 'Alta' : task.priority === 'medium' ? 'Média' : 'Baixa'}
                                </span>
                            </div>

                            {task.description && (
                                <div className={styles.taskDesc}>
                                    <AlignLeft size={12} /> {task.description.length > 60 ? task.description.slice(0,60)+'...' : task.description}
                                </div>
                            )}
                            
                            <div className={styles.taskMetaRow}>
                                {task.due_date && (
                                    <span className={`${styles.metaItem} ${new Date(task.due_date) < new Date() && task.status !== 'completed' ? styles.overdue : ''}`}>
                                        <Calendar size={12} /> 
                                        {new Date(task.due_date).toLocaleDateString()} {new Date(task.due_date).toLocaleTimeString().slice(0,5)}
                                    </span>
                                )}
                                {task.lead_name && (
                                    <span className={styles.metaItem} title="Lead Vinculado">
                                        <Users size={12} /> {task.lead_name}
                                    </span>
                                )}
                                {task.contact_name && !task.lead_name && (
                                    <span className={styles.metaItem} title="Contato Vinculado">
                                        <User size={12} /> {task.contact_name}
                                    </span>
                                )}
                            </div>
                        </div>

                        <div className={styles.actions}>
                            <button className={styles.iconBtn} onClick={() => handleOpenModal(task)}><Edit2 size={16} /></button>
                            <button className={`${styles.iconBtn} ${styles.danger}`} onClick={() => deleteTask(task.id)}><Trash2 size={16} /></button>
                        </div>
                    </div>
                    ))}
                </div>
            )}

            {/* --- MODO BOARD (KANBAN) --- */}
            {viewMode === 'board' && isBrowser && (
                <DragDropContext onDragEnd={onDragEnd}>
                    <div className={styles.boardContainer}>
                        {columns.map(col => {
                            const colTasks = tasks.filter(t => t.status === col.id);
                            return (
                                <div key={col.id} className={styles.column} style={{background: col.bg}}>
                                    <div className={styles.columnHeader} style={{borderTopColor: col.color}}>
                                        <span>{col.title}</span>
                                        <span className={styles.columnCount}>{colTasks.length}</span>
                                    </div>
                                    <Droppable droppableId={col.id}>
                                        {(provided, snapshot) => (
                                            <div 
                                                className={styles.columnBody}
                                                ref={provided.innerRef}
                                                {...provided.droppableProps}
                                                style={{background: snapshot.isDraggingOver ? 'rgba(0,0,0,0.02)' : 'transparent'}}
                                            >
                                                {colTasks.map((task, index) => (
                                                    <Draggable key={task.id} draggableId={task.id} index={index}>
                                                        {(provided, snapshot) => (
                                                            <div
                                                                className={styles.card}
                                                                ref={provided.innerRef}
                                                                {...provided.draggableProps}
                                                                {...provided.dragHandleProps}
                                                                onClick={() => handleOpenModal(task)}
                                                                style={{
                                                                    ...provided.draggableProps.style,
                                                                    opacity: snapshot.isDragging ? 0.8 : 1,
                                                                    transform: snapshot.isDragging ? `${provided.draggableProps.style?.transform} rotate(2deg)` : provided.draggableProps.style?.transform
                                                                }}
                                                            >
                                                                <div className={styles.cardHeader}>
                                                                    <span className={`${styles.priorityDot} ${styles[`priority-${task.priority}`]}`}></span>
                                                                    <span className={styles.cardTitleBoard}>{task.title}</span>
                                                                </div>
                                                                
                                                                <div className={styles.cardFooter}>
                                                                     {task.lead_name ? (
                                                                        <div className={styles.cardTag}><Users size={10}/> {task.lead_name.split(' ')[0]}</div>
                                                                     ) : task.contact_name ? (
                                                                        <div className={styles.cardTag}><User size={10}/> {task.contact_name.split(' ')[0]}</div>
                                                                     ) : <div></div>}

                                                                     {task.due_date && (
                                                                        <div className={`${styles.cardDate} ${new Date(task.due_date) < new Date() && task.status !== 'completed' ? styles.overdueText : ''}`}>
                                                                            {new Date(task.due_date).toLocaleDateString().slice(0,5)}
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
                            )
                        })}
                    </div>
                </DragDropContext>
            )}
        </>
      )}

      {/* Modal Criar/Editar */}
      {isModalOpen && (
        <div className={styles.modalOverlay}>
            <div className={styles.modalContent}>
                <div className={styles.modalHeader}>
                    <h3>{editingTask ? 'Editar Tarefa' : 'Nova Tarefa'}</h3>
                    <button onClick={() => setIsModalOpen(false)} className={styles.closeBtn}><X size={20}/></button>
                </div>
                <form onSubmit={handleSubmit(handleSave)}>
                    <div className={styles.modalBody}>
                        <div className={styles.formGroup}>
                            <label>O que precisa ser feito?</label>
                            <input {...register('title')} className={styles.input} autoFocus placeholder="Ex: Ligar para cliente..." />
                            {/* Erros se necessário */}
                        </div>
                        
                        <div style={{display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem'}}>
                            <div className={styles.formGroup}>
                                <label>Status</label>
                                <select {...register('status')} className={styles.select}>
                                    <option value="pending">A Fazer</option>
                                    <option value="in_progress">Em Andamento</option>
                                    <option value="completed">Concluída</option>
                                </select>
                            </div>
                            <div className={styles.formGroup}>
                                <label>Prioridade</label>
                                <select {...register('priority')} className={styles.select}>
                                    <option value="low">Baixa</option>
                                    <option value="medium">Média</option>
                                    <option value="high">Alta</option>
                                </select>
                            </div>
                        </div>

                        <div className={styles.formGroup}>
                            <label>Data e Hora Limite</label>
                            <input {...register('due_date')} type="datetime-local" className={styles.input} />
                        </div>

                        {/* SELEÇÃO DE VÍNCULO (LEAD OU CONTATO) */}
                        <div style={{display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem'}}>
                            <div className={styles.formGroup}>
                                <label>Vincular a Lead</label>
                                <select {...register('lead_id')} className={styles.select}>
                                    <option value="">Nenhum</option>
                                    {leads.map(l => (
                                        <option key={l.id} value={l.id}>{l.name}</option>
                                    ))}
                                </select>
                            </div>
                            <div className={styles.formGroup}>
                                <label>Vincular a Contato</label>
                                <select {...register('contact_id')} className={styles.select}>
                                    <option value="">Nenhum</option>
                                    {contacts.map(c => (
                                        <option key={c.id} value={c.id}>{c.name}</option>
                                    ))}
                                </select>
                            </div>
                        </div>

                        <div className={styles.formGroup}>
                            <label>Descrição</label>
                            <textarea {...register('description')} className={styles.textarea} placeholder="Detalhes adicionais..." />
                        </div>
                    </div>

                    <div className={styles.modalFooter}>
                        <button type="button" className={styles.cancelButton} onClick={() => setIsModalOpen(false)}>Cancelar</button>
                        <button type="submit" disabled={isSaving} className={styles.saveButton}>
                            {isSaving ? <Loader2 className="animate-spin" size={16}/> : 'Salvar Tarefa'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
      )}
    </div>
  );
}