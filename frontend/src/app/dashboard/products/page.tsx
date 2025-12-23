'use client';

import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Plus, Search, Package, Edit2, Trash2, Loader2, X, Archive } from 'lucide-react';
import api from '@/services/api';
import styles from './page.module.css';

interface Product {
  id: string;
  name: string;
  description?: string;
  price: number;
  active: boolean;
}

const productSchema = z.object({
  name: z.string().min(2, 'Nome é obrigatório'),
  description: z.string().optional(),
  price: z.coerce.number().min(0, 'Preço inválido'),
  active: z.boolean().default(true)
});

type ProductFormData = z.infer<typeof productSchema>;

export default function ProductsPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  
  // Modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const { register, handleSubmit, reset, setValue, formState: { errors } } = useForm<ProductFormData>({
    resolver: zodResolver(productSchema),
    defaultValues: { active: true }
  });

  useEffect(() => {
    fetchProducts();
  }, []);

  async function fetchProducts() {
    setLoading(true);
    try {
      const res = await api.get('/api/products');
      setProducts(res.data);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  }

  // Filtro local (ou via API se preferir debounce)
  const filteredProducts = products.filter(p => 
    p.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    p.description?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  function handleOpenModal(product?: Product) {
    if (product) {
      setEditingProduct(product);
      setValue('name', product.name);
      setValue('description', product.description || '');
      setValue('price', product.price);
      setValue('active', product.active);
    } else {
      setEditingProduct(null);
      reset();
      setValue('active', true);
    }
    setIsModalOpen(true);
  }

  async function onSave(data: ProductFormData) {
    setIsSaving(true);
    try {
      if (editingProduct) {
        await api.put(`/api/products/${editingProduct.id}`, data);
      } else {
        await api.post('/api/products', data);
      }
      setIsModalOpen(false);
      fetchProducts();
    } catch (error) {
      alert('Erro ao salvar produto.');
    } finally {
      setIsSaving(false);
    }
  }

  async function onDelete(id: string) {
    if (!confirm('Excluir este produto?')) return;
    try {
      const res = await api.delete(`/api/products/${id}`);
      if (res.data.message?.includes('arquivado')) {
        alert('Este produto já foi usado em propostas e foi arquivado ao invés de excluído.');
      }
      fetchProducts();
    } catch (error) {
      alert('Erro ao excluir produto.');
    }
  }

  // Formatter
  const formatCurrency = (val: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);

  if (loading) return <div className={styles.loading}><Loader2 className="animate-spin" size={32}/></div>;

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <div>
            <h1 className={styles.title}><Package size={24} color="#2563eb"/> Catálogo de Produtos</h1>
            <p className={styles.subtitle}>Gerencie os itens disponíveis para suas propostas.</p>
        </div>
        <button className={styles.addButton} onClick={() => handleOpenModal()}>
          <Plus size={20} /> Novo Produto
        </button>
      </div>

      <div className={styles.controls}>
        <div className={styles.searchWrapper}>
            <Search size={18} className={styles.searchIcon} />
            <input 
                placeholder="Buscar produtos..." 
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                className={styles.searchInput}
            />
        </div>
      </div>

      <div className={styles.tableContainer}>
        {filteredProducts.length === 0 ? (
            <div className={styles.emptyState}>Nenhum produto encontrado.</div>
        ) : (
            <table className={styles.table}>
                <thead>
                    <tr>
                        <th>Nome</th>
                        <th>Descrição</th>
                        <th>Preço Unit.</th>
                        <th>Status</th>
                        <th style={{textAlign:'right'}}>Ações</th>
                    </tr>
                </thead>
                <tbody>
                    {filteredProducts.map(product => (
                        <tr key={product.id} style={{opacity: product.active ? 1 : 0.6}}>
                            <td>
                                <div style={{fontWeight: 600, color: '#374151'}}>{product.name}</div>
                            </td>
                            <td>
                                <div style={{color: '#6b7280', fontSize: '0.9rem', maxWidth: '300px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis'}}>
                                    {product.description || '-'}
                                </div>
                            </td>
                            <td>
                                <div style={{fontWeight: 600, color: '#059669'}}>
                                    {formatCurrency(Number(product.price))}
                                </div>
                            </td>
                            <td>
                                <span className={`${styles.badge} ${product.active ? styles.active : styles.inactive}`}>
                                    {product.active ? 'Ativo' : 'Arquivado'}
                                </span>
                            </td>
                            <td style={{textAlign: 'right'}}>
                                <div className={styles.actions}>
                                    <button onClick={() => handleOpenModal(product)} className={styles.iconBtn} title="Editar">
                                        <Edit2 size={18} />
                                    </button>
                                    <button onClick={() => onDelete(product.id)} className={`${styles.iconBtn} ${styles.danger}`} title="Excluir">
                                        {product.active ? <Trash2 size={18} /> : <Archive size={18}/>}
                                    </button>
                                </div>
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        )}
      </div>

      {/* Modal */}
      {isModalOpen && (
        <div className={styles.modalOverlay}>
            <div className={styles.modalContent}>
                <div className={styles.modalHeader}>
                    <h3>{editingProduct ? 'Editar Produto' : 'Novo Produto'}</h3>
                    <button onClick={() => setIsModalOpen(false)} className={styles.closeBtn}><X size={20}/></button>
                </div>
                <form onSubmit={handleSubmit(onSave)}>
                    <div className={styles.formGroup}>
                        <label>Nome do Produto/Serviço</label>
                        <input {...register('name')} className={styles.input} placeholder="Ex: Consultoria Hora" />
                        {errors.name && <span className={styles.error}>{errors.name.message}</span>}
                    </div>
                    
                    <div className={styles.row}>
                        <div className={styles.formGroup}>
                            <label>Preço Unitário (R$)</label>
                            <input {...register('price')} type="number" step="0.01" className={styles.input} />
                            {errors.price && <span className={styles.error}>{errors.price.message}</span>}
                        </div>
                        <div className={styles.formGroup} style={{display:'flex', alignItems:'center', marginTop:'1.5rem'}}>
                            <input type="checkbox" {...register('active')} id="active" style={{width:'20px', height:'20px', marginRight:'8px'}} />
                            <label htmlFor="active" style={{marginBottom:0, cursor:'pointer'}}>Disponível para venda</label>
                        </div>
                    </div>

                    <div className={styles.formGroup}>
                        <label>Descrição</label>
                        <textarea {...register('description')} className={styles.textarea} placeholder="Detalhes técnicos, escopo, etc..." />
                    </div>

                    <div className={styles.modalFooter}>
                        <button type="button" className={styles.btnCancel} onClick={() => setIsModalOpen(false)}>Cancelar</button>
                        <button type="submit" disabled={isSaving} className={styles.btnSave}>
                            {isSaving ? <Loader2 className="animate-spin" size={16} /> : 'Salvar'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
      )}
    </div>
  );
}