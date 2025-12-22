'use client';

import { useState } from 'react';
import { leadsService } from '@/services/leads';
import styles from './LeadModal.module.css'; // Reutilizando os estilos existentes

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

// CORREÇÃO: O componente deve ser exportado como default function
export default function ImportCSVModal({ isOpen, onClose, onSuccess }: Props) {
  const [loading, setLoading] = useState(false);
  const [file, setFile] = useState<File | null>(null);

  if (!isOpen) return null;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
    }
  };

  const processCSV = async () => {
    if (!file) return;
    setLoading(true);

    const reader = new FileReader();
    
    reader.onload = async ({ target }) => {
      const csv = target?.result;
      if (typeof csv !== 'string') return;

      const lines = csv.split(/\r?\n/); // Divide por quebra de linha (Windows ou Linux)
      const leads = [];
      
      // Itera pelas linhas (começando da 1 para pular o cabeçalho)
      for (let i = 1; i < lines.length; i++) {
        const line = lines[i].trim();
        if (!line) continue;
        
        // Regex para separar por vírgula, mas ignorar vírgulas dentro de aspas
        const matches = line.match(/(".*?"|[^",\s]+)(?=\s*,|\s*$)/g);
        
        const cols = matches 
          ? matches.map(col => col.replace(/^"|"$/g, '').trim()) 
          : line.split(','); 

        if (cols.length >= 1) {
          leads.push({
            name: cols[0]?.trim() || 'Desconhecido',
            email: cols[1]?.trim() || undefined,
            phone: cols[2]?.trim() || undefined,
            company_name: cols[3]?.trim() || undefined,
            source: 'Importação CSV'
          });
        }
      }

      if (leads.length === 0) {
        alert('Nenhum lead válido encontrado no arquivo.');
        setLoading(false);
        return;
      }

      try {
        const res = await leadsService.importCSV(leads);
        alert(`Sucesso! ${res.count} leads foram importados para a piscina.`);
        onSuccess();
        onClose();
        setFile(null); // Limpa seleção
      } catch (error) {
        console.error(error);
        alert('Erro ao importar leads. Verifique o console ou o formato do arquivo.');
      } finally {
        setLoading(false);
      }
    };
    
    reader.onerror = () => {
      alert('Erro ao ler o arquivo.');
      setLoading(false);
    };

    reader.readAsText(file);
  };

  return (
    <div className={styles.overlay}>
      <div className={styles.container}>
        <div className={styles.header}>
          <h2 className={styles.title}>Importar Leads (CSV)</h2>
          <button onClick={onClose} className={styles.closeBtn}>&times;</button>
        </div>

        <div className="space-y-4">
          <div style={{ marginBottom: '1.5rem', padding: '1rem', backgroundColor: '#f9fafb', borderRadius: '4px', border: '1px solid #e5e7eb' }}>
            <p style={{ fontSize: '0.9rem', color: '#4b5563', marginBottom: '0.5rem' }}>
              <strong>Instruções:</strong>
            </p>
            <ul style={{ fontSize: '0.85rem', color: '#6b7280', listStyle: 'disc', paddingLeft: '1.2rem' }}>
              <li>O arquivo deve ser <strong>.csv</strong></li>
              <li>Ordem das colunas: <strong>Nome, Email, Telefone, Empresa</strong></li>
              <li>A primeira linha (cabeçalho) é ignorada.</li>
            </ul>
          </div>

          <div className={styles.formGroup}>
            <input 
              type="file" 
              accept=".csv"
              onChange={handleFileChange}
              className={styles.input}
            />
          </div>

          <div className={styles.footer}>
            <button onClick={onClose} className={styles.btnCancel}>Cancelar</button>
            <button 
              onClick={processCSV} 
              disabled={loading || !file} 
              className={styles.btnSubmit}
              style={{ backgroundColor: '#059669' }} 
            >
              {loading ? 'Enviando...' : 'Importar Leads'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}