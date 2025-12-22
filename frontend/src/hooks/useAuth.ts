import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

export interface User {
  id: string;
  name: string;
  email: string;
  role: 'owner' | 'admin' | 'agent' | 'user';
  is_super_admin: boolean;
  tenant_id: string;
}

export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    // Verifica se estamos no lado do cliente (navegador)
    if (typeof window !== 'undefined') {
      const storedUser = localStorage.getItem('crm_user');
      const token = localStorage.getItem('crm_token');

      if (!token || !storedUser) {
        setUser(null);
        // Opcional: Se quiser forçar o redirect caso não esteja logado
        // router.push('/login'); 
      } else {
        try {
          setUser(JSON.parse(storedUser));
        } catch (error) {
          console.error("Erro ao processar dados do usuário", error);
          setUser(null);
        }
      }
      setLoading(false);
    }
  }, []);

  const logout = () => {
    localStorage.removeItem('crm_token');
    localStorage.removeItem('crm_user');
    setUser(null);
    router.push('/login');
  };

  return {
    user,
    loading,
    isAuthenticated: !!user,
    logout
  };
}