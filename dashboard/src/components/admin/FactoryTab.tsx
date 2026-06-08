import React, { useState } from 'react';
import { Plus, Tag, Info, Hash, Check, Edit2, Trash2, X, Boxes, Zap } from 'lucide-react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: any[]) {
  return twMerge(clsx(inputs));
}

interface FactoryTabProps {
  items: any[];
  botConfig: any;
  handleCreateItem: (e: React.FormEvent) => void;
  newItem: any;
  setNewItem: (item: any) => void;
  handleUpdatePrice: (itemId: string, price: string) => void;
  handleUpdateResalePrice: (itemId: string, resalePrice: string) => void;
  handleUpdateStock: (itemId: string, stock: string) => void;
  handleDeleteItem: (itemId: string) => void;
}

export default function FactoryTab({
  items,
  botConfig,
  handleCreateItem,
  newItem,
  setNewItem,
  handleUpdatePrice,
  handleUpdateResalePrice,
  handleUpdateStock,
  handleDeleteItem
}: FactoryTabProps) {
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [editingPriceId, setEditingPriceId] = useState<string | null>(null);
  const [editingResaleId, setEditingResaleId] = useState<string | null>(null);
  const [tempPrice, setTempPrice] = useState<string>('0,00');
  const [tempResale, setTempResale] = useState<string>('0,00');
  const [editingStockId, setEditingStockId] = useState<string | null>(null);
  const [tempStock, setTempStock] = useState<string>('0');

  // Máscaras de exibição para o novo item (Modal)
  const [displayNewPrice, setDisplayNewPrice] = useState('0,00');
  const [displayNewResale, setDisplayNewResale] = useState('0,00');
  const [displayNewStock, setDisplayNewStock] = useState('-1');

  const formatCurrencyMask = (val: string) => {
    let value = val.replace(/\D/g, '');
    if (!value) value = '000';
    value = value.padStart(3, '0');
    const integer = value.slice(0, -2);
    const decimals = value.slice(-2);
    const cleanInteger = parseInt(integer, 10).toString();
    const formattedInteger = cleanInteger.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
    return `${formattedInteger},${decimals}`;
  };

  const parseCurrencyMask = (masked: string) => {
    return parseFloat(masked.replace(/\./g, '').replace(',', '.')) || 0;
  };

  const handleStockInputChange = (val: string, isNew: boolean, itemId?: string) => {
    // Permitir apenas números e o sinal de menos no início
    const regex = /^-?\d*$/;
    if (val !== '' && !regex.test(val)) return;
    
    if (isNew) {
      setDisplayNewStock(val);
      if (val !== '' && val !== '-') {
        setNewItem({ ...newItem, stock: parseInt(val) });
      }
    } else if (itemId) {
      setTempStock(val);
    }
  };

  const handlePriceInputChange = (val: string, isNew: boolean, type: 'price' | 'resale', itemId?: string) => {
    const masked = formatCurrencyMask(val);
    const numeric = parseCurrencyMask(masked);

    if (isNew) {
      if (type === 'price') {
        setDisplayNewPrice(masked);
        setNewItem({ ...newItem, price: numeric });
      } else {
        setDisplayNewResale(masked);
        setNewItem({ ...newItem, resale_price: numeric });
      }
    } else if (itemId) {
      if (type === 'price') setTempPrice(masked);
      else setTempResale(masked);
    }
  };

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Top Banner / Actions */}
      <section className="flex flex-col md:flex-row md:items-center justify-between gap-6 bg-panel p-8 rounded-[2.5rem] border border-border/50 shadow-2xl relative overflow-hidden group">
        <div className="absolute top-0 right-0 w-64 h-64 bg-primary/5 rounded-full -mr-32 -mt-32 blur-3xl transition-all group-hover:bg-primary/10" />
        
        <div className="flex items-center gap-5 relative z-10">
          <div className="p-4 bg-black rounded-[1.5rem] text-primary shadow-xl rotate-3 group-hover:rotate-0 transition-transform duration-500">
            <Boxes size={28} />
          </div>
          <div>
            <h3 className="text-2xl font-black uppercase tracking-tighter text-black leading-none">Inventário Mestre</h3>
            <p className="text-[10px] font-bold text-muted uppercase tracking-[0.2em] mt-2 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
              {(items || []).length} Ativos em circulação
            </p>
          </div>
        </div>

        <button 
          onClick={() => setIsCreateModalOpen(true)}
          className="bg-black text-primary px-10 py-5 rounded-2xl text-[11px] font-black uppercase tracking-[0.2em] flex items-center justify-center gap-3 hover:scale-[1.02] active:scale-95 transition-all shadow-[0_10px_20px_-10px_rgba(0,0,0,0.5)] relative z-10 group/btn"
        >
          <Plus size={18} className="group-hover/btn:rotate-90 transition-transform duration-500" /> 
          Adicionar Novo Registro
        </button>
      </section>

      {/* Main List */}
      <section className="space-y-6">
        <div className="hidden md:block bg-panel rounded-[2.5rem] shadow-xl overflow-hidden border border-border/50">
          <div className="overflow-x-auto no-scrollbar">
            <table className="w-full text-left min-w-[800px]">
              <thead className="bg-black text-white text-[9px] font-black uppercase tracking-[0.2em] border-b border-white/10">
                <tr>
                  <th className="px-8 py-6 w-[140px]">Tipo</th>
                  <th className="px-8 py-6">Identificação do Ativo</th>
                  <th className="px-8 py-6 w-[150px]">Preço Unitário</th>
                  <th className="px-8 py-6 w-[150px]">Vlr. Revenda</th>
                  <th className="px-8 py-6 w-[140px]">Disponibilidade</th>
                  <th className="px-8 py-6 text-right w-[100px]">Gerir</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/50">
                {(items || []).map((item: any) => (
                  <tr key={item.id} className="hover:bg-primary/5 transition-all duration-300 group">
                    <td className="px-8 py-6">
                      <span className="text-[8px] font-black bg-surface border border-black/10 text-black/60 px-3 py-1 rounded-lg uppercase tracking-wider">{item.item_type}</span>
                    </td>
                    <td className="px-8 py-6">
                      <div className="text-sm font-black uppercase text-black leading-tight group-hover:text-primary transition-colors">{item.name}</div>
                      <div className="text-[8px] font-bold text-muted uppercase mt-1 tracking-widest font-mono">UID: {item.id.substr(0, 12)}</div>
                    </td>
                    <td className="px-8 py-6">
                      {editingPriceId === item.id ? (
                        <div className="flex items-center gap-2 animate-in zoom-in-95 duration-300">
                          <input 
                            type="text" 
                            className="w-24 bg-white border-2 border-black p-2 rounded-xl text-xs font-black outline-none shadow-lg" 
                            value={tempPrice} 
                            onChange={e => handlePriceInputChange(e.target.value, false, 'price', item.id)} 
                            autoFocus 
                          />
                          <button onClick={() => { handleUpdatePrice(item.id, tempPrice); setEditingPriceId(null); }} className="p-2 bg-black text-primary rounded-xl hover:scale-110 transition-transform"><Check size={14} /></button>
                          <button onClick={() => setEditingPriceId(null)} className="p-2 bg-white border-2 border-border rounded-xl text-muted hover:text-red-500 hover:border-red-500 transition-colors"><X size={14} /></button>
                        </div>
                      ) : (
                        <div onClick={() => { setEditingPriceId(item.id); setTempPrice(item.price.toLocaleString('pt-BR', { minimumFractionDigits: 2 })); }} className="flex items-center gap-2 cursor-pointer group/item hover:translate-x-1 transition-transform">
                          <span className="text-sm font-black tabular-nums">{botConfig.currency_symbol}{item.price.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                          <Edit2 size={10} className="opacity-0 group-hover:opacity-40 transition-opacity text-black" />
                        </div>
                      )}
                    </td>
                    <td className="px-8 py-6">
                      {editingResaleId === item.id ? (
                        <div className="flex items-center gap-2 animate-in zoom-in-95 duration-300">
                          <input 
                            type="text" 
                            className="w-24 bg-white border-2 border-black p-2 rounded-xl text-xs font-black outline-none shadow-lg" 
                            value={tempResale} 
                            onChange={e => handlePriceInputChange(e.target.value, false, 'resale', item.id)} 
                            autoFocus 
                          />
                          <button onClick={() => { handleUpdateResalePrice(item.id, tempResale); setEditingResaleId(null); }} className="p-2 bg-black text-primary rounded-xl hover:scale-110 transition-transform"><Check size={14} /></button>
                          <button onClick={() => setEditingResaleId(null)} className="p-2 bg-white border-2 border-border rounded-xl text-muted hover:text-red-500 hover:border-red-500 transition-colors"><X size={14} /></button>
                        </div>
                      ) : (
                        <div onClick={() => { setEditingResaleId(item.id); setTempResale((item.resale_price || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })); }} className="flex items-center gap-2 cursor-pointer group/item hover:translate-x-1 transition-transform">
                          <span className="text-sm font-black tabular-nums text-muted">{botConfig.currency_symbol}{(item.resale_price || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                          <Edit2 size={10} className="opacity-0 group-hover:opacity-40 transition-opacity text-black" />
                        </div>
                      )}
                    </td>
                    <td className="px-8 py-6">
                      {editingStockId === item.id ? (
                        <div className="flex items-center gap-2 animate-in zoom-in-95 duration-300">
                          <button onClick={() => setTempStock((parseInt(tempStock || '0') - 1).toString())} className="w-8 h-8 flex items-center justify-center bg-surface border-2 border-black rounded-lg text-xs font-black hover:bg-black hover:text-white transition-all">-</button>
                          <input 
                            type="text" 
                            className="w-16 bg-white border-2 border-black p-1.5 rounded-lg text-xs font-black outline-none text-center shadow-lg" 
                            value={tempStock} 
                            onChange={e => handleStockInputChange(e.target.value, false, item.id)} 
                          />
                          <button onClick={() => setTempStock((parseInt(tempStock || '0') + 1).toString())} className="w-8 h-8 flex items-center justify-center bg-surface border-2 border-black rounded-lg text-xs font-black hover:bg-black hover:text-white transition-all">+</button>
                          <button onClick={() => { handleUpdateStock(item.id, tempStock); setEditingStockId(null); }} className="p-2 bg-black text-primary rounded-lg ml-1 shadow-md hover:scale-110 transition-transform"><Check size={12} /></button>
                        </div>
                      ) : (
                        <div onClick={() => { setEditingStockId(item.id); setTempStock(item.stock.toString()); }} className="flex items-center gap-3 cursor-pointer group/item">
                          <span className={cn(
                            "text-[10px] font-black px-3 py-1 rounded-xl border-2 transition-all shadow-sm",
                            item.stock === -1 
                              ? "bg-black text-primary border-black rotate-2" 
                              : item.stock === 0 
                                ? "bg-red-50 border-red-200 text-red-600"
                                : "border-black/5 bg-white text-black"
                          )}>{item.stock === -1 ? 'INFINITO' : item.stock}</span>
                          <Edit2 size={10} className="opacity-0 group-hover:opacity-40 transition-opacity text-black" />
                        </div>
                      )}
                    </td>
                    <td className="px-8 py-6 text-right">
                      <button onClick={() => handleDeleteItem(item.id)} className="p-3 text-muted hover:text-red-600 transition-all rounded-2xl hover:bg-red-50 group/del">
                        <Trash2 size={18} className="group-hover/del:scale-110 transition-transform" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Mobile View */}
        <div className="md:hidden space-y-4">
          {(items || []).map((item: any) => (
            <div key={item.id} className="bg-panel rounded-[2.5rem] p-6 relative overflow-hidden transition-all border border-border/50 shadow-xl">
              <div className="flex justify-between items-start mb-4">
                <span className="text-[8px] font-black bg-black text-white px-3 py-1 rounded-full uppercase tracking-widest">{item.item_type}</span>
                <button onClick={() => handleDeleteItem(item.id)} className="text-red-500 p-2.5 rounded-2xl bg-red-50 shadow-sm active:scale-90 transition-all"><Trash2 size={16} /></button>
              </div>
              <div className="text-lg font-black uppercase text-black mb-4 leading-tight">{item.name}</div>
              <div className="grid grid-cols-2 gap-4 pt-4 border-t border-border/30">
                <div onClick={() => { setEditingPriceId(item.id); setTempPrice(item.price.toLocaleString('pt-BR', { minimumFractionDigits: 2 })); }} className="flex flex-col gap-1 cursor-pointer group">
                  <span className="text-[8px] font-black uppercase tracking-[0.15em] text-muted">Preço</span>
                  <span className="text-sm font-black flex items-center gap-2 text-black group-active:text-primary transition-colors">
                    {botConfig.currency_symbol} {item.price.toLocaleString('pt-BR', { minimumFractionDigits: 2 })} 
                    <Edit2 size={10} className="text-muted opacity-40" />
                  </span>
                </div>
                <div onClick={() => { setEditingStockId(item.id); setTempStock(item.stock.toString()); }} className="flex flex-col gap-1 cursor-pointer group">
                  <span className="text-[8px] font-black uppercase tracking-[0.15em] text-muted">Estoque</span>
                  <span className="text-sm font-black flex items-center gap-2 text-black group-active:text-primary transition-colors">
                    {item.stock === -1 ? '∞ INFINITO' : item.stock} 
                    <Edit2 size={10} className="text-muted opacity-40" />
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Creation Modal */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 overflow-y-auto no-scrollbar">
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm animate-fade-in" onClick={() => setIsCreateModalOpen(false)} />
          
          <div className="relative w-full max-w-lg bg-white border-2 border-black rounded-[2rem] shadow-2xl overflow-hidden animate-slide-up no-scrollbar">
            <header className="bg-black p-6 flex justify-between items-center text-primary">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center border-2 border-black shadow-sm">
                  <Plus size={20} className="text-black" />
                </div>
                <div>
                  <h3 className="text-lg font-black uppercase tracking-tight text-white leading-none">Novo Registro</h3>
                  <div className="text-[9px] font-bold text-primary uppercase tracking-[0.2em] mt-1">Configuração de Ativo</div>
                </div>
              </div>
              <button 
                onClick={() => setIsCreateModalOpen(false)}
                className="w-10 h-10 flex items-center justify-center rounded-xl bg-white/5 hover:bg-red-500 hover:text-white transition-all text-white/40"
              >
                <X size={24} />
              </button>
            </header>

            <form 
              onSubmit={async (e) => {
                await handleCreateItem(e);
                setIsCreateModalOpen(false);
                setDisplayNewPrice('0,00');
                setDisplayNewResale('0,00');
                setDisplayNewStock('-1');
              }} 
              className="p-8 space-y-6 max-h-[80vh] overflow-y-auto no-scrollbar bg-surface/30"
            >
              <div className="space-y-6">
                {/* Nome e Descrição */}
                <div className="space-y-4 bg-white border-2 border-black/5 rounded-2xl p-5 shadow-sm">
                  <div className="space-y-1.5">
                    <label className="text-[9px] font-black uppercase tracking-widest text-black/40 ml-1">Nome do Ativo</label>
                    <div className="relative group">
                      <Tag className="absolute left-4 top-1/2 -translate-y-1/2 text-muted group-focus-within:text-black transition-all" size={14} />
                      <input type="text" required placeholder="Ex: Espada Lendária" className="w-full bg-surface border-2 border-transparent rounded-xl p-3 pl-10 text-sm font-black outline-none focus:border-black focus:bg-white transition-all" value={newItem.name} onChange={e => setNewItem({...newItem, name: e.target.value})} />
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[9px] font-black uppercase tracking-widest text-black/40 ml-1">Descrição</label>
                    <div className="relative group">
                      <Info className="absolute left-4 top-4 text-muted group-focus-within:text-black transition-all" size={14} />
                      <textarea placeholder="Para que serve este item?" className="w-full bg-surface border-2 border-transparent rounded-xl p-3 pl-10 text-sm font-bold outline-none focus:border-black focus:bg-white transition-all h-20 resize-none" value={newItem.description} onChange={e => setNewItem({...newItem, description: e.target.value})} />
                    </div>
                  </div>
                </div>

                {/* Preços e Estoque - Destaque Maior */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                   <div className="space-y-1.5 bg-black text-white p-4 rounded-2xl shadow-lg">
                      <label className="text-[9px] font-black uppercase tracking-widest text-primary/60 ml-1">Preço de Venda</label>
                      <div className="relative">
                        <span className="absolute left-0 top-1/2 -translate-y-1/2 text-primary font-black text-lg">{botConfig.currency_symbol}</span>
                        <input 
                          type="text" 
                          required 
                          className="w-full bg-transparent border-b-2 border-primary/20 p-2 pl-8 text-2xl font-black outline-none focus:border-primary transition-all text-white tabular-nums" 
                          value={displayNewPrice} 
                          onChange={e => handlePriceInputChange(e.target.value, true, 'price')} 
                        />
                      </div>
                   </div>
                   <div className="space-y-1.5 bg-white border-2 border-black p-4 rounded-2xl shadow-sm">
                      <label className="text-[9px] font-black uppercase tracking-widest text-black/40 ml-1">Estoque Disponível</label>
                      <div className="relative">
                        <Hash className="absolute left-0 top-1/2 -translate-y-1/2 text-black/20" size={18} />
                        <input 
                          type="text" 
                          required 
                          placeholder="-1 para ∞" 
                          className="w-full bg-transparent border-b-2 border-black/5 p-2 pl-8 text-2xl font-black outline-none focus:border-black transition-all text-black tabular-nums" 
                          value={displayNewStock} 
                          onChange={e => handleStockInputChange(e.target.value, true)} 
                        />
                      </div>
                   </div>
                </div>

                <div className="space-y-1.5 bg-white border-2 border-black/5 p-4 rounded-2xl shadow-sm">
                  <label className="text-[9px] font-black uppercase tracking-widest text-black/40 ml-1">Preço de Revenda (Opcional)</label>
                  <div className="relative flex items-center">
                    <span className="text-black font-black text-sm mr-2">{botConfig.currency_symbol}</span>
                    <input 
                      type="text" 
                      className="w-full bg-surface border-2 border-transparent rounded-lg p-2 text-sm font-black outline-none focus:border-black transition-all" 
                      value={displayNewResale} 
                      onChange={e => handlePriceInputChange(e.target.value, true, 'resale')} 
                    />
                  </div>
                </div>

                {/* Módulo de Ação */}
                <div className="space-y-3">
                   <label className="text-[9px] font-black uppercase tracking-widest text-black/40 ml-1">Módulo de Execução</label>
                   <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                      {['custom', 'ban', 'mute', 'tag', 'block_stickers', 'set_group_name'].map(type => (
                        <button key={type} type="button" onClick={() => setNewItem({...newItem, item_type: type})} className={cn(
                          "py-2.5 rounded-xl text-[8px] font-black uppercase transition-all border-2", 
                          newItem.item_type === type 
                            ? "bg-black text-primary border-black shadow-md" 
                            : "bg-white border-black/5 text-muted hover:border-black/20"
                        )}>
                          {type === 'custom' ? 'PADRÃO' : type.replace(/_/g, ' ')}
                        </button>
                      ))}
                   </div>
                </div>

                {newItem.item_type === 'tag' && (
                  <div className="p-5 bg-primary/10 rounded-2xl border-2 border-primary/20 space-y-3 animate-in slide-in-from-top-2">
                    <div className="text-[9px] font-black uppercase tracking-widest text-black/60">Configurar Cargos</div>
                    <div className="grid grid-cols-2 gap-3">
                      {[{ id: 'tag_member', label: 'Membro' }, { id: 'tag_admin', label: 'Admin' }].map(toggle => {
                        const meta = JSON.parse(newItem.metadata || '{}');
                        const isActive = !!meta[toggle.id];
                        return (
                          <div key={toggle.id} onClick={() => {
                            const nextMeta = { tag_member: toggle.id === 'tag_member' ? !isActive : false, tag_admin: toggle.id === 'tag_admin' ? !isActive : false };
                            setNewItem({ ...newItem, metadata: JSON.stringify(nextMeta) });
                          }} className="flex items-center justify-between p-3 bg-white border-2 border-black rounded-xl cursor-pointer transition-all shadow-sm">
                            <span className={cn("text-[9px] font-black uppercase", isActive ? "text-black" : "text-muted")}>{toggle.label}</span>
                            <div className={cn("w-8 h-5 rounded-full p-0.5 transition-all duration-300", isActive ? "bg-black" : "bg-border")}>
                              <div className={cn("w-3.5 h-3.5 bg-primary rounded-full transition-transform duration-300", isActive ? "translate-x-3" : "translate-x-0")} />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>

              <button type="submit" className="w-full bg-black text-primary py-5 rounded-2xl font-black uppercase text-xs tracking-[0.2em] flex items-center justify-center gap-3 transition-all hover:bg-primary hover:text-black hover:scale-[1.02] active:scale-95 shadow-xl group mt-4">
                Salvar Ativo Digital <Zap size={16} className="group-hover:fill-current" />
              </button>
            </form>
          </div>
        </div>
      )}

      <style>{`
        .no-scrollbar::-webkit-scrollbar { display: none; }
        .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
        .animate-slide-up { animation: slide-up 0.4s cubic-bezier(0.165, 0.84, 0.44, 1); }
        @keyframes slide-up { from { transform: translateY(100px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
      `}</style>
    </div>
  );
}
