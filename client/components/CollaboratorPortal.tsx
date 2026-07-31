"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import api from "@/lib/api";
import { ArrowUpRight, Check, ClipboardList, LogOut, Plus, Trash2, Wallet } from "lucide-react";

type Service = { id: number; name: string; description?: string | null; value: number };
type Completion = { id: number; quantity: number; totalValue: number; notes?: string | null; completedAt: string; paymentStatus: string; service: Service };
const money = (value: number) => new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value);

export default function CollaboratorPortal({ role, title }: { role: "DESIGNER" | "DEMANDAS"; title: string }) {
    const router = useRouter();
    const [services, setServices] = useState<Service[]>([]);
    const [completions, setCompletions] = useState<Completion[]>([]);
    const [pendingTotal, setPendingTotal] = useState(0);
    const [serviceId, setServiceId] = useState("");
    const [quantity, setQuantity] = useState(1);
    const [notes, setNotes] = useState("");
    const [message, setMessage] = useState("");
    const [saving, setSaving] = useState(false);
    const [userName, setUserName] = useState("");
    const selected = useMemo(() => services.find(service => service.id === Number(serviceId)), [services, serviceId]);

    const load = async () => {
        try {
            const user = JSON.parse(localStorage.getItem("user") || "{}");
            setUserName(user.fullName || user.name || "");
            const permitted = user.role === role || (user.role === "COLLABORATOR" && (role === "DESIGNER" ? user.collaboratorProfile === "DESIGNER" : user.collaboratorProfile === "COMPANY_DEMANDS"));
            if (!permitted) return router.replace("/login");
            const { data } = await api.get("/collaborators/portal");
            setServices(data.services); setCompletions(data.completions); setPendingTotal(data.pendingTotal);
            if (data.services[0]) setServiceId(String(data.services[0].id));
        } catch { setMessage("Não foi possível carregar seus serviços."); }
    };
    useEffect(() => { load(); }, []);
    const submit = async (event: FormEvent) => {
        event.preventDefault(); setSaving(true); setMessage("");
        try { await api.post("/collaborators/portal/completions", { serviceId: Number(serviceId), quantity, notes }); setQuantity(1); setNotes(""); setMessage("Lançamento enviado para aprovação."); await load(); }
        catch (error: any) { setMessage(error.response?.data?.error || "Não foi possível registrar o serviço."); }
        finally { setSaving(false); }
    };
    const logout = () => { localStorage.removeItem("token"); localStorage.removeItem("user"); router.push("/login"); };
    const removeCompletion = async (id: number) => {
        if (!confirm("Remover este lançamento pendente?")) return;
        try { await api.delete(`/collaborators/portal/completions/${id}`); setMessage("Lançamento removido."); await load(); }
        catch (error: any) { setMessage(error.response?.data?.error || "Não foi possível remover o lançamento."); }
    };

    return <main className="min-h-screen bg-white px-4 py-5 text-zinc-950 md:px-8 md:py-8"><div className="mx-auto max-w-6xl">
        <header className="flex flex-col justify-between gap-5 border-b border-zinc-200 pb-7 sm:flex-row sm:items-start"><div><h1 className="text-4xl font-semibold tracking-[-.07em] md:text-5xl">{userName ? `Olá, ${userName}` : title}</h1><p className="mt-3 max-w-lg text-base text-zinc-500">Registre o trabalho concluído e acompanhe os valores enviados para pagamento.</p></div><button onClick={logout} className="inline-flex items-center gap-2 self-start rounded-lg border border-zinc-200 px-3.5 py-2 text-sm font-medium transition hover:border-zinc-950 hover:bg-zinc-950 hover:text-white"><LogOut size={15}/>Sair</button></header>
        <section className="grid border-x border-t border-zinc-200 sm:grid-cols-3"><Metric icon={<Wallet size={18}/>} label="A receber" value={money(pendingTotal)} emphasis/><Metric icon={<ClipboardList size={18}/>} label="Lançamentos" value={String(completions.length)}/><Metric icon={<Check size={18}/>} label="Serviços disponíveis" value={String(services.length)}/></section>
        <div className="grid border border-zinc-200 lg:grid-cols-[.9fr_1.1fr]"><section className="border-b border-zinc-200 p-5 md:p-7 lg:border-b-0 lg:border-r"><div className="flex items-center justify-between"><div><p className="text-xs font-semibold uppercase tracking-[.14em] text-zinc-500">Novo registro</p><h2 className="mt-1 text-2xl font-semibold tracking-[-.05em]">Lançar serviço</h2></div><ArrowUpRight size={22}/></div><form onSubmit={submit} className="mt-7 space-y-5"><Field label="Serviço"><select required value={serviceId} onChange={e => setServiceId(e.target.value)} className="portal-input">{services.length === 0 && <option value="">Nenhum serviço cadastrado</option>}{services.map(service => <option key={service.id} value={service.id}>{service.name} — {money(service.value)}</option>)}</select></Field><Field label="Quantidade"><input min="1" type="number" value={quantity} onChange={e => setQuantity(Number(e.target.value))} className="portal-input"/></Field>{selected && <div className="flex items-center justify-between border-y border-zinc-200 py-4 text-sm"><span className="text-zinc-500">Total deste lançamento</span><strong className="text-lg">{money(selected.value * quantity)}</strong></div>}<Field label="Observação"><textarea value={notes} onChange={e => setNotes(e.target.value)} className="portal-input min-h-24 resize-none" placeholder="Cliente, projeto ou detalhes (opcional)"/></Field>{message && <p className="border-l-2 border-zinc-950 pl-3 text-sm text-zinc-600">{message}</p>}<button disabled={saving || !serviceId} className="flex w-full items-center justify-center gap-2 rounded-lg bg-zinc-950 px-4 py-3 text-sm font-semibold text-white transition hover:bg-zinc-700 disabled:cursor-not-allowed disabled:bg-zinc-300"><Plus size={17}/>{saving ? "Enviando..." : "Registrar serviço"}</button></form></section>
        <section><div className="flex items-center justify-between border-b border-zinc-200 p-5 md:p-7"><div><p className="text-xs font-semibold uppercase tracking-[.14em] text-zinc-500">Linha do tempo</p><h2 className="mt-1 text-2xl font-semibold tracking-[-.05em]">Histórico</h2></div><span className="text-sm text-zinc-500">{completions.length} itens</span></div><div>{completions.length === 0 ? <div className="p-7 text-sm text-zinc-500">Nenhum serviço lançado ainda.</div> : completions.map(item => <article key={item.id} className="flex items-start justify-between gap-5 border-b border-zinc-200 p-5 last:border-0 md:p-7"><div><h3 className="font-semibold">{item.service.name} <span className="font-normal text-zinc-500">× {item.quantity}</span></h3><p className="mt-1 text-sm text-zinc-500">{new Date(item.completedAt).toLocaleDateString("pt-BR")}{item.notes ? ` · ${item.notes}` : ""}</p></div><div className="min-w-fit text-right"><p className="font-semibold">{money(item.totalValue)}</p><div className="mt-1 flex items-center justify-end gap-2"><span className={`inline-block rounded-full px-2 py-0.5 text-[11px] font-semibold ${item.paymentStatus === "PAID" ? "bg-zinc-950 text-white" : "bg-zinc-100 text-zinc-600"}`}>{item.paymentStatus === "PAID" ? "Pago" : "Pendente"}</span>{item.paymentStatus === "PENDING" && <button onClick={() => removeCompletion(item.id)} className="rounded-md p-1.5 text-zinc-400 transition hover:bg-red-50 hover:text-red-600" title="Remover lançamento"><Trash2 size={15}/></button>}</div></div></article>)}</div></section></div>
    </div><style jsx global>{`.portal-input{margin-top:.45rem;width:100%;border:1px solid #e4e4e7;border-radius:.5rem;background:#fff;padding:.75rem;color:#18181b;outline:none;transition:border-color .15s,box-shadow .15s}.portal-input:focus{border-color:#18181b;box-shadow:0 0 0 3px #f4f4f5}.portal-input::placeholder{color:#a1a1aa}`}</style></main>;
}
function Metric({ icon, label, value, emphasis = false }: { icon: React.ReactNode; label: string; value: string; emphasis?: boolean }) { return <div className={`border-b border-r border-zinc-200 p-5 last:border-r-0 sm:border-b-0 md:p-6 ${emphasis ? "bg-zinc-950 text-white" : "bg-white"}`}><div className={emphasis ? "text-zinc-300" : "text-zinc-500"}>{icon}</div><p className={`mt-6 text-xs font-semibold uppercase tracking-[.12em] ${emphasis ? "text-zinc-400" : "text-zinc-500"}`}>{label}</p><p className="mt-1 text-2xl font-semibold tracking-[-.05em]">{value}</p></div>; }
function Field({ label, children }: { label: string; children: React.ReactNode }) { return <label className="block text-sm font-medium">{label}{children}</label>; }
