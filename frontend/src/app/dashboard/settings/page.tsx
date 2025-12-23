'use client';

import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Save, Loader2, Palette, Building2, MessageSquare, Clipboard, Check, Zap, Database, Download } from 'lucide-react';
import api from '@/services/api';
import styles from './page.module.css';

// Import do Modal (reutilizando o componente existente)
import ImportCSVModal from '@/components/leads/ImportCSVModal';

const settingsSchema = z.object({
  name: z.string().min(2, 'Nome da empresa é obrigatório'),
  company_legal_name: z.string().optional(),
  company_document: z.string().optional(),
  logo_url: z.string().url('URL inválida').optional().or(z.literal('')),
  primary_color: z.string().regex(/^#[0-9A-F]{6}$/i, 'Cor inválida'),
  chatwoot_url: z.string().url('URL inválida').optional().or(z.literal('')),
  chatwoot_access_token: z.string().optional(),
  round_robin_active: z.boolean().optional(), // Novo
});

type SettingsFormData = z.infer<typeof settingsSchema>;

export default function SettingsPage() {
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [webhookUrl, setWebhookUrl] = useState('');
  const [copied, setCopied] = useState(false);

  // Estado do Modal de Importação
  const [isImportOpen, setIsImportOpen] = useState(false);

  const { register, handleSubmit, setValue, watch, formState: { errors } } = useForm<SettingsFormData>({
    resolver: zodResolver(settingsSchema),
    defaultValues: {
      primary_color: '#000000',
      round_robin_active: false
    }
  });

  const selectedColor = watch('primary_color');
  const roundRobinActive = watch('round_robin_active'); // Para feedback visual

  useEffect(() => {
    async function loadSettings() {
      try {
        const response = await api.get('/api/tenants/current');
        const data = response.data;
        
        setValue('name', data.name);
        setValue('company_legal_name', data.company_legal_name || '');
        setValue('company_document', data.company_document || '');
        setValue('logo_url', data.logo_url || '');
        setValue('primary_color', data.primary_color || '#000000');
        setValue('chatwoot_url', data.chatwoot_url || '');
        setValue('chatwoot_access_token', data.chatwoot_access_token || '');
        setValue('round_robin_active', data.round_robin_active || false);

        if (data.webhook_token) {
            const baseUrl = process.env.NEXT_PUBLIC_API_URL || window.location.origin.replace(':3001', ':3000');
            setWebhookUrl(`${baseUrl}/api/webhooks/chatwoot/${data.webhook_token}`);
        }
        
      } catch (error) {
        console.error('Erro ao carregar configurações:', error);
      } finally {
        setIsLoading(false);
      }
    }
    loadSettings();
  }, [setValue]);

  async function handleSave(data: SettingsFormData) {
    setIsSaving(true);
    try {
      await api.put('/api/tenants/current', data);
      alert('Configurações salvas com sucesso!');
      
      if (data.primary_color) {
        document.documentElement.style.setProperty('--primary', data.primary_color);
      }
      
    } catch (error) {
      console.error(error);
      alert('Erro ao salvar configurações.');
    } finally {
      setIsSaving(false);
    }
  }

  function copyToClipboard() {
    if (!webhookUrl) return;
    navigator.clipboard.writeText(webhookUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  if (isLoading) {
    return <div style={{ display: 'flex', justifyContent: 'center', marginTop: '3rem' }}><Loader2 className="animate-spin" /></div>;
  }

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h1 className={styles.title}>Configurações da Empresa</h1>
        <p className={styles.subtitle}>Gerencie a identidade visual, integrações e automações.</p>
      </div>

      <form onSubmit={handleSubmit(handleSave)} style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
        
        {/* --- Card: Dados Gerais --- */}
        <div className={styles.sectionCard}>
          <div className={styles.cardHeader}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Building2 size={20} color="#6b7280" />
              <h3 className={styles.cardTitle}>Dados Cadastrais</h3>
            </div>
            <p className={styles.cardDescription}>Informações que aparecerão em faturas e documentos.</p>
          </div>
          
          <div className={styles.cardBody}>
            <div className={styles.formGroup}>
              <label className={styles.label}>Nome Fantasia</label>
              <input {...register('name')} className={styles.input} />
              {errors.name && <span style={{ color: 'red', fontSize: '0.8rem' }}>{errors.name.message}</span>}
            </div>

            <div className={styles.formGroup}>
              <label className={styles.label}>Razão Social</label>
              <input {...register('company_legal_name')} className={styles.input} placeholder="Ex: Minha Empresa LTDA" />
            </div>

            <div className={styles.formGroup}>
              <label className={styles.label}>CNPJ / Documento</label>
              <input {...register('company_document')} className={styles.input} placeholder="00.000.000/0000-00" />
            </div>
          </div>
        </div>

        {/* --- NOVO CARD: Automação & Dados --- */}
        <div className={styles.sectionCard} style={{ border: '1px solid #dbeafe', background: '#eff6ff' }}>
          <div className={styles.cardHeader}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Database size={20} color="#2563eb" />
              <h3 className={styles.cardTitle} style={{ color: '#1e40af' }}>Automação & Dados</h3>
            </div>
            <p className={styles.cardDescription}>Regras de distribuição de leads e importação em massa.</p>
          </div>
          
          <div className={styles.cardBody}>
            {/* SWITCH ROUND ROBIN */}
            <div className={styles.formGroup} style={{ display: 'flex', alignItems: 'flex-start', gap: '1rem', padding: '1rem', background: 'white', borderRadius: '8px', border: '1px solid #bfdbfe' }}>
                <div style={{ paddingTop: '4px' }}>
                    <input 
                        type="checkbox" 
                        {...register('round_robin_active')}
                        id="rr_switch"
                        style={{ width: '20px', height: '20px', cursor: 'pointer' }}
                    />
                </div>
                <div>
                    <label htmlFor="rr_switch" style={{ fontWeight: 600, color: '#1e3a8a', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <Zap size={16} fill={roundRobinActive ? "#eab308" : "none"} color={roundRobinActive ? "#ca8a04" : "#6b7280"} />
                        Ativar Distribuição Automática (Round Robin)
                    </label>
                    <p style={{ fontSize: '0.9rem', color: '#4b5563', marginTop: '0.25rem' }}>
                        Quando ativado, novos leads criados manualmente ou via API/Webhook serão atribuídos automaticamente ao vendedor que está há mais tempo sem receber um lead.
                    </p>
                </div>
            </div>

            {/* BOTÃO IMPORTAR CSV */}
            <div className={styles.formGroup} style={{ marginTop: '1rem' }}>
                <label className={styles.label}>Importação de Dados</label>
                <div style={{ padding: '1rem', background: 'white', borderRadius: '8px', border: '1px solid #e5e7eb', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                        <span style={{ fontWeight: 600, color: '#374151' }}>Importar Leads via CSV</span>
                        <p style={{ fontSize: '0.85rem', color: '#6b7280' }}>Adicione múltiplos leads de uma vez através de uma planilha.</p>
                    </div>
                    <button 
                        type="button" 
                        onClick={() => setIsImportOpen(true)}
                        className={styles.saveButton} 
                        style={{ background: 'white', color: '#374151', border: '1px solid #d1d5db', display: 'flex', alignItems: 'center', gap: '0.5rem' }}
                    >
                        <Download size={16} /> Abrir Importador
                    </button>
                </div>
            </div>
          </div>
        </div>

        {/* --- Card: Branding (Mantido, código resumido visualmente aqui) --- */}
        <div className={styles.sectionCard}>
            {/* ... Conteúdo de Branding ... */}
            <div className={styles.cardHeader}>
                 <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <Palette size={20} color="#6b7280" />
                    <h3 className={styles.cardTitle}>Identidade Visual</h3>
                </div>
            </div>
            <div className={styles.cardBody}>
                <div className={styles.formGroup}>
                <label className={styles.label}>Cor Primária</label>
                <div className={styles.colorWrapper}>
                    <input type="color" {...register('primary_color')} className={styles.colorInput} />
                    <span className={styles.colorValue}>{selectedColor}</span>
                </div>
                </div>
                <div className={styles.formGroup}>
                <label className={styles.label}>URL do Logo</label>
                <input {...register('logo_url')} className={styles.input} />
                </div>
            </div>
        </div>

        {/* --- Card: Chatwoot (Mantido) --- */}
        <div className={styles.sectionCard}>
            <div className={styles.cardHeader}>
                 <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <MessageSquare size={20} color="#6b7280" />
                    <h3 className={styles.cardTitle}>Integração Chatwoot</h3>
                </div>
            </div>
            <div className={styles.cardBody}>
                 <div className={styles.formGroup}>
                    <label className={styles.label}>URL / Token</label>
                    <input {...register('chatwoot_url')} className={styles.input} placeholder="URL" style={{marginBottom:'1rem'}} />
                    <input {...register('chatwoot_access_token')} type="password" className={styles.input} placeholder="Token" />
                 </div>
                 <div className={styles.formGroup} style={{ marginTop: '1rem', paddingTop: '1rem', borderTop: '1px dashed #e5e7eb' }}>
                    <label className={styles.label}>Webhook URL</label>
                    <div style={{display: 'flex', gap: '0.5rem'}}>
                        <input readOnly value={webhookUrl} className={styles.input} style={{backgroundColor: '#f3f4f6'}} />
                        <button type="button" onClick={copyToClipboard} style={{/*...*/}}><Clipboard size={18} /></button>
                    </div>
                 </div>
            </div>

            <div className={styles.footer}>
                <button type="submit" disabled={isSaving} className={styles.saveButton}>
                {isSaving ? <Loader2 className="animate-spin" size={18} /> : <><Save size={18} /> Salvar Tudo</>}
                </button>
            </div>
        </div>

      </form>

      {/* Modal de Importação Renderizado Aqui */}
      <ImportCSVModal 
        isOpen={isImportOpen} 
        onClose={() => setIsImportOpen(false)} 
        onSuccess={() => alert('Importação concluída! Verifique a tela de Leads.')} 
      />
    </div>
  );
}