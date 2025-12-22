'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function LeadsIndexPage() {
  const router = useRouter();

  useEffect(() => {
    // Redireciona para a Piscina assim que entra em /leads
    router.replace('/dashboard/leads/pool');
  }, [router]);

  return (
    <div className="flex items-center justify-center h-64 text-gray-500">
      Carregando módulo de leads...
    </div>
  );
}