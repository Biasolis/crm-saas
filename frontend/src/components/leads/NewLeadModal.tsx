'use client';

import { useState } from 'react';
import { leadsService } from '@/services/leads';
import styles from './LeadModal.module.css';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export default function NewLeadModal({ isOpen, onClose, onSuccess }: Props) {
  const [loading, setLoading] = useState(false);
  
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    company_name: '',
    position: '',
    notes: ''
  });

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      // O backend agora consulta as configs da empresa para decidir se distribui ou não
      await leadsService.create(formData);
      
      alert('Lead criado com sucesso!');
      onSuccess();
      onClose();
      
      // Reset form
      setFormData({
        name: '',
        email: '',
        phone: '',
        company_name: '',
        position: '',
        notes: ''
      });
    } catch (error) {
      console.error(error);
      alert('Erro ao criar lead.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={styles.overlay}>
      <div className={styles.container}>
        <div className={styles.header}>
          <h2 className={styles.title}>Novo Lead</h2>
          <button onClick={onClose} className={styles.closeBtn}>&times;</button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className={styles.formGroup}>
            <label className={styles.label}>Nome Completo *</label>
            <input 
              required
              className={styles.input}
              value={formData.name}
              onChange={e => setFormData({...formData, name: e.target.value})}
              placeholder="Ex: João Silva"
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <div className={styles.formGroup}>
              <label className={styles.label}>Email</label>
              <input 
                type="email"
                className={styles.input}
                value={formData.email}
                onChange={e => setFormData({...formData, email: e.target.value})}
                placeholder="joao@empresa.com"
              />
            </div>
            <div className={styles.formGroup}>
              <label className={styles.label}>Telefone</label>
              <input 
                className={styles.input}
                value={formData.phone}
                onChange={e => setFormData({...formData, phone: e.target.value})}
                placeholder="(11) 99999-9999"
              />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <div className={styles.formGroup}>
              <label className={styles.label}>Empresa</label>
              <input 
                className={styles.input}
                value={formData.company_name}
                onChange={e => setFormData({...formData, company_name: e.target.value})}
                placeholder="Empresa LTDA"
              />
            </div>
            <div className={styles.formGroup}>
              <label className={styles.label}>Cargo</label>
              <input 
                className={styles.input}
                value={formData.position}
                onChange={e => setFormData({...formData, position: e.target.value})}
                placeholder="Gerente de Compras"
              />
            </div>
          </div>

          <div className={styles.formGroup}>
            <label className={styles.label}>Anotações</label>
            <textarea 
              className={styles.textarea}
              value={formData.notes}
              onChange={e => setFormData({...formData, notes: e.target.value})}
              placeholder="Detalhes iniciais..."
            />
          </div>

          <div className={styles.footer}>
            <button type="button" onClick={onClose} className={styles.btnCancel}>Cancelar</button>
            <button type="submit" disabled={loading} className={styles.btnSubmit}>
              {loading ? 'Salvando...' : 'Criar Lead'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}