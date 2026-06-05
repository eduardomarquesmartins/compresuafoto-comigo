"use client";

import { useEffect, useMemo, useState } from "react";
import { Check, Eye, Loader2, Mail, Search, Send, Users, X } from "lucide-react";
import { getClients, sendClientEmail } from "@/lib/api";

type Client = {
    id: number;
    name: string;
    email?: string;
    phone?: string;
    status?: string;
    cityState?: string;
};

type SendResult = {
    sent: number;
    failed: number;
    totalRecipients: number;
    skippedWithoutEmail: number;
    results: Array<{
        clientId: number;
        name: string;
        email: string;
        success: boolean;
        error?: string | null;
    }>;
};

const templates = [
    {
        id: "relationship",
        label: "Relacionamento",
        subject: "Uma mensagem da Compre Sua Foto para {nome}",
        preheader: "Estamos por aqui para ajudar sua operação com fotos.",
        body: "Queria passar por aqui para manter nosso contato ativo.\n\nSe precisar organizar eventos, revisar pedidos, atualizar contratos ou alinhar novas campanhas, nossa equipe está pronta para ajudar.\n\nConte com a gente para deixar a experiência dos seus clientes mais simples, rápida e profissional.",
        ctaLabel: "Falar com a equipe",
        ctaUrl: ""
    },
    {
        id: "proposal",
        label: "Proposta",
        subject: "{nome}, podemos montar uma proposta para o seu próximo projeto",
        preheader: "Vamos estruturar uma proposta comercial sob medida.",
        body: "Podemos preparar uma proposta com escopo, valores e próximos passos para o seu projeto.\n\nA ideia é deixar tudo claro: o que será entregue, prazo, investimento e como vamos conduzir a execução.",
        ctaLabel: "Solicitar proposta",
        ctaUrl: ""
    },
    {
        id: "notice",
        label: "Aviso",
        subject: "Atualização importante para {nome}",
        preheader: "Confira uma atualização importante da nossa equipe.",
        body: "Temos uma atualização importante para compartilhar com você.\n\nRevise as informações abaixo e, se tiver qualquer dúvida, responda este e-mail para alinharmos os próximos passos.",
        ctaLabel: "",
        ctaUrl: ""
    }
];

const fillPreview = (value: string, client?: Client) => {
    return value
        .replace(/\{nome\}/g, client?.name || "Cliente")
        .replace(/\{cliente\}/g, client?.name || "Cliente")
        .replace(/\{email\}/g, client?.email || "email@cliente.com")
        .replace(/\{cidade\}/g, client?.cityState || "Cidade/UF")
        .replace(/\{documento\}/g, "");
};

export default function AdminEmailsPage() {
    const [clients, setClients] = useState<Client[]>([]);
    const [selectedIds, setSelectedIds] = useState<number[]>([]);
    const [mode, setMode] = useState<"selected" | "active" | "all">("selected");
    const [search, setSearch] = useState("");
    const [loading, setLoading] = useState(true);
    const [sending, setSending] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [result, setResult] = useState<SendResult | null>(null);

    const [subject, setSubject] = useState(templates[0].subject);
    const [preheader, setPreheader] = useState(templates[0].preheader);
    const [body, setBody] = useState(templates[0].body);
    const [ctaLabel, setCtaLabel] = useState(templates[0].ctaLabel);
    const [ctaUrl, setCtaUrl] = useState(templates[0].ctaUrl);
    const [replyTo, setReplyTo] = useState("");

    useEffect(() => {
        const loadClients = async () => {
            try {
                setLoading(true);
                setError(null);
                const data = await getClients();
                setClients(Array.isArray(data) ? data : []);
            } catch (err: any) {
                setError(err.response?.data?.error || "Não foi possível carregar os clientes.");
            } finally {
                setLoading(false);
            }
        };

        loadClients();
    }, []);

    const clientsWithEmail = useMemo(() => clients.filter(client => Boolean(client.email)), [clients]);

    const filteredClients = useMemo(() => {
        const term = search.trim().toLowerCase();
        if (!term) return clientsWithEmail;

        return clientsWithEmail.filter(client => {
            return [
                client.name,
                client.email,
                client.phone,
                client.cityState,
                client.status
            ].some(value => String(value || "").toLowerCase().includes(term));
        });
    }, [clientsWithEmail, search]);

    const recipientsCount = useMemo(() => {
        if (mode === "all") return clientsWithEmail.length;
        if (mode === "active") return clientsWithEmail.filter(client => client.status === "ACTIVE").length;
        return selectedIds.length;
    }, [clientsWithEmail, mode, selectedIds.length]);

    const selectedPreviewClient = clientsWithEmail.find(client => selectedIds.includes(client.id));
    const previewClient = selectedPreviewClient || {
        id: 0,
        name: "Cliente Exemplo",
        email: "cliente@exemplo.com",
        cityState: "Cidade/UF"
    };
    const previewSubject = fillPreview(subject, previewClient);
    const previewPreheader = fillPreview(preheader, previewClient);
    const previewBody = fillPreview(body, previewClient);
    const previewCtaLabel = fillPreview(ctaLabel, previewClient);
    const previewCtaUrl = fillPreview(ctaUrl, previewClient);

    const toggleClient = (id: number) => {
        setSelectedIds(prev => prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]);
    };

    const selectFiltered = () => {
        const ids = filteredClients.map(client => client.id);
        setSelectedIds(prev => Array.from(new Set([...prev, ...ids])));
        setMode("selected");
    };

    const applyTemplate = (templateId: string) => {
        const template = templates.find(item => item.id === templateId);
        if (!template) return;

        setSubject(template.subject);
        setPreheader(template.preheader);
        setBody(template.body);
        setCtaLabel(template.ctaLabel);
        setCtaUrl(template.ctaUrl);
    };

    const handleSend = async () => {
        setError(null);
        setResult(null);

        if (!subject.trim() || !body.trim()) {
            setError("Preencha o assunto e a mensagem antes de enviar.");
            return;
        }

        if (recipientsCount === 0) {
            setError("Selecione ao menos um cliente com e-mail.");
            return;
        }

        const confirmed = window.confirm(`Enviar este e-mail para ${recipientsCount} cliente${recipientsCount === 1 ? "" : "s"}?`);
        if (!confirmed) return;

        try {
            setSending(true);
            const response = await sendClientEmail({
                mode,
                clientIds: selectedIds,
                subject,
                preheader,
                body,
                ctaLabel,
                ctaUrl,
                replyTo
            });
            setResult(response);
        } catch (err: any) {
            setError(err.response?.data?.error || "Não foi possível enviar os e-mails.");
        } finally {
            setSending(false);
        }
    };

    return (
        <div className="mx-auto max-w-[1500px] space-y-8 pb-20">
            <header className="flex flex-col gap-5 border-b border-white/10 pb-6 lg:flex-row lg:items-end lg:justify-between">
                <div>
                    <span className="text-xs font-semibold uppercase tracking-[0.22em] text-blue-500">Comunicacao</span>
                    <h1 className="mt-2 text-4xl font-light tracking-tight text-white">E-mails para clientes</h1>
                    <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-400">
                        Envie comunicados, propostas e avisos para clientes cadastrados com preview e relatorio de entrega.
                    </p>
                </div>
                <button
                    type="button"
                    onClick={handleSend}
                    disabled={sending}
                    className="inline-flex items-center justify-center gap-2 rounded-lg bg-white px-5 py-3 text-sm font-bold text-black transition hover:bg-slate-200 disabled:cursor-not-allowed disabled:opacity-60"
                >
                    {sending ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
                    {sending ? "Enviando" : `Enviar para ${recipientsCount}`}
                </button>
            </header>

            {error && (
                <div className="flex items-center gap-3 rounded-lg border border-red-500/25 bg-red-500/10 px-4 py-3 text-sm text-red-100">
                    <X size={16} />
                    {error}
                </div>
            )}

            {result && (
                <div className="rounded-lg border border-emerald-500/25 bg-emerald-500/10 p-4 text-sm text-emerald-50">
                    <div className="flex items-center gap-2 font-semibold">
                        <Check size={16} />
                        Envio concluido: {result.sent} enviados, {result.failed} falharam, {result.skippedWithoutEmail} sem e-mail.
                    </div>
                    {result.failed > 0 && (
                        <div className="mt-3 space-y-1 text-emerald-100/80">
                            {result.results.filter(item => !item.success).slice(0, 5).map(item => (
                                <p key={`${item.clientId}-${item.email}`}>{item.name}: {item.error || "erro no envio"}</p>
                            ))}
                        </div>
                    )}
                </div>
            )}

            <div className="grid grid-cols-1 gap-6 xl:grid-cols-[320px_1fr_420px]">
                <section className="space-y-5 rounded-lg border border-white/10 bg-[#10121a] p-4">
                    <div className="flex items-center justify-between gap-3">
                        <div>
                            <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-500">Destinatarios</p>
                            <h2 className="mt-1 text-lg font-semibold text-white">Clientes</h2>
                        </div>
                        <div className="flex h-10 w-10 items-center justify-center rounded-lg border border-blue-500/25 bg-blue-500/10 text-blue-300">
                            <Users size={18} />
                        </div>
                    </div>

                    <div className="grid grid-cols-3 rounded-lg border border-white/10 bg-black/20 p-1 text-xs font-semibold">
                        {[
                            ["selected", "Selecionados"],
                            ["active", "Ativos"],
                            ["all", "Todos"]
                        ].map(([value, label]) => (
                            <button
                                key={value}
                                type="button"
                                onClick={() => setMode(value as "selected" | "active" | "all")}
                                className={`rounded-md px-3 py-2 transition ${mode === value ? "bg-white text-black" : "text-slate-400 hover:text-white"}`}
                            >
                                {label}
                            </button>
                        ))}
                    </div>

                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
                        <input
                            value={search}
                            onChange={event => setSearch(event.target.value)}
                            className="w-full rounded-lg border border-white/10 bg-black/30 py-3 pl-10 pr-3 text-sm text-white outline-none transition focus:border-blue-500"
                            placeholder="Buscar cliente"
                        />
                    </div>

                    <div className="flex items-center justify-between text-xs text-slate-500">
                        <span>{selectedIds.length} selecionados</span>
                        <button type="button" onClick={selectFiltered} className="font-semibold text-blue-400 hover:text-blue-300">
                            Selecionar lista
                        </button>
                    </div>

                    <div className="max-h-[520px] space-y-2 overflow-y-auto pr-1">
                        {loading ? (
                            <div className="flex h-40 items-center justify-center text-slate-500">
                                <Loader2 className="animate-spin" />
                            </div>
                        ) : filteredClients.length === 0 ? (
                            <div className="rounded-lg border border-dashed border-white/10 p-6 text-center text-sm text-slate-500">
                                Nenhum cliente com e-mail encontrado.
                            </div>
                        ) : filteredClients.map(client => {
                            const selected = selectedIds.includes(client.id);

                            return (
                                <button
                                    key={client.id}
                                    type="button"
                                    onClick={() => toggleClient(client.id)}
                                    className={`block w-full rounded-lg border p-3 text-left transition ${selected ? "border-blue-500/45 bg-blue-500/10" : "border-white/10 bg-black/20 hover:border-white/20"}`}
                                >
                                    <div className="flex items-start justify-between gap-3">
                                        <div className="min-w-0">
                                            <p className="truncate text-sm font-semibold text-white">{client.name}</p>
                                            <p className="mt-1 truncate text-xs text-slate-500">{client.email}</p>
                                        </div>
                                        <span className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded border ${selected ? "border-blue-400 bg-blue-500 text-white" : "border-white/15 text-transparent"}`}>
                                            <Check size={12} />
                                        </span>
                                    </div>
                                </button>
                            );
                        })}
                    </div>
                </section>

                <section className="space-y-5 rounded-lg border border-white/10 bg-[#10121a] p-5">
                    <div>
                        <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-500">Mensagem</p>
                        <h2 className="mt-1 text-lg font-semibold text-white">Editor de envio</h2>
                    </div>

                    <div className="flex flex-wrap gap-2">
                        {templates.map(template => (
                            <button
                                key={template.id}
                                type="button"
                                onClick={() => applyTemplate(template.id)}
                                className="rounded-lg border border-white/10 bg-black/25 px-3 py-2 text-xs font-semibold text-slate-300 transition hover:border-blue-500/40 hover:text-white"
                            >
                                {template.label}
                            </button>
                        ))}
                    </div>

                    <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                        <label className="space-y-2 md:col-span-2">
                            <span className="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-500">Assunto</span>
                            <input
                                value={subject}
                                onChange={event => setSubject(event.target.value)}
                                className="w-full rounded-lg border border-white/10 bg-black/30 px-4 py-3 text-sm text-white outline-none transition focus:border-blue-500"
                            />
                        </label>
                        <label className="space-y-2 md:col-span-2">
                            <span className="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-500">Preheader</span>
                            <input
                                value={preheader}
                                onChange={event => setPreheader(event.target.value)}
                                className="w-full rounded-lg border border-white/10 bg-black/30 px-4 py-3 text-sm text-white outline-none transition focus:border-blue-500"
                                placeholder="Texto curto que aparece antes de abrir o e-mail"
                            />
                        </label>
                        <label className="space-y-2 md:col-span-2">
                            <span className="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-500">Mensagem</span>
                            <textarea
                                value={body}
                                onChange={event => setBody(event.target.value)}
                                rows={12}
                                className="w-full resize-none rounded-lg border border-white/10 bg-black/30 px-4 py-3 text-sm leading-6 text-white outline-none transition focus:border-blue-500"
                            />
                        </label>
                        <label className="space-y-2">
                            <span className="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-500">Texto do botão</span>
                            <input
                                value={ctaLabel}
                                onChange={event => setCtaLabel(event.target.value)}
                                className="w-full rounded-lg border border-white/10 bg-black/30 px-4 py-3 text-sm text-white outline-none transition focus:border-blue-500"
                                placeholder="Falar com a equipe"
                            />
                        </label>
                        <label className="space-y-2">
                            <span className="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-500">Link do botão</span>
                            <input
                                value={ctaUrl}
                                onChange={event => setCtaUrl(event.target.value)}
                                className="w-full rounded-lg border border-white/10 bg-black/30 px-4 py-3 text-sm text-white outline-none transition focus:border-blue-500"
                                placeholder="https://..."
                            />
                        </label>
                        <label className="space-y-2 md:col-span-2">
                            <span className="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-500">Responder para</span>
                            <input
                                value={replyTo}
                                onChange={event => setReplyTo(event.target.value)}
                                className="w-full rounded-lg border border-white/10 bg-black/30 px-4 py-3 text-sm text-white outline-none transition focus:border-blue-500"
                                placeholder="contato@seudominio.com"
                            />
                        </label>
                    </div>

                    <div className="rounded-lg border border-white/10 bg-black/20 p-4 text-xs leading-6 text-slate-400">
                        Placeholders: <span className="text-white">{"{nome}"}</span>, <span className="text-white">{"{cliente}"}</span>, <span className="text-white">{"{email}"}</span>, <span className="text-white">{"{cidade}"}</span>, <span className="text-white">{"{documento}"}</span>.
                    </div>
                </section>

                <aside className="space-y-5 rounded-lg border border-white/10 bg-[#10121a] p-5 xl:sticky xl:top-6 xl:h-fit">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-500">Preview</p>
                            <h2 className="mt-1 text-lg font-semibold text-white">Como o cliente recebe</h2>
                        </div>
                        <Eye className="text-blue-400" size={18} />
                    </div>

                    <div className="rounded-lg border border-slate-200 bg-white text-slate-900 shadow-2xl">
                        <div className="border-b border-slate-200 bg-slate-50 p-4">
                            <div className="flex items-center gap-3">
                                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-slate-950 text-white">
                                    <Mail size={16} />
                                </div>
                                <div className="min-w-0">
                                    <p className="truncate text-sm font-bold">{previewSubject}</p>
                                    <p className="truncate text-xs text-slate-500">{previewPreheader}</p>
                                </div>
                            </div>
                        </div>
                        <div className="p-5">
                            <p className="text-xs font-bold uppercase tracking-[0.22em] text-sky-600">& CONTI</p>
                            <h3 className="mt-2 text-xl font-bold">Compre Sua Foto</h3>
                            <p className="mt-5 text-sm leading-6">Ola, <strong>{previewClient?.name || "Cliente"}</strong>.</p>
                            <div className="mt-4 space-y-4 text-sm leading-6 text-slate-700">
                                {previewBody.split(/\n{2,}/).filter(Boolean).map((paragraph, index) => (
                                    <p key={index}>{paragraph}</p>
                                ))}
                            </div>
                            {previewCtaLabel && previewCtaUrl && (
                                <div className="mt-6">
                                    <span className="inline-flex rounded-lg bg-slate-950 px-4 py-3 text-sm font-bold text-white">
                                        {previewCtaLabel}
                                    </span>
                                </div>
                            )}
                        </div>
                    </div>
                </aside>
            </div>
        </div>
    );
}
