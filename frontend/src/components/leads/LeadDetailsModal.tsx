'use client';

import { useState, useEffect } from 'react';
import { leadsService } from '@/services/leads';
import { Lead, LeadLog, Task } from '@/types';
import api from '@/services/api'; 
import { X, CheckCircle, User, AlertCircle } from 'lucide-react';
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
        // Correção: Adicionado /api/
        const { data } = await api.get(`/api/tasks?lead_id=${lead.id}`);
        setTasks(data);
    } catch(e) { console.error(e); }
  }

  const handleCreateTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if(!lead || !newTaskTitle) return;

    try {
        // Correção: Adicionado /api/
        await api.post('/api/tasks', {
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
            <button 
              onClick={() => setActiveTab('info')} 
              className={activeTab === 'info' ? styles.btnPrimary : styles.btnSecondary}
              style={{ borderBottom: 'none', borderRadius: '4px' }}
            >
                Detalhes
            </button>
            <button 
              onClick={() => setActiveTab('tasks')} 
              className={activeTab === 'tasks' ? styles.btnPrimary : styles.btnSecondary}
              style={{ borderBottom: 'none', borderRadius: '4px' }}
            >
                Tarefas ({tasks.length})
            </button>
            <button 
              onClick={() => setActiveTab('history')} 
              className={activeTab === 'history' ? styles.btnPrimary : styles.btnSecondary}
              style={{ borderBottom: 'none', borderRadius: '4px' }}
            >
                Histórico
            </button>
        </div>

        <div style={{ minHeight: '300px', maxHeight: '500px', overflowY: 'auto' }}>
            
            {/* CONTEÚDO: INFO */}
            {activeTab === 'info' && (
                <div className="space-y-4" style={{ display: 'flex', flexDirection: 'column', gap: '0.8rem' }}>
                    <p><strong>Empresa:</strong> {lead.company_name || '-'}</p>
                    <p><strong>Cargo:</strong> {lead.position || '-'}</p>
                    <p><strong>Email:</strong> {lead.email}</p>
                    <p><strong>Telefone:</strong> {lead.phone} / {lead.mobile}</p>
                    <p><strong>Origem:</strong> {lead.source}</p>
                    {lead.notes && (
                        <div style={{ background: '#fffbeb', padding: '1rem', borderRadius: '4px', marginTop: '0.5rem', border: '1px solid #fcd34d' }}>
                            <strong>📝 Notas Iniciais:</strong>
                            <p style={{ marginTop: '0.5rem' }}>{lead.notes}</p>
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
                        <button type="submit" className={styles.btnPrimary}>Adicionar</button>
                    </form>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                        {tasks.map(task => (
                            <div key={task.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.75rem', border: '1px solid #e5e7eb', borderRadius: '4px', background: 'white' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                    <div style={{ width: 12, height: 12, borderRadius: '50%', border: task.status === 'completed' ? '4px solid green' : '2px solid #ccc' }}></div>
                                    <span style={{ textDecoration: task.status === 'completed' ? 'line-through' : 'none', color: task.status === 'completed' ? '#999' : '#000' }}>{task.title}</span>
                                </div>
                                <span style={{ fontSize: '0.8rem', color: '#666' }}>
                                    {task.due_date ? new Date(task.due_date).toLocaleDateString() : 'Sem data'}
                                </span>
                            </div>
                        ))}
                        {tasks.length === 0 && <p style={{ color: '#999', textAlign: 'center', marginTop: '2rem' }}>Nenhuma tarefa agendada.</p>}
                    </div>
                </div>
            )}

            {/* CONTEÚDO: HISTÓRICO */}
            {activeTab === 'history' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    {logs.map(log => (
                        <div key={log.id} style={{ display: 'flex', gap: '0.75rem', paddingBottom: '1rem', borderBottom: '1px dashed #eee' }}>
                            <div style={{ marginTop: '2px' }}>
                                {log.action === 'claimed' && <User size={18} className="text-blue-600" />}
                                {log.action === 'task_created' && <CheckCircle size={18} className="text-green-600" />}
                                {log.action === 'lost' && <AlertCircle size={18} className="text-red-600" />}
                                {log.action === 'converted' && <CheckCircle size={18} className="text-purple-600" />}
                                {log.action === 'created' && <User size={18} className="text-gray-400" />}
                            </div>
                            <div>
                                <p style={{ fontSize: '0.9rem', margin: 0, lineHeight: '1.4' }}>
                                    <strong>{log.user_name || 'Sistema'}</strong> 
                                    {log.action === 'claimed' && ' assumiu o lead.'}
                                    {log.action === 'task_created' && ` criou a tarefa: "${log.details?.title}"`}
                                    {log.action === 'converted' && ' converteu este lead em cliente.'}
                                    {log.action === 'lost' && ` marcou como perdido. Motivo: ${log.details?.reason}`}
                                    {log.action === 'created' && ' criou este lead.'}
                                </p>
                                <span style={{ fontSize: '0.75rem', color: '#9ca3af' }}>
                                    {new Date(log.created_at).toLocaleString()}
                                </span>
                            </div>
                        </div>
                    ))}
                    {logs.length === 0 && <p style={{ color: '#999', textAlign: 'center' }}>Nenhuma atividade registrada ainda.</p>}
                </div>
            )}
        </div>
      </div>
    </div>
  );
}