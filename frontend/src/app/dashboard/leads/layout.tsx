'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth'; // Ajuste conforme seu hook de auth
import { LayoutDashboard, UserCheck, CheckCircle, XCircle } from 'lucide-react';
import styles from './layout.module.css';

export default function LeadsLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { user } = useAuth(); // Para verificar permissões se necessário

  // Função auxiliar para verificar se o link está ativo
  const isActive = (path: string) => pathname?.includes(path);

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <h1 className={styles.title}>Gestão de Leads</h1>
        <nav className={styles.nav}>
          <Link 
            href="/dashboard/leads/pool" 
            className={`${styles.tab} ${isActive('/pool') ? styles.active : ''}`}
          >
            <LayoutDashboard size={18} />
            Piscina (Geral)
          </Link>

          <Link 
            href="/dashboard/leads/mine" 
            className={`${styles.tab} ${isActive('/mine') ? styles.active : ''}`}
          >
            <UserCheck size={18} />
            Meus Leads
          </Link>

          <Link 
            href="/dashboard/leads/converted" 
            className={`${styles.tab} ${isActive('/converted') ? styles.active : ''}`}
          >
            <CheckCircle size={18} />
            Convertidos
          </Link>

          <Link 
            href="/dashboard/leads/lost" 
            className={`${styles.tab} ${isActive('/lost') ? styles.active : ''}`}
          >
            <XCircle size={18} />
            Perdidos
          </Link>
        </nav>
      </header>
      
      <main className={styles.content}>
        {children}
      </main>
    </div>
  );
}