'use client';

import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { User, Mail, Lock, Shield, Calendar, Loader2, Save, KeyRound } from 'lucide-react';
import api from '@/services/api';
import styles from './page.module.css';

const profileSchema = z.object({
  name: z.string().min(2, 'Nome muito curto'),
  email: z.string().email('Email inválido'),
  current_password: z.string().optional(),
  new_password: z.string().min(6, 'Mínimo 6 caracteres').optional().or(z.literal('')),
  confirm_password: z.string().optional()
}).refine((data) => {
  if (data.new_password && !data.current_password) return false;
  return true;
}, {
  message: "Senha atual é necessária para definir uma nova",
  path: ["current_password"]
}).refine((data) => {
  if (data.new_password !== data.confirm_password) return false;
  return true;
}, {
  message: "As senhas não coincidem",
  path: ["confirm_password"]
});

type ProfileFormData = z.infer<typeof profileSchema>;

interface UserProfile {
  id: string;
  name: string;
  email: string;
  role: string;
  created_at: string;
}

export default function ProfilePage() {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  const { register, handleSubmit, setValue, formState: { errors } } = useForm<ProfileFormData>({
    resolver: zodResolver(profileSchema)
  });

  useEffect(() => {
    async function loadProfile() {
      try {
        const res = await api.get('/api/users/me');
        setUser(res.data);
        setValue('name', res.data.name);
        setValue('email', res.data.email);
      } catch (error) {
        console.error(error);
      } finally {
        setIsLoading(false);
      }
    }
    loadProfile();
  }, [setValue]);

  async function onSave(data: ProfileFormData) {
    setIsSaving(true);
    try {
      const payload: any = {
        name: data.name,
        email: data.email
      };

      if (data.new_password) {
        payload.password = data.new_password;
        payload.current_password = data.current_password;
      }

      await api.put('/api/users/me', payload);
      alert('Perfil atualizado com sucesso!');
      
      // Atualiza localmente se mudou nome
      if (user) setUser({ ...user, name: data.name, email: data.email });
      
      // Limpa campos de senha
      setValue('current_password', '');
      setValue('new_password', '');
      setValue('confirm_password', '');

    } catch (error: any) {
      alert(error.response?.data?.error || 'Erro ao atualizar perfil.');
    } finally {
      setIsSaving(false);
    }
  }

  if (isLoading) return <div className={styles.loading}><Loader2 className="animate-spin" size={32} /></div>;
  if (!user) return <div className={styles.error}>Erro ao carregar perfil.</div>;

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h1 className={styles.title}>Meu Perfil</h1>
        <p className={styles.subtitle}>Gerencie suas informações pessoais e segurança.</p>
      </div>

      <div className={styles.grid}>
        
        {/* Cartão de Identidade */}
        <div className={styles.identityCard}>
            <div className={styles.avatarLarge}>
                {user.name.charAt(0).toUpperCase()}
            </div>
            <h2 className={styles.userName}>{user.name}</h2>
            <div className={styles.roleBadge}>
                {user.role === 'owner' ? 'Dono da Conta' : user.role === 'admin' ? 'Administrador' : 'Vendedor'}
            </div>
            
            <div className={styles.metaInfo}>
                <div className={styles.metaItem}>
                    <Mail size={16} /> {user.email}
                </div>
                <div className={styles.metaItem}>
                    <Calendar size={16} /> Membro desde {new Date(user.created_at).getFullYear()}
                </div>
                <div className={styles.metaItem}>
                    <Shield size={16} /> Acesso: {user.role.toUpperCase()}
                </div>
            </div>
        </div>

        {/* Formulário de Edição */}
        <div className={styles.formCard}>
            <h3 className={styles.sectionTitle}><User size={20}/> Dados Pessoais</h3>
            
            <form onSubmit={handleSubmit(onSave)}>
                <div className={styles.formGroup}>
                    <label>Nome Completo</label>
                    <input {...register('name')} className={styles.input} />
                    {errors.name && <span className={styles.error}>{errors.name.message}</span>}
                </div>

                <div className={styles.formGroup}>
                    <label>E-mail</label>
                    <input {...register('email')} className={styles.input} />
                    {errors.email && <span className={styles.error}>{errors.email.message}</span>}
                </div>

                <div className={styles.separator}></div>

                <h3 className={styles.sectionTitle}><KeyRound size={20}/> Segurança</h3>
                <p className={styles.hint}>Preencha apenas se quiser alterar sua senha.</p>

                <div className={styles.formGroup}>
                    <label>Senha Atual</label>
                    <input {...register('current_password')} type="password" className={styles.input} placeholder="Necessária para confirmar alteração" />
                    {errors.current_password && <span className={styles.error}>{errors.current_password.message}</span>}
                </div>

                <div className={styles.row}>
                    <div className={styles.formGroup}>
                        <label>Nova Senha</label>
                        <input {...register('new_password')} type="password" className={styles.input} placeholder="Mínimo 6 caracteres" />
                        {errors.new_password && <span className={styles.error}>{errors.new_password.message}</span>}
                    </div>
                    <div className={styles.formGroup}>
                        <label>Confirmar Nova Senha</label>
                        <input {...register('confirm_password')} type="password" className={styles.input} placeholder="Repita a nova senha" />
                        {errors.confirm_password && <span className={styles.error}>{errors.confirm_password.message}</span>}
                    </div>
                </div>

                <div className={styles.footer}>
                    <button type="submit" disabled={isSaving} className={styles.saveButton}>
                        {isSaving ? <Loader2 className="animate-spin" size={20} /> : <><Save size={20} /> Salvar Alterações</>}
                    </button>
                </div>
            </form>
        </div>

      </div>
    </div>
  );
}