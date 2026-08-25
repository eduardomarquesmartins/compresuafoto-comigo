"use client";

import { useEffect, useMemo, useState } from "react";
import { Check, Eye, FileUp, Loader2, Mail, Paperclip, Search, Send, Trash2, Users, X } from "lucide-react";
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
    attachments?: Array<{
        filename: string;
        contentType?: string;
    }>;
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
        subject: "Uma mensagem da & CONTI para {nome}",
        preheader: "Estratégia, conteúdo e presença digital para o seu negócio.",
        body: "Queria passar por aqui para manter nosso contato ativo.\n\nSe precisar alinhar estratégia, conteúdo, campanhas, gravações ou os próximos passos do seu projeto, nossa equipe está pronta para ajudar.\n\nConte com a gente para fortalecer a presença digital do seu negócio com clareza e consistência.",
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

const MAX_ATTACHMENTS = 8;
const MAX_ATTACHMENTS_SIZE = 20 * 1024 * 1024;

const formatFileSize = (size: number) => {
    if (size >= 1024 * 1024) return `${(size / 1024 / 1024).toFixed(1)} MB`;
    return `${Math.max(1, Math.round(size / 1024))} KB`;
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
    const [attachments, setAttachments] = useState<File[]>([]);

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

    const allFilteredSelected = useMemo(() => {
        if (filteredClients.length === 0) return false;
        return filteredClients.every(client => selectedIds.includes(client.id));
    }, [filteredClients, selectedIds]);

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
    const attachmentsSize = attachments.reduce((sum, file) => sum + file.size, 0);

    const toggleClient = (id: number) => {
        setSelectedIds(prev => prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]);
    };

    const selectFiltered = () => {
        const ids = filteredClients.map(client => client.id);
        if (allFilteredSelected) {
            setSelectedIds(prev => prev.filter(id => !ids.includes(id)));
        } else {
            setSelectedIds(prev => Array.from(new Set([...prev, ...ids])));
            setMode("selected");
        }
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

    const handleAttachmentChange = (files: FileList | null) => {
        if (!files?.length) return;

        const nextFiles = [...attachments, ...Array.from(files)];
        const limitedFiles = nextFiles.slice(0, MAX_ATTACHMENTS);
        const totalSize = limitedFiles.reduce((sum, file) => sum + file.size, 0);

        if (nextFiles.length > MAX_ATTACHMENTS) {
            setError(`Você pode anexar no máximo ${MAX_ATTACHMENTS} arquivos.`);
            return;
        }

        if (totalSize > MAX_ATTACHMENTS_SIZE) {
            setError("Os anexos devem somar no máximo 20 MB.");
            return;
        }

        setError(null);
        setAttachments(limitedFiles);
    };

    const removeAttachment = (index: number) => {
        setAttachments(prev => prev.filter((_, itemIndex) => itemIndex !== index));
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
                replyTo,
                attachments
            });
            setResult(response);
        } catch (err: any) {
            setError(err.response?.data?.error || "Não foi possível enviar os e-mails.");
        } finally {
            setSending(false);
        }
    };

    return (
        <div className="mx-auto max-w-[1540px] space-y-7 pb-20">
            <header className="flex flex-col gap-6 border-b border-black/10 pb-7 lg:flex-row lg:items-end lg:justify-between">
                <div>
                    <span className="text-sm font-extrabold uppercase tracking-[0.2em] text-blue-600">Comunicação com clientes</span>
                </div>
                <div className="flex items-center gap-3">
                    <span className="hidden text-xs font-medium text-slate-500 sm:inline">{recipientsCount} destinatário{recipientsCount === 1 ? "" : "s"}</span>
                    <button
                        type="button"
                        onClick={handleSend}
                        disabled={sending}
                        className="admin-primary-button inline-flex items-center justify-center gap-2 px-5 py-3 text-sm font-bold disabled:cursor-not-allowed disabled:opacity-60"
                    >
                        {sending ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
                        {sending ? "Enviando" : "Enviar e-mail"}
                    </button>
                </div>
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
                        Envio concluído: {result.sent} enviados, {result.failed} falharam, {result.skippedWithoutEmail} sem e-mail.
                    </div>
                    {result.attachments?.length ? (
                        <div className="mt-2 text-emerald-100/80">
                            {result.attachments.length} anexo{result.attachments.length === 1 ? "" : "s"} enviado{result.attachments.length === 1 ? "" : "s"} junto com a mensagem.
                        </div>
                    ) : null}
                    {result.failed > 0 && (
                        <div className="mt-3 space-y-1 text-emerald-100/80">
                            {result.results.filter(item => !item.success).slice(0, 5).map(item => (
                                <p key={`${item.clientId}-${item.email}`}>{item.name}: {item.error || "erro no envio"}</p>
                            ))}
                        </div>
                    )}
                </div>
            )}

            <div className="space-y-7">
                <div className="border border-black/10 bg-[#fffefa] p-6 md:p-7">
                    <div className="flex flex-col gap-5 border-b border-black/10 pb-6 lg:flex-row lg:items-end lg:justify-between">
                        <div>
                            <p className="admin-overline">Destinatários</p>
                            <h2 className="mt-2 text-xl font-semibold text-white">Quem recebe</h2>
                            <p className="mt-1 text-sm text-slate-500">Selecione pessoas específicas, todos os clientes ativos ou toda a sua base.</p>
                        </div>
                        <div className="flex items-center gap-4">
                            <Users size={21} className="hidden text-blue-500 sm:block" aria-hidden="true" />
                            <div className="grid grid-cols-3 border border-black/10 p-1 text-[11px] font-semibold">
                                {[
                                    ["selected", "Selecionados"],
                                    ["active", "Ativos"],
                                    ["all", "Todos"]
                                ].map(([value, label]) => (
                                    <button
                                        key={value}
                                        type="button"
                                        onClick={() => setMode(value as "selected" | "active" | "all")}
                                        className={`px-3 py-2 transition ${mode === value ? "bg-blue-600 text-white" : "text-slate-500 hover:bg-black/[0.04] hover:text-black"}`}
                                    >
                                        {label}
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>

                    <div className="mt-5 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                        <div className="relative w-full md:max-w-md">
                            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
                            <input
                                value={search}
                                onChange={event => setSearch(event.target.value)}
                                className="w-full border border-black/10 bg-white py-3 pl-10 pr-3 text-sm text-black outline-none transition focus:border-blue-500"
                                placeholder="Buscar cliente por nome ou e-mail"
                            />
                        </div>
                        <div className="flex items-center justify-between gap-5 text-sm text-slate-500">
                            <span><strong className="text-black">{selectedIds.length}</strong> marcados</span>
                            <button type="button" onClick={selectFiltered} className="font-semibold text-blue-600 hover:text-blue-800">
                                {allFilteredSelected ? "Desmarcar lista" : "Selecionar lista"}
                            </button>
                        </div>
                    </div>

                    <div className="mt-5 grid max-h-[350px] grid-cols-1 gap-x-5 overflow-y-auto pr-1 custom-scrollbar md:grid-cols-2 xl:grid-cols-3">
                        {loading ? (
                            <div className="flex h-40 items-center justify-center text-slate-500">
                                <Loader2 className="animate-spin" />
                            </div>
                        ) : filteredClients.length === 0 ? (
                            <div className="border border-dashed border-black/15 p-6 text-center text-sm text-slate-500">
                                Nenhum cliente com e-mail encontrado.
                            </div>
                        ) : filteredClients.map(client => {
                            const selected = selectedIds.includes(client.id);

                            return (
                                <button
                                    key={client.id}
                                    type="button"
                                    onClick={() => toggleClient(client.id)}
                                    className={`block w-full border-b border-black/10 px-3 py-3 text-left transition ${selected ? "bg-blue-50" : "hover:bg-black/[0.03]"}`}
                                >
                                    <div className="flex items-start justify-between gap-3">
                                        <div className="min-w-0">
                                            <p className="truncate text-sm font-semibold text-white">{client.name}</p>
                                            <p className="mt-1 truncate text-xs text-slate-500">{client.email}</p>
                                        </div>
                                        <span className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center border ${selected ? "border-blue-600 bg-blue-600 text-white" : "border-black/15 text-transparent"}`}>
                                            <Check size={12} />
                                        </span>
                                    </div>
                                </button>
                            );
                        })}
                    </div>
                </div>

                <div className="border border-black/10 bg-[#fffefa] p-6 md:p-7">
                    <div className="flex flex-col gap-4 border-b border-black/10 pb-6 sm:flex-row sm:items-end sm:justify-between">
                        <div>
                            <p className="admin-overline">Mensagem</p>
                            <h2 className="mt-2 text-2xl font-semibold text-white">Editor de envio</h2>
                            <p className="mt-1 text-sm text-slate-500">Use um modelo como ponto de partida ou escreva do zero.</p>
                        </div>
                        <div className="flex flex-wrap gap-2">
                            {templates.map(template => (
                                <button
                                    key={template.id}
                                    type="button"
                                    onClick={() => applyTemplate(template.id)}
                                    className="border border-black/15 bg-white px-3 py-2 text-xs font-semibold text-slate-700 transition hover:border-blue-600 hover:text-blue-700"
                                >
                                    {template.label}
                                </button>
                            ))}
                        </div>
                    </div>

                    <div className="mt-6 grid grid-cols-1 gap-x-5 gap-y-5 md:grid-cols-2">
                        <label className="space-y-2 md:col-span-2">
                            <span className="admin-overline">Assunto</span>
                            <input
                                value={subject}
                                onChange={event => setSubject(event.target.value)}
                                className="w-full border border-black/10 bg-white px-4 py-3 text-sm text-black outline-none transition focus:border-blue-500"
                            />
                        </label>
                        <label className="space-y-2 md:col-span-2">
                            <span className="admin-overline">Linha de apoio</span>
                            <input
                                value={preheader}
                                onChange={event => setPreheader(event.target.value)}
                                className="w-full border border-black/10 bg-white px-4 py-3 text-sm text-black outline-none transition focus:border-blue-500"
                                placeholder="Texto curto que aparece antes de abrir o e-mail"
                            />
                        </label>
                        <label className="space-y-2 md:col-span-2">
                            <span className="admin-overline">Mensagem</span>
                            <textarea
                                value={body}
                                onChange={event => setBody(event.target.value)}
                                rows={12}
                                className="w-full resize-none border border-black/10 bg-white px-4 py-3 text-sm leading-7 text-black outline-none transition focus:border-blue-500"
                            />
                        </label>
                        <label className="space-y-2">
                            <span className="admin-overline">Texto do botão</span>
                            <input
                                value={ctaLabel}
                                onChange={event => setCtaLabel(event.target.value)}
                                className="w-full border border-black/10 bg-white px-4 py-3 text-sm text-black outline-none transition focus:border-blue-500"
                                placeholder="Falar com a equipe"
                            />
                        </label>
                        <label className="space-y-2">
                            <span className="admin-overline">Link do botão</span>
                            <input
                                value={ctaUrl}
                                onChange={event => setCtaUrl(event.target.value)}
                                className="w-full border border-black/10 bg-white px-4 py-3 text-sm text-black outline-none transition focus:border-blue-500"
                                placeholder="https://..."
                            />
                        </label>
                        <label className="space-y-2 md:col-span-2">
                            <span className="admin-overline">Responder para</span>
                            <input
                                value={replyTo}
                                onChange={event => setReplyTo(event.target.value)}
                                className="w-full border border-black/10 bg-white px-4 py-3 text-sm text-black outline-none transition focus:border-blue-500"
                                placeholder="contato@seudominio.com"
                            />
                        </label>
                        <div className="space-y-3 md:col-span-2">
                            <div className="flex items-center justify-between gap-3">
                                <span className="admin-overline">Anexos</span>
                                <span className="text-[10px] font-semibold uppercase tracking-widest text-slate-500">
                                    {attachments.length}/{MAX_ATTACHMENTS} · {formatFileSize(attachmentsSize)}
                                </span>
                            </div>
                            <label className="flex cursor-pointer items-center justify-center gap-3 border border-dashed border-black/20 bg-white px-4 py-5 text-sm font-semibold text-slate-700 transition hover:border-blue-500 hover:bg-blue-50 hover:text-blue-700">
                                <FileUp size={18} />
                                Anexar arquivos
                                <input
                                    type="file"
                                    multiple
                                    className="hidden"
                                    accept=".pdf,.jpg,.jpeg,.png,.webp,.gif,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.csv"
                                    onChange={event => {
                                        handleAttachmentChange(event.target.files);
                                        event.target.value = "";
                                    }}
                                />
                            </label>
                            {attachments.length > 0 && (
                                <div className="space-y-2">
                                    {attachments.map((file, index) => (
                                        <div key={`${file.name}-${file.size}-${index}`} className="flex items-center justify-between gap-3 border border-black/10 bg-white px-3 py-2">
                                            <div className="flex min-w-0 items-center gap-3">
                                                <Paperclip size={15} className="shrink-0 text-blue-400" />
                                                <div className="min-w-0">
                                                    <p className="truncate text-sm font-semibold text-black">{file.name}</p>
                                                    <p className="text-xs text-slate-500">{formatFileSize(file.size)}</p>
                                                </div>
                                            </div>
                                            <button
                                                type="button"
                                                onClick={() => removeAttachment(index)}
                                                className="rounded-md p-2 text-slate-500 transition hover:bg-red-500/10 hover:text-red-300"
                                                aria-label={`Remover ${file.name}`}
                                            >
                                                <Trash2 size={15} />
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>

                    <div className="mt-6 border-t border-black/10 pt-4 text-xs leading-6 text-slate-500">
                        Personalize com: <span className="font-semibold text-black">{"{nome}"}</span>, <span className="font-semibold text-black">{"{cliente}"}</span>, <span className="font-semibold text-black">{"{email}"}</span>, <span className="font-semibold text-black">{"{cidade}"}</span> e <span className="font-semibold text-black">{"{documento}"}</span>.
                    </div>
                </div>

                <aside className="border border-black/10 bg-[#fffefa]">
                    <div className="flex items-start justify-between border-b border-black/10 p-5">
                        <div>
                            <p className="admin-overline">Prévia em tempo real</p>
                            <h2 className="mt-2 text-xl font-semibold text-white">Como chega ao cliente</h2>
                        </div>
                        <Eye className="text-blue-400" size={18} />
                    </div>

                    <div className="mx-auto my-6 max-w-2xl border border-slate-200 bg-white text-slate-900">
                        <div className="border-b border-slate-200 bg-slate-50 p-4">
                            <div className="flex items-center gap-3">
                                <div className="flex h-9 w-9 items-center justify-center bg-slate-950 text-white">
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
                            <h3 className="mt-2 text-xl font-bold">&amp; CONTI Marketing Digital</h3>
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
                            {attachments.length > 0 && (
                                <div className="mt-6 rounded-lg border border-slate-200 bg-slate-50 p-3">
                                    <p className="mb-2 flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-slate-500">
                                        <Paperclip size={13} />
                                        Anexos
                                    </p>
                                    <div className="space-y-1">
                                        {attachments.slice(0, 4).map((file, index) => (
                                            <p key={`${file.name}-preview-${index}`} className="truncate text-xs font-semibold text-slate-700">
                                                {file.name}
                                            </p>
                                        ))}
                                        {attachments.length > 4 && (
                                            <p className="text-xs text-slate-500">+ {attachments.length - 4} arquivo{attachments.length - 4 === 1 ? "" : "s"}</p>
                                        )}
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </aside>
            </div>
        </div>
    );
}
