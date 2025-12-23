'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useForm, useFieldArray } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { ArrowLeft, Plus, Trash2, Save, Loader2, DollarSign } from 'lucide-react';
import api from '@/services/api';
import Link from 'next/link';

// Schemas
const itemSchema = z.object({
  product_id: z.string().optional(),
  description: z.string().min(1, 'Descrição obrigatória'),
  quantity: z.number().min(1, 'Qtd mínima 1'),
  unit_price: z.number().min(0, 'Preço inválido')
});

const formSchema = z.object({
  title: z.string().min(1, 'Título é obrigatório'),
  contact_id: z.string().optional(),
  deal_id: z.string().optional(),
  valid_until: z.string().optional(),
  notes: z.string().optional(),
  items: z.array(itemSchema).min(1, 'Adicione pelo menos um item')
});

type FormData = z.infer<typeof formSchema>;

export default function NewProposalPage() {
  const router = useRouter();
  const [isLoadingData, setIsLoadingData] = useState(true);
  const [contacts, setContacts] = useState<{id:string, name:string}[]>([]);
  const [deals, setDeals] = useState<{id:string, title:string}[]>([]);
  const [products, setProducts] = useState<{id:string, name:string, price:number}[]>([]);
  
  const { register, control, handleSubmit, watch, setValue, formState: { errors, isSubmitting } } = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      items: [{ description: '', quantity: 1, unit_price: 0 }]
    }
  });

  const { fields, append, remove } = useFieldArray({
    control,
    name: "items"
  });

  // Watch para cálculos em tempo real
  const watchItems = watch("items");
  const totalAmount = watchItems.reduce((acc, item) => acc + (Number(item.quantity || 0) * Number(item.unit_price || 0)), 0);

  useEffect(() => {
    Promise.all([
        api.get('/api/contacts'),
        api.get('/api/deals'),
        api.get('/api/products')
    ]).then(([resContacts, resDeals, resProducts]) => {
        setContacts(resContacts.data.data || resContacts.data);
        setDeals(resDeals.data);
        setProducts(resProducts.data);
    }).finally(() => setIsLoadingData(false));
  }, []);

  const onProductSelect = (index: number, productId: string) => {
    const product = products.find(p => p.id === productId);
    if (product) {
        setValue(`items.${index}.description`, product.name);
        setValue(`items.${index}.unit_price`, product.price);
        setValue(`items.${index}.product_id`, product.id);
    }
  };

  const onSubmit = async (data: FormData) => {
    try {
        await api.post('/api/proposals', {
            ...data,
            // Limpa campos opcionais vazios
            contact_id: data.contact_id || null,
            deal_id: data.deal_id || null,
        });
        router.push('/dashboard/proposals');
    } catch (error) {
        alert('Erro ao criar proposta. Verifique os dados.');
    }
  };

  if (isLoadingData) return <div style={{display:'flex', justifyContent:'center', marginTop:'3rem'}}><Loader2 className="animate-spin" /></div>;

  return (
    <div style={{ maxWidth: '900px', margin: '0 auto', paddingBottom: '3rem' }}>
      <div style={{ marginBottom: '1.5rem' }}>
        <Link href="/dashboard/proposals" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#6b7280', textDecoration: 'none', marginBottom: '1rem', fontSize: '0.9rem' }}>
            <ArrowLeft size={16} /> Voltar para lista
        </Link>
        <h1 style={{ fontSize: '1.8rem', fontWeight: 700, color: '#1f2937' }}>Nova Proposta</h1>
      </div>

      <form onSubmit={handleSubmit(onSubmit)}>
        
        {/* Card: Dados Gerais */}
        <div style={{ background: 'white', padding: '1.5rem', borderRadius: '12px', border: '1px solid #e5e7eb', marginBottom: '1.5rem' }}>
            <div style={{ marginBottom: '1rem' }}>
                <label style={{ display: 'block', fontWeight: 600, marginBottom: '0.3rem', fontSize: '0.9rem' }}>Título da Proposta</label>
                <input {...register('title')} placeholder="Ex: Orçamento Projeto Web" style={{ width: '100%', padding: '0.6rem', border: '1px solid #d1d5db', borderRadius: '6px' }} />
                {errors.title && <span style={{ color: '#ef4444', fontSize: '0.8rem' }}>{errors.title.message}</span>}
            </div>
            
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
                <div>
                    <label style={{ display: 'block', fontWeight: 600, marginBottom: '0.3rem', fontSize: '0.9rem' }}>Cliente</label>
                    <select {...register('contact_id')} style={{ width: '100%', padding: '0.6rem', border: '1px solid #d1d5db', borderRadius: '6px' }}>
                        <option value="">Selecione...</option>
                        {contacts.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                    </select>
                </div>
                <div>
                    <label style={{ display: 'block', fontWeight: 600, marginBottom: '0.3rem', fontSize: '0.9rem' }}>Negócio (Opcional)</label>
                    <select {...register('deal_id')} style={{ width: '100%', padding: '0.6rem', border: '1px solid #d1d5db', borderRadius: '6px' }}>
                        <option value="">Selecione...</option>
                        {deals.map(d => <option key={d.id} value={d.id}>{d.title}</option>)}
                    </select>
                </div>
            </div>

            <div>
                <label style={{ display: 'block', fontWeight: 600, marginBottom: '0.3rem', fontSize: '0.9rem' }}>Válida Até</label>
                <input type="date" {...register('valid_until')} style={{ width: '100%', maxWidth: '200px', padding: '0.6rem', border: '1px solid #d1d5db', borderRadius: '6px' }} />
            </div>
        </div>

        {/* Card: Itens */}
        <div style={{ background: 'white', padding: '1.5rem', borderRadius: '12px', border: '1px solid #e5e7eb', marginBottom: '1.5rem' }}>
            <h3 style={{ fontSize: '1.1rem', fontWeight: 600, marginBottom: '1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                Itens e Serviços
                <button type="button" onClick={() => append({ description: '', quantity: 1, unit_price: 0 })} style={{ background: '#eff6ff', color: '#2563eb', border: '1px solid #bfdbfe', padding: '0.4rem 0.8rem', borderRadius: '6px', fontSize: '0.85rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                    <Plus size={16} /> Adicionar Item
                </button>
            </h3>

            {fields.map((field, index) => (
                <div key={field.id} style={{ display: 'grid', gridTemplateColumns: '1.5fr 3fr 0.5fr 1fr 0.5fr', gap: '0.8rem', alignItems: 'end', marginBottom: '1rem', paddingBottom: '1rem', borderBottom: '1px dashed #f3f4f6' }}>
                    {/* Select Produto (Preenche automático) */}
                    <div>
                        <label style={{ fontSize: '0.75rem', color: '#6b7280', display: 'block', marginBottom: '2px' }}>Produto (Auto)</label>
                        <select onChange={(e) => onProductSelect(index, e.target.value)} style={{ width: '100%', padding: '0.5rem', border: '1px solid #d1d5db', borderRadius: '6px', fontSize: '0.9rem' }}>
                            <option value="">Personalizado...</option>
                            {products.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                        </select>
                    </div>
                    
                    <div>
                        <label style={{ fontSize: '0.75rem', color: '#6b7280', display: 'block', marginBottom: '2px' }}>Descrição</label>
                        <input {...register(`items.${index}.description` as const)} placeholder="Descrição do serviço" style={{ width: '100%', padding: '0.5rem', border: '1px solid #d1d5db', borderRadius: '6px' }} />
                    </div>

                    <div>
                        <label style={{ fontSize: '0.75rem', color: '#6b7280', display: 'block', marginBottom: '2px' }}>Qtd</label>
                        <input type="number" step="0.1" {...register(`items.${index}.quantity` as const, {valueAsNumber: true})} style={{ width: '100%', padding: '0.5rem', border: '1px solid #d1d5db', borderRadius: '6px', textAlign: 'center' }} />
                    </div>

                    <div>
                        <label style={{ fontSize: '0.75rem', color: '#6b7280', display: 'block', marginBottom: '2px' }}>Preço Unit.</label>
                        <input type="number" step="0.01" {...register(`items.${index}.unit_price` as const, {valueAsNumber: true})} style={{ width: '100%', padding: '0.5rem', border: '1px solid #d1d5db', borderRadius: '6px' }} />
                    </div>

                    <button type="button" onClick={() => remove(index)} style={{ padding: '0.5rem', background: '#fef2f2', border: '1px solid #fee2e2', color: '#ef4444', borderRadius: '6px', cursor: 'pointer' }}>
                        <Trash2 size={16} />
                    </button>
                </div>
            ))}
            
            {errors.items && <p style={{ color: '#ef4444', fontSize: '0.85rem' }}>{errors.items.message}</p>}

            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '1.5rem', paddingTop: '1rem', borderTop: '1px solid #e5e7eb' }}>
                <div style={{ textAlign: 'right' }}>
                    <span style={{ color: '#6b7280', fontSize: '0.9rem' }}>Total da Proposta</span>
                    <div style={{ fontSize: '1.5rem', fontWeight: 700, color: '#059669' }}>
                        {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(totalAmount)}
                    </div>
                </div>
            </div>
        </div>

        {/* Card: Notas */}
        <div style={{ background: 'white', padding: '1.5rem', borderRadius: '12px', border: '1px solid #e5e7eb', marginBottom: '2rem' }}>
            <label style={{ display: 'block', fontWeight: 600, marginBottom: '0.3rem', fontSize: '0.9rem' }}>Notas e Observações</label>
            <textarea {...register('notes')} placeholder="Termos de pagamento, prazos, etc..." rows={4} style={{ width: '100%', padding: '0.6rem', border: '1px solid #d1d5db', borderRadius: '6px', resize: 'vertical' }} />
        </div>

        <button type="submit" disabled={isSubmitting} style={{ width: '100%', background: '#2563eb', color: 'white', padding: '1rem', borderRadius: '8px', border: 'none', fontWeight: 700, fontSize: '1rem', cursor: 'pointer', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '0.5rem' }}>
            {isSubmitting ? <Loader2 className="animate-spin" /> : <><Save size={20} /> Salvar e Gerar Link</>}
        </button>
      </form>
    </div>
  );
}