'use client';

import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Plus, Trash2, Calendar, User, CheckCircle2, Circle, X, ClipboardList, Loader2, Edit2, AlignLeft, LayoutList, Kanban as KanbanIcon } from 'lucide-react';
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
  status: 'pending' | 'in_progress' | 'completed'; // Adicionado in_progress
  contact_name?: string;
}

interface Contact { id: string; name: string; }

const taskSchema = z.object({
  title: z.string().min(1, 'Título obrigatório'),
  description: z.string().optional(),
  due_date: z.string().optional(),
  priority: z.enum(['low', 'medium', 'high']),
  contact_id: z.string().optional(),
  status: z.enum(['pending', 'in_progress', 'completed']).default('pending'), // Adicionado ao form
});

type TaskFormData = z.infer<typeof taskSchema>;

export default function TasksPage() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [viewMode, setViewMode] = useState<'list' | 'board'>('list'); // Estado da visualização
  const [isBrowser, setIsBrowser] = useState(false); // Para DND

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  
  const { register, handleSubmit, reset, setValue } = useForm<TaskFormData>({
    resolver: zodResolver(taskSchema),
    defaultValues: { priority: 'medium', status: 'pending' }
  });

  useEffect(() => { setIsBrowser(true); }, []);

  // Load
  async function fetchTasks() {
    setIsLoading(true);
    try {
      const res = await api.get(`/api/tasks?status=all`); // Trazemos todas para filtrar no front se precisar
      setTasks(res.data);
    } catch (error) {
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    fetchTasks();
    api.get('/api/contacts').then(res => setContacts(res.data.data)).catch(console.error);
  }, []);

  // --- Actions ---

  // Mudar Status (Usado na Lista e no Kanban)
  async function changeTaskStatus(id: string, newStatus: 'pending' | 'in_progress' | 'completed') {
    // Optimistic Update
    setTasks(prev => prev.map(t => t.id === id ? { ...t, status: newStatus } : t));

    try {
        await api.patch(`/api/tasks/${id}/status`, { status: newStatus });
    } catch (error) {
        console.error(error);
        fetchTasks(); // Reverte
    }
  }

  // Drag & Drop no Kanban
  function onDragEnd(result: DropResult) {
    const { destination, draggableId } = result;
    if (!destination) return;
    
    // Mapeia o ID da coluna para o status
    const newStatus = destination.droppableId as 'pending' | 'in_progress' | 'completed';
    
    changeTaskStatus(draggableId, newStatus);
  }

  // Save
  async function handleSave(data: TaskFormData) {
    setIsSaving(true);
    try {
      if (editingTask) {
        await api.put(`/api/tasks/${editingTask.id}`, data);
      } else {
        await api.post('/api/tasks', data);
      }
      setIsModalOpen(false);
      fetchTasks();
    } catch (error) {
      alert('Erro ao salvar tarefa');
    } finally {
      setIsSaving(false);
    }
  }

  // Open Modal
  function handleOpenModal(task?: Task) {
    if (task) {
      setEditingTask(task);
      setValue('title', task.title);
      setValue('description', task.description || '');
      setValue('priority', task.priority);
      setValue('status', task.status);
      
      if (task.due_date) {
        const date = new Date(task.due_date);
        const isoString = new Date(date.getTime() - (date.getTimezoneOffset() * 60000)).toISOString().slice(0, 16);
        setValue('due_date', isoString);
      } else {
        setValue('due_date', '');
      }
    } else {
      setEditingTask(null);
      reset();
    }
    setIsModalOpen(true);
  }

  // Delete
  async function deleteTask(id: string) {
    if (!confirm('Excluir tarefa?')) return;
    try {
        setTasks(tasks.filter(t => t.id !== id));
        await api.delete(`/api/tasks/${id}`);
    } catch (error) { fetchTasks(); }
  }

  // --- Renders ---

  const columns = [
    { id: 'pending', title: 'A Fazer', color: '#3b82f6' },
    { id: 'in_progress', title: 'Em Andamento', color: '#f59e0b' },
    { id: 'completed', title: 'Concluído', color: '#10b981' }
  ];

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <div style={{display:'flex', alignItems:'center', gap:'1rem'}}>
            <h1 className={styles.title}>Minha Agenda</h1>
            
            {/* View Toggle */}
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
        </div>

        <button className={styles.addButton} onClick={() => handleOpenModal()}>
          <Plus size={20} /> Nova Tarefa
        </button>
      </div>

      {isLoading ? (
         <div style={{ padding: '2rem', textAlign: 'center' }}><Loader2 className="animate-spin" style={{ margin: '0 auto' }} /></div>
      ) : (
        <>
            {/* --- MODO LISTA --- */}
            {viewMode === 'list' && (
                <div className={styles.taskList}>
                    {tasks.length === 0 && <div className={styles.emptyState}><ClipboardList size={32}/><p>Sem tarefas.</p></div>}
                    
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
                            <span className={styles.taskTitle}>
                                {task.title} 
                                {task.status === 'in_progress' && <span style={{fontSize:'0.7rem', background:'#fef3c7', color:'#d97706', padding:'2px 6px', borderRadius:'4px', marginLeft:'8px'}}>EM ANDAMENTO</span>}
                            </span>
                            {task.description && (
                                <div style={{fontSize: '0.85rem', color: '#64748b', marginTop: '0.2rem', display: 'flex', alignItems: 'center', gap: '4px'}}>
                                    <AlignLeft size={12} /> {task.description.length > 50 ? task.description.slice(0,50)+'...' : task.description}
                                </div>
                            )}
                            <div className={styles.taskMeta}>
                                {task.due_date && (
                                    <span style={{display: 'flex', alignItems: 'center', gap: '4px', color: new Date(task.due_date) < new Date() && task.status !== 'completed' ? '#ef4444' : 'inherit'}}>
                                        <Calendar size={14} /> 
                                        {new Date(task.due_date).toLocaleDateString()}
                                    </span>
                                )}
                                <span className={`${styles.priorityBadge} ${styles[`priority-${task.priority}`]}`}>
                                    {task.priority === 'high' ? 'Alta' : task.priority === 'medium' ? 'Média' : 'Baixa'}
                                </span>
                            </div>
                        </div>

                        <div style={{display: 'flex', gap: '0.5rem'}}>
                            <button className={styles.deleteBtn} onClick={() => handleOpenModal(task)}><Edit2 size={18} /></button>
                            <button className={styles.deleteBtn} onClick={() => deleteTask(task.id)}><Trash2 size={18} /></button>
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
                                <div key={col.id} className={styles.column}>
                                    <div className={styles.columnHeader} style={{borderTop: `3px solid ${col.color}`}}>
                                        <span>{col.title}</span>
                                        <span className={styles.columnCount}>{colTasks.length}</span>
                                    </div>
                                    <Droppable droppableId={col.id}>
                                        {(provided, snapshot) => (
                                            <div 
                                                className={styles.columnBody}
                                                ref={provided.innerRef}
                                                {...provided.droppableProps}
                                                style={{background: snapshot.isDraggingOver ? '#f1f5f9' : 'transparent'}}
                                            >
                                                {colTasks.map((task, index) => (
                                                    <Draggable key={task.id} draggableId={task.id} index={index}>
                                                        {(provided) => (
                                                            <div
                                                                className={styles.card}
                                                                ref={provided.innerRef}
                                                                {...provided.draggableProps}
                                                                {...provided.dragHandleProps}
                                                                onClick={() => handleOpenModal(task)}
                                                            >
                                                                <div className={styles.cardTitle}>{task.title}</div>
                                                                <div className={styles.taskMeta} style={{marginTop: '0.5rem'}}>
                                                                    <span className={`${styles.priorityBadge} ${styles[`priority-${task.priority}`]}`}>
                                                                        {task.priority === 'high' ? 'Alta' : 'Normal'}
                                                                    </span>
                                                                    {task.due_date && (
                                                                        <span style={{fontSize:'0.75rem', display:'flex', alignItems:'center', gap:'2px'}}>
                                                                            <Calendar size={12}/> {new Date(task.due_date).toLocaleDateString().slice(0,5)}
                                                                        </span>
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
                    <button onClick={() => setIsModalOpen(false)} style={{background: 'none', border: 'none', cursor: 'pointer', color: '#6b7280'}}><X size={24}/></button>
                </div>
                <form onSubmit={handleSubmit(handleSave)}>
                    <div className={styles.formGroup}>
                        <label>O que precisa ser feito?</label>
                        <input {...register('title')} className={styles.input} autoFocus />
                    </div>
                    <div className={styles.formGroup}>
                        <label>Status Inicial</label>
                        <select {...register('status')} className={styles.select}>
                            <option value="pending">A Fazer</option>
                            <option value="in_progress">Em Andamento</option>
                            <option value="completed">Concluída</option>
                        </select>
                    </div>
                    {/* Resto do formulário igual... */}
                    <div className={styles.formGroup}>
                        <label>Descrição</label>
                        <textarea {...register('description')} className={styles.input} style={{minHeight:'80px', resize:'vertical'}} />
                    </div>
                    <div style={{display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem'}}>
                        <div className={styles.formGroup}>
                            <label>Data e Hora</label>
                            <input {...register('due_date')} type="datetime-local" className={styles.input} />
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
                    <div className={styles.modalFooter}>
                        <button type="button" className={styles.cancelButton} onClick={() => setIsModalOpen(false)}>Cancelar</button>
                        <button type="submit" disabled={isSaving} className={styles.saveButton}>
                            {isSaving ? <Loader2 className="animate-spin" size={16}/> : 'Salvar'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
      )}
    </div>
  );
}