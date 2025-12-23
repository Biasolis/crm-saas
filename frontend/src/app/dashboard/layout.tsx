'use client';

import { useEffect, useState, useRef } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { 
  LayoutDashboard, Users, Trello, Settings, LogOut, Hexagon, Package, FileText, 
  Building2, CalendarCheck, Filter, Users2, BarChart3, 
  ShieldAlert, CreditCard, ChevronDown, ChevronRight, Lock, Bell, Check, X 
} from 'lucide-react';
import Cookies from 'js-cookie';
import api from '@/services/api';
import styles from './layout.module.css';

// --- Interface de Notificação ---
interface Notification {
  id: string;
  title: string;
  message: string;
  read: boolean;
  link?: string;
  created_at: string;
}

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

  // Estados de Notificação
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isNotifOpen, setIsNotifOpen] = useState(false);
  const notifDropdownRef = useRef<HTMLDivElement>(null);

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
      }
    }
    fetchTenantSettings();
  }, [router, pathname]);

  // Busca notificações periodicamente
  useEffect(() => {
    if (!user) return;

    function fetchNotifications() {
      api.get('/api/notifications')
        .then(res => {
          setNotifications(res.data);
          setUnreadCount(res.data.filter((n: Notification) => !n.read).length);
        })
        .catch(err => console.error(err));
    }

    fetchNotifications();
    const interval = setInterval(fetchNotifications, 60000); // 60 segundos
    return () => clearInterval(interval);
  }, [user]);

  // Fecha dropdown ao clicar fora
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (notifDropdownRef.current && !notifDropdownRef.current.contains(event.target as Node)) {
        setIsNotifOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [notifDropdownRef]);

  function handleLogout() {
    Cookies.remove('crm_token');
    localStorage.removeItem('crm_user');
    document.documentElement.style.removeProperty('--primary');
    router.push('/');
  }

  async function handleMarkAsRead(id: string, link?: string) {
    try {
      await api.post(`/api/notifications/${id}/read`);
      // Atualiza localmente
      setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
      setUnreadCount(prev => Math.max(0, prev - 1));
      
      if (link) {
        router.push(link);
        setIsNotifOpen(false);
      }
    } catch (error) {
      console.error(error);
    }
  }

  async function handleMarkAllRead() {
    try {
      await api.post('/api/notifications/read-all');
      setNotifications(prev => prev.map(n => ({ ...n, read: true })));
      setUnreadCount(0);
    } catch (error) {
      console.error(error);
    }
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
    
    // Itens restritos
    { name: 'Relatórios', icon: BarChart3, href: '/dashboard/reports', roles: ['owner', 'admin'] },
    { name: 'Equipe', icon: Users2, href: '/dashboard/team', roles: ['owner', 'admin'] },
    { name: 'Configurações', icon: Settings, href: '/dashboard/settings', roles: ['owner', 'admin'] },
  ];

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
                whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '170px',
                fontWeight: 800, fontSize: '1.1rem', marginLeft: '0.75rem', color: '#1f2937'
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
              <Link key={item.href} href={item.href} className={`${styles.navItem} ${isActive ? styles.navItemActive : ''}`}>
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
                      <Link key={item.href} href={item.href} className={`${styles.subItem} ${pathname === item.href ? styles.subItemActive : ''}`}>
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
          <div className={styles.avatar}>{user.name.charAt(0).toUpperCase()}</div>
          <div className={styles.userInfo}>
            <span className={styles.userName}>{user.name}</span>
            <span className={styles.userRole}>{user.is_super_admin ? 'SUPER ADMIN' : user.role.toUpperCase()}</span>
          </div>
          <button onClick={handleLogout} className={styles.logoutButton} title="Sair">
            <LogOut size={18} />
          </button>
        </div>
      </aside>

      <main className={styles.main}>
        <header className={styles.topbar} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h1 className={styles.pageTitle}>
            {adminItems.find(i => i.href === pathname)?.name || 
             visibleMenuItems.find(i => i.href === pathname || (i.href !== '/dashboard' && pathname.startsWith(i.href)))?.name || 
             'Dashboard'}
          </h1>

          {/* --- NOTIFICAÇÕES --- */}
          <div style={{ position: 'relative' }} ref={notifDropdownRef}>
             <div 
                style={{ marginRight: '1rem', cursor: 'pointer', position: 'relative' }} 
                title="Notificações"
                onClick={() => setIsNotifOpen(!isNotifOpen)}
             >
                <Bell size={22} color="#6b7280" />
                {unreadCount > 0 && (
                  <span style={{
                    position:'absolute', top:-4, right:-4, 
                    background:'#ef4444', color:'white', fontSize:'0.7rem', fontWeight:'bold',
                    width:16, height:16, borderRadius:'50%', display:'flex', alignItems:'center', justifyContent:'center'
                  }}>
                    {unreadCount > 9 ? '9+' : unreadCount}
                  </span>
                )}
             </div>

             {/* DROPDOWN */}
             {isNotifOpen && (
               <div style={{
                 position: 'absolute', right: '1rem', top: '2.5rem', width: '320px',
                 background: 'white', borderRadius: '8px', boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
                 border: '1px solid #e5e7eb', zIndex: 50, overflow: 'hidden'
               }}>
                 <div style={{ padding: '0.75rem', borderBottom: '1px solid #f3f4f6', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontWeight: 600, fontSize: '0.9rem' }}>Notificações</span>
                    {unreadCount > 0 && (
                      <button 
                        onClick={handleMarkAllRead}
                        style={{ fontSize: '0.75rem', color: '#2563eb', background: 'none', border: 'none', cursor: 'pointer' }}
                      >
                        Marcar todas como lidas
                      </button>
                    )}
                 </div>
                 
                 <div style={{ maxHeight: '300px', overflowY: 'auto' }}>
                    {notifications.length === 0 ? (
                      <div style={{ padding: '2rem', textAlign: 'center', color: '#9ca3af', fontSize: '0.9rem' }}>
                        Nenhuma notificação recente.
                      </div>
                    ) : (
                      notifications.map(n => (
                        <div 
                          key={n.id} 
                          onClick={() => handleMarkAsRead(n.id, n.link)}
                          style={{
                            padding: '0.75rem', borderBottom: '1px solid #f3f4f6', cursor: 'pointer',
                            backgroundColor: n.read ? 'white' : '#eff6ff',
                            transition: 'background 0.2s'
                          }}
                        >
                          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.25rem' }}>
                             <strong style={{ fontSize: '0.85rem', color: '#374151' }}>{n.title}</strong>
                             {!n.read && <span style={{ width: 8, height: 8, background: '#2563eb', borderRadius: '50%' }}></span>}
                          </div>
                          <p style={{ fontSize: '0.8rem', color: '#6b7280', margin: 0 }}>{n.message}</p>
                          <small style={{ fontSize: '0.7rem', color: '#9ca3af', display: 'block', marginTop: '0.4rem' }}>
                             {new Date(n.created_at).toLocaleString('pt-BR')}
                          </small>
                        </div>
                      ))
                    )}
                 </div>
               </div>
             )}
          </div>
        </header>
        <div className={styles.content}>
          {children}
        </div>
      </main>
    </div>
  );
}