'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Plus, Trash2, ArrowLeft, Loader2 } from 'lucide-react';
import Link from 'next/link';
import api from '@/services/api';
import styles from './new.module.css'; // Crie este CSS baseado nos anteriores

// Schema
const itemSchema = z.object({
  product_id: z.string().optional(),
  description: z.string().min(1, 'Descrição necessária'),
  quantity: z.number().min(1),
  unit_price: z.number().min(0)
});

const formSchema = z.object({
  title: z.string().min(1, 'Título obrigatório'),
  contact_id: z.string().optional(),
  valid_until: z.string().optional(),
  notes: z.string().optional(),
  items: z.array(itemSchema).min(1, 'Adicione itens')
});

type FormData = z.infer<typeof formSchema>;

export default function NewProposalPage() {
  const router = useRouter();
  const [contacts, setContacts] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]); // Catálogo
  const [isSaving, setIsSaving] = useState(false);

  const { register, control, handleSubmit, watch, setValue } = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      items: [{ description: '', quantity: 1, unit_price: 0 }]
    }
  });

  const { fields, append, remove } = useFieldArray({
    control,
    name: "items"
  });

  // Watch para calcular totais em tempo real
  const items = watch('items');
  const totalGeral = items.reduce((acc, item) => acc + (item.quantity * item.unit_price), 0);

  useEffect(() => {
    // Carregar dados auxiliares
    api.get('/api/contacts').then(res => setContacts(res.data.data));
    api.get('/api/products').then(res => setProducts(res.data));
  }, []);

  // Quando seleciona um produto do catálogo, preenche os campos
  function handleProductSelect(index: number, productId: string) {
    const product = products.find(p => p.id === productId);
    if (product) {
      setValue(`items.${index}.description`, product.name);
      setValue(`items.${index}.unit_price`, Number(product.price));
      setValue(`items.${index}.product_id`, product.id);
    }
  }

  async function onSubmit(data: FormData) {
    setIsSaving(true);
    try {
      await api.post('/api/proposals', data);
      router.push('/dashboard/proposals');
    } catch (error) {
      console.error(error);
      alert('Erro ao criar proposta');
    } finally {
      setIsSaving(false);
    }
  }

  // Styles inline para agilizar (mas ideal é mover para CSS Modules)
  const inputStyle = { padding: '0.6rem', border: '1px solid #e5e7eb', borderRadius: '6px', width: '100%' };
  const labelStyle = { display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.3rem' };

  return (
    <div style={{ maxWidth: '900px', margin: '0 auto' }}>
      <div style={{ marginBottom: '1.5rem' }}>
        <Link href="/dashboard/proposals" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#6b7280', marginBottom: '1rem', textDecoration: 'none' }}>
          <ArrowLeft size={16} /> Voltar
        </Link>
        <h1 style={{ fontSize: '1.5rem', fontWeight: 700 }}>Nova Proposta</h1>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
        
        {/* Card: Dados Gerais */}
        <div style={{ backgroundColor: 'white', padding: '1.5rem', borderRadius: '12px', border: '1px solid #e5e7eb' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '1rem' }}>
            <div>
              <label style={labelStyle}>Título da Proposta</label>
              <input {...register('title')} style={inputStyle} placeholder="Ex: Orçamento Site Institucional" />
            </div>
            <div>
              <label style={labelStyle}>Validade</label>
              <input {...register('valid_until')} type="date" style={inputStyle} />
            </div>
            <div>
              <label style={labelStyle}>Cliente</label>
              <select {...register('contact_id')} style={inputStyle}>
                <option value="">Selecione...</option>
                {contacts.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
          </div>
        </div>

        {/* Card: Itens */}
        <div style={{ backgroundColor: 'white', padding: '1.5rem', borderRadius: '12px', border: '1px solid #e5e7eb' }}>
          <h3 style={{ fontSize: '1.1rem', fontWeight: 600, marginBottom: '1rem' }}>Itens e Serviços</h3>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {fields.map((field, index) => (
              <div key={field.id} style={{ display: 'grid', gridTemplateColumns: '1fr 2fr 0.5fr 1fr auto', gap: '0.75rem', alignItems: 'end', paddingBottom: '1rem', borderBottom: '1px dashed #e5e7eb' }}>
                
                {/* Select de Produto Rápido */}
                <div>
                  <label style={{...labelStyle, fontSize: '0.75rem'}}>Carregar do Catálogo</label>
                  <select 
                    style={inputStyle} 
                    onChange={(e) => handleProductSelect(index, e.target.value)}
                  >
                    <option value="">Busca rápida...</option>
                    {products.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                  </select>
                </div>

                <div>
                  <label style={labelStyle}>Descrição</label>
                  <input {...register(`items.${index}.description`)} style={inputStyle} />
                </div>

                <div>
                  <label style={labelStyle}>Qtd</label>
                  <input {...register(`items.${index}.quantity`, { valueAsNumber: true })} type="number" style={inputStyle} />
                </div>

                <div>
                  <label style={labelStyle}>Preço Unit. (R$)</label>
                  <input {...register(`items.${index}.unit_price`, { valueAsNumber: true })} type="number" step="0.01" style={inputStyle} />
                </div>

                <button type="button" onClick={() => remove(index)} style={{ border: 'none', background: '#fee2e2', color: '#ef4444', padding: '0.6rem', borderRadius: '6px', cursor: 'pointer' }}>
                  <Trash2 size={18} />
                </button>
              </div>
            ))}
          </div>

          <button 
            type="button" 
            onClick={() => append({ description: '', quantity: 1, unit_price: 0 })}
            style={{ marginTop: '1rem', background: 'none', border: '1px dashed #2563eb', color: '#2563eb', padding: '0.5rem 1rem', borderRadius: '6px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.9rem', fontWeight: 600 }}
          >
            <Plus size={16} /> Adicionar Item
          </button>
        </div>

        {/* Total e Salvar */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1.5rem', backgroundColor: '#f9fafb', borderRadius: '12px', border: '1px solid #e5e7eb' }}>
          <div>
            <span style={{ color: '#6b7280', marginRight: '0.5rem' }}>Total da Proposta:</span>
            <span style={{ fontSize: '1.5rem', fontWeight: 700, color: '#059669' }}>
              {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(totalGeral)}
            </span>
          </div>

          <button 
            type="submit" 
            disabled={isSaving}
            style={{ backgroundColor: '#2563eb', color: 'white', border: 'none', padding: '0.75rem 2rem', borderRadius: '8px', fontWeight: 700, cursor: 'pointer', fontSize: '1rem' }}
          >
            {isSaving ? <Loader2 className="animate-spin" /> : 'Finalizar Proposta'}
          </button>
        </div>

      </form>
    </div>
  );
}