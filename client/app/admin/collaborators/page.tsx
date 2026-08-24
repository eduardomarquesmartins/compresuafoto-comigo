"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import api from "@/lib/api";
import { CheckCircle2, Download, Pencil, PlusCircle, ToggleLeft, ToggleRight, Trash2, Users, WalletCards, X } from "lucide-react";

type Collaborator = { id: number; name?: string | null; fullName?: string | null; email: string; collaboratorProfile?: "DESIGNER" | "COMPANY_DEMANDS" | null };
type Service = { id: number; name: string; description?: string | null; value: number; active: boolean; collaboratorId?: number | null; collaborator?: Collaborator | null };
type Completion = { id: number; quantity: number; totalValue: number; unitValue: number; notes?: string | null; completedAt: string; paymentStatus: string; service: Service; collaborator: Collaborator };
type Data = { collaborators: Collaborator[]; services: Service[]; completions: Completion[] };

const money = (value: number) => new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value);
const person = (item: Collaborator) => item.fullName || item.name || item.email;
const currentCompetence = new Date().toISOString().slice(0, 7);
const emptyService = { name: "", description: "", value: "" };

export default function CollaboratorsPage() {
  const [data, setData] = useState<Data>({ collaborators: [], services: [], completions: [] });
  const [tab, setTab] = useState<"payments" | "services" | "closing">("payments");
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [competence, setCompetence] = useState(currentCompetence);
  const [message, setMessage] = useState("");
  const [form, setForm] = useState(emptyService);
  const [editing, setEditing] = useState<Service | null>(null);
  const [saving, setSaving] = useState(false);
  const [closingForm, setClosingForm] = useState({ serviceId: "", quantity: "1", notes: "", additionalClauses: "", closingDate: new Date().toISOString().slice(0, 10) });

  const load = async () => {
    try {
      const result = await api.get<Data>("/collaborators/admin");
      setData(result.data);
      setSelectedId(current => current ?? result.data.collaborators[0]?.id ?? null);
    } catch { setMessage("Não foi possível carregar os dados de colaboradores."); }
  };
  useEffect(() => { load(); }, []);

  const pending = useMemo(() => data.completions.filter(item => item.paymentStatus === "PENDING"), [data]);
  const pendingTotal = pending.reduce((total, item) => total + item.totalValue, 0);
  const selected = data.collaborators.find(item => item.id === selectedId);
  const services = data.services.filter(item => item.collaboratorId === selectedId);
  const activeServices = services.filter(item => item.active);
  const monthCompletions = data.completions.filter(item => item.collaborator.id === selectedId && item.completedAt.slice(0, 7) === competence);
  const monthTotal = monthCompletions.reduce((total, item) => total + item.totalValue, 0);

  const createService = async (event: FormEvent) => {
    event.preventDefault(); setSaving(true);
    try { await api.post("/collaborators/admin/services", { ...form, collaboratorId: selectedId, value: Number(form.value) }); setForm(emptyService); setMessage("Serviço adicionado ao catálogo."); await load(); }
    catch (error: any) { setMessage(error.response?.data?.error || "Não foi possível salvar o serviço."); }
    finally { setSaving(false); }
  };
  const updateService = async (event: FormEvent) => {
    event.preventDefault(); if (!editing) return; setSaving(true);
    try { await api.patch(`/collaborators/admin/services/${editing.id}`, { name: editing.name, description: editing.description, value: Number(editing.value), active: editing.active }); setEditing(null); setMessage("Serviço atualizado."); await load(); }
    catch { setMessage("Não foi possível atualizar o serviço."); } finally { setSaving(false); }
  };
  const toggle = async (service: Service) => {
    try { await api.patch(`/collaborators/admin/services/${service.id}`, { active: !service.active }); setMessage(service.active ? "Serviço desativado." : "Serviço ativado."); load(); }
    catch { setMessage("Não foi possível alterar a disponibilidade."); }
  };
  const pay = async (id: number) => {
    try { await api.patch(`/collaborators/admin/completions/${id}/pay`); setMessage("Pagamento confirmado."); load(); }
    catch { setMessage("Não foi possível confirmar o pagamento."); }
  };
  const addToClosing = async (event: FormEvent) => {
    event.preventDefault(); if (!selectedId) return; setSaving(true);
    try {
      await api.post("/collaborators/admin/completions", { collaboratorId: selectedId, serviceId: Number(closingForm.serviceId), quantity: Number(closingForm.quantity), notes: closingForm.notes, completedAt: `${competence}-01T12:00:00` });
      setClosingForm(current => ({ ...current, serviceId: "", quantity: "1", notes: "" })); setMessage("Serviço incluído no fechamento mensal."); await load();
    } catch (error: any) { setMessage(error.response?.data?.error || "Não foi possível incluir o serviço."); }
    finally { setSaving(false); }
  };
  const removeFromClosing = async (id: number) => {
    if (!window.confirm("Remover este serviço do fechamento?")) return;
    try { await api.delete(`/collaborators/admin/completions/${id}`); setMessage("Serviço removido do fechamento."); await load(); }
    catch (error: any) { setMessage(error.response?.data?.error || "Não foi possível remover o serviço."); }
  };
  const generateContract = async () => {
    if (!selectedId) return; setSaving(true);
    try {
      const response = await api.post("/collaborators/admin/monthly-contract", { collaboratorId: selectedId, competence, additionalClauses: closingForm.additionalClauses, closingDate: closingForm.closingDate }, { responseType: "blob" });
      const url = URL.createObjectURL(new Blob([response.data], { type: "application/pdf" }));
      const link = document.createElement("a"); link.href = url; link.download = `fechamento-${competence}.pdf`; link.click(); URL.revokeObjectURL(url);
      setMessage("Contrato mensal gerado.");
    } catch (error: any) { setMessage(error.response?.data?.error || "Não foi possível gerar o contrato."); }
    finally { setSaving(false); }
  };

  return <div className="admin-page-stack max-w-7xl mx-auto">
    <section className="admin-card p-5 md:p-6"><p className="admin-kicker">Gestão de equipe</p><h1 className="mt-2 text-4xl font-semibold tracking-[-.065em] text-white md:text-5xl">Colaboradores</h1></section>
    <section className="grid gap-4 md:grid-cols-3"><Metric icon={<Users />} label="Colaboradores" value={String(data.collaborators.length)} /><Metric icon={<WalletCards />} label="Pendente de pagamento" value={money(pendingTotal)} /><Metric icon={<CheckCircle2 />} label="Lançamentos" value={String(data.completions.length)} /></section>
    {message && <p className="rounded-xl border border-blue-400/20 bg-blue-500/10 p-4 text-sm text-blue-100">{message}</p>}
    <section className="admin-card overflow-hidden p-0">
      <div className="flex flex-wrap border-b border-white/10">{([['payments', `Pagamentos pendentes (${pending.length})`], ['services', 'Serviços por colaborador'], ['closing', 'Fechamento mensal']] as const).map(([id, label]) => <button key={id} onClick={() => setTab(id)} className={`px-5 py-4 text-sm font-semibold ${tab === id ? 'border-b-2 border-blue-400 text-white' : 'text-slate-400'}`}>{label}</button>)}</div>
      {tab === "payments" && <div className="divide-y divide-white/10">{pending.length === 0 ? <p className="p-8 text-slate-400">Nenhum pagamento pendente.</p> : pending.map(item => <div className="flex flex-col gap-4 p-5 md:flex-row md:items-center md:justify-between" key={item.id}><div><p className="font-semibold text-white">{person(item.collaborator)}</p><p className="mt-1 text-sm text-slate-400">{item.service.name} × {item.quantity} · {new Date(item.completedAt).toLocaleDateString('pt-BR')}</p></div><div className="flex items-center gap-4"><p className="font-bold text-white">{money(item.totalValue)}</p><button onClick={() => pay(item.id)} className="admin-primary-button">Marcar como pago</button></div></div>)}</div>}
      {tab !== "payments" && <div className="p-5"><CollaboratorPicker collaborators={data.collaborators} services={data.services} selectedId={selectedId} setSelectedId={setSelectedId} />
        {tab === "services" && selected && <div className="grid gap-6 xl:grid-cols-[1fr_.8fr]"><section className="p-5"><div className="mb-4"><p className="text-sm font-semibold text-white">Serviços de {person(selected)}</p><p className="mt-1 text-xs text-slate-500">Edite valores e disponibilidade do catálogo individual.</p></div><div className="overflow-hidden rounded-xl border border-white/10">{services.length === 0 ? <p className="p-6 text-sm text-slate-400">Nenhum serviço cadastrado para esta pessoa.</p> : services.map(service => <div key={service.id} className="flex items-center justify-between gap-4 border-b border-white/10 p-4 last:border-0"><div><p className="font-medium text-white">{service.name}</p><p className="mt-1 text-sm text-slate-500">{service.description || 'Sem descrição'}</p><span className={`mt-2 inline-block text-xs ${service.active ? 'text-emerald-300' : 'text-amber-300'}`}>{service.active ? 'Disponível' : 'Desativado'}</span></div><div className="flex items-center gap-2"><strong className="mr-2 text-white">{money(service.value)}</strong><button onClick={() => setEditing({ ...service })} className="rounded-lg p-2 text-blue-300 hover:bg-blue-500/10" aria-label="Editar serviço"><Pencil size={17} /></button><button onClick={() => toggle(service)} className="rounded-lg p-2 text-slate-300 hover:bg-white/10" aria-label="Alterar disponibilidade">{service.active ? <ToggleRight size={20} /> : <ToggleLeft size={20} />}</button></div></div>)}</div></section><form onSubmit={createService} className="h-fit rounded-xl border border-white/10 bg-black/20 p-5 space-y-3"><p className="text-sm font-semibold text-white">Adicionar serviço para {person(selected)}</p><input required placeholder="Nome do serviço" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} className="input" /><input required min="0" step="0.01" type="number" placeholder="Valor (R$)" value={form.value} onChange={e => setForm({ ...form, value: e.target.value })} className="input" /><textarea placeholder="Descrição (opcional)" value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} className="input min-h-20" /><button disabled={saving} className="admin-primary-button w-full justify-center"><PlusCircle size={17} />Adicionar serviço</button></form></div>}
        {tab === "closing" && selected && <div className="grid gap-6 xl:grid-cols-[1.25fr_.75fr]"><section className="rounded-xl border border-white/10"><div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/10 p-5"><div><p className="font-semibold text-white">Serviços de {person(selected)}</p><p className="mt-1 text-sm text-slate-400">Competência selecionada: {competence}</p></div><strong className="text-lg text-white">{money(monthTotal)}</strong></div><div className="divide-y divide-white/10">{monthCompletions.length === 0 ? <p className="p-6 text-sm text-slate-400">Inclua os serviços realizados para montar este fechamento.</p> : monthCompletions.map(item => <div className="flex items-center justify-between gap-4 p-4" key={item.id}><div><p className="font-medium text-white">{item.service.name} × {item.quantity}</p><p className="mt-1 text-xs text-slate-500">{item.notes || 'Sem observações'} · {item.paymentStatus === 'PAID' ? 'Pago' : 'Pendente'}</p></div><div className="flex items-center gap-3"><strong className="text-white">{money(item.totalValue)}</strong>{item.paymentStatus !== 'PAID' && <button onClick={() => removeFromClosing(item.id)} className="rounded-lg p-2 text-red-300 hover:bg-red-500/10" aria-label="Remover do fechamento"><Trash2 size={17} /></button>}</div></div>)}</div></section><div className="space-y-5"><form onSubmit={addToClosing} className="rounded-xl border border-white/10 bg-black/20 p-5 space-y-5"><p className="font-semibold text-white">Adicionar serviço ao mês</p><label className="block text-xs text-slate-400">Competência<input type="month" value={competence} onChange={e => setCompetence(e.target.value)} className="input mt-2" /></label><label className="block text-xs text-slate-400">Serviço<select required value={closingForm.serviceId} onChange={e => setClosingForm({ ...closingForm, serviceId: e.target.value })} className="input mt-2"><option value="">Selecione um serviço</option>{activeServices.map(service => <option key={service.id} value={service.id}>{service.name} — {money(service.value)}</option>)}</select></label><label className="block text-xs text-slate-400">Quantidade<input type="number" min="1" required value={closingForm.quantity} onChange={e => setClosingForm({ ...closingForm, quantity: e.target.value })} className="input mt-2" /></label><textarea value={closingForm.notes} onChange={e => setClosingForm({ ...closingForm, notes: e.target.value })} className="input min-h-20" placeholder="Observação (opcional)" /><button disabled={saving || !activeServices.length} className="admin-primary-button w-full justify-center"><PlusCircle size={17} />Incluir no fechamento</button></form><div className="rounded-xl border border-white/10 p-5 space-y-3"><p className="font-semibold text-white">Gerar contrato mensal</p><p className="text-sm text-slate-400">O PDF inclui o contratante, colaborador, serviços, quantidades, valores, total e cláusulas do fechamento.</p><label className="block text-xs text-slate-400">Data de fechamento do contrato<input type="date" value={closingForm.closingDate} onChange={e => setClosingForm({ ...closingForm, closingDate: e.target.value })} className="input mt-2" /></label><textarea value={closingForm.additionalClauses} onChange={e => setClosingForm({ ...closingForm, additionalClauses: e.target.value })} className="input min-h-24" placeholder="Cláusulas ou observações adicionais (opcional)" /><button disabled={saving || !monthCompletions.length} onClick={generateContract} className="admin-primary-button w-full justify-center"><Download size={17} />Gerar contrato de {competence}</button></div></div></div>}
      </div>}
    </section>
    {editing && <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"><form onSubmit={updateService} className="admin-card w-full max-w-lg p-6"><div className="mb-5 flex items-center justify-between"><div><p className="admin-kicker">Editar serviço</p><h2 className="mt-1 text-xl font-semibold text-white">{editing.name}</h2></div><button type="button" onClick={() => setEditing(null)} className="rounded-lg p-2 text-slate-400 hover:bg-white/10"><X size={18} /></button></div><div className="space-y-4"><input required value={editing.name} onChange={e => setEditing({ ...editing, name: e.target.value })} className="input" /><input required min="0" step="0.01" type="number" value={editing.value} onChange={e => setEditing({ ...editing, value: Number(e.target.value) })} className="input" /><textarea value={editing.description || ''} onChange={e => setEditing({ ...editing, description: e.target.value })} className="input min-h-24" /><label className="flex items-center gap-3 text-sm text-slate-300"><input type="checkbox" checked={editing.active} onChange={e => setEditing({ ...editing, active: e.target.checked })} />Disponível para o colaborador</label><button disabled={saving} className="admin-primary-button w-full justify-center">Salvar alterações</button></div></form></div>}
    <style jsx global>{`.input{width:100%;border-radius:.75rem;border:1px solid rgba(255,255,255,.1);background:rgba(0,0,0,.25);padding:.75rem;color:white;outline:none}.input:focus{border-color:rgba(96,165,250,.7)}.input option{background:#111827;color:#fff}`}</style>
  </div>;
}

function CollaboratorPicker({ collaborators, services, selectedId, setSelectedId }: { collaborators: Collaborator[]; services: Service[]; selectedId: number | null; setSelectedId: (id: number) => void }) {
  return <div className="mb-6 grid gap-3 md:grid-cols-2">{collaborators.map(item => <button key={item.id} onClick={() => setSelectedId(item.id)} className={`rounded-2xl border p-4 text-left transition ${selectedId === item.id ? 'border-blue-400 bg-blue-500/10' : 'border-white/10 bg-black/15 hover:border-white/30'}`}><p className="font-semibold text-white">{person(item)}</p><p className="mt-1 text-sm text-slate-400">{item.collaboratorProfile === 'DESIGNER' ? 'Designer' : 'Demandas da empresa'} · {services.filter(service => service.collaboratorId === item.id).length} serviços</p></button>)}</div>;
}
function Metric({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) { return <div className="admin-card p-5"><div className="text-blue-300">{icon}</div><p className="mt-4 text-sm text-slate-400">{label}</p><p className="mt-1 text-2xl font-bold text-white">{value}</p></div>; }
