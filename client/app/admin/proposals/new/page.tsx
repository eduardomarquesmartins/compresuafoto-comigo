"use client";
import React, { useEffect, useState } from "react";
import { ArrowLeft, Plus, Mail, Send, CheckCircle2, Loader2 } from 'lucide-react';
import { sendProposalEmail, downloadProposalPdf, createProposal, getClients, getProposal, updateProposal } from '@/lib/api';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import ProposalCover from "@/components/proposals/ProposalCover";
import ProposalServices from "@/components/proposals/ProposalServices";
import ProposalClosing from "@/components/proposals/ProposalClosing";

// --- Dados Iniciais ---
// --- DescriÃƒÂ§ÃƒÂµes Gerais por Categoria ---
const CATEGORY_DESCRIPTIONS: Record<string, string> = {
    "Social Media": "Postagens Facebook e Instagram, organizaÃƒÂ§ÃƒÂ£o de feed, anÃƒÂ¡lise de mercado, estratÃƒÂ©gia, designer (cards), copyright, pesquisa do mÃƒÂªs atravÃƒÂ©s do forms, Trello para organizaÃƒÂ§ÃƒÂ£o.",
    "Social Media + Audiovisual": "Postagens Facebook e Instagram, organizaÃƒÂ§ÃƒÂ£o de feed, anÃƒÂ¡lise de mercado, estratÃƒÂ©gia, designer (cards), copyright, pesquisa do mÃƒÂªs atravÃƒÂ©s do forms, Trello para organizaÃƒÂ§ÃƒÂ£o, social media, + fotografias, vÃƒÂ­deos e drone (uma vez ao mÃƒÂªs) + cadastro Google meu negÃƒÂ³cio.",
    "TrÃƒÂ¡fego Pago": "GestÃƒÂ£o estratÃƒÂ©gica de anÃƒÂºncios para maximizar alcance, leads e conversÃƒÂµes atravÃƒÂ©s de plataformas de alta performance.",
    "Audiovisual / Fotos": "ProduÃƒÂ§ÃƒÂ£o de conteÃƒÂºdo visual de alto impacto, incluindo fotografia profissional e vÃƒÂ­deos dinÃƒÂ¢micos para plataformas digitais.",
    "Artes Adicionais": "CriaÃƒÂ§ÃƒÂ£o de identidades visuais e artes grÃƒÂ¡ficas exclusivas para fortalecer a comunicaÃƒÂ§ÃƒÂ£o da sua marca.",
    "Fotografia": "Pacotes de cobertura fotogrÃƒÂ¡fica para casamento, com tratamento profissional, entrega digital em alta resoluÃƒÂ§ÃƒÂ£o e opÃƒÂ§ÃƒÂµes de making of, recepÃƒÂ§ÃƒÂ£o, balada e ensaio.",
    "VÃƒÂ­deo": "Cobertura em vÃƒÂ­deo para cerimÃƒÂ´nia, recepÃƒÂ§ÃƒÂ£o e momentos especiais, com opÃƒÂ§ÃƒÂµes de teaser, filme, drone e entrega prioritÃƒÂ¡ria.",
    "Combos Foto + VÃƒÂ­deo": "Pacotes combinados de fotografia e vÃƒÂ­deo com economia progressiva, equipe completa e entregas integradas para o evento.",
    "Storymaker": "Cobertura em tempo real para redes sociais, com profissionais especializados em conteÃƒÂºdo, stories criativos e entrega de todos os arquivos.",
    "15 anos": "Pacotes de foto, vÃƒÂ­deo e combos para festas de 15 anos, com opÃƒÂ§ÃƒÂµes de ensaio externo, retrospectiva, drone, ÃƒÂ¡lbum fÃƒÂ­sico e Same Day Edit.",
    "Fotografia AniversÃ¡rio": "Pacotes de fotografia para aniversÃ¡rios.",
    "VÃ­deo AniversÃ¡rio": "Pacotes de vÃ­deo para aniversÃ¡rios.",
    "Combos Foto + VÃ­deo AniversÃ¡rio": "Combos completos para aniversÃ¡rios.",
    "Fotografia â€” ChÃ¡ RevelaÃ§Ã£o & ChÃ¡ de Fralda": "Pacotes de fotografia para chÃ¡ revelaÃ§Ã£o e chÃ¡ de fralda.",
    "VÃ­deo â€” ChÃ¡ RevelaÃ§Ã£o": "Pacotes de vÃ­deo para chÃ¡ revelaÃ§Ã£o.",
    "VÃ­deo â€” ChÃ¡ de Fralda": "Pacotes de vÃ­deo para chÃ¡ de fralda.",
    "Combo Foto + VÃ­deo â€” ChÃ¡ RevelaÃ§Ã£o": "Combos completos para chÃ¡ revelaÃ§Ã£o.",
    "Combo Foto + VÃ­deo â€” ChÃ¡ de Fralda": "Combos completos para chÃ¡ de fralda.",
    "Combo Especial â€” ChÃ¡ RevelaÃ§Ã£o + ChÃ¡ de Fralda Juntos": "Pacotes conjuntos para os dois eventos."
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
    { id: "tr_1", name: "Google Ads (GestÃƒÂ£o + EstratÃƒÂ©gia)", defaultPrice: 1000, description: "GestÃƒÂ£o completa de campanhas no Google Ads, focado em resultados e ROI." },
    { id: "tr_2", name: "Meta Ads (Instagram/Facebook)", defaultPrice: 1000, description: "GestÃƒÂ£o de anÃƒÂºncios no Instagram e Facebook para aumento de alcance e conversÃƒÂµes." },
    { id: "tr_3", name: "Combo Google + Meta Ads", defaultPrice: 1500, description: "GestÃƒÂ£o unificada de anÃƒÂºncios nas principais plataformas (Google + Meta)." },
];

const dataAudiovisual = [
    { id: "av_1", name: "Reels sem Drone", defaultPrice: 500, description: "CaptaÃƒÂ§ÃƒÂ£o e ediÃƒÂ§ÃƒÂ£o de vÃƒÂ­deo formato Reels para redes sociais." },
    { id: "av_2", name: "Reels com Drone", defaultPrice: 750, description: "CaptaÃƒÂ§ÃƒÂ£o com Drone e ediÃƒÂ§ÃƒÂ£o de vÃƒÂ­deo premium para redes sociais." },
    { id: "av_3", name: "Subida de Drone", defaultPrice: 250, description: "Voo exclusivo com Drone para captaÃƒÂ§ÃƒÂ£o de imagens aÃƒÂ©reas brutas." },
    { id: "av_4", name: "Ensaio BÃƒÂ¡sico (80 fotos / 15 edit)", defaultPrice: 400, description: "SessÃƒÂ£o fotogrÃƒÂ¡fica profissional com entrega de 80 fotos brutas e 15 editadas." },
    { id: "av_5", name: "Ensaio IntermediÃƒÂ¡rio (150 fotos / 30 edit)", defaultPrice: 600, description: "SessÃƒÂ£o fotogrÃƒÂ¡fica intermediÃƒÂ¡ria com 150 fotos brutas e 30 editadas." },
    { id: "av_6", name: "Ensaio Premium (250 fotos / 50 edit)", defaultPrice: 800, description: "SessÃƒÂ£o completa premium com 250 fotos brutas e 50 editadas." },
    { id: "av_7", name: "Cobertura 2H sem ediÃƒÂ§ÃƒÂ£o (brutas)", defaultPrice: 500, description: "Acompanhamento fotogrÃƒÂ¡fico de evento por 2 horas, entrega de fotos brutas." },
    { id: "av_8", name: "Hora Extra", defaultPrice: 200, description: "Hora adicional de cobertura fotogrÃƒÂ¡fica/audiovisual." },
];

const dataArtes = [
    { id: "ar_1", name: "Artes para camisetas", defaultPrice: 100, description: "Design exclusivo para estampas de camisetas." },
    { id: "ar_2", name: "Artes impressÃƒÂ£o 1 lado", defaultPrice: 80, description: "CriaÃƒÂ§ÃƒÂ£o de arte para materiais impressos (frente)." },
    { id: "ar_3", name: "Artes impressÃƒÂ£o 2 lados", defaultPrice: 120, description: "CriaÃƒÂ§ÃƒÂ£o de arte para materiais impressos (frente e verso)." },
    { id: "ar_4", name: "Artes plotagem de carro", defaultPrice: 150, description: "Design para adesivagem e comunicaÃƒÂ§ÃƒÂ£o visual de veÃƒÂ­culos." },
    { id: "ar_5", name: "Capas de destaque", defaultPrice: 80, description: "CriaÃƒÂ§ÃƒÂ£o de ÃƒÂ­cones personalizados para destaques do Instagram." },
    { id: "ar_6", name: "CardÃƒÂ¡pio", defaultPrice: 250, description: "Design profissional para cardÃƒÂ¡pios e menus." },
    { id: "ar_7", name: "CrachÃƒÂ¡", defaultPrice: 100, description: "Identidade visual para crachÃƒÂ¡s e identificaÃƒÂ§ÃƒÂ£o." },
    { id: "ar_8", name: "Design foto de perfil", defaultPrice: 80, description: "Ajuste e design estratÃƒÂ©gico para fotos de perfil corporativas." },
    { id: "ar_9", name: "VetorizaÃƒÂ§ÃƒÂ£o logo existente", defaultPrice: 150, description: "Redesenho de logo em alta resoluÃƒÂ§ÃƒÂ£o (vetor)." },
    { id: "ar_10", name: "MIV", defaultPrice: 350, description: "Manual de Identidade Visual bÃƒÂ¡sico." },
    { id: "ar_11", name: "PDF ApresentaÃƒÂ§ÃƒÂ£o", defaultPrice: 350, description: "Design de lÃƒÂ¢minas para apresentaÃƒÂ§ÃƒÂµes comerciais." },
    { id: "ar_12", name: "PortfÃƒÂ³lio", defaultPrice: 350, description: "CriaÃƒÂ§ÃƒÂ£o de portfÃƒÂ³lio digital profissional." },
    { id: "ar_13", name: "Proposta Comercial", defaultPrice: 200, description: "Design de documento para propostas de vendas." },
    { id: "ar_14", name: "CriaÃƒÂ§ÃƒÂ£o de Logo", defaultPrice: 250, description: "Processo criativo para nova logomarca." },
    { id: "ar_15", name: "Banner Site", defaultPrice: 80, description: "CriaÃƒÂ§ÃƒÂ£o de banners para web e E-commerce." },
    { id: "ar_16", name: "Arte avulsa redes sociais", defaultPrice: 60, description: "Design unitÃƒÂ¡rio para postagens avulsas." },
];

const dataFotografia = [
    { id: "foto_essencial", name: "Essencial", defaultPrice: 2000, description: "4h de cobertura | 1 fotÃƒÂ³grafo profissional | CerimÃƒÂ´nia + inÃƒÂ­cio da recepÃƒÂ§ÃƒÂ£o | 250 fotos tratadas e editadas | Entrega digital em alta resoluÃƒÂ§ÃƒÂ£o | Sem making of, balada completa ou ensaio" },
    { id: "foto_premium", name: "Premium", defaultPrice: 3500, description: "8h de cobertura | 2 fotÃƒÂ³grafos profissionais | Making of da noiva | CerimÃƒÂ´nia completa + recepÃƒÂ§ÃƒÂ£o + abertura da balada | 450 fotos tratadas e editadas | Galeria completa do evento | Sem ensaio prÃƒÂ©-casamento" },
    { id: "foto_completa", name: "ExperiÃƒÂªncia Completa", defaultPrice: 4800, description: "10h de cobertura | 2 fotÃƒÂ³grafos profissionais | Making of do noivo e da noiva | CerimÃƒÂ´nia + recepÃƒÂ§ÃƒÂ£o + balada completa | 650+ fotos tratadas e editadas | Galeria completa | Entrega prioritÃƒÂ¡ria + backup garantido" },
    { id: "foto_ensaio_pre", name: "Adicional: Ensaio prÃƒÂ©-casamento", defaultPrice: 1200, description: "Ensaio fotogrÃƒÂ¡fico prÃƒÂ©-casamento." },
    { id: "foto_hora_extra", name: "Adicional: Hora extra", defaultPrice: 400, description: "Hora adicional de cobertura fotogrÃƒÂ¡fica." },
    { id: "foto_album", name: "Adicional: ÃƒÂlbum fÃƒÂ­sico", defaultPrice: 0, description: "Valor sob consulta." },
];

const dataVideo = [
    { id: "video_essencial", name: "Essencial", defaultPrice: 2500, description: "4h de cobertura | 1 cÃƒÂ¢mera profissional | CerimÃƒÂ´nia + inÃƒÂ­cio da recepÃƒÂ§ÃƒÂ£o | Teaser de atÃƒÂ© 1 minuto | Sem making of, balada, drone ou filme longo" },
    { id: "video_premium", name: "Premium", defaultPrice: 3800, description: "8h de cobertura | 2 cÃƒÂ¢meras profissionais | Making of da noiva | CerimÃƒÂ´nia completa + recepÃƒÂ§ÃƒÂ£o + abertura da balada | Teaser de 1 a 2 minutos | Filme de atÃƒÂ© 15 minutos | Sem drone, making do noivo ou prÃƒÂ©-wedding" },
    { id: "video_completa", name: "ExperiÃƒÂªncia Completa", defaultPrice: 5000, description: "10h de cobertura | 2 cÃƒÂ¢meras profissionais | Making of do noivo e da noiva | CerimÃƒÂ´nia + recepÃƒÂ§ÃƒÂ£o + balada completa | Drone incluso | Teaser + filme de atÃƒÂ© 15 minutos | Entrega prioritÃƒÂ¡ria" },
    { id: "video_making_noivo", name: "Adicional: Making do noivo", defaultPrice: 600, description: "Cobertura adicional do making of do noivo." },
    { id: "video_drone", name: "Adicional: Drone", defaultPrice: 500, description: "CaptaÃƒÂ§ÃƒÂ£o aÃƒÂ©rea com drone." },
    { id: "video_pre_wedding", name: "Adicional: PrÃƒÂ©-wedding", defaultPrice: 1400, description: "VÃƒÂ­deo prÃƒÂ©-wedding." },
    { id: "video_hora_extra", name: "Adicional: Hora extra", defaultPrice: 450, description: "Hora adicional de cobertura em vÃƒÂ­deo." },
];

const dataCombos = [
    { id: "combo_essencial", name: "Combo Essencial", defaultPrice: 4200, description: "Economia de R$300 | 4h de cobertura | 1 fotÃƒÂ³grafo + 1 cinegrafista | CerimÃƒÂ´nia + inÃƒÂ­cio da recepÃƒÂ§ÃƒÂ£o | 250 fotos tratadas + teaser atÃƒÂ© 1 min | Entrega digital em alta resoluÃƒÂ§ÃƒÂ£o" },
    { id: "combo_premium", name: "Combo Premium", defaultPrice: 6700, description: "Economia de R$600 | 8h de cobertura | 2 fotÃƒÂ³grafos + 2 cinegrafistas | Making of da noiva | CerimÃƒÂ´nia + recepÃƒÂ§ÃƒÂ£o + abertura da balada | 450 fotos tratadas + teaser 1-2 min + filme atÃƒÂ© 15 min" },
    { id: "combo_completa", name: "Combo ExperiÃƒÂªncia Completa", defaultPrice: 8800, description: "Economia de R$1.000 | 10h de cobertura | 2 fotÃƒÂ³grafos + 2 cinegrafistas | Making of do noivo e da noiva | CerimÃƒÂ´nia + recepÃƒÂ§ÃƒÂ£o + balada completa | 650+ fotos + teaser + filme atÃƒÂ© 15 min + drone incluso | Entrega prioritÃƒÂ¡ria + backup garantido" },
    { id: "combo_camera_adicional", name: "Adicional: CÃƒÂ¢mera adicional", defaultPrice: 500, description: "CÃƒÂ¢mera adicional para cobertura do evento." },
    { id: "combo_hora_extra", name: "Adicional: Hora extra", defaultPrice: 500, description: "Hora adicional para combo foto + vÃƒÂ­deo." },
    { id: "combo_same_day", name: "Adicional: Same Day Edit", defaultPrice: 1200, description: "EdiÃƒÂ§ÃƒÂ£o para exibiÃƒÂ§ÃƒÂ£o no mesmo dia." },
    { id: "combo_storymaker_6h", name: "Adicional: Storymaker 6h", defaultPrice: 1200, description: "Cobertura storymaker por atÃƒÂ© 6 horas." },
    { id: "combo_storymaker_10h", name: "Adicional: Storymaker 10h", defaultPrice: 1500, description: "Cobertura storymaker por atÃƒÂ© 10 horas." },
    { id: "combo_pre_wedding_foto", name: "Adicional: PrÃƒÂ©-wedding foto", defaultPrice: 1200, description: "Ensaio fotogrÃƒÂ¡fico prÃƒÂ©-wedding." },
    { id: "combo_pre_wedding_video", name: "Adicional: PrÃƒÂ©-wedding vÃƒÂ­deo", defaultPrice: 1400, description: "VÃƒÂ­deo prÃƒÂ©-wedding." },
    { id: "combo_album", name: "Adicional: ÃƒÂlbum fÃƒÂ­sico", defaultPrice: 0, description: "Valor sob consulta." },
];

const dataStorymaker = [
    { id: "story_6h", name: "AtÃƒÂ© 6h", defaultPrice: 1200, description: "Cobertura em tempo real para redes sociais | 2 profissionais especializados em conteÃƒÂºdo | Stories criativos produzidos e postados em tempo real | Entrega de todos os arquivos" },
    { id: "story_10h", name: "AtÃƒÂ© 10h", defaultPrice: 1500, description: "Cobertura em tempo real para redes sociais | 2 profissionais especializados em conteÃƒÂºdo | Stories criativos produzidos e postados em tempo real | Entrega de todos os arquivos" },
    { id: "story_obs", name: "ObservaÃƒÂ§ÃƒÂ£o de deslocamento", defaultPrice: 0, description: "Deslocamento nÃƒÂ£o incluso para eventos fora do estado. O local deve fornecer acesso ÃƒÂ  internet estÃƒÂ¡vel." },
];

const data15Anos = [
    { id: "15_ensaio_foto", name: "Ensaio externo foto", defaultPrice: 1100, description: "Ensaio externo para 15 anos." },
    { id: "15_ensaio_video", name: "Ensaio externo video", defaultPrice: 1200, description: "Ensaio externo em video para 15 anos." },
    { id: "15_ensaio_foto_video", name: "Ensaio externo foto + video juntos", defaultPrice: 2000, description: "Combo de ensaio externo com foto + video | Economia de R$300." },
    { id: "15_foto_essencial", name: "Foto 15 anos - Essencial", defaultPrice: 1600, description: "Pacote essencial de fotografia para 15 anos." },
    { id: "15_foto_premium", name: "Foto 15 anos - Premium", defaultPrice: 2400, description: "Pacote premium de fotografia para 15 anos." },
    { id: "15_foto_completa", name: "Foto 15 anos - Experiencia Completa", defaultPrice: 3600, description: "Pacote experiencia completa de fotografia para 15 anos." },
    { id: "15_foto_ensaio_externo", name: "Foto 15 anos - Adicional: Ensaio externo", defaultPrice: 1100, description: "Ensaio externo fotografico adicional." },
    { id: "15_foto_album", name: "Foto 15 anos - Adicional: Album fisico", defaultPrice: 0, description: "Valor sob orcamento." },
    { id: "15_foto_hora_extra", name: "Foto 15 anos - Adicional: Hora extra", defaultPrice: 350, description: "Hora extra de cobertura fotografica." },
    { id: "15_video_essencial", name: "Video 15 anos - Essencial", defaultPrice: 1900, description: "Pacote essencial de video para 15 anos." },
    { id: "15_video_premium", name: "Video 15 anos - Premium", defaultPrice: 2700, description: "Pacote premium de video para 15 anos." },
    { id: "15_video_completa", name: "Video 15 anos - Experiencia Completa", defaultPrice: 4000, description: "Pacote experiencia completa de video para 15 anos." },
    { id: "15_video_ensaio_externo", name: "Video 15 anos - Adicional: Ensaio externo", defaultPrice: 1200, description: "Ensaio externo em video adicional." },
    { id: "15_video_retrospectiva", name: "Video 15 anos - Adicional: Retrospectiva personalizada", defaultPrice: 900, description: "Retrospectiva personalizada para 15 anos." },
    { id: "15_video_drone", name: "Video 15 anos - Adicional: Drone avulso", defaultPrice: 400, description: "Captacao aerea com drone avulso." },
    { id: "15_video_hora_extra", name: "Video 15 anos - Adicional: Hora extra", defaultPrice: 400, description: "Hora extra de cobertura em video." },
    { id: "15_combo_essencial", name: "Combo Foto + Video 15 anos - Essencial", defaultPrice: 3200, description: "Combo essencial de foto + video | Economia de R$300." },
    { id: "15_combo_premium", name: "Combo Foto + Video 15 anos - Premium", defaultPrice: 4500, description: "Combo premium de foto + video | Economia de R$600." },
    { id: "15_combo_completa", name: "Combo Foto + Video 15 anos - Experiencia Completa", defaultPrice: 6600, description: "Combo experiencia completa de foto + video | Economia de R$1.000." },
    { id: "15_combo_ensaio_externo", name: "Combo 15 anos - Adicional: Ensaio externo foto + video", defaultPrice: 2000, description: "Ensaio externo com foto + video adicional." },
    { id: "15_combo_retrospectiva_telao", name: "Combo 15 anos - Adicional: Video retrospectiva telao", defaultPrice: 500, description: "Video retrospectiva para exibicao no telao." },
    { id: "15_combo_same_day", name: "Combo 15 anos - Adicional: Same Day Edit", defaultPrice: 1200, description: "Edicao para exibicao no mesmo dia." },
];

const dataAniversarioFoto = [
    { id: "aniv_foto_2h", name: "2 Horas", defaultPrice: 700, description: "Fotos ilimitadas do evento | 30 fotos editadas | Entrega digital em alta resolucao" },
    { id: "aniv_foto_3h", name: "3 Horas", defaultPrice: 1000, description: "Fotos ilimitadas do evento | 50 fotos editadas | Entrega digital em alta resolucao" },
    { id: "aniv_foto_4h", name: "4 Horas", defaultPrice: 1500, description: "Fotos ilimitadas do evento | 100 fotos editadas | Entrega digital em alta resolucao" },
    { id: "aniv_foto_6h", name: "6 Horas", defaultPrice: 2200, description: "Fotos ilimitadas do evento | 200 fotos editadas | Drone incluso | Entrega digital em alta resolucao" },
];

const dataAniversarioVideo = [
    { id: "aniv_video_2h", name: "2 Horas", defaultPrice: 700, description: "1 Reels completo (ate 1min30s) | Entrega digital em alta resolucao" },
    { id: "aniv_video_3h", name: "3 Horas", defaultPrice: 1000, description: "1 Reels completo (ate 1min30s) | Entrega digital em alta resolucao" },
    { id: "aniv_video_4h", name: "4 Horas", defaultPrice: 1500, description: "1 Reels completo (ate 1min30s) | Drone incluso | Entrega digital em alta resolucao" },
    { id: "aniv_video_6h", name: "6 Horas", defaultPrice: 2200, description: "2 Reels completos (ate 1min30s cada) | Drone incluso | Entrega digital em alta resolucao" },
];

const dataAniversarioCombo = [
    { id: "aniv_combo_2h", name: "Combo 2h", defaultPrice: 1200, description: "Fotos ilimitadas + 30 fotos editadas | 1 Reels completo (ate 1min30s) | Entrega digital em alta resolucao" },
    { id: "aniv_combo_3h", name: "Combo 3h", defaultPrice: 1700, description: "Fotos ilimitadas + 50 fotos editadas | 1 Reels completo (ate 1min30s) | Entrega digital em alta resolucao" },
    { id: "aniv_combo_4h", name: "Combo 4h", defaultPrice: 2500, description: "Fotos ilimitadas + 100 fotos editadas | 1 Reels completo (ate 1min30s) | Drone incluso | Entrega digital em alta resolucao" },
    { id: "aniv_combo_6h", name: "Combo 6h", defaultPrice: 3800, description: "Fotos ilimitadas + 200 fotos editadas | 2 Reels completos (ate 1min30s cada) | Drone incluso | Entrega digital em alta resolucao" },
];

const dataChaRevelacaoFoto = [
    { id: "cha_rev_foto_2h", name: "2 Horas", defaultPrice: 700, description: "Fotos ilimitadas do evento | 30 fotos editadas | Entrega digital em alta resolucao" },
    { id: "cha_rev_foto_3h", name: "3 Horas", defaultPrice: 950, description: "Fotos ilimitadas do evento | 50 fotos editadas | Entrega digital em alta resolucao" },
];

const dataChaRevelacaoVideo = [
    { id: "cha_rev_video_2h", name: "2 Horas", defaultPrice: 900, description: "1 Reels completo (ate 1min30s) | Drone no momento da revelacao | Entrega digital em alta resolucao" },
    { id: "cha_rev_video_3h", name: "3 Horas", defaultPrice: 1100, description: "1 Reels completo (ate 1min30s) | Drone no momento da revelacao | Entrega digital em alta resolucao" },
];

const dataChaFraldaVideo = [
    { id: "cha_fralda_video_2h", name: "2 Horas", defaultPrice: 800, description: "1 Reels completo (ate 1min30s) | Entrega digital em alta resolucao" },
    { id: "cha_fralda_video_3h", name: "3 Horas", defaultPrice: 1000, description: "1 Reels completo (ate 1min30s) | Entrega digital em alta resolucao" },
];

const dataChaRevelacaoCombo = [
    { id: "cha_rev_combo_2h", name: "2 Horas", defaultPrice: 1400, description: "Fotos ilimitadas + 30 fotos editadas | 1 Reels completo + drone na revelacao | Drone incluso | Entrega digital em alta resolucao" },
    { id: "cha_rev_combo_3h", name: "3 Horas", defaultPrice: 1800, description: "Fotos ilimitadas + 50 fotos editadas | 1 Reels completo + drone na revelacao | Drone incluso | Entrega digital em alta resolucao" },
];

const dataChaFraldaCombo = [
    { id: "cha_fralda_combo_2h", name: "2 Horas", defaultPrice: 1300, description: "Fotos ilimitadas + 30 fotos editadas | 1 Reels completo | Entrega digital em alta resolucao" },
    { id: "cha_fralda_combo_3h", name: "3 Horas", defaultPrice: 1700, description: "Fotos ilimitadas + 50 fotos editadas | 1 Reels completo | Entrega digital em alta resolucao" },
];

const dataChaJuntosCombo = [
    { id: "cha_juntos_3h", name: "3 Horas", defaultPrice: 2000, description: "Cobertura completa dos dois eventos | Fotos ilimitadas + Reels completo | Drone na revelacao | Entrega digital em alta resolucao" },
    { id: "cha_juntos_5h", name: "5 Horas", defaultPrice: 2600, description: "Cobertura completa dos dois eventos | Fotos ilimitadas + 2 Reels completos | Drone na revelacao | Entrega digital em alta resolucao" },
];

interface SelectedService {
    id: string;
    category: string;
    name: string;
    price: number;
    description?: string;
}

interface ProposalItem {
    id: string;
    name: string;
    defaultPrice: number;
    description?: string;
}

const formatMoney = (value: number) => value.toLocaleString('pt-BR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
});

const parseMoneyInput = (value: string) => {
    const normalized = value
        .replace(/[^\d,.-]/g, '')
        .replace(/\./g, '')
        .replace(',', '.');

    if (!normalized || normalized === '-' || normalized === '.') {
        return null;
    }

    const parsed = Number(normalized);
    return Number.isFinite(parsed) ? parsed : null;
};

export default function NewProposalPage() {
    const router = useRouter();
    const [clients, setClients] = useState<any[]>([]);
    const [editingProposalId, setEditingProposalId] = useState<string | null>(null);
    const [selectedClientId, setSelectedClientId] = useState("");
    const [clientName, setClientName] = useState("");
    const [clientEmail, setClientEmail] = useState('');
    const [isDownloading, setIsDownloading] = useState(false);
    const [isLoadingProposal, setIsLoadingProposal] = useState(false);
    const [emailStatus, setEmailStatus] = useState<'idle' | 'success' | 'error'>('idle');
    const [selectedServices, setSelectedServices] = useState<SelectedService[]>([]);
    const [priceDrafts, setPriceDrafts] = useState<Record<string, string>>({});
    const [totalFinalDraft, setTotalFinalDraft] = useState('');
    const [isManualTotal, setIsManualTotal] = useState(false);

    useEffect(() => {
        const loadClients = async () => {
            try {
                const data = await getClients();
                setClients(Array.isArray(data) ? data : []);
            } catch (error) {
                console.warn("Erro ao carregar clientes para proposta:", error);
            }
        };

        loadClients();
    }, []);

    useEffect(() => {
        const proposalId = new URLSearchParams(window.location.search).get("edit");
        if (!proposalId) return;

        setEditingProposalId(proposalId);

        const loadProposal = async () => {
            try {
                setIsLoadingProposal(true);
                const proposal = await getProposal(proposalId);
                const services = Array.isArray(proposal.selectedServices) ? proposal.selectedServices : [];
                const normalizedServices = services.map((service: any) => ({
                    id: service.id,
                    category: service.category,
                    name: service.name,
                    price: Number(service.price) || 0,
                    description: service.description
                }));

                setSelectedClientId(proposal.clientId || proposal.client?.id ? String(proposal.clientId || proposal.client?.id) : "");
                setClientName(proposal.client?.name || proposal.clientName || "");
                setClientEmail(proposal.client?.email || proposal.clientEmail || "");
                setSelectedServices(normalizedServices);
                setPriceDrafts(normalizedServices.reduce((drafts: Record<string, string>, service: SelectedService) => {
                    drafts[service.id] = String(service.price);
                    return drafts;
                }, {}));
                const initialTotal = Number(proposal.total) || 0;
                setTotalFinalDraft(formatMoney(initialTotal));
                setIsManualTotal(true);
            } catch (error) {
                console.error("Erro ao carregar proposta para edicao:", error);
                alert("Nao consegui carregar a proposta para edicao.");
            } finally {
                setIsLoadingProposal(false);
            }
        };

        loadProposal();
    }, []);

    const handleClientSelect = (clientId: string) => {
        setSelectedClientId(clientId);
        const client = clients.find(item => String(item.id) === clientId);
        if (!client) return;

        setClientName(client.name || "");
        setClientEmail(client.email || "");
    };

    const handleServiceToggle = (item: ProposalItem, category: string) => {
        const isSelected = selectedServices.some(s => s.id === item.id);
        if (isSelected) {
            setSelectedServices(selectedServices.filter(s => s.id !== item.id));
            setPriceDrafts(prev => {
                const next = { ...prev };
                delete next[item.id];
                return next;
            });
        } else {
            setSelectedServices([...selectedServices, {
                id: item.id,
                name: item.name,
                category,
                price: item.defaultPrice,
                description: item.description // Ensure description is passed
            }]);
            setPriceDrafts(prev => ({ ...prev, [item.id]: String(item.defaultPrice) }));
        }
    };

    const handlePriceChange = (id: string, newPrice: string) => {
        setPriceDrafts(prev => ({ ...prev, [id]: newPrice }));

        const normalizedPrice = newPrice.replace(',', '.');
        const price = normalizedPrice.trim() === '' ? 0 : Number(normalizedPrice);
        if (Number.isNaN(price)) return;

        setSelectedServices(selectedServices.map(s => s.id === id ? { ...s, price } : s));
    };

    const isSelected = (id: string) => selectedServices.some(s => s.id === id);
    const subtotal = selectedServices.reduce((acc, curr) => acc + curr.price, 0);
    const parsedManualTotal = parseMoneyInput(totalFinalDraft);
    const totalFinal = isManualTotal && parsedManualTotal !== null ? parsedManualTotal : subtotal;

    const handleManualTotalFocus = () => {
        if (isManualTotal) return;
        setIsManualTotal(true);
        setTotalFinalDraft(formatMoney(subtotal));
    };

    const handleManualTotalChange = (value: string) => {
        setIsManualTotal(true);
        setTotalFinalDraft(value);
    };

    const handleResetTotal = () => {
        setIsManualTotal(false);
        setTotalFinalDraft('');
    };

    const handleSaveProposal = async () => {
        if (!clientName || selectedServices.length === 0) {
            alert('Por favor, informe o nome do cliente e selecione ao menos um servico.');
            return;
        }

        try {
            setIsDownloading(true);
            const finalTotal = isManualTotal && parsedManualTotal !== null ? parsedManualTotal : subtotal;

            if (clientEmail) {
                setEmailStatus('idle');
                await sendProposalEmail({
                    email: clientEmail,
                    clientName,
                    selectedServices,
                    total: finalTotal
                });
                setEmailStatus('success');
                setTimeout(() => setEmailStatus('idle'), 5000);
            }

            const proposalPayload = {
                clientId: selectedClientId ? Number(selectedClientId) : undefined,
                clientName,
                clientEmail,
                selectedServices,
                total: finalTotal
            };

            if (editingProposalId) {
                await updateProposal(editingProposalId, proposalPayload);
            } else {
                await createProposal(proposalPayload);
            }

            const blob = await downloadProposalPdf({
                clientName,
                selectedServices,
                total: finalTotal
            });

            const url = window.URL.createObjectURL(new Blob([blob]));
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', `proposta_${clientName.replace(/\s+/g, '_').toLowerCase()}.pdf`);
            document.body.appendChild(link);
            link.click();
            link.parentNode?.removeChild(link);
            window.URL.revokeObjectURL(url);

            setTimeout(() => {
                router.push(`/admin/proposals?updated=${Date.now()}`);
            }, 250);
        } catch (error) {
            console.error('Erro na acao:', error);
            alert('Houve um erro ao processar a proposta.');
        } finally {
            setIsDownloading(false);
        }
    };

    const renderCategory = (title: string, data: ProposalItem[], categoryStr: string) => (
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
                                        <p className="text-[10px] text-slate-500 mt-1 leading-snug">
                                            {item.description}
                                        </p>
                                    )}
                                    <div className="mt-3">
                                        {selected ? (
                                            <div className="flex items-center gap-2">
                                                <span className="text-slate-400 text-sm">R$</span>
                                                <input
                                                    type="text"
                                                    inputMode="decimal"
                                                    value={priceDrafts[item.id] ?? (currentService?.price ? String(currentService.price) : '')}
                                                    onChange={(e) => handlePriceChange(item.id, e.target.value)}
                                                    placeholder="0"
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
            {/* O CONTEÃƒÅ¡DO VISÃƒÂVEL NO ADMIN (ESCONDIDO NA IMPRESSÃƒÆ’O) */}
            <div className="max-w-6xl mx-auto space-y-10 pb-40 print:hidden relative z-10">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                    <div>
                        <Link href="/admin/proposals" className="flex items-center gap-2 text-slate-400 hover:text-white transition-colors mb-4 text-sm font-bold uppercase tracking-widest">
                            <ArrowLeft className="w-4 h-4" />
                            Voltar
                        </Link>
                        <h1 className="text-4xl font-bold uppercase tracking-tighter text-white flex items-center gap-3">
                            <Plus className="w-8 h-8 text-blue-500" />
                            {editingProposalId ? "Editar Proposta" : "Nova Proposta"}
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

                {isLoadingProposal && (
                    <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 flex items-center gap-3 text-slate-300">
                        <Loader2 className="animate-spin text-blue-500" size={20} />
                        <span className="text-sm font-bold uppercase tracking-widest">Carregando proposta...</span>
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
                        <div className="space-y-3 md:col-span-2">
                            <label className="text-xs font-bold uppercase text-slate-500 tracking-widest ml-1">Cliente vinculado</label>
                            <select
                                value={selectedClientId}
                                onChange={e => handleClientSelect(e.target.value)}
                                className="w-full bg-slate-950/50 border border-slate-800 rounded-2xl p-4 text-white focus:border-blue-500 focus:ring-1 focus:ring-blue-500/20 transition-all outline-none"
                            >
                                <option value="">Sem vÃƒÂ­nculo / preencher manualmente</option>
                                {clients.map(client => (
                                    <option key={client.id} value={client.id}>
                                        {client.name} {client.email ? `- ${client.email}` : ""}
                                    </option>
                                ))}
                            </select>
                        </div>
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
                    {renderCategory("TrÃƒÂ¡fego Pago", dataTrafego, "TrÃƒÂ¡fego Pago")}
                    {renderCategory("Audiovisual / Fotos", dataAudiovisual, "Audiovisual / Fotos")}
                    {renderCategory("Artes Adicionais", dataArtes, "Artes Adicionais")}
                    {renderCategory("Fotografia", dataFotografia, "Fotografia")}
                    {renderCategory("VÃƒÂ­deo", dataVideo, "VÃƒÂ­deo")}
                    {renderCategory("Combos Foto + VÃƒÂ­deo", dataCombos, "Combos Foto + VÃƒÂ­deo")}
                    {renderCategory("Storymaker", dataStorymaker, "Storymaker")}
                    {renderCategory("15 anos", data15Anos, "15 anos")}
                    {renderCategory("Fotografia AniversÃ¡rio", dataAniversarioFoto, "Fotografia AniversÃ¡rio")}
                    {renderCategory("VÃ­deo AniversÃ¡rio", dataAniversarioVideo, "VÃ­deo AniversÃ¡rio")}
                    {renderCategory("Combos Foto + VÃ­deo AniversÃ¡rio", dataAniversarioCombo, "Combos Foto + VÃ­deo AniversÃ¡rio")}
                    {renderCategory("Fotografia â€” ChÃ¡ RevelaÃ§Ã£o & ChÃ¡ de Fralda", dataChaRevelacaoFoto, "Fotografia â€” ChÃ¡ RevelaÃ§Ã£o & ChÃ¡ de Fralda")}
                    {renderCategory("VÃ­deo â€” ChÃ¡ RevelaÃ§Ã£o", dataChaRevelacaoVideo, "VÃ­deo â€” ChÃ¡ RevelaÃ§Ã£o")}
                    {renderCategory("VÃ­deo â€” ChÃ¡ de Fralda", dataChaFraldaVideo, "VÃ­deo â€” ChÃ¡ de Fralda")}
                    {renderCategory("Combo Foto + VÃ­deo â€” ChÃ¡ RevelaÃ§Ã£o", dataChaRevelacaoCombo, "Combo Foto + VÃ­deo â€” ChÃ¡ RevelaÃ§Ã£o")}
                    {renderCategory("Combo Foto + VÃ­deo â€” ChÃ¡ de Fralda", dataChaFraldaCombo, "Combo Foto + VÃ­deo â€” ChÃ¡ de Fralda")}
                    {renderCategory("Combo Especial â€” ChÃ¡ RevelaÃ§Ã£o + ChÃ¡ de Fralda Juntos", dataChaJuntosCombo, "Combo Especial â€” ChÃ¡ RevelaÃ§Ã£o + ChÃ¡ de Fralda Juntos")}
                </div>
            </div>

            {/* Header Fixo Inferior com Resumo e AÃƒÂ§ÃƒÂ£o */}
            <div className="fixed bottom-0 left-0 md:left-64 right-0 bg-slate-900/90 backdrop-blur-xl border-t border-slate-800 py-3 px-6 z-40 print:hidden shadow-[0_-20px_50px_rgba(0,0,0,0.5)]">
                <div className="max-w-6xl mx-auto flex flex-col md:flex-row justify-between items-center gap-4">
                    <div className="flex flex-col text-center md:text-left gap-1">
                        <span className="text-slate-400 text-[10px] font-bold uppercase tracking-[0.2em]">{selectedServices.length} serviÃƒÂ§os selecionados</span>
                        <span className="text-white text-xl font-black tracking-tighter flex items-center gap-2 justify-center md:justify-start">
                            Total final: R$ {formatMoney(totalFinal)}
                            {isManualTotal && (
                                <span className="text-[10px] px-2 py-1 rounded-full bg-blue-500/15 text-blue-300 border border-blue-500/30 uppercase tracking-[0.2em]">
                                    Manual
                                </span>
                            )}
                        </span>
                    </div>

                    <div className="flex flex-col md:flex-row items-center gap-3 w-full md:w-auto">
                        <div className="flex items-center gap-3 w-full md:w-[320px]">
                            <input
                                type="text"
                                inputMode="decimal"
                                value={isManualTotal ? totalFinalDraft : formatMoney(subtotal)}
                                onFocus={handleManualTotalFocus}
                                onChange={e => handleManualTotalChange(e.target.value)}
                                onBlur={() => {
                                    if (!isManualTotal) return;
                                    const parsed = parseMoneyInput(totalFinalDraft);
                                    if (parsed === null) {
                                        setTotalFinalDraft(formatMoney(subtotal));
                                    }
                                }}
                                className="w-full bg-slate-950/70 border border-slate-700 rounded-xl px-4 py-3 text-white font-mono text-lg focus:border-blue-500 focus:outline-none"
                                aria-label="Valor final da proposta"
                            />
                            <button
                                type="button"
                                onClick={handleResetTotal}
                                className="whitespace-nowrap px-4 py-3 rounded-xl border border-slate-700 text-slate-200 hover:border-blue-500 hover:text-white transition-colors text-sm font-bold uppercase tracking-[0.15em]"
                            >
                                AutomÃƒÂ¡tico
                            </button>
                        </div>
                        <button
                            onClick={handleSaveProposal}
                            disabled={isDownloading || isLoadingProposal || selectedServices.length === 0}
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
                                    <span className="text-sm">
                                        {editingProposalId ? (clientEmail ? 'Salvar, Enviar e Baixar' : 'Salvar e Baixar') : (clientEmail ? 'Enviar e Baixar' : 'Baixar Proposta')}
                                    </span>
                                </>
                            )}
                        </button>
                    </div>
                </div>
            </div>

            {/* LAYOUT DE IMPRESSÃƒÆ’O (PDF) */}
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
                <ProposalServices selectedServices={selectedServices} subtotal={subtotal} total={totalFinal} />
                <ProposalClosing />
            </div>
        </div>
    );
}
