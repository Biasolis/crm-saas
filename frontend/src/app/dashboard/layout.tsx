'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { 
  LayoutDashboard, Users, Trello, Settings, LogOut, Hexagon, Package, FileText, 
  Building2, CalendarCheck, Filter, Users2, BarChart3, 
  ShieldAlert, CreditCard, ChevronDown, ChevronRight, Lock 
} from 'lucide-react';
import Cookies from 'js-cookie';
import api from '@/services/api';
import styles from './layout.module.css';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  
  const [user, setUser] = useState<{ name: string; role: string; is_super_admin?: boolean } | null>(null);
  const [tenantLogo, setTenantLogo] = useState<string | null>(null);
  const [companyName, setCompanyName] = useState<string>(''); 
  const [isAdminExpanded, setIsAdminExpanded] = useState(false);

  useEffect(() => {
    const token = Cookies.get('crm_token');
    const userData = localStorage.getItem('crm_user');

    if (!token || !userData) {
      router.push('/');
      return;
    }

    try {
      const parsedUser = JSON.parse(userData);
      setUser(parsedUser);
      if (pathname.includes('/dashboard/admin')) {
        setIsAdminExpanded(true);
      }
    } catch (e) {
      router.push('/');
    }

    async function fetchTenantSettings() {
      try {
        const response = await api.get('/api/tenants/current');
        const { primary_color, logo_url, name } = response.data;
        
        if (primary_color) document.documentElement.style.setProperty('--primary', primary_color);
        if (logo_url) setTenantLogo(logo_url);
        
        setCompanyName(name || 'CRM SaaS');

      } catch (error) {
        console.error('Erro ao carregar branding:', error);
        setCompanyName('CRM SaaS');
      }
    }
    fetchTenantSettings();
  }, [router, pathname]);

  function handleLogout() {
    Cookies.remove('crm_token');
    localStorage.removeItem('crm_user');
    document.documentElement.style.removeProperty('--primary');
    router.push('/');
  }

  if (!user) return null;

  // --- LÓGICA DE PERMISSÃO DO MENU ---
  const allMenuItems = [
    { name: 'Visão Geral', icon: LayoutDashboard, href: '/dashboard', roles: ['owner', 'admin', 'agent'] },
    { name: 'Leads', icon: Filter, href: '/dashboard/leads', roles: ['owner', 'admin', 'agent'] },
    { name: 'Contatos', icon: Users, href: '/dashboard/contacts', roles: ['owner', 'admin', 'agent'] },
    { name: 'Empresas', icon: Building2, href: '/dashboard/companies', roles: ['owner', 'admin', 'agent'] },
    { name: 'Funis de Venda', icon: Trello, href: '/dashboard/pipelines', roles: ['owner', 'admin', 'agent'] },
    { name: 'Agenda', icon: CalendarCheck, href: '/dashboard/tasks', roles: ['owner', 'admin', 'agent'] },
    { name: 'Produtos', icon: Package, href: '/dashboard/products', roles: ['owner', 'admin', 'agent'] },
    { name: 'Propostas', icon: FileText, href: '/dashboard/proposals', roles: ['owner', 'admin', 'agent'] },
    
    // Itens restritos (apenas Owner/Admin)
    { name: 'Relatórios', icon: BarChart3, href: '/dashboard/reports', roles: ['owner', 'admin'] },
    { name: 'Equipe', icon: Users2, href: '/dashboard/team', roles: ['owner', 'admin'] },
    { name: 'Configurações', icon: Settings, href: '/dashboard/settings', roles: ['owner', 'admin'] },
  ];

  // Filtra os itens baseado no cargo do usuário logado
  const visibleMenuItems = allMenuItems.filter(item => item.roles.includes(user.role));

  const adminItems = [
    { name: 'Gerir Empresas', icon: ShieldAlert, href: '/dashboard/admin/tenants' },
    { name: 'Gerir Planos', icon: CreditCard, href: '/dashboard/admin/plans' },
  ];

  return (
    <div className={styles.container}>
      <aside className={styles.sidebar}>
        <div className={styles.sidebarHeader}>
          <div className={styles.logo}>
            {tenantLogo ? (
              <img 
                src={tenantLogo} 
                alt="Logo" 
                style={{ maxHeight: '32px', maxWidth: '32px', objectFit: 'contain', borderRadius: '4px' }} 
              />
            ) : (
              <Hexagon size={28} fill="currentColor" />
            )}

            <span style={{ 
                whiteSpace: 'nowrap', 
                overflow: 'hidden', 
                textOverflow: 'ellipsis', 
                maxWidth: '170px',
                fontWeight: 800,
                fontSize: '1.1rem',
                marginLeft: '0.75rem',
                color: '#1f2937'
            }}>
                {companyName || '...'}
            </span>
          </div>
        </div>

        <nav className={styles.nav}>
          {visibleMenuItems.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href || (item.href !== '/dashboard' && pathname.startsWith(item.href));
            return (
              <Link 
                key={item.href} 
                href={item.href}
                className={`${styles.navItem} ${isActive ? styles.navItemActive : ''}`}
              >
                <Icon size={20} />
                <span>{item.name}</span>
              </Link>
            );
          })}

          {user.is_super_admin === true && (
            <div style={{ marginTop: '1rem', borderTop: '1px solid #e5e7eb', paddingTop: '1rem' }}>
              <div style={{ padding: '0 1rem 0.5rem 1rem', fontSize: '0.75rem', fontWeight: 700, color: '#9ca3af', textTransform: 'uppercase' }}>
                Administração
              </div>
              
              <button 
                onClick={() => setIsAdminExpanded(!isAdminExpanded)}
                className={styles.navItem}
                style={{ justifyContent: 'space-between', color: '#b91c1c' }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                  <Lock size={18} />
                  <span style={{ fontWeight: 600 }}>Super Admin</span>
                </div>
                {isAdminExpanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
              </button>

              {isAdminExpanded && (
                <div className={styles.submenu}>
                  {adminItems.map((item) => {
                    const Icon = item.icon;
                    return (
                      <Link 
                        key={item.href} 
                        href={item.href}
                        className={`${styles.subItem} ${pathname === item.href ? styles.subItemActive : ''}`}
                      >
                        <Icon size={16} />
                        <span>{item.name}</span>
                      </Link>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </nav>

        <div className={styles.userProfile}>
          <div className={styles.avatar}>
            {user.name.charAt(0).toUpperCase()}
          </div>
          <div className={styles.userInfo}>
            <span className={styles.userName}>{user.name}</span>
            <span className={styles.userRole}>
                {user.is_super_admin ? 'SUPER ADMIN' : user.role.toUpperCase()}
            </span>
          </div>
          <button onClick={handleLogout} className={styles.logoutButton} title="Sair">
            <LogOut size={18} />
          </button>
        </div>
      </aside>

      <main className={styles.main}>
        <header className={styles.topbar}>
          <h1 className={styles.pageTitle}>
            {adminItems.find(i => i.href === pathname)?.name || 
             visibleMenuItems.find(i => i.href === pathname || (i.href !== '/dashboard' && pathname.startsWith(i.href)))?.name || 
             'Dashboard'}
          </h1>
        </header>
        <div className={styles.content}>
          {children}
        </div>
      </main>
    </div>
  );
}