'use client';

import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { Plus, Package, Search, Edit2, Trash2, X, Loader2 } from 'lucide-react';
import api from '@/services/api';

interface Product {
  id: string;
  name: string;
  description?: string;
  price: number;
  sku?: string;
}

export default function ProductsPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [filteredProducts, setFilteredProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  
  // Controle de Permissão
  const [userRole, setUserRole] = useState<string>('');

  // Modal e Edição
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const { register, handleSubmit, reset, setValue } = useForm();

  useEffect(() => {
    // 1. Identificar Role
    const userData = localStorage.getItem('crm_user');
    if (userData) {
        try {
            const parsed = JSON.parse(userData);
            setUserRole(parsed.role);
        } catch (e) { console.error(e); }
    }

    // 2. Carregar Dados
    loadProducts();
  }, []);

  async function loadProducts() {
    setIsLoading(true);
    try {
      const response = await api.get('/api/products');
      setProducts(response.data);
      setFilteredProducts(response.data);
    } catch (error) {
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  }

  // Filtro de Busca Local
  useEffect(() => {
    const term = searchTerm.toLowerCase();
    const filtered = products.filter(p => 
        p.name.toLowerCase().includes(term) || 
        p.sku?.toLowerCase().includes(term)
    );
    setFilteredProducts(filtered);
  }, [searchTerm, products]);

  // --- Ações (Só funcionam se o botão aparecer) ---

  function openModal(product?: Product) {
    if (product) {
      setEditingProduct(product);
      setValue('name', product.name);
      setValue('description', product.description);
      setValue('price', product.price);
      setValue('sku', product.sku);
    } else {
      setEditingProduct(null);
      reset();
    }
    setIsModalOpen(true);
  }

  async function handleSave(data: any) {
    try {
      const payload = { ...data, price: Number(data.price) };
      
      if (editingProduct) {
        await api.put(`/api/products/${editingProduct.id}`, payload);
      } else {
        await api.post('/api/products', payload);
      }
      
      setIsModalOpen(false);
      loadProducts();
    } catch (error) {
      alert('Erro ao salvar produto.');
    }
  }

  async function handleDelete(id: string) {
    if (!confirm('Tem certeza que deseja excluir este produto?')) return;
    try {
      await api.delete(`/api/products/${id}`);
      loadProducts();
    } catch (error) {
      alert('Erro ao excluir produto.');
    }
  }

  if (isLoading) return <div style={{display:'flex', justifyContent:'center', padding:'4rem'}}><Loader2 className="animate-spin" /></div>;

  return (
    <div style={{ maxWidth: '1000px', margin: '0 auto' }}>
      
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <div>
            <h1 style={{ fontSize: '1.5rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Package color="#2563eb" /> Catálogo de Produtos
            </h1>
            <p style={{ color: '#6b7280' }}>Gerencie os itens que sua empresa vende.</p>
        </div>
        
        {/* BOTÃO NOVO PRODUTO (Oculto para Vendedor) */}
        {userRole !== 'agent' && (
            <button 
                onClick={() => openModal()}
                style={{ 
                    background: '#2563eb', color: 'white', border: 'none', padding: '0.75rem 1.25rem', 
                    borderRadius: '8px', cursor: 'pointer', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.5rem'
                }}
            >
                <Plus size={20} /> Novo Produto
            </button>
        )}
      </div>

      {/* Barra de Busca */}
      <div style={{ marginBottom: '1.5rem', position: 'relative' }}>
        <Search size={20} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#9ca3af' }} />
        <input 
            type="text" 
            placeholder="Buscar por nome ou SKU..." 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={{ 
                width: '100%', padding: '0.8rem 0.8rem 0.8rem 2.5rem', 
                borderRadius: '8px', border: '1px solid #d1d5db', fontSize: '1rem' 
            }} 
        />
      </div>

      {/* Lista de Produtos */}
      <div style={{ display: 'grid', gap: '1rem' }}>
        {filteredProducts.map(product => (
            <div key={product.id} style={{ background: 'white', padding: '1.5rem', borderRadius: '12px', border: '1px solid #e5e7eb', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                    <h3 style={{ fontWeight: 600, fontSize: '1.1rem', color: '#1f2937' }}>{product.name}</h3>
                    {product.sku && <span style={{ fontSize: '0.8rem', color: '#6b7280', background: '#f3f4f6', padding: '2px 6px', borderRadius: '4px' }}>SKU: {product.sku}</span>}
                    <p style={{ color: '#6b7280', fontSize: '0.9rem', marginTop: '0.5rem' }}>{product.description || 'Sem descrição'}</p>
                </div>
                
                <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: '1.25rem', fontWeight: 700, color: '#059669', marginBottom: '0.5rem' }}>
                        {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(product.price)}
                    </div>
                    
                    {/* AÇÕES (Ocultas para Vendedor) */}
                    {userRole !== 'agent' && (
                        <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
                            <button onClick={() => openModal(product)} style={{ border: '1px solid #d1d5db', background: 'white', padding: '6px', borderRadius: '6px', cursor: 'pointer' }}><Edit2 size={16} color="#4b5563" /></button>
                            <button onClick={() => handleDelete(product.id)} style={{ border: '1px solid #fee2e2', background: '#fef2f2', padding: '6px', borderRadius: '6px', cursor: 'pointer' }}><Trash2 size={16} color="#ef4444" /></button>
                        </div>
                    )}
                </div>
            </div>
        ))}
        {filteredProducts.length === 0 && <p style={{ textAlign: 'center', color: '#9ca3af', padding: '2rem' }}>Nenhum produto encontrado.</p>}
      </div>

      {/* Modal Criar/Editar */}
      {isModalOpen && (
        <div style={{position:'fixed', inset:0, background:'rgba(0,0,0,0.5)', zIndex:50, display:'flex', alignItems:'center', justifyContent:'center'}}>
            <div style={{background:'white', padding:'2rem', borderRadius:'12px', width:'500px', maxWidth:'95%'}}>
                <div style={{display:'flex', justifyContent:'space-between', marginBottom:'1.5rem'}}>
                    <h3 style={{fontWeight:700, fontSize:'1.25rem'}}>{editingProduct ? 'Editar Produto' : 'Novo Produto'}</h3>
                    <button onClick={() => setIsModalOpen(false)} style={{background:'none', border:'none', cursor:'pointer'}}><X size={20}/></button>
                </div>
                <form onSubmit={handleSubmit(handleSave)} style={{display:'flex', flexDirection:'column', gap:'1rem'}}>
                    <div>
                        <label style={{display:'block', marginBottom:'0.3rem', fontSize:'0.9rem', fontWeight:600}}>Nome do Produto</label>
                        <input {...register('name', {required:true})} style={{width:'100%', padding:'0.6rem', border:'1px solid #d1d5db', borderRadius:'6px'}} />
                    </div>
                    <div style={{display:'grid', gridTemplateColumns:'1fr 1fr', gap:'1rem'}}>
                        <div>
                            <label style={{display:'block', marginBottom:'0.3rem', fontSize:'0.9rem', fontWeight:600}}>Preço (R$)</label>
                            <input {...register('price', {required:true})} type="number" step="0.01" style={{width:'100%', padding:'0.6rem', border:'1px solid #d1d5db', borderRadius:'6px'}} />
                        </div>
                        <div>
                            <label style={{display:'block', marginBottom:'0.3rem', fontSize:'0.9rem', fontWeight:600}}>SKU (Código)</label>
                            <input {...register('sku')} style={{width:'100%', padding:'0.6rem', border:'1px solid #d1d5db', borderRadius:'6px'}} />
                        </div>
                    </div>
                    <div>
                        <label style={{display:'block', marginBottom:'0.3rem', fontSize:'0.9rem', fontWeight:600}}>Descrição</label>
                        <textarea {...register('description')} rows={3} style={{width:'100%', padding:'0.6rem', border:'1px solid #d1d5db', borderRadius:'6px'}} />
                    </div>
                    <button type="submit" style={{marginTop:'1rem', background:'#2563eb', color:'white', border:'none', padding:'0.8rem', borderRadius:'6px', fontWeight:600, cursor:'pointer'}}>
                        Salvar Produto
                    </button>
                </form>
            </div>
        </div>
      )}
    </div>
  );
}