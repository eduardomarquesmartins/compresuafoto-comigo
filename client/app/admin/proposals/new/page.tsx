"use client";
import React, { useState } from "react";
import { ArrowLeft, Plus, Trash2, Printer, Mail, Send, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react';
import { sendProposalEmail, downloadProposalPdf, createProposal } from '@/lib/api';
import Link from 'next/link';
import ProposalCover from "@/components/proposals/ProposalCover";
import ProposalServices from "@/components/proposals/ProposalServices";
import ProposalClosing from "@/components/proposals/ProposalClosing";

// --- Dados Iniciais ---
// --- Descrições Gerais por Categoria ---
const CATEGORY_DESCRIPTIONS: Record<string, string> = {
    "Social Media": "Postagens Facebook e Instagram, organização de feed, análise de mercado, estratégia, designer (cards), copyright, pesquisa do mês através do forms, Trello para organização.",
    "Social Media + Audiovisual": "Postagens Facebook e Instagram, organização de feed, análise de mercado, estratégia, designer (cards), copyright, pesquisa do mês através do forms, Trello para organização, social media, + fotografias, vídeos e drone (uma vez ao mês) + cadastro Google meu negócio.",
    "Tráfego Pago": "Gestão estratégica de anúncios para maximizar alcance, leads e conversões através de plataformas de alta performance.",
    "Audiovisual / Fotos": "Produção de conteúdo visual de alto impacto, incluindo fotografia profissional e vídeos dinâmicos para plataformas digitais.",
    "Artes Adicionais": "Criação de identidades visuais e artes gráficas exclusivas para fortalecer a comunicação da sua marca."
};

const dataSocialMedia = [
    { id: "sm_1", name: "Pacote 01", defaultPrice: 500, description: "1 postagem por semana" },
    { id: "sm_2", name: "Pacote 02", defaultPrice: 650, description: "2 postagens por semana" },
    { id: "sm_3", name: "Pacote 03", defaultPrice: 800, description: "3 postagens por semana" },
    { id: "sm_4", name: "Pacote 04", defaultPrice: 1000, description: "4 postagens por semana" },
    { id: "sm_5", name: "Pacote 05", defaultPrice: 1200, description: "5 postagens por semana" },
    { id: "sm_6", name: "Pacote 06", defaultPrice: 1400, description: "6 postagens por semana" },
];

const dataSocialMediaAudiovisual = [
    { id: "sma_1", name: "Pacote 01 + Audiovisual", defaultPrice: 700, description: "1 postagem por semana" },
    { id: "sma_2", name: "Pacote 02 + Audiovisual", defaultPrice: 900, description: "2 postagens por semana" },
    { id: "sma_3", name: "Pacote 03 + Audiovisual", defaultPrice: 1100, description: "3 postagens por semana" },
    { id: "sma_4", name: "Pacote 04 + Audiovisual", defaultPrice: 1600, description: "4 postagens por semana" },
    { id: "sma_5", name: "Pacote 05 + Audiovisual", defaultPrice: 1800, description: "5 postagens por semana" },
    { id: "sma_6", name: "Pacote 06 + Audiovisual", defaultPrice: 2000, description: "6 postagens por semana" },
];

const dataTrafego = [
    { id: "tr_1", name: "Google Ads (Gestão + Estratégia)", defaultPrice: 1000, description: "Gestão completa de campanhas no Google Ads, focado em resultados e ROI." },
    { id: "tr_2", name: "Meta Ads (Instagram/Facebook)", defaultPrice: 1000, description: "Gestão de anúncios no Instagram e Facebook para aumento de alcance e conversões." },
    { id: "tr_3", name: "Combo Google + Meta Ads", defaultPrice: 1500, description: "Gestão unificada de anúncios nas principais plataformas (Google + Meta)." },
];

const dataAudiovisual = [
    { id: "av_1", name: "Reels sem Drone", defaultPrice: 500, description: "Captação e edição de vídeo formato Reels para redes sociais." },
    { id: "av_2", name: "Reels com Drone", defaultPrice: 750, description: "Captação com Drone e edição de vídeo premium para redes sociais." },
    { id: "av_3", name: "Subida de Drone", defaultPrice: 250, description: "Voo exclusivo com Drone para captação de imagens aéreas brutas." },
    { id: "av_4", name: "Ensaio Básico (80 fotos / 15 edit)", defaultPrice: 400, description: "Sessão fotográfica profissional com entrega de 80 fotos brutas e 15 editadas." },
    { id: "av_5", name: "Ensaio Intermediário (150 fotos / 30 edit)", defaultPrice: 600, description: "Sessão fotográfica intermediária com 150 fotos brutas e 30 editadas." },
    { id: "av_6", name: "Ensaio Premium (250 fotos / 50 edit)", defaultPrice: 800, description: "Sessão completa premium com 250 fotos brutas e 50 editadas." },
    { id: "av_7", name: "Cobertura 2H sem edição (brutas)", defaultPrice: 500, description: "Acompanhamento fotográfico de evento por 2 horas, entrega de fotos brutas." },
    { id: "av_8", name: "Hora Extra", defaultPrice: 200, description: "Hora adicional de cobertura fotográfica/audiovisual." },
];

const dataArtes = [
    { id: "ar_1", name: "Artes para camisetas", defaultPrice: 100, description: "Design exclusivo para estampas de camisetas." },
    { id: "ar_2", name: "Artes impressão 1 lado", defaultPrice: 80, description: "Criação de arte para materiais impressos (frente)." },
    { id: "ar_3", name: "Artes impressão 2 lados", defaultPrice: 120, description: "Criação de arte para materiais impressos (frente e verso)." },
    { id: "ar_4", name: "Artes plotagem de carro", defaultPrice: 150, description: "Design para adesivagem e comunicação visual de veículos." },
    { id: "ar_5", name: "Capas de destaque", defaultPrice: 80, description: "Criação de ícones personalizados para destaques do Instagram." },
    { id: "ar_6", name: "Cardápio", defaultPrice: 250, description: "Design profissional para cardápios e menus." },
    { id: "ar_7", name: "Crachá", defaultPrice: 100, description: "Identidade visual para crachás e identificação." },
    { id: "ar_8", name: "Design foto de perfil", defaultPrice: 80, description: "Ajuste e design estratégico para fotos de perfil corporativas." },
    { id: "ar_9", name: "Vetorização logo existente", defaultPrice: 150, description: "Redesenho de logo em alta resolução (vetor)." },
    { id: "ar_10", name: "MIV", defaultPrice: 350, description: "Manual de Identidade Visual básico." },
    { id: "ar_11", name: "PDF Apresentação", defaultPrice: 350, description: "Design de lâminas para apresentações comerciais." },
    { id: "ar_12", name: "Portfólio", defaultPrice: 350, description: "Criação de portfólio digital profissional." },
    { id: "ar_13", name: "Proposta Comercial", defaultPrice: 200, description: "Design de documento para propostas de vendas." },
    { id: "ar_14", name: "Criação de Logo", defaultPrice: 250, description: "Processo criativo para nova logomarca." },
    { id: "ar_15", name: "Banner Site", defaultPrice: 80, description: "Criação de banners para web e E-commerce." },
    { id: "ar_16", name: "Arte avulsa redes sociais", defaultPrice: 60, description: "Design unitário para postagens avulsas." },
];

interface SelectedService {
    id: string;
    category: string;
    name: string;
    price: number;
    description?: string;
}

export default function NewProposalPage() {
    const [clientName, setClientName] = useState("");
    const [clientEmail, setClientEmail] = useState('');
    const [isDownloading, setIsDownloading] = useState(false);
    const [emailStatus, setEmailStatus] = useState<'idle' | 'success' | 'error'>('idle');
    const [selectedServices, setSelectedServices] = useState<SelectedService[]>([]);

    const handleServiceToggle = (item: any, category: string) => {
        const isSelected = selectedServices.some(s => s.id === item.id);
        if (isSelected) {
            setSelectedServices(selectedServices.filter(s => s.id !== item.id));
        } else {
            setSelectedServices([...selectedServices, {
                id: item.id,
                name: item.name,
                category,
                price: item.defaultPrice,
                description: item.description // Ensure description is passed
            }]);
        }
    };

    const handlePriceChange = (id: string, newPrice: string) => {
        const price = parseFloat(newPrice) || 0;
        setSelectedServices(selectedServices.map(s => s.id === id ? { ...s, price } : s));
    };

    const isSelected = (id: string) => selectedServices.some(s => s.id === id);
    const total = selectedServices.reduce((acc, curr) => acc + curr.price, 0);

    const renderCategory = (title: string, data: any[], categoryStr: string) => (
        <div key={categoryStr} className="bg-slate-900 border border-slate-800 rounded-3xl p-6 space-y-4">
            <h3 className="text-xl font-black uppercase tracking-widest text-slate-200">{title}</h3>
            {CATEGORY_DESCRIPTIONS[categoryStr] && (
                <p className="text-slate-400 text-xs italic leading-relaxed max-w-3xl border-l-2 border-blue-500/50 pl-4 mb-4">
                    {CATEGORY_DESCRIPTIONS[categoryStr]}
                </p>
            )}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {data.map(item => {
                    const selected = isSelected(item.id);
                    const currentService = selectedServices.find(s => s.id === item.id);
                    return (
                        <div key={item.id} className={`p-4 rounded-2xl border-2 transition-all ${selected ? 'border-blue-500 bg-blue-500/10' : 'border-slate-800 bg-slate-800/50 hover:border-slate-700'}`}>
                            <div className="flex items-start gap-3 w-full">
                                <div className="mt-1 flex-shrink-0">
                                    <input
                                        type="checkbox"
                                        checked={selected}
                                        onChange={() => handleServiceToggle(item, categoryStr)}
                                        className="w-5 h-5 rounded border-slate-600 text-blue-500 focus:ring-blue-500/20 bg-slate-900"
                                    />
                                </div>
                                <div className="flex-1">
                                    <p className={`font-bold text-sm ${selected ? 'text-white' : 'text-slate-300'}`}>{item.name}</p>
                                    {item.description && (
                                        <p className="text-[10px] text-slate-500 mt-1 leading-tight line-clamp-2">
                                            {item.description}
                                        </p>
                                    )}
                                    <div className="mt-3">
                                        {selected ? (
                                            <div className="flex items-center gap-2">
                                                <span className="text-slate-400 text-sm">R$</span>
                                                <input
                                                    type="number"
                                                    value={currentService?.price ?? ''}
                                                    onChange={(e) => handlePriceChange(item.id, e.target.value)}
                                                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-1 text-white font-mono text-sm focus:border-blue-500 focus:outline-none"
                                                />
                                            </div>
                                        ) : (
                                            <p className="text-slate-500 text-sm font-mono">R$ {item.defaultPrice.toFixed(2)}</p>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );

    return (
        <div className="min-h-screen relative">
            {/* O CONTEÚDO VISÍVEL NO ADMIN (ESCONDIDO NA IMPRESSÃO) */}
            <div className="max-w-6xl mx-auto space-y-10 pb-40 print:hidden relative z-10">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                    <div>
                        <Link href="/admin/proposals" className="flex items-center gap-2 text-slate-400 hover:text-white transition-colors mb-4 text-sm font-bold uppercase tracking-widest">
                            <ArrowLeft className="w-4 h-4" />
                            Voltar
                        </Link>
                        <h1 className="text-4xl font-bold uppercase tracking-tighter text-white flex items-center gap-3">
                            <Plus className="w-8 h-8 text-blue-500" />
                            Nova Proposta
                        </h1>
                    </div>
                </div>

                {/* Toast de Sucesso ao Enviar E-mail */}
                {emailStatus === 'success' && (
                    <div className="fixed top-24 right-10 bg-green-500 text-white px-6 py-4 rounded-2xl shadow-2xl z-50 flex items-center gap-3 animate-in fade-in slide-in-from-top-4 duration-300 no-print">
                        <div className="bg-white/20 p-2 rounded-full">
                            <CheckCircle2 size={24} />
                        </div>
                        <div>
                            <p className="font-bold leading-tight">Sucesso!</p>
                            <p className="text-sm opacity-90">Proposta enviada para o e-mail do cliente.</p>
                        </div>
                    </div>
                )}

                <div className="bg-slate-900 border border-slate-800 rounded-3xl p-8 space-y-6 shadow-2xl">
                    <div className="flex items-center gap-3 mb-2">
                        <div className="w-8 h-8 bg-blue-500/20 rounded-lg flex items-center justify-center">
                            <Plus className="w-5 h-5 text-blue-500" />
                        </div>
                        <h3 className="text-xl font-bold uppercase tracking-widest text-slate-200">Dados do Cliente</h3>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        <div className="space-y-3">
                            <label className="text-xs font-bold uppercase text-slate-500 tracking-widest ml-1">Nome do Cliente / Empresa</label>
                            <input
                                type="text"
                                value={clientName}
                                onChange={e => setClientName(e.target.value)}
                                placeholder="Ex: Empresa Conti Marketing"
                                className="w-full bg-slate-950/50 border border-slate-800 rounded-2xl p-4 text-white focus:border-blue-500 focus:ring-1 focus:ring-blue-500/20 transition-all outline-none"
                            />
                        </div>
                        <div className="space-y-3">
                            <label className="text-xs font-bold uppercase text-slate-500 tracking-widest ml-1 flex items-center gap-2">
                                <Mail size={14} className="text-blue-500" />
                                E-mail de Envio (opcional)
                            </label>
                            <input
                                type="email"
                                value={clientEmail}
                                onChange={e => setClientEmail(e.target.value)}
                                placeholder="contato@empresa.com"
                                className="w-full bg-slate-950/50 border border-slate-800 rounded-2xl p-4 text-white focus:border-blue-500 focus:ring-1 focus:ring-blue-500/20 transition-all outline-none"
                            />
                        </div>
                    </div>
                </div>

                <div className="space-y-10">
                    {renderCategory("Social Media", dataSocialMedia, "Social Media")}
                    {renderCategory("Social Media + Audiovisual", dataSocialMediaAudiovisual, "Social Media + Audiovisual")}
                    {renderCategory("Tráfego Pago", dataTrafego, "Tráfego Pago")}
                    {renderCategory("Audiovisual / Fotos", dataAudiovisual, "Audiovisual / Fotos")}
                    {renderCategory("Artes Adicionais", dataArtes, "Artes Adicionais")}
                </div>
            </div>

            {/* Header Fixo Inferior com Resumo e Ação */}
            <div className="fixed bottom-0 left-0 md:left-64 right-0 bg-slate-900/90 backdrop-blur-xl border-t border-slate-800 py-3 px-6 z-40 print:hidden shadow-[0_-20px_50px_rgba(0,0,0,0.5)]">
                <div className="max-w-6xl mx-auto flex flex-col md:flex-row justify-between items-center gap-4">
                    <div className="flex flex-col text-center md:text-left">
                        <span className="text-slate-400 text-[10px] font-bold uppercase tracking-[0.2em]">{selectedServices.length} serviços selecionados</span>
                        <span className="text-white text-xl font-black tracking-tighter">Total: R$ {total.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                    </div>

                    <div className="flex justify-center w-full md:w-auto">
                        <button
                            onClick={async () => {
                                if (!clientName || selectedServices.length === 0) {
                                    alert('Por favor, informe o nome do cliente e selecione ao menos um serviço.');
                                    return;
                                }

                                try {
                                    setIsDownloading(true);

                                    // 1. Se tiver e-mail, envia primeiro
                                    if (clientEmail) {
                                        setEmailStatus('idle');
                                        await sendProposalEmail({
                                            email: clientEmail,
                                            clientName,
                                            selectedServices,
                                            total
                                        });
                                        setEmailStatus('success');
                                        setTimeout(() => setEmailStatus('idle'), 5000);
                                    }

                                    // 2. Salva a proposta no banco de dados
                                    await createProposal({
                                        clientName,
                                        clientEmail,
                                        selectedServices,
                                        total
                                    });

                                    // 3. Faz o download do PDF
                                    const blob = await downloadProposalPdf({
                                        clientName,
                                        selectedServices,
                                        total
                                    });

                                    const url = window.URL.createObjectURL(new Blob([blob]));
                                    const link = document.createElement('a');
                                    link.href = url;
                                    link.setAttribute('download', `proposta_${clientName.replace(/\s+/g, '_').toLowerCase()}.pdf`);
                                    document.body.appendChild(link);
                                    link.click();
                                    link.parentNode?.removeChild(link);

                                } catch (error) {
                                    console.error('Erro na ação:', error);
                                    alert('Houve um erro ao processar a proposta.');
                                } finally {
                                    setIsDownloading(false);
                                }
                            }}
                            disabled={isDownloading || selectedServices.length === 0}
                            className={`group relative overflow-hidden flex items-center justify-center gap-4 px-10 py-4 rounded-xl font-bold uppercase tracking-[0.15em] transition-all shadow-xl ${isDownloading
                                ? 'bg-slate-800 text-slate-500 cursor-wait'
                                : 'bg-blue-600 hover:bg-blue-500 text-white hover:scale-[1.02] active:scale-[0.98] shadow-blue-600/30'
                                }`}
                        >
                            {isDownloading ? (
                                <>
                                    <Loader2 className="animate-spin" size={20} />
                                    <span className="text-sm">Processando...</span>
                                </>
                            ) : (
                                <>
                                    {clientEmail ? <Send size={20} /> : <ArrowLeft className="rotate-[-90deg]" size={20} />}
                                    <span className="text-sm">{clientEmail ? 'Enviar e Baixar' : 'Baixar Proposta'}</span>
                                </>
                            )}
                        </button>
                    </div>
                </div>
            </div>

            {/* LAYOUT DE IMPRESSÃO (PDF) */}
            <div className="relative hidden print:block w-full text-black bg-white" id="proposal-print-area">
                <style dangerouslySetInnerHTML={{
                    __html: `
                    @media print {
                        @page { size: A4 portrait; margin: 0; }
                        
                        html, body {
                            background: white !important;
                            margin: 0 !important;
                            padding: 0 !important;
                            width: 100% !important;
                            height: auto !important;
                            -webkit-print-color-adjust: exact; 
                            print-color-adjust: exact;
                        }

                        .min-h-screen, main, .flex-1, .bg-slate-950 {
                            background: white !important;
                            padding: 0 !important;
                            margin: 0 !important;
                            display: block !important;
                            width: 100% !important;
                            min-height: 0 !important;
                        }

                        aside, header, nav, .sidebar, .admin-header, .no-print, .md\\:hidden, button {
                            display: none !important;
                        }

                        * { 
                            box-shadow: none !important; 
                            text-shadow: none !important;
                        }

                        #proposal-print-area {
                            display: block !important;
                            position: relative !important;
                            width: 100% !important;
                        }
                    }
                `}} />

                <ProposalCover clientName={clientName} />
                <ProposalServices selectedServices={selectedServices} total={total} />
                <ProposalClosing />
            </div>
        </div>
    );
}
