'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useRouter } from 'next/navigation';
import Cookies from 'js-cookie';
import { Lock, Mail, Loader2, ArrowRight, AlertCircle } from 'lucide-react';
import api from '@/services/api';
import styles from './page.module.css';

const loginSchema = z.object({
  email: z.string().email('Digite um e-mail válido'),
  password: z.string().min(1, 'A senha é obrigatória'),
});

type LoginFormData = z.infer<typeof loginSchema>;

export default function LoginPage() {
  const router = useRouter();
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
  });

  async function handleLogin(data: LoginFormData) {
    setIsLoading(true);
    setError('');

    try {
      const response = await api.post('/api/auth/login', {
        email: data.email,
        password: data.password,
      });

      const { token, user } = response.data;

      Cookies.set('crm_token', token, { expires: 7 });
      localStorage.setItem('crm_user', JSON.stringify(user));

      router.push('/dashboard');

    } catch (err: any) {
      console.error(err);
      if (err.response?.status === 401) {
        setError('E-mail ou senha incorretos.');
      } else {
        setError('Erro de conexão com o servidor.');
      }
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className={styles.container}>
      <div className={styles.card}>
        <div className={styles.header}>
          <div className={styles.logoBox}>
            <Lock size={28} />
          </div>
          <h1 className={styles.title}>Acesse sua conta</h1>
          <p className={styles.subtitle}>Gerencie seu CRM SaaS</p>
        </div>

        <form className={styles.form} onSubmit={handleSubmit(handleLogin)}>
          <div className={styles.inputGroup}>
            <label htmlFor="email" className={styles.label}>E-mail</label>
            <div className={styles.inputWrapper}>
              <div className={styles.icon}>
                <Mail size={18} />
              </div>
              <input
                {...register('email')}
                id="email"
                type="email"
                className={`${styles.input} ${errors.email ? styles.inputError : ''}`}
                placeholder="exemplo@empresa.com"
              />
            </div>
            {errors.email && <span className={styles.errorMessage}>{errors.email.message}</span>}
          </div>

          <div className={styles.inputGroup}>
            <label htmlFor="password" className={styles.label}>Senha</label>
            <div className={styles.inputWrapper}>
              <div className={styles.icon}>
                <Lock size={18} />
              </div>
              <input
                {...register('password')}
                id="password"
                type="password"
                className={`${styles.input} ${errors.password ? styles.inputError : ''}`}
                placeholder="••••••"
              />
            </div>
            {errors.password && <span className={styles.errorMessage}>{errors.password.message}</span>}
          </div>

          {error && (
            <div className={styles.formError}>
              <AlertCircle size={18} />
              <span>{error}</span>
            </div>
          )}

          <button type="submit" disabled={isLoading} className={styles.button}>
            {isLoading ? (
              <Loader2 className={styles.spinner} />
            ) : (
              <>
                Entrar <ArrowRight className={styles.buttonIcon} />
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  );
}