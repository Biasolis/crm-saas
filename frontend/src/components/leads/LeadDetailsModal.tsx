'use client';

import { useState, useEffect } from 'react';
import { leadsService } from '@/services/leads';
import { Lead, LeadLog, Task } from '@/types';
import api from '@/services/api'; 
import { X, CheckCircle, User } from 'lucide-react';
import styles from './LeadModal.module.css';

interface Props {
  lead: Lead | null;
  isOpen: boolean;
  onClose: () => void;
}

export default function LeadDetailsModal({ lead, isOpen, onClose }: Props) {
  const [activeTab, setActiveTab] = useState<'info' | 'tasks' | 'history'>('info');
  const [logs, setLogs] = useState<LeadLog[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [newTaskDate, setNewTaskDate] = useState('');

  useEffect(() => {
    if (lead && isOpen) {
        fetchLogs();
        fetchTasks();
    }
  }, [lead, isOpen]);

  const fetchLogs = async () => {
    if(!lead) return;
    try {
        const data = await leadsService.getLogs(lead.id);
        setLogs(data);
    } catch(e) { console.error(e); }
  };

  const fetchTasks = async () => {
    if(!lead) return;
    try {
        const { data } = await api.get(`/tasks?lead_id=${lead.id}`);
        setTasks(data);
    } catch(e) { console.error(e); }
  }

  const handleCreateTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if(!lead || !newTaskTitle) return;

    try {
        await api.post('/tasks', {
            title: newTaskTitle,
            due_date: newTaskDate || undefined,
            lead_id: lead.id,
            priority: 'medium'
        });
        setNewTaskTitle('');
        setNewTaskDate('');
        fetchTasks();
        fetchLogs(); 
        alert('Tarefa criada!');
    } catch(e) {
        alert('Erro ao criar tarefa');
    }
  }

  if (!isOpen || !lead) return null;

  return (
    <div className={styles.overlay}>
      <div className={styles.container} style={{ maxWidth: '700px' }}>
        <div className={styles.header}>
          <h2 className={styles.title}>{lead.name}</h2>
          <button onClick={onClose} className={styles.closeBtn}><X size={24} /></button>
        </div>

        {/* ABAS */}
        <div style={{ display: 'flex', borderBottom: '1px solid #e5e7eb', marginBottom: '1rem', gap: '1rem' }}>
            <button onClick={() => setActiveTab('info')} style={{ padding: '0.5rem', borderBottom: activeTab === 'info' ? '2px solid blue' : 'none', fontWeight: 500, background: 'none', border: activeTab === 'info' ? 'none' : 'none', borderBottom: activeTab === 'info' ? '2px solid blue' : 'none', cursor: 'pointer' }}>
                Detalhes
            </button>
            <button onClick={() => setActiveTab('tasks')} style={{ padding: '0.5rem', borderBottom: activeTab === 'tasks' ? '2px solid blue' : 'none', fontWeight: 500, background: 'none', border: activeTab === 'tasks' ? 'none' : 'none', borderBottom: activeTab === 'tasks' ? '2px solid blue' : 'none', cursor: 'pointer' }}>
                Tarefas ({tasks.length})
            </button>
            <button onClick={() => setActiveTab('history')} style={{ padding: '0.5rem', borderBottom: activeTab === 'history' ? '2px solid blue' : 'none', fontWeight: 500, background: 'none', border: activeTab === 'history' ? 'none' : 'none', borderBottom: activeTab === 'history' ? '2px solid blue' : 'none', cursor: 'pointer' }}>
                Histórico
            </button>
        </div>

        <div style={{ minHeight: '300px', maxHeight: '500px', overflowY: 'auto' }}>
            
            {/* CONTEÚDO: INFO */}
            {activeTab === 'info' && (
                <div className="space-y-4" style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                    <p><strong>Empresa:</strong> {lead.company_name || '-'}</p>
                    <p><strong>Cargo:</strong> {lead.position || '-'}</p>
                    <p><strong>Email:</strong> {lead.email}</p>
                    <p><strong>Telefone:</strong> {lead.phone} / {lead.mobile}</p>
                    <p><strong>Origem:</strong> {lead.source}</p>
                    {lead.notes && (
                        <div style={{ background: '#fffbeb', padding: '1rem', borderRadius: '4px', marginTop: '1rem' }}>
                            <strong>Notas Iniciais:</strong>
                            <p>{lead.notes}</p>
                        </div>
                    )}
                </div>
            )}

            {/* CONTEÚDO: TAREFAS */}
            {activeTab === 'tasks' && (
                <div>
                    <form onSubmit={handleCreateTask} style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem' }}>
                        <input 
                            className={styles.input} 
                            placeholder="Nova tarefa..." 
                            value={newTaskTitle}
                            onChange={e => setNewTaskTitle(e.target.value)}
                            required
                        />
                        <input 
                            type="date"
                            className={styles.input}
                            value={newTaskDate}
                            onChange={e => setNewTaskDate(e.target.value)}
                            style={{ width: '150px' }}
                        />
                        <button type="submit" className={styles.btnPrimary} style={{ padding: '0.5rem 1rem', background: '#2563eb', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>Adicionar</button>
                    </form>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                        {tasks.map(task => (
                            <div key={task.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.75rem', border: '1px solid #e5e7eb', borderRadius: '4px' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                    <div style={{ width: 16, height: 16, borderRadius: '50%', border: '2px solid #ccc' }}></div>
                                    <span style={{ textDecoration: task.status === 'completed' ? 'line-through' : 'none' }}>{task.title}</span>
                                </div>
                                <span style={{ fontSize: '0.8rem', color: '#666' }}>
                                    {task.due_date ? new Date(task.due_date).toLocaleDateString() : 'Sem data'}
                                </span>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* CONTEÚDO: HISTÓRICO */}
            {activeTab === 'history' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    {logs.map(log => (
                        <div key={log.id} style={{ display: 'flex', gap: '0.75rem' }}>
                            <div style={{ marginTop: '4px' }}>
                                {log.action === 'claimed' && <User size={16} color="blue" />}
                                {log.action === 'task_created' && <CheckCircle size={16} color="green" />}
                                {log.action === 'lost' && <X size={16} color="red" />}
                                {log.action === 'converted' && <CheckCircle size={16} color="purple" />}
                            </div>
                            <div>
                                <p style={{ fontSize: '0.9rem', margin: 0 }}>
                                    <strong>{log.user_name || 'Usuário'}</strong> 
                                    {log.action === 'claimed' && ' assumiu o lead.'}
                                    {log.action === 'task_created' && ` criou tarefa: ${log.details?.title}`}
                                    {log.action === 'converted' && ' converteu em cliente.'}
                                    {log.action === 'lost' && ` marcou como perdido: ${log.details?.reason}`}
                                </p>
                                <span style={{ fontSize: '0.75rem', color: '#999' }}>
                                    {new Date(log.created_at).toLocaleString()}
                                </span>
                            </div>
                        </div>
                    ))}
                    {logs.length === 0 && <p style={{ color: '#999', textAlign: 'center' }}>Nenhuma atividade registrada.</p>}
                </div>
            )}
        </div>
      </div>
    </div>
  );
}