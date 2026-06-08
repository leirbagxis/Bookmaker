import { Palette, MessageSquare, Zap, Plus, ChevronRight, Hash, Info, Menu, Trash2 } from 'lucide-react';
import { DEFAULT_COMMANDS } from './constants';
import { adminUpdateConfig } from '../../api';
import { showToast } from '../Toast';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: any[]) {
  return twMerge(clsx(inputs));
}

interface BotTabProps {
  activeBotSubTab: 'commands' | 'buttons';
  setActiveBotSubTab: (tab: 'commands' | 'buttons') => void;
  botConfig: any;
  setBotConfig: (config: any) => void;
  editingBtnId: string | null;
  setEditingBtnId: (id: string | null) => void;
  isMoveMode: boolean;
  setIsMoveMode: (mode: boolean) => void;
  selectedBtnForMove: string | null;
  setSelectedBtnForMove: (id: string | null) => void;
  botId: string | undefined;
  lastSavedCommands: string;
  setLastSavedCommands: (cmds: string) => void;
  setIsLoading: (loading: boolean) => void;
}

export default function BotTab({
  activeBotSubTab,
  setActiveBotSubTab,
  botConfig,
  setBotConfig,
  editingBtnId,
  setEditingBtnId,
  isMoveMode,
  setIsMoveMode,
  selectedBtnForMove,
  setSelectedBtnForMove,
  botId,
  lastSavedCommands,
  setLastSavedCommands,
  setIsLoading
}: BotTabProps) {
  let allCommands: any[] = [];
  try {
    allCommands = JSON.parse(botConfig.commands || '[]');
  } catch(e) {}

  const commands = [
    ...allCommands.filter(c => (c.action || 'send') === (activeBotSubTab === 'commands' ? 'send' : 'edit')),
    ...DEFAULT_COMMANDS.filter(d => (d.action || 'send') === (activeBotSubTab === 'commands' ? 'send' : 'edit'))
      .filter(d => !allCommands.some(c => c.trigger === d.trigger))
  ];

  const updateCommand = (id: string, fields: any) => {
    setBotConfig((prev: any) => {
      const current = JSON.parse(prev.commands || '[]');
      const exists = current.some((c: any) => c.id === id);
      let next = exists 
        ? current.map((c: any) => c.id === id ? { ...c, ...fields } : c) 
        : [...current, { ...DEFAULT_COMMANDS.find(d => d.id === id), ...fields }];
      return { ...prev, commands: JSON.stringify(next) };
    });
  };

  const deleteCommand = (id: string) => {
    setBotConfig((prev: any) => ({
      ...prev,
      commands: JSON.stringify(JSON.parse(prev.commands || '[]').filter((c: any) => c.id !== id))
    }));
  };

  const saveAll = async () => {
    setIsLoading(true);
    try {
      await adminUpdateConfig(botId!, botConfig);
      setLastSavedCommands(botConfig.commands);
      showToast.success("UI Sincronizada!");
    } catch (e) {
      showToast.error("Erro");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col xl:flex-row gap-10 items-start animate-in fade-in duration-500">
      <aside className="w-full xl:w-80 shrink-0 space-y-4 xl:sticky xl:top-8 transition-all">
        <div className="bg-black text-white p-8 lg:p-10 rounded-[2rem] border border-white/10 shadow-3xl relative overflow-hidden group/side transition-all hover:shadow-md">
          <Palette size={100} className="absolute -top-6 -right-6 opacity-5 group-hover/side:rotate-[-20deg] transition-transform duration-1000" />
          <h4 className="text-[10px] font-black uppercase tracking-[0.2em] mb-10 flex items-center gap-2.5 relative z-10 text-primary animate-pulse">
            <Palette size={18} /> UI Compiler
          </h4>
          <nav className="space-y-2 relative z-10">
            <button
              onClick={() => setActiveBotSubTab('commands')}
              className={cn(
                "w-full flex items-center gap-4 p-4 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all duration-500 border-2",
                activeBotSubTab === 'commands' ? "bg-primary text-black border-primary shadow-2xl scale-105" : "bg-white/5 border-transparent text-white/40 hover:bg-white/10"
              )}
            >
              <MessageSquare size={16} /> Mensagens
            </button>
            <button
              onClick={() => setActiveBotSubTab('buttons')}
              className={cn(
                "w-full flex items-center gap-4 p-4 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all duration-500 border-2",
                activeBotSubTab === 'buttons' ? "bg-primary text-black border-primary shadow-2xl scale-105" : "bg-white/5 border-transparent text-white/40 hover:bg-white/10"
              )}
            >
              <Zap size={16} /> Callbacks
            </button>
          </nav>
          <div className="mt-10 pt-8 border-t border-white/10 relative z-10">
            <button
              onClick={() => {
                const id = `cmd_${Math.random().toString(36).substr(2, 9)}`;
                const isCallback = activeBotSubTab === 'buttons';
                setBotConfig((prev: any) => {
                  const current = JSON.parse(prev.commands || '[]');
                  const next = [...current, { 
                    id, 
                    trigger: isCallback ? 'id_acao' : '/cmd', 
                    text: 'Mensagem...', 
                    buttons: [[]], 
                    action: isCallback ? 'edit' : 'send' 
                  }];
                  return { ...prev, commands: JSON.stringify(next) };
                });
                setEditingBtnId(id);
              }}
              className="w-full h-12 bg-white text-black hover:bg-primary border-2 border-border hover:border-primary font-black uppercase px-6 py-2 text-[9px] tracking-widest rounded-full transition-all active:scale-95 disabled:opacity-50 flex items-center justify-center gap-2 shadow-xl group/btn"
            >
              <Plus size={16} className="group-hover/btn:rotate-90 transition-transform duration-500 mr-2" /> Novo Registro
            </button>
          </div>
        </div>
      </aside>

      <main className="flex-1 space-y-4 w-full animate-in slide-in-from-right-4 duration-700">
        <div className="space-y-4">
          {commands.map((cmd) => (
            <div 
              key={cmd.id} 
              className={cn(
                "bg-panel rounded-[2rem] shadow-sm p-0 overflow-hidden border-2 transition-all duration-500",
                editingBtnId === cmd.id ? "border-black shadow-2xl" : "border-transparent hover:border-black/10"
              )}
            >
              <div 
                onClick={() => setEditingBtnId(editingBtnId === cmd.id ? null : cmd.id)} 
                className="p-6 flex items-center justify-between cursor-pointer hover:bg-surface group/item"
              >
                <div className="flex items-center gap-4">
                  <div className={cn(
                    "w-12 h-12 flex items-center justify-center rounded-2xl font-black text-xs border-2 transition-all duration-700",
                    cmd.trigger?.startsWith('/') ? "bg-black text-primary border-black shadow-lg" : "bg-surface border-border text-black shadow-inner"
                  )}>
                    {cmd.trigger?.startsWith('/') ? '/' : 'CB'}
                  </div>
                  <div className="min-w-0">
                    <div className="text-sm font-black uppercase truncate text-black flex items-center gap-2">
                      {cmd.trigger} 
                      <ChevronRight size={12} className="text-muted group-hover/item:translate-x-1 transition-transform" />
                    </div>
                    <div className="text-[8px] font-bold text-muted uppercase mt-1 tracking-widest">
                      {DEFAULT_COMMANDS.some(d => d.id === cmd.id) ? 'SISTEMA' : 'CUSTOM'}
                    </div>
                  </div>
                </div>
                <ChevronRight size={22} className={cn("transition-all duration-700 text-muted group-hover/item:text-black", editingBtnId === cmd.id ? "rotate-90 scale-125" : "")} />
              </div>

              {editingBtnId === cmd.id && (
                <div className="p-8 lg:p-10 bg-surface border-t-2 border-border/50 space-y-10 animate-in slide-in-from-top-4 duration-700">
                  <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
                    <div>
                      <label className="text-[10px] font-bold uppercase tracking-[0.15em] text-muted mb-xs block text-[9px] mb-2">Gatilho ID</label>
                      <div className="relative group/in">
                        <Hash className="absolute left-3 top-1/2 -translate-y-1/2 text-muted group-focus-within/in:text-black transition-colors" size={14} />
                        <input 
                          value={cmd.trigger} 
                          onChange={e => updateCommand(cmd.id, { trigger: e.target.value })} 
                          className="w-full bg-panel border border-border p-3 pl-9 rounded-xl text-[11px] font-black outline-none focus:border-black transition-all focus:bg-white shadow-inner" 
                        />
                      </div>
                    </div>
                    <div className="lg:col-span-3">
                      <label className="text-[10px] font-bold uppercase tracking-[0.15em] text-muted mb-xs block text-[9px] mb-2">Payload Mensagem</label>
                      <div className="relative group/in">
                        <Info className="absolute left-3 top-4 text-muted group-focus-within/in:text-black transition-colors" size={14} />
                        <textarea 
                          value={cmd.text} 
                          onChange={e => updateCommand(cmd.id, { text: e.target.value })} 
                          className="w-full bg-panel border border-border p-3 pl-9 rounded-xl text-[11px] font-bold outline-none focus:border-black transition-all min-h-[120px] resize-none shadow-inner focus:bg-white" 
                        />
                        <div className="flex flex-wrap gap-1.5 mt-3">
                          {['$user_name', '$user_id', '$user_saldo', '$bot_name'].map(v => (
                            <button key={v} onClick={() => updateCommand(cmd.id, { text: cmd.text + v })} className="text-[8px] font-black px-3 py-1.5 bg-white border border-border rounded-xl hover:bg-black hover:text-white transition-all shadow-sm active:scale-95 uppercase">{v}</button>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-6">
                    <div className="flex items-center justify-between border-b pb-4">
                      <div className="flex items-center gap-2">
                        <Menu size={16} className="text-black" />
                        <label className="text-[10px] font-bold uppercase tracking-[0.15em] text-muted mb-xs block mb-0 text-[10px] tracking-[0.2em]">Interface Flow</label>
                      </div>
                      <button 
                        onClick={() => setIsMoveMode(!isMoveMode)} 
                        className={cn(
                          "px-4 py-1.5 rounded-xl text-[9px] font-black uppercase border-2 transition-all duration-500 shadow-lg",
                          isMoveMode ? "bg-black text-primary border-black scale-105" : "border-border text-muted hover:border-black"
                        )}
                      >
                        {isMoveMode ? 'FIXAR' : 'EDITAR'}
                      </button>
                    </div>

                    <div className="space-y-4 bg-panel/20 p-8 lg:p-10 rounded-[3rem] border-2 border-dashed border-border/50 relative overflow-hidden transition-all duration-700">
                      {(() => {
                        const cmdRows = cmd.buttons || [[]];
                        const displayRows = [[], [], []].map((_, i) => cmdRows[i] || []);
                        
                        const moveBtn = (btnId: string, targetIdx: number) => {
                          const all = cmdRows.flat();
                          const b = all.find((x: any) => x.id === btnId);
                          if (!b) return;
                          const cleaned = cmdRows.map((r: any[]) => r.filter((x: any) => x.id !== btnId));
                          while (cleaned.length <= targetIdx) cleaned.push([]);
                          cleaned[targetIdx].push(b);
                          updateCommand(cmd.id, { buttons: cleaned.filter((r: any[]) => r.length > 0 || r === cleaned[0]) });
                          setSelectedBtnForMove(null);
                        };

                        return (
                          <div className="space-y-3 relative z-10">
                            {displayRows.map((row, rowIdx) => (
                              <div 
                                key={rowIdx} 
                                onDragOver={(e) => e.preventDefault()} 
                                onDrop={(e) => { 
                                  e.preventDefault(); 
                                  const btnId = e.dataTransfer.getData('text/plain'); 
                                  moveBtn(btnId, rowIdx); 
                                }} 
                                className={cn(
                                  "min-h-[90px] p-3 border-2 border-dashed rounded-[2.5rem] flex flex-wrap gap-3 items-center justify-center transition-all duration-700",
                                  row.length > 0 ? "bg-white/50 shadow-lg" : "bg-panel/10 border-transparent",
                                  selectedBtnForMove ? "border-primary bg-primary/10 ring-4 ring-primary/5" : "hover:bg-white/40"
                                )}
                              >
                                {row.length === 0 && !selectedBtnForMove && <div className="text-[8px] font-black uppercase text-muted tracking-[0.3em] opacity-25">Layer Vazio</div>}
                                {row.map((btn: any) => (
                                  <div 
                                    key={btn.id} 
                                    draggable 
                                    onDragStart={(e) => { e.dataTransfer.setData('text/plain', btn.id); }} 
                                    onClick={() => isMoveMode && setSelectedBtnForMove(selectedBtnForMove === btn.id ? null : btn.id)} 
                                    className={cn(
                                      "flex-1 min-w-[130px] max-w-[200px] bg-white border-2 rounded-2xl p-3.5 transition-all duration-500 cursor-grab active:cursor-grabbing shadow-xl shadow-black/5 relative group/bitem overflow-hidden",
                                      selectedBtnForMove === btn.id ? "border-black scale-[1.05] z-20 shadow-2xl ring-4 ring-black/5" : "border-border hover:border-black hover:translate-y-[-2px]"
                                    )}
                                  >
                                    <div className="absolute top-0 left-0 w-1 h-full bg-black opacity-0 group-hover/bitem:opacity-100 transition-opacity duration-500" />
                                    {!isMoveMode ? (
                                      <div className="space-y-3 animate-in zoom-in-95 duration-500">
                                        <div className="flex gap-2">
                                          <input value={btn.text} onChange={e => updateCommand(cmd.id, { buttons: cmdRows.map((r: any[]) => r.map((x: any) => x.id === btn.id ? { ...x, text: e.target.value } : x)) })} className="w-full bg-black text-primary text-[9px] font-black uppercase p-2 rounded-xl outline-none focus:ring-4 ring-primary/20 transition-all duration-500 shadow-md" />
                                          <button onClick={() => updateCommand(cmd.id, { buttons: cmdRows.map((r: any[]) => r.filter((x: any) => x.id !== btn.id)).filter((r: any[]) => r.length > 0 || r === cmdRows[0]) })} className="text-muted hover:text-red-500 transition-colors p-1.5 hover:rotate-12 duration-300"><Trash2 size={14} /></button>
                                        </div>
                                        <div className="grid grid-cols-1 gap-1.5">
                                          <select value={btn.type || 'callback'} onChange={e => updateCommand(cmd.id, { buttons: cmdRows.map((r: any[]) => r.map((x: any) => x.id === btn.id ? { ...x, type: e.target.value } : x)) })} className="bg-panel border rounded-lg px-2 py-1 text-[7px] font-black uppercase outline-none focus:bg-white transition-all shadow-inner"><option value="callback">AÇÃO</option><option value="url">URL</option><option value="webapp">APP</option></select>
                                          <input value={btn.type === 'url' || btn.type === 'webapp' ? (btn.url || '') : (btn.data || '')} onChange={e => updateCommand(cmd.id, { buttons: cmdRows.map((r: any[]) => r.map((x: any) => x.id === btn.id ? (btn.type === 'url' || btn.type === 'webapp' ? { ...x, url: e.target.value } : { ...x, data: e.target.value }) : x)) })} className="bg-white border rounded-lg px-2 py-1 text-[7px] font-bold outline-none focus:border-black transition-all shadow-inner" placeholder="IDENTIFICADOR" />
                                        </div>
                                      </div>
                                    ) : (
                                      <div className="text-[10px] font-black uppercase text-center py-4 flex items-center justify-center gap-2.5 text-black tracking-widest">
                                        <div className="w-7 h-7 rounded-lg bg-black/5 flex items-center justify-center transition-all duration-500 group-hover/bitem:bg-black group-hover/bitem:text-primary"><Menu size={12} /></div>
                                        {btn.text}
                                      </div>
                                    )}
                                  </div>
                                ))}
                              </div>
                            ))}
                            <div className="pt-8 flex justify-center">
                              <button 
                                type="button" 
                                onClick={() => { 
                                  const bId = `b_${Math.random().toString(36).substr(2, 5)}`; 
                                  const n = [...(cmd.buttons || [[]])]; 
                                  n[0] = [...(n[0] || []), { id: bId, text: 'BOTÃO', type: 'callback', data: '0' }]; 
                                  updateCommand(cmd.id, { buttons: n }); 
                                }} 
                                className="h-12 bg-primary text-black font-black uppercase px-8 text-[9px] tracking-[0.2em] rounded-full transition-all hover:scale-110 active:scale-95 shadow-2xl shadow-primary/20 flex items-center justify-center"
                              >
                                <Plus size={16} className="mr-2" /> ACOPLAR NÓ
                              </button>
                            </div>
                          </div>
                        );
                      })()}
                    </div>
                  </div>

                  <div className="flex gap-4 pt-8 border-t-2 border-border/50">
                    <button 
                      onClick={saveAll} 
                      className="h-14 bg-primary text-black font-black uppercase px-10 text-xs tracking-widest rounded-full transition-all hover:-translate-y-1.5 active:scale-95 shadow-3xl shadow-primary/20 flex items-center justify-center"
                    >
                      SALVAR
                    </button>
                    <button 
                      onClick={() => { 
                        try { 
                          const s = JSON.parse(lastSavedCommands).find((c: any) => c.id === cmd.id); 
                          if (s) updateCommand(cmd.id, { trigger: s.trigger, text: s.text, buttons: s.buttons }); 
                        } catch(e) {} 
                      }} 
                      className="text-[10px] font-black uppercase px-6 py-2 border-2 border-border rounded-xl hover:border-black transition-all duration-500"
                    >
                      REVERTER
                    </button>
                    {!DEFAULT_COMMANDS.some(d => d.id === cmd.id) && (
                      <button onClick={() => deleteCommand(cmd.id)} className="ml-auto text-[10px] font-black uppercase text-muted hover:text-red-500 transition-colors duration-300">EXCLUIR</button>
                    )}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}
