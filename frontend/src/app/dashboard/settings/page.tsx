'use client';

import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Save, Loader2, Palette, Building2, MessageSquare, Clipboard, Check } from 'lucide-react';
import api from '@/services/api';
import styles from './page.module.css';

// Schema de validação
const settingsSchema = z.object({
  name: z.string().min(2, 'Nome da empresa é obrigatório'),
  company_legal_name: z.string().optional(),
  company_document: z.string().optional(),
  logo_url: z.string().url('URL inválida').optional().or(z.literal('')),
  primary_color: z.string().regex(/^#[0-9A-F]{6}$/i, 'Cor inválida'),
  chatwoot_url: z.string().url('URL inválida').optional().or(z.literal('')),
  chatwoot_access_token: z.string().optional(),
});

type SettingsFormData = z.infer<typeof settingsSchema>;

export default function SettingsPage() {
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  
  // Estados para o Webhook
  const [webhookUrl, setWebhookUrl] = useState('');
  const [copied, setCopied] = useState(false);

  const { register, handleSubmit, setValue, watch, formState: { errors } } = useForm<SettingsFormData>({
    resolver: zodResolver(settingsSchema),
    defaultValues: {
      primary_color: '#000000'
    }
  });

  // Watch para preview da cor em tempo real
  const selectedColor = watch('primary_color');

  // Carregar Dados Iniciais
  useEffect(() => {
    async function loadSettings() {
      try {
        const response = await api.get('/api/tenants/current');
        const data = response.data;
        
        // Preenche o formulário
        setValue('name', data.name);
        setValue('company_legal_name', data.company_legal_name || '');
        setValue('company_document', data.company_document || '');
        setValue('logo_url', data.logo_url || '');
        setValue('primary_color', data.primary_color || '#000000');
        setValue('chatwoot_url', data.chatwoot_url || '');
        setValue('chatwoot_access_token', data.chatwoot_access_token || '');

        // Constrói a URL do Webhook se o token existir
        if (data.webhook_token) {
            // Tenta usar a variável de ambiente ou infere baseado na URL atual
            // Em dev, ajustamos a porta 3001 (front) para 3000 (back) para a URL ficar correta para o Chatwoot
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
      
      // Atualiza a cor do sistema em tempo real para feedback visual
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
        <p className={styles.subtitle}>Gerencie a identidade visual e integrações do seu CRM.</p>
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

        {/* --- Card: Branding --- */}
        <div className={styles.sectionCard}>
          <div className={styles.cardHeader}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Palette size={20} color="#6b7280" />
              <h3 className={styles.cardTitle}>Identidade Visual (Branding)</h3>
            </div>
            <p className={styles.cardDescription}>Personalize as cores e o logo do seu sistema.</p>
          </div>
          
          <div className={styles.cardBody}>
            <div className={styles.formGroup}>
              <label className={styles.label}>Cor Primária</label>
              <div className={styles.colorWrapper}>
                <input 
                  type="color" 
                  {...register('primary_color')} 
                  className={styles.colorInput} 
                  title="Escolher cor"
                />
                <span className={styles.colorValue}>{selectedColor}</span>
              </div>
              <p style={{ fontSize: '0.8rem', color: '#6b7280' }}>Esta cor será usada em botões, links e destaques.</p>
            </div>

            <div className={styles.formGroup}>
              <label className={styles.label}>URL do Logo</label>
              <input {...register('logo_url')} className={styles.input} placeholder="https://..." />
              {errors.logo_url && <span style={{ color: 'red', fontSize: '0.8rem' }}>{errors.logo_url.message}</span>}
              
              {selectedColor && (
                 <div style={{ marginTop: '1rem', padding: '1rem', border: '1px dashed #e5e7eb', borderRadius: '8px', textAlign: 'center' }}>
                    <span style={{ color: selectedColor, fontWeight: 700 }}>Preview da sua Marca</span>
                    <br />
                    <button type="button" style={{ marginTop: '0.5rem', backgroundColor: selectedColor, color: 'white', border: 'none', padding: '0.5rem 1rem', borderRadius: '6px' }}>
                      Botão Exemplo
                    </button>
                 </div>
              )}
            </div>
          </div>
        </div>

        {/* --- Card: Chatwoot --- */}
        <div className={styles.sectionCard}>
          <div className={styles.cardHeader}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <MessageSquare size={20} color="#6b7280" />
              <h3 className={styles.cardTitle}>Integração Chatwoot</h3>
            </div>
            <p className={styles.cardDescription}>Conecte seu sistema de atendimento.</p>
          </div>
          
          <div className={styles.cardBody}>
            <div className={styles.formGroup}>
              <label className={styles.label}>URL da Instância</label>
              <input {...register('chatwoot_url')} className={styles.input} placeholder="https://chat.suaempresa.com" />
            </div>

            <div className={styles.formGroup}>
              <label className={styles.label}>Token de Acesso (Admin)</label>
              <input {...register('chatwoot_access_token')} type="password" className={styles.input} placeholder="••••••••••••" />
              <p style={{ fontSize: '0.8rem', color: '#6b7280' }}>Usado para abrir o chat diretamente nos contatos.</p>
            </div>

            {/* Campo Webhook URL (Somente Leitura) */}
            <div className={styles.formGroup} style={{ marginTop: '1rem', paddingTop: '1rem', borderTop: '1px dashed #e5e7eb' }}>
                <label className={styles.label}>Webhook URL (Para receber dados)</label>
                <div style={{display: 'flex', gap: '0.5rem'}}>
                    <input 
                        readOnly 
                        value={webhookUrl} 
                        className={styles.input} 
                        style={{backgroundColor: '#f3f4f6', color: '#6b7280', cursor: 'default'}} 
                        placeholder="URL será gerada após salvar..."
                    />
                    <button 
                        type="button" 
                        onClick={copyToClipboard}
                        disabled={!webhookUrl}
                        style={{
                            background: 'white', border: '1px solid #e5e7eb', borderRadius: '8px', 
                            padding: '0 1rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.5rem',
                            minWidth: '100px', justifyContent: 'center'
                        }}
                    >
                        {copied ? <Check size={18} color="#22c55e" /> : <Clipboard size={18} />}
                        {copied ? 'Copiado' : 'Copiar'}
                    </button>
                </div>
                <p style={{ fontSize: '0.8rem', color: '#6b7280' }}>
                    Cole esta URL nas configurações de &quot;Integrações &gt; Webhooks&quot; do seu Chatwoot para criar contatos automaticamente aqui.
                </p>
            </div>
          </div>

          <div className={styles.footer}>
            <button type="submit" disabled={isSaving} className={styles.saveButton}>
              {isSaving ? <Loader2 className="animate-spin" size={18} /> : (
                <>
                  <Save size={18} /> Salvar Tudo
                </>
              )}
            </button>
          </div>
        </div>

      </form>
    </div>
  );
}