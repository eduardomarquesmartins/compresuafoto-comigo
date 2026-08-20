"use client";

import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { createPortal, flushSync } from "react-dom";
import { ArrowLeft, ArrowRight, Expand, Megaphone, Monitor, Pause, Play, RotateCcw, X } from "lucide-react";
import { motion } from "framer-motion";

const formUrl = "https://docs.google.com/forms/d/e/1FAIpQLSfAkyeXUOrtnlk0QTrBMGkleWwEryJTlIRLEKcya1_e53d2bQ/viewform";

type ImageSlide = { kind: "image"; title: string; src: string };
type FormSlide = { kind: "form"; title: string };
type IntroSlide = {
    kind: "intro";
    title: string;
    chapter?: string;
    year?: string;
    subtitle?: string;
    body?: string;
    emphasis?: string;
    quote?: string;
};
type CaseSlide = {
    kind: "case";
    title: string;
    leftImage?: { src: string; alt: string };
    rightImage?: { src: string; alt: string };
    singleImage?: { src: string; alt: string };
};
type PairSlide = {
    kind: "pair";
    title: string;
    leftSrc: string;
    rightSrc: string;
    leftAlt?: string;
    rightAlt?: string;
};
type Slide = ImageSlide | FormSlide | IntroSlide | CaseSlide | PairSlide;

const introSlides: IntroSlide[] = [
    { kind: "intro", title: "CONHEÇA MAIS" },
    {
        kind: "intro",
        chapter: "CAPÍTULO 01 • O PONTO DE PARTIDA",
        year: "2018",
        title: "Primeiros Passos no Marketing",
        subtitle: "Da atuação no varejo à descoberta da criação de conteúdo",
        body: "Tudo começou em 2018 quando, trabalhando como caixa em um shopping, surgiu a oportunidade de uma promoção para vendedora. Ao perceber o potencial transformador das redes sociais para impulsionar as vendas, a estratégia de elaboração de conteúdo tomou forma.",
        emphasis: "Disponibilizando-se para tirar fotos, gravar vídeos e até atuar como modelo, a paixão pela criação de conteúdo floresceu — incluindo a criação de uma rede social própria para comercialização de cosméticos."
    },
    {
        kind: "intro",
        chapter: "CAPÍTULO 02 • EXPANSÃO E GESTÃO",
        year: "2019",
        title: "Crescimento & Novas Oportunidades",
        subtitle: "Assumindo a liderança de redes sociais de matriz e filial",
        body: "Em 2019, uma nova jornada teve início. Com rápido destaque pelas habilidades estratégicas no marketing, veio a responsabilidade integral pela gestão das redes sociais, tanto da matriz quanto da filial.",
        emphasis: "Cada campanha e publicação refletiam um domínio crescente das ferramentas digitais, com compromisso inegociável por inovação e eficácia de resultados."
    },
    {
        kind: "intro",
        chapter: "CAPÍTULO 03 • O GRANDE DESAFIO",
        year: "2020",
        title: "Campanha Política & Identidade Visual",
        subtitle: "Agenciamento completo, velocidade de entrega e posicionamento",
        body: "Em 2020, surgiu o desafio de agenciar uma campanha política de ponta a ponta. Um trabalho que exigiu criatividade máxima, organização e rapidez na elaboração de toda a identidade visual da campanha: panfletos, cartões de visita, bandeiras e adesivos.",
        emphasis: "Um marco decisivo que comprovou a capacidade de entrega sob pressão e fortaleceu a visão estratégica de comunicação."
    },
    {
        kind: "intro",
        chapter: "CAPÍTULO 04 • ESTUDO E PRIMEIROS CLIENTES",
        year: "2021",
        title: "Faculdade de Marketing & Primeiras Parcerias",
        subtitle: "O início da graduação e a conquista das primeiras empresas parceiras",
        body: "2021 foi um ano de evolução acelerada. Ingressou na faculdade de Marketing e, em 7 de agosto, conquistou o primeiro cliente oficial para criar uma presença digital do zero — o primeiro de muitos.",
        emphasis: "Ainda em 2021, a atuação na Crefisa agregou profundo conhecimento do setor financeiro, elevando os padrões de análise e execução."
    },
    {
        kind: "intro",
        chapter: "CAPÍTULO 05 • EXPERIÊNCIA CORPORATIVA",
        year: "2022",
        title: "A Bagagem na Macromac",
        subtitle: "Última atuação corporativa CLT antes do salto ao empreendedorismo",
        body: "Em 2022, iniciou seu trabalho na Macromac, sua última experiência corporativa CLT. Contribuiu ativamente na elaboração de apresentações estratégicas, materiais executivos e cursos internos.",
        emphasis: "Uma vivência enriquecedora que lapidou a visão corporativa e a determinação de fundar sua própria agência."
    },
    {
        kind: "intro",
        chapter: "CAPÍTULO 06 • CONQUISTA ACADÊMICA",
        year: "2022",
        title: "Formatura em Marketing",
        subtitle: "Celebração do diploma e consolidação do conhecimento",
        body: "Em 2022, Duda celebrou a formatura na faculdade de Marketing, coroando anos de dedicação entre trabalho e estudo intenso.",
        emphasis: "Com fundamentação teórica sólida e ampla bagagem prática, estava mais preparada do que nunca para liderar sua própria empresa com excelência."
    },
    {
        kind: "intro",
        chapter: "CAPÍTULO 07 • A GRANDE DECISÃO",
        year: "2023",
        title: "O Nascimento da &CONTI",
        subtitle: "A virada de chave para transformar marcas",
        body: "Após pedir demissão da Macromac, tomou a decisão corajosa de fundar oficialmente a &CONTI. Dos dias de shopping à formação acadêmica, cada passo convergiu para este propósito.",
        emphasis: "A &CONTI nasceu para entregar soluções inovadoras de marketing digital, gerando valor tangível e impacto positivo real para cada cliente parceiro."
    },
    {
        kind: "intro",
        chapter: "CAPÍTULO 08 • CONSOLIDAÇÃO",
        year: "2024",
        title: "+70 Empresas Atendidas no Ano",
        subtitle: "Crescimento acelerado e impacto em múltiplos segmentos",
        body: "Durante este ano, a &CONTI consolidou sua operação e atingiu a marca histórica de mais de 70 empresas atendidas, transformando o posicionamento digital de marcas no comércio, serviços, gastronomia e indústrias.",
        quote: "Se você deseja algo, vá até o final com determinação e paixão."
    },
    {
        kind: "intro",
        chapter: "CAPÍTULO 09 • EXPANSÃO E LIDERANÇA",
        year: "2024",
        title: "Grandes Marcas & Direção Institucional",
        subtitle: "Produções de padrão cinema e liderança na comunicação pública",
        body: "Atingimos um novo patamar técnico com produções dinâmicas e coberturas para marcas de expressão nacional como Mercado Livre e Stock Car Pro Series.",
        emphasis: "Consolidando a maturidade na gestão estratégica, Duda assumiu como Diretora de Comunicação da Câmara de Viamão, comandando a comunicação pública institucional."
    },
    {
        kind: "intro",
        chapter: "CAPÍTULO 10 • GRANDES PRODUÇÕES",
        year: "2025",
        title: "+CLIENTES & Produções",
        subtitle: "Coberturas de grande escala e evolução contínua",
        body: "Em 2025, mantivemos a liderança na Câmara de Vereadores e aceleramos o volume de produções.",
        emphasis: "Consolidação da autoridade em comunicação institucional e execução de projetos audiovisuais e estratégicos de grande porte."
    },
    {
        kind: "intro",
        chapter: "CAPÍTULO 11 • O NOSSO PRESENTE",
        year: "2026",
        title: "Vivendo 100% da &CONTI",
        subtitle: "Dedicação integral.",
        body: "Em 2026, demos o passo definitivo: pedimos demissão dos nossos cargos e passamos a viver exclusivamente da &CONTI.",
        emphasis: "Com parque de equipamentos próprio, equipe dedicada e estúdio estruturado, transformamos o nosso sonho na nossa realidade de todos os dias."
    }
];

const caseSlides: CaseSlide[] = [
    {
        kind: "case",
        title: "Case 1 Milhão - Parte 1",
        leftImage: { src: "/apresentacao/case-1milhao-1.jpg", alt: "Esse vídeo bateu 1 milhão de visualizações" },
        rightImage: { src: "/apresentacao/case-1milhao-2.jpg", alt: "Sem tráfego pago - 1.026.282 visualizações" }
    },
    {
        kind: "case",
        title: "Case 1 Milhão - Parte 2",
        leftImage: { src: "/apresentacao/case-1milhao-3.jpg", alt: "64 mil compartilhamentos" },
        rightImage: { src: "/apresentacao/case-1milhao-4.jpg", alt: "A própria marca comentou (Baly)" }
    },
    {
        kind: "case",
        title: "Case 1 Milhão - Parte 3",
        leftImage: { src: "/apresentacao/case-1milhao-5.jpg", alt: "E o melhor: gerou vendas!" },
        rightImage: { src: "/apresentacao/case-1milhao-6.jpg", alt: "Isso não é sorte, é estratégia - &CONTI" }
    }
];

const singlePortfolioSlides: ImageSlide[] = [1, 2, 3, 4, 5, 8, 9].map((num) => ({
    kind: "image",
    title: `Slide ${num}`,
    src: `/apresentacao/${num}.png`
}));

const beforeAfterPairSlide: PairSlide = {
    kind: "pair",
    title: "Embelezamento Visual & Antes/Depois",
    leftSrc: "/apresentacao/10.png",
    rightSrc: "/apresentacao/11.png",
    leftAlt: "Embelezamento Visual - Sinval Transportes",
    rightAlt: "Antes e Depois - Gracie Barra"
};

const remainingPortfolioSlides: ImageSlide[] = [12, 13].map((num) => ({
    kind: "image",
    title: `Slide ${num}`,
    src: `/apresentacao/${num}.png`
}));

const lastSlide: ImageSlide = {
    kind: "image",
    title: "Slide 14",
    src: "/apresentacao/14.png"
};

const slides: Slide[] = [
    ...introSlides,
    ...singlePortfolioSlides,
    beforeAfterPairSlide,
    ...caseSlides,
    ...remainingPortfolioSlides,
    { kind: "form", title: "Formulário de conteúdos do mês" },
    lastSlide
];

const common = "relative m-auto w-full max-w-7xl px-4 py-8 sm:px-8 md:px-12";

function EditorialHeader({ year, title, subtitle }: { chapter?: string; year?: string; title: string; subtitle?: string }) {
    return (
        <header className="mb-6 flex flex-col md:flex-row md:items-end md:justify-between gap-4 border-b border-white/20 pb-5 font-sans">
            <div className="space-y-1.5">
                <h2 className="text-2xl sm:text-3xl lg:text-4xl font-medium tracking-tight text-white uppercase leading-tight">
                    {title}
                </h2>
                {subtitle && (
                    <p className="text-xs sm:text-sm font-normal uppercase tracking-[0.35em] text-black max-w-3xl">
                        {subtitle}
                    </p>
                )}
            </div>

            {year && (
                <div className="flex items-center md:items-end justify-start md:justify-end text-right">
                    <p className="text-5xl sm:text-6xl lg:text-7xl font-medium tracking-tight text-white font-sans">
                        {year}
                    </p>
                </div>
            )}
        </header>
    );
}

function Tape({ className = "" }: { className?: string }) {
    return (
        <div className={`pointer-events-none absolute h-4 w-16 -rotate-3 bg-white/80 border border-white/40 backdrop-blur-xs shadow-xs z-30 ${className}`} aria-hidden="true" />
    );
}

function QuoteGraphic() {
    return (
        <svg className="absolute -right-2 -top-6 h-16 w-20 text-white/20" viewBox="0 0 120 80" aria-hidden="true">
            <path d="M9 7h39v32c0 23-14 34-37 35V57c10-1 16-6 17-16H9V7Zm62 0h39v32c0 23-14 34-37 35V57c10-1 16-6 17-16H71V7Z" fill="currentColor" />
        </svg>
    );
}

const CONTI_LETTERS = ["&", "C", "O", "N", "T", "I"] as const;

const CONTI_ANIMATION_KEYFRAMES = CONTI_LETTERS.map((_, index) => {
    const totalSteps = 10;
    const t1 = index / totalSteps;
    const t2 = (totalSteps - index) / totalSteps;
    const halfWidth = 0.085;
    const sampleCount = 45;

    const y: number[] = [];
    const scale: number[] = [];
    const times: number[] = [];

    for (let k = 0; k < sampleCount; k++) {
        const t = k / (sampleCount - 1);
        times.push(t);

        const d1 = Math.min(Math.abs(t - t1), 1 - Math.abs(t - t1));
        const d2 = Math.min(Math.abs(t - t2), 1 - Math.abs(t - t2));
        const d = Math.min(d1, d2);

        let factor = 0;
        if (d < halfWidth) {
            const angle = (d / halfWidth) * (Math.PI / 2);
            factor = Math.pow(Math.cos(angle), 2);
        }

        y.push(Number((-26 * factor).toFixed(2)));
        scale.push(Number((1 + 0.07 * factor).toFixed(3)));
    }

    return { y, scale, times };
});

function IntroTimelineSlide({ slide, onNext }: { slide: IntroSlide; onNext?: () => void }) {
    if (!slide.year) {
        return (
            <article className="relative flex h-full w-full flex-col items-center justify-center overflow-hidden bg-[#2f7fde] text-white px-6 py-12 select-none font-sans" aria-label="Conheça mais - &CONTI">
                <div className="relative z-10 flex h-full w-full max-w-6xl flex-col items-center justify-between py-6 text-center">
                    <div className="h-4 sm:h-8" />

                    {/* Full Seamless Center Logo with letter-by-letter wave jumping animation */}
                    <div className="flex flex-col items-center justify-center my-auto">
                        <h1 className="flex items-center justify-center text-6xl font-medium tracking-tight text-white sm:text-8xl md:text-9xl lg:text-[11rem] leading-none font-sans select-none">
                            {CONTI_LETTERS.map((char, index) => {
                                const { y, scale, times } = CONTI_ANIMATION_KEYFRAMES[index];
                                return (
                                    <motion.span
                                        key={index}
                                        className="inline-block origin-bottom will-change-transform"
                                        animate={{
                                            y,
                                            scale,
                                        }}
                                        transition={{
                                            duration: 4.8,
                                            repeat: Infinity,
                                            ease: "linear",
                                            times,
                                        }}
                                    >
                                        {char}
                                    </motion.span>
                                );
                            })}
                        </h1>
                        <p className="mt-3 sm:mt-5 text-lg sm:text-xl md:text-2xl lg:text-3xl font-semibold uppercase tracking-[0.45em] text-black font-sans">
                            MARKETING DIGITAL
                        </p>
                    </div>

                    {/* "Conheça mais" with animated right arrow */}
                    <div className="pt-6 pb-2">
                        <motion.button
                            type="button"
                            onClick={onNext}
                            className="group inline-flex items-center gap-3 sm:gap-4 rounded-full px-6 py-2.5 sm:px-8 sm:py-3 text-xl sm:text-2xl md:text-3xl font-semibold uppercase tracking-[0.25em] text-white/95 transition-all duration-300 hover:text-white hover:bg-white/10 hover:shadow-lg focus:outline-hidden cursor-pointer"
                            aria-label="Conheça mais - Avançar"
                            animate={{
                                scale: [1, 1.025, 1],
                            }}
                            transition={{
                                repeat: Infinity,
                                duration: 2,
                                ease: "easeInOut",
                            }}
                            whileHover={{ scale: 1.06 }}
                            whileTap={{ scale: 0.95 }}
                        >
                            <span>CONHEÇA MAIS</span>
                            <motion.span
                                className="inline-flex items-center justify-center text-white"
                                animate={{
                                    x: [0, 8, 0],
                                }}
                                transition={{
                                    repeat: Infinity,
                                    duration: 1.2,
                                    ease: "easeInOut",
                                }}
                            >
                                <ArrowRight className="h-6 w-6 sm:h-7 sm:w-7 md:h-8 md:w-8 transition-transform group-hover:translate-x-1.5" strokeWidth={2.8} />
                            </motion.span>
                        </motion.button>
                    </div>
                </div>
            </article>
        );
    }

    return (
        <article className="relative flex min-h-full h-full w-full flex-col justify-center overflow-y-auto overflow-x-hidden no-scrollbar bg-[#2f7fde] text-white font-sans" aria-label={`${slide.year}: ${slide.title}`}>
            {/* Ambient Background Glows */}
            <div className="pointer-events-none absolute -left-20 top-0 h-96 w-96 rounded-full bg-white/5 blur-3xl" />
            <div className="pointer-events-none absolute -right-20 bottom-0 h-96 w-96 rounded-full bg-black/10 blur-3xl" />

            {slide.year === "2018" && (
                <div className={common}>
                    <EditorialHeader chapter={slide.chapter} year={slide.year} title={slide.title} subtitle={slide.subtitle} />
                    <div className="mt-4 grid gap-8 lg:grid-cols-[1.1fr_1.1fr] items-center">
                        <div className="space-y-4">
                            <div className="rounded-3xl bg-white p-6 sm:p-7 shadow-2xl text-slate-900 space-y-4">
                                <p className="text-base sm:text-lg font-normal leading-relaxed text-slate-800">
                                    {slide.body}
                                </p>
                                <div className="rounded-2xl border-l-4 border-[#2f7fde] bg-slate-50 p-4">
                                    <p className="text-sm sm:text-base font-medium leading-snug text-slate-900">
                                        {slide.emphasis}
                                    </p>
                                </div>
                            </div>
                        </div>

                        {/* Clean Non-Overlapping Gallery */}
                        <div className="space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                {/* Photo 1 */}
                                <div className="animate-in fade-in zoom-in-75 duration-700 animate-float-slow relative overflow-hidden rounded-2xl border-2 border-white/90 shadow-2xl transition-all hover:scale-105">
                                    <Tape className="-top-3 left-6" />
                                    <img src="/apresentacao/2018-1.jpg" alt="Eduarda Conti em 2018" className="h-56 sm:h-64 w-full object-cover" style={{ objectPosition: "left top" }} />
                                </div>

                                {/* Photo 2 */}
                                <div className="animate-in fade-in zoom-in-75 duration-700 delay-150 animate-float-reverse relative overflow-hidden rounded-2xl border-2 border-white/90 shadow-2xl transition-all hover:scale-105">
                                    <Tape className="-top-3 right-6" />
                                    <img src="/apresentacao/2018-2.jpg" alt="Início das produções de conteúdo" className="h-56 sm:h-64 w-full object-cover object-top" />
                                </div>
                            </div>

                            {/* First Consultant Logo Card */}
                            <div className="animate-in fade-in zoom-in-90 duration-700 delay-300 animate-float-gentle rounded-2xl border border-white/30 bg-white p-3 text-center shadow-2xl transition-transform hover:scale-102 flex items-center justify-center gap-4">
                                <img src="/apresentacao/2018-logo.png" alt="Primeira logo consultora Eduarda Conti" className="h-20 sm:h-24 w-auto object-contain" />
                                <div className="text-left">
                                    <span className="block text-[11px] font-normal uppercase tracking-[0.25em] text-black">
                                        1ª Identidade Visual
                                    </span>
                                    <p className="text-xs text-slate-600 font-medium">Consultora Eduarda Conti</p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {slide.year === "2019" && (
                <div className={common}>
                    <EditorialHeader chapter={slide.chapter} year={slide.year} title={slide.title} subtitle={slide.subtitle} />
                    <div className="mt-4 grid gap-8 lg:grid-cols-[1fr_1.2fr] items-center">
                        <div className="space-y-4">
                            <div className="rounded-3xl bg-white p-6 sm:p-7 shadow-2xl text-slate-900 space-y-4">
                                <p className="text-base sm:text-lg font-normal leading-relaxed text-slate-800">
                                    {slide.body}
                                </p>
                                <div className="rounded-2xl border-l-4 border-[#2f7fde] bg-slate-50 p-4">
                                    <p className="text-sm sm:text-base font-medium leading-snug text-slate-900">
                                        {slide.emphasis}
                                    </p>
                                </div>
                            </div>
                        </div>

                        {/* Clean 3-Column Side-by-Side Gallery */}
                        <div className="grid grid-cols-3 gap-3.5">
                            <div className="animate-in fade-in zoom-in-75 duration-700 animate-float-slow relative overflow-hidden rounded-2xl border-2 border-white/90 shadow-2xl transition-all hover:scale-105">
                                <Tape className="-top-3 left-4" />
                                <img src="/apresentacao/2019-1.jpg" alt="Gestão de marketing 2019" className="h-60 sm:h-64 w-full object-cover object-top" />
                            </div>
                            <div className="animate-in fade-in zoom-in-75 duration-700 delay-150 animate-float-reverse relative overflow-hidden rounded-2xl border-2 border-white/90 shadow-2xl transition-all hover:scale-105">
                                <Tape className="-top-3 left-4" />
                                <img src="/apresentacao/2019-2.jpg" alt="Crescimento profissional 2019" className="h-60 sm:h-64 w-full object-cover object-top" />
                            </div>
                            <div className="animate-in fade-in zoom-in-75 duration-700 delay-300 animate-float-gentle relative overflow-hidden rounded-2xl border-2 border-white/90 shadow-2xl transition-all hover:scale-105">
                                <Tape className="-top-3 right-4" />
                                <img src="/apresentacao/2019-3.jpg" alt="Apresentação de resultados 2019" className="h-60 sm:h-64 w-full object-cover object-top" />
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {slide.year === "2020" && (
                <div className={common}>
                    <EditorialHeader chapter={slide.chapter} year={slide.year} title={slide.title} subtitle={slide.subtitle} />
                    <div className="mt-4 grid gap-8 lg:grid-cols-[1fr_1.1fr] items-center">
                        <div className="space-y-4">
                            <div className="rounded-3xl bg-white p-6 sm:p-7 shadow-2xl text-slate-900 space-y-4">
                                <p className="text-base sm:text-lg font-normal leading-relaxed text-slate-800">
                                    {slide.body}
                                </p>
                                <div className="rounded-2xl border-l-4 border-[#2f7fde] bg-slate-50 p-4">
                                    <p className="text-sm sm:text-base font-medium leading-snug text-slate-900">
                                        {slide.emphasis}
                                    </p>
                                </div>
                            </div>
                        </div>

                        {/* Clean 2-Column Side-by-Side Gallery */}
                        <div className="grid grid-cols-2 gap-4">
                            <div className="animate-in fade-in zoom-in-75 duration-700 animate-float-slow relative overflow-hidden rounded-2xl border-2 border-white/90 shadow-2xl transition-all hover:scale-105">
                                <Tape className="-top-3 left-6" />
                                <img src="/apresentacao/2020-1.jpg" alt="Campanha Política 2020" className="h-64 sm:h-72 w-full object-cover object-top" />
                            </div>
                            <div className="animate-in fade-in zoom-in-75 duration-700 delay-200 animate-float-reverse relative overflow-hidden rounded-2xl border-2 border-white/90 shadow-2xl transition-all hover:scale-105">
                                <Tape className="-top-3 right-6" />
                                <img src="/apresentacao/2020-2.jpg" alt="Materiais de Identidade Visual 2020" className="h-64 sm:h-72 w-full object-cover object-top" />
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {slide.year === "2021" && (
                <div className={common}>
                    <EditorialHeader chapter={slide.chapter} year={slide.year} title={slide.title} subtitle={slide.subtitle} />
                    <div className="mt-4 grid gap-8 lg:grid-cols-[1.1fr_1fr] items-center">
                        <div className="space-y-4">
                            <div className="rounded-3xl bg-white p-6 sm:p-7 shadow-2xl text-slate-900 space-y-4">
                                <p className="text-base sm:text-lg font-normal leading-relaxed text-slate-800">
                                    {slide.body}
                                </p>
                                <div className="rounded-2xl border-l-4 border-[#2f7fde] bg-slate-50 p-4">
                                    <p className="text-sm sm:text-base font-medium leading-snug text-slate-900">
                                        {slide.emphasis}
                                    </p>
                                </div>
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="animate-in fade-in zoom-in-75 duration-700 delay-75 animate-float-slow flex flex-col items-center justify-center rounded-2xl border border-white/30 bg-white p-3.5 shadow-xl transition-all hover:scale-105">
                                <img src="/apresentacao/2021-donnavall.jpg" alt="Cliente Donna Vall" className="h-20 w-auto object-contain" />
                                <span className="mt-2 text-[11px] font-normal uppercase tracking-[0.2em] text-black">DONNA VALL</span>
                            </div>
                            <div className="animate-in fade-in zoom-in-75 duration-700 delay-150 animate-float-reverse flex flex-col items-center justify-center rounded-2xl border border-white/30 bg-white p-3.5 shadow-xl transition-all hover:scale-105">
                                <img src="/apresentacao/2021-tuttipromo.jpg" alt="Cliente Tuttipromo" className="h-20 w-auto object-cover rounded-lg" />
                                <span className="mt-2 text-[11px] font-normal uppercase tracking-[0.2em] text-black">tuttipromo</span>
                            </div>
                            <div className="animate-in fade-in zoom-in-75 duration-700 delay-225 animate-float-slow flex flex-col items-center justify-center rounded-2xl border border-white/30 bg-[#251e1a] p-3.5 shadow-xl transition-all hover:scale-105">
                                <img src="/apresentacao/2021-barbearia.jpg" alt="Barbearia Enéias Bittencourt" className="h-20 w-auto object-contain" />
                                <span className="mt-2 text-[11px] font-normal uppercase tracking-[0.2em] text-amber-200">BARBEARIA ENÉIAS</span>
                            </div>
                            <div className="animate-in fade-in zoom-in-75 duration-700 delay-300 animate-float-reverse flex flex-col items-center justify-center rounded-2xl border border-white/30 bg-white p-3.5 shadow-xl transition-all hover:scale-105">
                                <img src="/apresentacao/2021-crefisa.jpg" alt="Crefisa Experiência Financeira" className="h-20 w-auto object-cover rounded-lg" />
                                <span className="mt-2 text-[11px] font-normal uppercase tracking-[0.2em] text-black">CREFISA</span>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {slide.year === "2022" && slide.title.includes("Macromac") && (
                <div className={common}>
                    <EditorialHeader chapter={slide.chapter} year={slide.year} title={slide.title} subtitle={slide.subtitle} />
                    <div className="mt-4 grid gap-8 lg:grid-cols-[1fr_1.2fr] items-center">
                        <div className="space-y-4">
                            <div className="rounded-3xl bg-white p-6 sm:p-7 shadow-2xl text-slate-900 space-y-4">
                                <p className="text-base sm:text-lg font-normal leading-relaxed text-slate-800">
                                    {slide.body}
                                </p>
                                <div className="rounded-2xl border-l-4 border-[#2f7fde] bg-slate-50 p-4">
                                    <p className="text-sm sm:text-base font-medium leading-snug text-slate-900">
                                        {slide.emphasis}
                                    </p>
                                </div>
                            </div>
                        </div>

                        {/* Clean 5-Photo Mosaic Gallery (3 top + 2 bottom, Zero Overlap) */}
                        <div className="space-y-3">
                            <div className="grid grid-cols-3 gap-3">
                                <div className="animate-in fade-in zoom-in-75 duration-700 delay-75 animate-float-slow overflow-hidden rounded-2xl border-2 border-white/90 shadow-2xl transition-all hover:scale-105">
                                    <img src="/apresentacao/2022-1.jpg" alt="Equipe Macromac" className="h-36 sm:h-40 w-full object-cover" style={{ objectPosition: "center center" }} />
                                </div>
                                <div className="animate-in fade-in zoom-in-75 duration-700 delay-150 animate-float-reverse overflow-hidden rounded-2xl border-2 border-white/90 shadow-2xl transition-all hover:scale-105">
                                    <img src="/apresentacao/2022-2.jpg" alt="Apresentações Corporativas" className="h-36 sm:h-40 w-full object-cover" style={{ objectPosition: "center 75%" }} />
                                </div>
                                <div className="animate-in fade-in zoom-in-75 duration-700 delay-225 animate-float-slow overflow-hidden rounded-2xl border-2 border-white/90 shadow-2xl transition-all hover:scale-105">
                                    <img src="/apresentacao/2022-3.jpg" alt="Eventos e Ações" className="h-36 sm:h-40 w-full object-cover" style={{ objectPosition: "center 30%" }} />
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                                <div className="animate-in fade-in zoom-in-75 duration-700 delay-300 animate-float-reverse overflow-hidden rounded-2xl border-2 border-white/90 shadow-2xl transition-all hover:scale-105">
                                    <img src="/apresentacao/2022-4.jpg" alt="Treinamentos e Slides" className="h-36 sm:h-40 w-full object-cover" style={{ objectPosition: "center 80%" }} />
                                </div>
                                <div className="animate-in fade-in zoom-in-75 duration-700 delay-375 animate-float-gentle overflow-hidden rounded-2xl border-2 border-white/90 shadow-2xl transition-all hover:scale-105">
                                    <img src="/apresentacao/2022-5.jpg" alt="Projetos Especiais" className="h-36 sm:h-40 w-full object-cover" style={{ objectPosition: "center center" }} />
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {slide.year === "2022" && slide.title.includes("Formatura") && (
                <div className={common}>
                    <EditorialHeader chapter={slide.chapter} year={slide.year} title={slide.title} subtitle={slide.subtitle} />
                    <div className="mt-4 grid gap-8 lg:grid-cols-[1fr_1.2fr] items-center">
                        <div className="space-y-4">
                            <div className="rounded-3xl bg-white p-6 sm:p-7 shadow-2xl text-slate-900 space-y-4">
                                <p className="text-base sm:text-lg font-normal leading-relaxed text-slate-800">
                                    {slide.body}
                                </p>
                                <div className="rounded-2xl border-l-4 border-[#2f7fde] bg-slate-50 p-4">
                                    <p className="text-sm sm:text-base font-medium leading-snug text-slate-900">
                                        {slide.emphasis}
                                    </p>
                                </div>
                            </div>
                        </div>

                        {/* Clean 3-Column Side-by-Side Gallery */}
                        <div className="grid grid-cols-3 gap-3.5">
                            <div className="animate-in fade-in zoom-in-75 duration-700 animate-float-slow relative overflow-hidden rounded-2xl border-2 border-white/90 shadow-2xl transition-all hover:scale-105">
                                <Tape className="-top-3 left-4" />
                                <img src="/apresentacao/2022-grad-1.jpg" alt="Dia do Profissional de Marketing" className="h-60 sm:h-64 w-full object-cover object-top" />
                            </div>
                            <div className="animate-in fade-in zoom-in-75 duration-700 delay-150 animate-float-reverse relative overflow-hidden rounded-2xl border-2 border-white/90 shadow-2xl transition-all hover:scale-105">
                                <Tape className="-top-3 left-4" />
                                <img src="/apresentacao/2022-grad-2.jpg" alt="Formatura em Marketing" className="h-60 sm:h-64 w-full object-cover object-top" />
                            </div>
                            <div className="animate-in fade-in zoom-in-75 duration-700 delay-300 animate-float-gentle relative overflow-hidden rounded-2xl border-2 border-white/90 shadow-2xl transition-all hover:scale-105">
                                <Tape className="-top-3 right-4" />
                                <img src="/apresentacao/2022-grad-3.jpg" alt="Diplomação" className="h-60 sm:h-64 w-full object-cover object-top" />
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {slide.year === "2023" && (
                <div className={common}>
                    <EditorialHeader chapter={slide.chapter} year={slide.year} title={slide.title} subtitle={slide.subtitle} />
                    <div className="mt-4 grid gap-8 lg:grid-cols-[1.1fr_1fr] items-center">
                        <div className="space-y-4">
                            <div className="rounded-3xl bg-white p-6 sm:p-7 shadow-2xl text-slate-900 space-y-4">
                                <p className="text-base sm:text-lg font-normal leading-relaxed text-slate-800">
                                    {slide.body}
                                </p>
                                <div className="rounded-2xl border-l-4 border-[#2f7fde] bg-slate-50 p-4">
                                    <p className="text-sm sm:text-base font-medium leading-snug text-slate-900">
                                        {slide.emphasis}
                                    </p>
                                </div>
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            {[1, 2, 3, 4].map((num, i) => (
                                <div key={num} className={`animate-in fade-in zoom-in-90 duration-500 delay-[${(i + 1) * 100}ms] animate-float-gentle overflow-hidden rounded-2xl border border-white/30 bg-white/10 backdrop-blur-xs p-1 shadow-xl transition-all hover:scale-105 flex items-center justify-center`}>
                                    <img src={`/apresentacao/2023-logo-${num}.jpg`} alt={`Conceito de logo &Conti ${num}`} className="aspect-square h-full w-full rounded-xl object-contain bg-white" />
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            )}

            {slide.year === "2024" && (slide.chapter?.includes("08") || slide.title.includes("70")) && (
                <div className={common}>
                    <EditorialHeader chapter={slide.chapter} year={slide.year} title={slide.title} subtitle={slide.subtitle} />
                    <div className="mt-4 grid gap-8 lg:grid-cols-[1.1fr_0.9fr] items-center">
                        <div className="space-y-5">
                            <div className="rounded-3xl bg-white p-6 sm:p-7 shadow-2xl text-slate-900 space-y-4">
                                <p className="text-base sm:text-lg font-normal leading-relaxed text-slate-800">
                                    {slide.body}
                                </p>
                            </div>
                            {slide.quote && (
                                <blockquote className="relative rounded-3xl bg-black p-6 sm:p-7 text-white shadow-2xl">
                                    <QuoteGraphic />
                                    <p className="text-base sm:text-xl font-medium italic leading-snug">
                                        "{slide.quote}"
                                    </p>
                                    <p className="mt-3 text-xs font-normal uppercase tracking-[0.35em] text-[#2f7fde]">
                                        Eduarda Conti • Fundadora &amp;CONTI
                                    </p>
                                </blockquote>
                            )}
                        </div>

                        <div className="mx-auto w-full max-w-sm">
                            <div className="animate-in fade-in zoom-in-90 duration-700 delay-150 animate-float-gentle overflow-hidden rounded-3xl border-2 border-white/90 shadow-2xl transition-all hover:scale-105">
                                <img src="/apresentacao/2024.jpg" alt="Eduarda Conti em 2024" className="h-full w-full object-cover object-top rounded-2xl" />
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {slide.year === "2024" && (slide.chapter?.includes("09") || slide.title.includes("Marcas") || slide.title.includes("Direção") || slide.title.includes("Impacto")) && (
                <div className={common}>
                    <EditorialHeader chapter={slide.chapter} year={slide.year} title={slide.title} subtitle={slide.subtitle} />
                    <div className="mt-4 grid gap-8 lg:grid-cols-[1fr_1.2fr] items-center">
                        <div className="space-y-4">
                            <div className="rounded-3xl bg-white p-6 sm:p-7 shadow-2xl text-slate-900 space-y-4">
                                <p className="text-base sm:text-lg font-normal leading-relaxed text-slate-800">
                                    {slide.body}
                                </p>
                                <div className="rounded-2xl border-l-4 border-[#2f7fde] bg-slate-50 p-4">
                                    <p className="text-sm sm:text-base font-medium leading-snug text-slate-900">
                                        {slide.emphasis}
                                    </p>
                                </div>
                            </div>
                        </div>

                        {/* Clean 2-Column Side-by-Side Video Projects (Zero Overlap) */}
                        <div className="grid grid-cols-2 gap-4">
                            <a
                                href="https://www.instagram.com/reel/C6Ctr7gL5vW/"
                                target="_blank"
                                rel="noreferrer"
                                title="Ver projeto Mercado Livre no Instagram"
                                className="group animate-in fade-in zoom-in-75 duration-700 delay-100 animate-float-slow block overflow-hidden rounded-2xl border-2 border-white/90 bg-slate-900 shadow-2xl transition-all duration-300 hover:scale-105"
                            >
                                <div className="relative h-56 sm:h-64 w-full overflow-hidden">
                                    <img src="/apresentacao/2024-mercadolivre.jpg" alt="Mercado Livre - Reels &CONTI" className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-110" />
                                    <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-transparent to-transparent" />
                                    <span className="absolute bottom-3 left-3 right-3 truncate rounded-full bg-black/75 px-3 py-1 text-[10px] font-normal uppercase tracking-[0.2em] text-white backdrop-blur text-center">
                                        Mercado Livre ↗
                                    </span>
                                </div>
                            </a>

                            <a
                                href="https://www.instagram.com/reel/C5hFQSwLxFZ/"
                                target="_blank"
                                rel="noreferrer"
                                title="Ver projeto Stock Car no Instagram"
                                className="group animate-in fade-in zoom-in-75 duration-700 delay-250 animate-float-reverse block overflow-hidden rounded-2xl border-2 border-white/90 bg-slate-900 shadow-2xl transition-all duration-300 hover:scale-105"
                            >
                                <div className="relative h-56 sm:h-64 w-full overflow-hidden">
                                    <img src="/apresentacao/2024-stockcar.jpg" alt="Stock Car Pro Series - Reels &CONTI" className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-110" />
                                    <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-transparent to-transparent" />
                                    <span className="absolute bottom-3 left-3 right-3 truncate rounded-full bg-black/75 px-3 py-1 text-[10px] font-normal uppercase tracking-[0.2em] text-white backdrop-blur text-center">
                                        Stock Car ↗
                                    </span>
                                </div>
                            </a>
                        </div>
                    </div>
                </div>
            )}

            {slide.year === "2025" && (
                <div className={common}>
                    <EditorialHeader chapter={slide.chapter} year={slide.year} title={slide.title} subtitle={slide.subtitle} />
                    <div className="mt-4 grid gap-8 lg:grid-cols-[1fr_1.2fr] items-center">
                        <div className="space-y-4">
                            <div className="rounded-3xl bg-white p-6 sm:p-7 shadow-2xl text-slate-900 space-y-4">
                                <p className="text-base sm:text-lg font-normal leading-relaxed text-slate-800">
                                    {slide.body}
                                </p>
                                <div className="rounded-2xl border-l-4 border-[#2f7fde] bg-slate-50 p-4">
                                    <p className="text-sm sm:text-base font-medium leading-snug text-slate-900">
                                        {slide.emphasis}
                                    </p>
                                </div>
                            </div>
                        </div>

                        {/* Featured Project Card (Câmara de Viamão) */}
                        <div className="mx-auto w-full max-w-sm sm:max-w-md">
                            <div className="animate-in fade-in zoom-in-75 duration-700 delay-150 animate-float-gentle relative overflow-hidden rounded-3xl border-2 border-white/90 bg-white p-2 shadow-2xl transition-all hover:scale-105">
                                <Tape className="-top-3 right-6" />
                                <img
                                    src="/apresentacao/2024-viamao.jpg"
                                    alt="Câmara de Vereadores de Viamão - Continuidade e Liderança"
                                    className="h-72 sm:h-80 md:h-96 w-full rounded-2xl object-cover"
                                    style={{ objectPosition: "center 75%" }}
                                />
                                <div className="mt-3 text-center pb-1">
                                    <span className="inline-block rounded-full bg-black px-3 py-1 text-[11px] font-normal uppercase tracking-[0.2em] text-white">
                                        Câmara de Viamão
                                    </span>
                                    <p className="mt-1.5 text-xs sm:text-sm font-medium text-slate-900">
                                        Liderança em Comunicação Pública Institucional
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {slide.year === "2026" && (
                <div className={common}>
                    <EditorialHeader chapter={slide.chapter} year={slide.year} title={slide.title} subtitle={slide.subtitle} />
                    <div className="mt-4 grid gap-8 lg:grid-cols-[1fr_1.2fr] items-center">
                        <div className="space-y-4">
                            <div className="rounded-3xl bg-white p-6 sm:p-7 shadow-2xl text-slate-900 space-y-4">
                                <p className="text-base sm:text-lg font-normal leading-relaxed text-slate-800">
                                    {slide.body}
                                </p>
                                <div className="rounded-2xl border-l-4 border-[#2f7fde] bg-slate-50 p-4">
                                    <p className="text-sm sm:text-base font-medium leading-snug text-slate-900">
                                        {slide.emphasis}
                                    </p>
                                </div>
                            </div>
                        </div>

                        {}
                        <div className="grid grid-cols-2 gap-4">
                            <div className="animate-in fade-in zoom-in-75 duration-700 delay-100 animate-float-slow overflow-hidden rounded-2xl border-2 border-white/90 bg-slate-900 shadow-2xl transition-all duration-300 hover:scale-105">
                                <img
                                    src="/apresentacao/2026-2.jpg"
                                    alt="Fundadores &CONTI - Vivendo do nosso negócio"
                                    className="h-64 sm:h-76 md:h-84 w-full object-cover object-top"
                                />
                            </div>
                            <div className="animate-in fade-in zoom-in-75 duration-700 delay-250 animate-float-reverse overflow-hidden rounded-2xl border-2 border-white/90 bg-slate-900 shadow-2xl transition-all duration-300 hover:scale-105">
                                <img
                                    src="/apresentacao/2026-1.jpg"
                                    alt="Produção audiovisual e equipamentos &CONTI"
                                    className="h-64 sm:h-76 md:h-84 w-full object-cover"
                                    style={{ objectPosition: "center 85%" }}
                                />
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </article>
    );
}

function CaseStudySlide({ slide }: { slide: CaseSlide }) {
    return (
        <article className="relative flex h-full w-full items-center justify-center overflow-hidden bg-gradient-to-b from-[#eef6fc] via-[#ffffff] to-[#e6f2fb] px-2 py-2 md:px-6" aria-label={slide.title}>
            {/* Ambient subtle brand glows */}
            <div className="pointer-events-none absolute -left-20 -top-20 h-96 w-96 rounded-full bg-[#00aeea]/10 blur-3xl" />
            <div className="pointer-events-none absolute -right-20 -bottom-20 h-96 w-96 rounded-full bg-[#0063b5]/10 blur-3xl" />

            <div className="relative z-10 m-auto flex h-full w-full max-w-[1700px] items-center justify-center">
                {slide.singleImage ? (
                    <div className="flex h-full w-full items-center justify-center py-2">
                        <img
                            src={slide.singleImage.src}
                            alt={slide.singleImage.alt}
                            className="max-h-[92vh] w-auto max-w-full object-contain rounded-2xl shadow-[0_20px_50px_rgba(7,59,89,0.15)] transition-transform duration-300 hover:scale-[1.01]"
                        />
                    </div>
                ) : (
                    <div className="flex h-full w-full items-center justify-center gap-1 sm:gap-2 md:gap-3">
                        {slide.leftImage && (
                            <div className="flex h-full flex-1 items-center justify-end">
                                <img
                                    src={slide.leftImage.src}
                                    alt={slide.leftImage.alt}
                                    className="max-h-[92vh] w-auto max-w-full object-contain rounded-2xl shadow-[0_20px_50px_rgba(7,59,89,0.15)] transition-transform duration-300 hover:scale-[1.01]"
                                />
                            </div>
                        )}
                        {slide.rightImage && (
                            <div className="flex h-full flex-1 items-center justify-start">
                                <img
                                    src={slide.rightImage.src}
                                    alt={slide.rightImage.alt}
                                    className="max-h-[92vh] w-auto max-w-full object-contain rounded-2xl shadow-[0_20px_50px_rgba(7,59,89,0.15)] transition-transform duration-300 hover:scale-[1.01]"
                                />
                            </div>
                        )}
                    </div>
                )}
            </div>
        </article>
    );
}

function PairSlideContent({ slide }: { slide: PairSlide }) {
    return (
        <article className="relative flex h-full w-full items-center justify-center overflow-hidden bg-gradient-to-b from-[#eef6fc] via-[#ffffff] to-[#e6f2fb] px-2 py-2 md:px-6" aria-label={slide.title}>
            {/* Ambient subtle brand glows */}
            <div className="pointer-events-none absolute -left-20 -top-20 h-96 w-96 rounded-full bg-[#00aeea]/10 blur-3xl" />
            <div className="pointer-events-none absolute -right-20 -bottom-20 h-96 w-96 rounded-full bg-[#0063b5]/10 blur-3xl" />

            <div className="relative z-10 m-auto flex h-full w-full max-w-[1700px] items-center justify-center">
                <div className="flex h-full w-full items-center justify-center gap-0 sm:gap-1 md:gap-2">
                    <div className="flex h-full flex-1 items-center justify-end">
                        <img
                            src={slide.leftSrc}
                            alt={slide.leftAlt || slide.title}
                            className="max-h-[92vh] w-auto max-w-full object-contain rounded-l-2xl shadow-[0_20px_50px_rgba(7,59,89,0.15)] transition-transform duration-300 hover:scale-[1.01]"
                        />
                    </div>
                    <div className="flex h-full flex-1 items-center justify-start">
                        <img
                            src={slide.rightSrc}
                            alt={slide.rightAlt || slide.title}
                            className="max-h-[92vh] w-auto max-w-full object-contain rounded-r-2xl shadow-[0_20px_50px_rgba(7,59,89,0.15)] transition-transform duration-300 hover:scale-[1.01]"
                        />
                    </div>
                </div>
            </div>
        </article>
    );
}

export default function AdminPresentationPage() {
    const [started, setStarted] = useState(false);
    const [currentIndex, setCurrentIndex] = useState(0);
    const [direction, setDirection] = useState<"next" | "previous">("next");
    const [showControls, setShowControls] = useState(true);
    const stageRef = useRef<HTMLDivElement>(null);
    const currentSlide = slides[currentIndex];
    const progress = useMemo(() => ((currentIndex + 1) / slides.length) * 100, [currentIndex]);

    const goNext = useCallback(() => {
        setDirection("next");
        setCurrentIndex((index) => Math.min(index + 1, slides.length - 1));
    }, []);

    const goPrevious = useCallback(() => {
        setDirection("previous");
        setCurrentIndex((index) => Math.max(index - 1, 0));
    }, []);

    const closePresentation = useCallback(() => {
        setStarted(false);
        if (document.fullscreenElement) {
            void document.exitFullscreen?.().catch(() => undefined);
        }
    }, []);

    const requestFullscreen = useCallback(() => {
        if (document.fullscreenElement) {
            void document.exitFullscreen?.().catch(() => undefined);
        } else {
            void (stageRef.current ?? document.documentElement).requestFullscreen?.();
        }
    }, []);

    const startPresentation = () => {
        flushSync(() => {
            setCurrentIndex(0);
            setStarted(true);
            setShowControls(true);
        });
        requestFullscreen();
    };

    // Auto-hide controls when user is not moving the mouse
    useEffect(() => {
        if (!started) return;
        let timer: ReturnType<typeof setTimeout>;

        const handleMouseMove = () => {
            setShowControls(true);
            clearTimeout(timer);
            timer = setTimeout(() => {
                setShowControls(false);
            }, 2500);
        };

        window.addEventListener("mousemove", handleMouseMove);
        return () => {
            clearTimeout(timer);
            window.removeEventListener("mousemove", handleMouseMove);
        };
    }, [started]);

    // Keyboard navigation
    useEffect(() => {
        if (!started) return;
        document.body.style.overflow = "hidden";
        document.documentElement.style.overflow = "hidden";

        const handleKeyDown = (event: KeyboardEvent) => {
            if (event.key === "ArrowRight" || event.key === " " || event.key === "PageDown") {
                event.preventDefault();
                goNext();
            }
            if (event.key === "ArrowLeft" || event.key === "Backspace" || event.key === "PageUp") {
                event.preventDefault();
                goPrevious();
            }
            if (event.key === "Home") {
                event.preventDefault();
                setCurrentIndex(0);
            }
            if (event.key === "End") {
                event.preventDefault();
                setCurrentIndex(slides.length - 1);
            }
            if (event.key === "Escape") {
                closePresentation();
            }
        };

        window.addEventListener("keydown", handleKeyDown);
        return () => {
            document.body.style.overflow = "";
            document.documentElement.style.overflow = "";
            window.removeEventListener("keydown", handleKeyDown);
        };
    }, [closePresentation, goNext, goPrevious, started]);

    return (
        <div className="admin-page-stack pb-12 animate-in fade-in slide-in-from-bottom-4 duration-700">
            <section className="admin-card overflow-hidden p-5 md:p-7">
                <div className="min-w-0">
                    <span className="admin-kicker">Portfólio</span>
                    <h1 className="mt-3 max-w-3xl text-4xl font-semibold leading-none tracking-[-0.055em] text-white md:text-6xl">
                        Apresentação Comercial
                    </h1>
                    <p className="mt-5 max-w-2xl text-base leading-7 text-slate-400">
                    </p>
                    <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                        <button type="button" onClick={startPresentation} className="admin-primary-button">
                            <Play size={17} fill="currentColor" /> Iniciar apresentação
                        </button>
                    </div>
                </div>
            </section>

            {started && typeof document !== "undefined" && createPortal(
                <div
                    ref={stageRef}
                    className={`fixed inset-0 z-[99999] w-full h-full min-h-[100dvh] overflow-hidden no-scrollbar text-white select-none transition-colors duration-300 ${
                        currentSlide.kind === "intro" ? "bg-[#2f7fde]" : currentSlide.kind === "case" ? "bg-white" : "bg-black"
                    }`}
                    style={{ position: "fixed", top: 0, left: 0, right: 0, bottom: 0, width: "100%", height: "100%", minHeight: "100vh", zIndex: 99999 }}
                    role="dialog"
                    aria-modal="true"
                    aria-label="Apresentação em andamento"
                >
                    {/* 100% FULLSCREEN SLIDE CONTENT (NO BARS SQUEEZING THE CONTENT) */}
                    <div className="absolute inset-0 h-full w-full overflow-hidden no-scrollbar">
                        <div
                            key={currentIndex}
                            className={`h-full w-full ${
                                direction === "next"
                                    ? "animate-in fade-in slide-in-from-right-8 duration-500"
                                    : "animate-in fade-in slide-in-from-left-8 duration-500"
                            }`}
                        >
                            {currentSlide.kind === "image" ? (
                                <img src={currentSlide.src} alt={currentSlide.title} className="h-full w-full object-contain" />
                            ) : currentSlide.kind === "intro" ? (
                                <IntroTimelineSlide slide={currentSlide} onNext={goNext} />
                            ) : currentSlide.kind === "case" ? (
                                <CaseStudySlide slide={currentSlide} />
                            ) : currentSlide.kind === "pair" ? (
                                <PairSlideContent slide={currentSlide} />
                            ) : (
                                <FormSlideContent />
                            )}
                        </div>
                    </div>

                    {/* CLICKABLE LEFT/RIGHT EDGE NAVIGATION */}
                    <button
                        type="button"
                        onClick={goPrevious}
                        disabled={currentIndex === 0}
                        className="group absolute left-0 top-0 bottom-0 z-40 w-16 sm:w-24 flex items-center justify-start pl-4 opacity-0 hover:opacity-100 transition-opacity disabled:pointer-events-none"
                        aria-label="Slide anterior"
                    >
                        <span className="flex h-12 w-12 items-center justify-center rounded-full bg-black/60 text-white/80 backdrop-blur-md shadow-2xl border border-white/10 group-hover:scale-110 transition-transform">
                            <ArrowLeft size={22} />
                        </span>
                    </button>

                    <button
                        type="button"
                        onClick={goNext}
                        disabled={currentIndex === slides.length - 1}
                        className="group absolute right-0 top-0 bottom-0 z-40 w-16 sm:w-24 flex items-center justify-end pr-4 opacity-0 hover:opacity-100 transition-opacity disabled:pointer-events-none"
                        aria-label="Próximo slide"
                    >
                        <span className="flex h-12 w-12 items-center justify-center rounded-full bg-black/60 text-white/80 backdrop-blur-md shadow-2xl border border-white/10 group-hover:scale-110 transition-transform">
                            <ArrowRight size={22} />
                        </span>
                    </button>

                    {/* TOP FLOATING HUD (AUTOHIDE) */}
                    <div
                        className={`pointer-events-none absolute top-0 left-0 right-0 z-50 flex items-center justify-between p-4 transition-opacity duration-300 ${
                            showControls ? "opacity-100" : "opacity-0"
                        }`}
                    >
                        <div className="pointer-events-auto flex items-center gap-2 rounded-full bg-black/50 px-3.5 py-1.5 backdrop-blur-md border border-white/10 shadow-lg text-xs font-medium text-white/80">
                            <span>{currentIndex + 1} / {slides.length}</span>
                            <span className="opacity-40">•</span>
                            <span className="truncate max-w-[200px] sm:max-w-md text-white/90">{currentSlide.title}</span>
                        </div>

                        <div className="pointer-events-auto flex items-center gap-2">
                            <button
                                type="button"
                                onClick={requestFullscreen}
                                className="flex h-9 w-9 items-center justify-center rounded-full bg-black/50 text-white/80 backdrop-blur-md border border-white/10 shadow-lg hover:bg-black/80 hover:text-white transition-all"
                                title="Alternar tela cheia"
                            >
                                <Expand size={16} />
                            </button>
                            <button
                                type="button"
                                onClick={closePresentation}
                                className="flex h-9 w-9 items-center justify-center rounded-full bg-black/50 text-white/80 backdrop-blur-md border border-white/10 shadow-lg hover:bg-red-500 hover:text-white transition-all"
                                title="Fechar apresentação (Esc)"
                            >
                                <X size={16} />
                            </button>
                        </div>
                    </div>

                    {/* BOTTOM FLOATING CONTROLS (AUTOHIDE) */}
                    <div
                        className={`pointer-events-none absolute bottom-4 left-1/2 -translate-x-1/2 z-50 flex items-center gap-3 rounded-full bg-black/60 px-4 py-2 backdrop-blur-xl border border-white/15 shadow-2xl transition-opacity duration-300 ${
                            showControls ? "opacity-100" : "opacity-0"
                        }`}
                    >
                        <button
                            type="button"
                            onClick={goPrevious}
                            disabled={currentIndex === 0}
                            className="pointer-events-auto flex items-center gap-1.5 text-xs font-semibold text-white/90 hover:text-white disabled:opacity-30 disabled:pointer-events-none transition-colors"
                        >
                            <ArrowLeft size={14} /> Anterior
                        </button>

                        <div className="flex items-center gap-1 px-2">
                            {slides.map((slide, index) => (
                                <button
                                    key={`${slide.kind}-${index}`}
                                    type="button"
                                    onClick={() => {
                                        setDirection(index > currentIndex ? "next" : "previous");
                                        setCurrentIndex(index);
                                    }}
                                    className={`pointer-events-auto h-1.5 rounded-full transition-all ${
                                        index === currentIndex ? "w-6 bg-[#00aeea]" : "w-1.5 bg-white/30 hover:bg-white/60"
                                    }`}
                                    aria-label={`Ir para slide ${index + 1}`}
                                />
                            ))}
                        </div>

                        {currentIndex === slides.length - 1 ? (
                            <button
                                type="button"
                                onClick={closePresentation}
                                className="pointer-events-auto flex items-center gap-1.5 rounded-full bg-[#00aeea] px-3 py-1 text-xs font-bold text-black hover:bg-[#38c4f5] transition-colors"
                            >
                                <Pause size={12} fill="currentColor" /> Encerrar
                            </button>
                        ) : (
                            <button
                                type="button"
                                onClick={goNext}
                                className="pointer-events-auto flex items-center gap-1.5 text-xs font-semibold text-white/90 hover:text-white transition-colors"
                            >
                                Próximo <ArrowRight size={14} />
                            </button>
                        )}
                    </div>
                </div>,
                document.body
            )}
        </div>
    );
}

function FormSlideContent() {
    return (
        <div className="flex h-full w-full items-center justify-center overflow-y-auto bg-[#050505] px-5 py-6 md:px-10">
            <div className="grid w-full max-w-[1600px] items-center gap-8 xl:grid-cols-[minmax(0,0.75fr)_minmax(640px,1.25fr)]">
                <div className="min-w-0">
                    <p className="font-mono text-[11px] font-semibold uppercase tracking-[0.22em] text-[#9ecbff]">Conteúdos do mês</p>
                    <h2 className="mt-4 max-w-2xl text-4xl font-semibold leading-[0.98] tracking-[-0.055em] text-white md:text-6xl">Precisamos organizar a pauta do mês.</h2>
                    <div className="mt-6 max-w-xl space-y-4 text-base leading-7 text-slate-300 md:text-lg md:leading-8">
                        <p>Criamos um formulário referente aos conteúdos importantes do <strong className="text-white">mês</strong>, com datas que podem ser muito relevantes para o seu negócio.</p>
                        <p>Por isso, precisamos que você o preencha, para que possamos deixar a pauta do mês organizada com aquilo que a sua empresa precisa.</p>
                        <p>É rapidinho, <strong className="text-white">menos de 5 minutos</strong>, e muito importante!</p>
                        <p>Obrigada e qualquer dúvida estamos à disposição!</p>
                    </div>
                    <a href={formUrl} target="_blank" rel="noreferrer" className="admin-primary-button mt-8 inline-flex items-center gap-2">
                        Link do formulário<ArrowRight size={16} />
                    </a>
                </div>
                <div className="grid min-h-0 grid-cols-1 md:grid-cols-2 gap-4 items-center">
                    <div className="flex flex-col items-center overflow-hidden rounded-xl border border-white/15 bg-black/60 p-1.5 shadow-2xl shadow-black/60 backdrop-blur">
                        <img
                            src="/apresentacao/form-1.png"
                            alt="Quadro de pauta e gestão de conteúdos no Trello"
                            className="max-h-[68vh] w-full rounded-lg object-contain transition-transform duration-300 hover:scale-[1.02]"
                        />
                        <span className="mt-1.5 text-center text-[10px] font-mono uppercase tracking-wider text-slate-400">
                            Gestão de Pautas &amp; Entregas
                        </span>
                    </div>
                    <div className="flex flex-col items-center overflow-hidden rounded-xl border border-white/15 bg-black/60 p-1.5 shadow-2xl shadow-black/60 backdrop-blur">
                        <img
                            src="/apresentacao/form-2.png"
                            alt="Formulário de pauta de conteúdos do mês"
                            className="max-h-[68vh] w-full rounded-lg object-contain transition-transform duration-300 hover:scale-[1.02]"
                        />
                        <span className="mt-1.5 text-center text-[10px] font-mono uppercase tracking-wider text-[#9ecbff]">
                            Formulário Mensal Interativo
                        </span>
                    </div>
                </div>
            </div>
        </div>
    );
}
