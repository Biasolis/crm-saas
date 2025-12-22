'use client';

import Link from 'next/link';
import { FileQuestion, Home } from 'lucide-react';

export default function NotFound() {
  return (
    <div style={{
      height: '100vh',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: '#f4f6f8',
      color: '#111827',
      textAlign: 'center',
      gap: '1.5rem'
    }}>
      <div style={{
        backgroundColor: 'white',
        padding: '2rem',
        borderRadius: '50%',
        boxShadow: '0 4px 6px rgba(0,0,0,0.05)'
      }}>
        <FileQuestion size={64} color="#2563eb" />
      </div>
      
      <div>
        <h1 style={{ fontSize: '2.5rem', fontWeight: 800, marginBottom: '0.5rem' }}>404</h1>
        <h2 style={{ fontSize: '1.5rem', fontWeight: 600 }}>Página não encontrada</h2>
        <p style={{ color: '#6b7280', marginTop: '0.5rem', maxWidth: '400px' }}>
          O recurso que você está procurando pode ter sido removido, ter seu nome alterado ou estar temporariamente indisponível.
        </p>
      </div>

      <Link 
        href="/dashboard"
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '0.5rem',
          backgroundColor: '#2563eb',
          color: 'white',
          padding: '0.75rem 1.5rem',
          borderRadius: '8px',
          fontWeight: 600,
          textDecoration: 'none',
          marginTop: '1rem',
          transition: 'opacity 0.2s'
        }}
      >
        <Home size={20} /> Voltar ao Dashboard
      </Link>
    </div>
  );
}