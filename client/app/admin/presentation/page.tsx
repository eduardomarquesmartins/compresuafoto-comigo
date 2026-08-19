"use client";

import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { createPortal, flushSync } from "react-dom";
import { ArrowLeft, ArrowRight, Expand, Megaphone, Monitor, Pause, Play, RotateCcw, X } from "lucide-react";

const formUrl = "https://docs.google.com/forms/d/e/1FAIpQLSfAkyeXUOrtnlk0QTrBMGkleWwEryJTlIRLEKcya1_e53d2bQ/viewform";

type ImageSlide = { kind: "image"; title: string; src: string };
type FormSlide = { kind: "form"; title: string };
type IntroSlide = { kind: "intro"; title: string; year?: string; eyebrow?: string; body?: string; emphasis?: string; quote?: string };
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
    { kind: "intro", title: "PRIMEIROS PASSOS\nNO MARKETING", year: "2018", body: "TUDO COMEÇOU EM 2018, QUANDO, TRABALHANDO COMO CAIXA EM UM SHOPPING, SURGIU A OPORTUNIDADE DE UMA PROMOÇÃO PARA VENDEDORA. PERCEBENDO O POTENCIAL DAS REDES SOCIAIS PARA IMPULSIONAR AS VENDAS, A ESTRATÉGIA DE ELABORAÇÃO DE CONTEÚDOS TOMOU FORMA.", emphasis: "DISPONIBILIZANDO-SE PARA TIRAR FOTOS, GRAVAR VÍDEOS E ATÉ ATUAR COMO MODELO, A PAIXÃO PELA CRIAÇÃO DE CONTEÚDO FLORESCEU. PARALELAMENTE, A VENDA DE COSMÉTICOS TAMBÉM GANHOU DESTAQUE, CULMINANDO NA CRIAÇÃO DE UMA REDE SOCIAL PRÓPRIA PARA COMERCIALIZAÇÃO." },
    { kind: "intro", title: "CRESCIMENTO E\nNOVAS OPORTUNIDADES", year: "2019", body: "EM 2019, UMA NOVA JORNADA COMEÇOU EM UMA OUTRA EMPRESA, ONDE RAPIDAMENTE SE DESTACOU PELAS HABILIDADES EXCEPCIONAIS NA ÁREA DE MARKETING. ESSE RECONHECIMENTO LEVOU À RESPONSABILIDADE INTEGRAL PELA GESTÃO DAS REDES SOCIAIS, TANTO DA MATRIZ QUANTO DA FILIAL. CADA CAMPANHA, CADA POST, REFLETIA UM DOMÍNIO CRESCENTE DAS ESTRATÉGIAS DIGITAIS, MOSTRANDO UM COMPROMISSO COM A INOVAÇÃO E A EFICÁCIA." },
    { kind: "intro", title: "DESAFIOS E NOVAS\nCONQUISTAS", year: "2020", body: "EM 2020, SURGIU A CHANCE DE AGENCIAR UMA CAMPANHA POLÍTICA. FOI UM GRANDE DESAFIO, MAS TAMBÉM UMA OPORTUNIDADE DE CRESCIMENTO. ATUOU NA CRIAÇÃO DE PANFLETOS, CARTÕES DE VISITA, BANDEIRAS E ADESIVOS, ELABORANDO TODA A IDENTIDADE VISUAL DA CAMPANHA. ESSE TRABALHO EXIGIU ORGANIZAÇÃO, CRIATIVIDADE E UMA COMPREENSÃO PROFUNDA DAS NECESSIDADES DO CLIENTE, SENDO CRUCIAL PARA SEU DESENVOLVIMENTO PROFISSIONAL." },
    { kind: "intro", title: "ESTUDO E PRIMEIROS\nCLIENTES", year: "2021", body: "2021 FOI UM ANO DE EVOLUÇÃO. INICIOU A FACULDADE DE MARKETING, APROFUNDANDO SEUS CONHECIMENTOS TEÓRICOS E PRÁTICOS. EM 7 DE AGOSTO, CONQUISTOU O PRIMEIRO CLIENTE PARA UMA NOVA EMPRESA QUE NÃO POSSUÍA PRESENÇA NAS REDES SOCIAIS, MOSTRANDO TALENTO AO CRIAR UMA PRESENÇA ONLINE EFETIVA. ESSE CLIENTE INICIAL FOI O PRIMEIRO DE MUITOS, CONSOLIDANDO SUA REPUTAÇÃO NA ÁREA. APÓS ESSES ACONTECIMENTOS, AINDA EM 2021, COMEÇOU A TRABALHAR NA CREFISA, ONDE APRIMOROU AINDA MAIS SEUS CONHECIMENTOS, EXPANDINDO SUAS HABILIDADES E EXPERIÊNCIAS NO SETOR FINANCEIRO." },
    { kind: "intro", title: "ÚLTIMA EXPERIÊNCIA\nANTES DA & CONTI", year: "2022", body: "EM 2022, DUDA INICIOU SEU TRABALHO NA MACROMAC, SUA ÚLTIMA EXPERIÊNCIA EM REGIME CLT ANTES DE DAR UM GRANDE PASSO RUMO AO EMPREENDEDORISMO COM A & CONTI. NESSA POSIÇÃO, CONTRIBUIU SIGNIFICATIVAMENTE COM SEU CONHECIMENTO EM MARKETING, COLABORANDO NA CRIAÇÃO DE SLIDES, CURSOS E OUTRAS ATIVIDADES QUE ENRIQUECERAM SUA TRAJETÓRIA PROFISSIONAL." },
    { kind: "intro", title: "CONQUISTA ACADÊMICA", year: "2022", body: "EM 2022, DUDA CELEBROU A FORMATURA NA FACULDADE DE MARKETING, UM MARCO IMPORTANTE EM SUA JORNADA PROFISSIONAL.", emphasis: "COM O CONHECIMENTO TEÓRICO SÓLIDO E PRÁTICO ADQUIRIDO AO LONGO DOS ESTUDOS, ESTAVA MAIS PREPARADA DO QUE NUNCA PARA ENFRENTAR OS DESAFIOS E APROVEITAR AS OPORTUNIDADES EM SUA CARREIRA DE EMPREENDEDORA." },
    { kind: "intro", title: "A GRANDE DECISÃO E\nFUNDAÇÃO DA & CONTI", year: "2023", body: "APÓS PEDIR DEMISSÃO DA MACROMAC, DUDA TOMOU UMA DECISÃO CORAJOSA DE SEGUIR SUA PAIXÃO PELO EMPREENDEDORISMO E FUNDOU A &CONTI. COM ANOS DE EXPERIÊNCIA EM MARKETING, DESDE SEUS DIAS COMO CAIXA NO SHOPPING ATÉ SUA FORMAÇÃO ACADÊMICA E DIVERSAS CONQUISTAS PROFISSIONAIS, ELA TRANSFORMOU SUA VISÃO EM REALIDADE. A & CONTI NASCEU PARA OFERECER SOLUÇÕES INOVADORAS EM MARKETING DIGITAL, COM FOCO NA CRIAÇÃO DE VALOR E IMPACTO POSITIVO PARA SEUS CLIENTES.", quote: "Logo teste para a &Conti" },
    { kind: "intro", title: "O NOSSO HOJE!", year: "2024", body: "HOJE, A & CONTI CELEBRA UM MARCO SIGNIFICATIVO: JÁ TRABALHAMOS COM MAIS DE 70 EMPRESAS, PARTICIPANDO EM DIVERSOS PROJETOS PARA MARCAS RENOMADAS COMO MERCADO LIVRE E STOCK CAR. SE NÃO FOSSE PELA PERSISTÊNCIA DE EDUARDA DESDE O INÍCIO, NÃO ESTARÍAMOS ONDE ESTAMOS HOJE. NOSSA JORNADA DESDE A FUNDAÇÃO TEM SIDO MARCADA PELO COMPROMISSO COM SOLUÇÕES INOVADORAS EM MARKETING DIGITAL, CRIANDO VALOR E IMPACTO POSITIVO PARA NOSSOS CLIENTES EM CADA PROJETO QUE REALIZAMOS.", quote: "LEMBRE-SE, SE VOCÊ DESEJA ALGO, VÁ ATÉ O FINAL COM DETERMINAÇÃO E PAIXÃO." },
    { kind: "intro", title: "EXPANSÃO, EQUIPAMENTOS E\nDIREÇÃO DE COMUNICAÇÃO", year: "2024", body: "EM 2024, A & CONTI EXPANDIU SEU ALCANCE ATENDENDO DIVERSAS EMPRESAS E REALIZANDO INVESTIMENTOS ESTRATÉGICOS EM NOVOS EQUIPAMENTOS PARA ENTREGAR A MÁXIMA QUALIDADE AOS CLIENTES.", emphasis: "PARALELAMENTE, DUDA ASSUMIU O DESAFIO COMO DIRETORA DE COMUNICAÇÃO NA CÂMARA DE VEREADORES DE VIAMÃO, CONSOLIDANDO AINDA MAIS SEU RECONHECIMENTO E LIDERANÇA NO SETOR DE COMUNICAÇÃO E MARKETING." },
    { kind: "intro", title: "CONSOLIDAÇÃO, GRANDES MARCAS E\nEVOLUÇÃO CONTÍNUA", year: "2025", body: "EM 2025, CONTINUAMOS NOSSA ATUAÇÃO NA CÂMARA DE VEREADORES E SEGUIMOS EM CONSTANTE EVOLUÇÃO NO NÚMERO DE CLIENTES E VOLUME DE ENTREGAS.", emphasis: "ENTRE OS PROJETOS DE DESTAQUE, ATENDEMOS O CLIENTE SCAPINI (VIVENDA SCAPINI), REALIZANDO A COBERTURA COMPLETA DA COLHEITA MECANIZADA DE OLIVEIRAS COM PRODUÇÃO AUDIOVISUAL DE ALTO NÍVEL." },
    { kind: "intro", title: "DEDICAÇÃO TOTAL E\nVIVENDO DA & CONTI", year: "2026", body: "EM 2026, TOMAMOS A MAIOR DECISÃO DA NOSSA JORNADA: PEDIMOS DEMISSÃO DOS NOSSOS CARGOS E PASSAMOS A VIVER EXCLUSIVAMENTE DA & CONTI!", emphasis: "COM ESTRUTURA COMPLETA, EQUIPAMENTOS DE CINEMA E DEDICAÇÃO 100% INTEGRAL, TRANSFORMAMOS O NOSSO PROPÓSITO NA NOSSA MAIOR REALIDADE." }
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
const common = "relative m-auto w-full max-w-6xl px-6 py-10 sm:px-10 md:px-14";

const Highlight = ({ children }: { children: ReactNode }) => <mark className="bg-[#00b6ef] px-1 text-inherit">{children}</mark>;

function YearHeading({ year, title }: Pick<IntroSlide, "year" | "title">) {
    return <header className="relative ml-auto max-w-xs text-right"><p className="text-5xl font-black leading-none tracking-[-.08em] text-[#063d5d] sm:text-7xl"><span className="mr-1 inline-block h-3 w-3 rounded-full bg-[#00b6ef] align-middle" />{year}</p><h2 className="whitespace-pre-line text-sm font-black leading-none tracking-[-.045em] sm:text-lg">{title}</h2></header>;
}

function BrandMark({ dark = false }: { dark?: boolean }) {
    return <span className={`inline-flex items-end font-black leading-none tracking-[-.08em] ${dark ? "text-[#073b59]" : "text-white"}`}><i className="mr-0.5 font-serif text-[.75em] not-italic">&amp;</i>CONTI</span>;
}

function BrushStroke({ children }: { children: ReactNode }) {
    return <span className="relative inline-block isolate px-5 py-2"><svg className="absolute -inset-x-3 -inset-y-3 -z-10 h-[calc(100%+1.5rem)] w-[calc(100%+1.5rem)]" viewBox="0 0 500 120" preserveAspectRatio="none" aria-hidden="true"><path d="M13 42C47 18 88 31 126 22c72-17 123 12 191-2 58-12 113-29 171-4l-13 17 19 12-22 11 16 16-27 8 20 12c-83 24-166 3-241 13-78 11-158-4-231 3l18-18-27-10 24-14-25-14Z" fill="#00aeef" /><circle cx="23" cy="100" r="5" fill="#00aeef" /><circle cx="478" cy="25" r="4" fill="#00aeef" /></svg>{children}</span>;
}

function IdBadge() {
    return <svg className="h-32 w-28 text-[#0063b5]" viewBox="0 0 120 140" fill="none" aria-label="Crachá corporativo" role="img"><path d="M38 18h44v16H38zM47 4h26v14H47zM18 29h84v98H18z" stroke="currentColor" strokeWidth="7" strokeLinejoin="round" /><path d="M41 74c0-13 8-24 19-24s19 11 19 24v20H41V74Z" stroke="currentColor" strokeWidth="6" /><circle cx="60" cy="63" r="10" stroke="currentColor" strokeWidth="6" /><path d="M34 108h20m8 0h24m-52 15h52" stroke="currentColor" strokeWidth="6" strokeLinecap="round" /></svg>;
}

function HeartBalloon({ className = "" }: { className?: string }) {
    return <span className={`relative inline-grid h-8 w-9 rotate-[18deg] place-items-center rounded-[55%_55%_55%_12%] bg-white text-[#f69daa] shadow ${className}`} aria-hidden="true">♥</span>;
}

function QuoteGraphic() {
    return <svg className="absolute -right-2 -top-7 h-20 w-28 text-[#ffc400]" viewBox="0 0 120 80" aria-hidden="true"><path d="M9 7h39v32c0 23-14 34-37 35V57c10-1 16-6 17-16H9V7Zm62 0h39v32c0 23-14 34-37 35V57c10-1 16-6 17-16H71V7Z" fill="currentColor" /></svg>;
}

function IntroTimelineSlide({ slide }: { slide: IntroSlide }) {
    if (!slide.year) {
        return (
            <article className="relative flex h-full w-full flex-col items-center justify-center overflow-hidden bg-[#2f7fde] text-white px-6 py-12 select-none" aria-label="Conheça mais - &CONTI">
                <div className="relative z-10 flex h-full w-full max-w-6xl flex-col items-center justify-between py-6 text-center">
                    <div className="h-4 sm:h-8" />

                    {/* Full Seamless Center Logo */}
                    <div className="flex flex-col items-center justify-center my-auto">
                        <h1 className="text-7xl font-bold tracking-tight text-white sm:text-9xl md:text-[11rem] lg:text-[14rem] leading-none">
                            &amp;CONTI
                        </h1>
                        <p className="mt-4 text-xl sm:text-2xl md:text-3xl lg:text-4xl font-extrabold uppercase tracking-[0.38em] text-black">
                            MARKETING DIGITAL
                        </p>
                    </div>

                    {/* "Conheça mais" */}
                    <div className="pt-6 pb-2">
                        <p className="text-2xl sm:text-3xl md:text-4xl font-black uppercase tracking-[0.25em] text-white transition-transform duration-300 hover:scale-105">
                            CONHEÇA MAIS
                        </p>
                    </div>
                </div>
            </article>
        );
    }
    return <article className="relative flex h-full w-full overflow-y-auto bg-[#fcfcfa] text-[#111]" aria-label={`${slide.year}: ${slide.title.replace(/\n/g, " ")}`}><div className="absolute left-0 right-0 top-8 border-t-2 border-dashed border-[#00b6ef]" aria-hidden="true" />
        {slide.year === "2018" && <div className={common}><YearHeading {...slide} /><div className="mt-8 grid gap-7 lg:grid-cols-2"><div className="space-y-5 text-center text-lg font-black leading-[1.35] sm:text-2xl"><p>{slide.body?.split("PERCEBENDO")[0]}<Highlight>PERCEBENDO O POTENCIAL DAS REDES SOCIAIS PARA IMPULSIONAR AS VENDAS,</Highlight> A ESTRATÉGIA DE ELABORAÇÃO DE CONTEÚDOS TOMOU FORMA.</p><p>DISPONIBILIZANDO-SE PARA TIRAR FOTOS, GRAVAR VÍDEOS E ATÉ ATUAR COMO MODELO, A <Highlight>PAIXÃO PELA CRIAÇÃO DE CONTEÚDO</Highlight> FLORESCEU. PARALELAMENTE, A VENDA DE COSMÉTICOS TAMBÉM GANHOU DESTAQUE, CULMINANDO NA CRIAÇÃO DE UMA REDE SOCIAL PRÓPRIA PARA COMERCIALIZAÇÃO.</p></div><aside className="relative flex min-h-[460px] items-end justify-center pb-2"><div className="absolute -left-2 -top-6 h-52 w-72 -rotate-3 overflow-hidden border-[10px] border-white bg-slate-200 shadow-2xl transition-transform hover:z-20 hover:scale-105 sm:h-60 sm:w-80 md:-left-8"><img src="/apresentacao/2018-1.jpg" alt="Registro visual de 2018" className="h-full w-full object-cover" /></div><div className="absolute -right-2 top-20 h-64 w-52 rotate-3 overflow-hidden border-[10px] border-white bg-slate-200 shadow-2xl transition-transform hover:z-20 hover:scale-105 sm:h-72 sm:w-56 md:-right-6"><img src="/apresentacao/2018-2.jpg" alt="Registro visual de 2018" className="h-full w-full object-cover" /></div><div className="relative z-10 rounded-[2rem] bg-white p-5 text-center shadow-2xl"><p className="mb-2 text-center text-lg font-bold leading-tight text-[#00aeea]">Primeira logo de quando eu era consultora</p><img src="/apresentacao/2018-logo.png" alt="Primeira logo de quando eu era consultora Eduarda Conti" className="mx-auto h-44 w-auto object-contain sm:h-48" /></div></aside></div></div>}
        {slide.year === "2019" && <TextSlide slide={slide} highlight="RAPIDAMENTE SE DESTACOU PELAS HABILIDADES EXCEPCIONAIS NA ÁREA DE MARKETING. ESSE RECONHECIMENTO LEVOU À RESPONSABILIDADE INTEGRAL PELA GESTÃO DAS REDES SOCIAIS, TANTO DA MATRIZ QUANTO DA FILIAL." />}
        {slide.year === "2020" && <div className={common}><YearHeading {...slide} /><div className="mt-8 grid gap-7 lg:grid-cols-2"><div className="flex items-center text-center text-lg font-black leading-[1.35] sm:text-2xl"><p>EM 2020, SURGIU A CHANCE DE AGENCIAR UMA CAMPANHA POLÍTICA. FOI UM GRANDE DESAFIO, MAS TAMBÉM UMA OPORTUNIDADE DE CRESCIMENTO. ATUOU NA CRIAÇÃO DE PANFLETOS, CARTÕES DE VISITA, BANDEIRAS E ADESIVOS, ELABORANDO TODA A IDENTIDADE VISUAL DA CAMPANHA. ESSE TRABALHO EXIGIU ORGANIZAÇÃO, CRIATIVIDADE E UMA COMPREENSÃO PROFUNDA DAS NECESSIDADES DO CLIENTE, SENDO <Highlight>CRUCIAL PARA SEU DESENVOLVIMENTO PROFISSIONAL.</Highlight></p></div><aside className="relative flex min-h-[460px] items-center justify-center pb-2"><div className="absolute -left-2 top-0 h-64 w-52 -rotate-3 overflow-hidden border-[10px] border-white bg-slate-200 shadow-2xl transition-transform hover:z-20 hover:scale-105 sm:h-72 sm:w-56 md:-left-8"><img src="/apresentacao/2020-1.jpg" alt="Registro visual de 2020" className="h-full w-full object-cover" /></div><div className="absolute -right-2 top-16 h-64 w-52 rotate-4 overflow-hidden border-[10px] border-white bg-slate-200 shadow-2xl transition-transform hover:z-20 hover:scale-105 sm:h-72 sm:w-56 md:-right-6"><img src="/apresentacao/2020-2.jpg" alt="Registro visual de 2020" className="h-full w-full object-cover" /></div></aside></div></div>}
        {slide.year === "2021" && <ClientsSlide slide={slide} />}
        {slide.year === "2022" && (slide.title.startsWith("ÚLTIMA") ? <MacromacSlide slide={slide} /> : <GraduationSlide slide={slide} />)}
        {slide.year === "2023" && <FoundationSlide slide={slide} />}
        {slide.year === "2024" && (slide.title.startsWith("O NOSSO") ? <TodaySlide slide={slide} /> : <TodayPart2Slide slide={slide} />)}
        {slide.year === "2025" && <Year2025Slide slide={slide} />}
        {slide.year === "2026" && <Year2026Slide slide={slide} />}
    </article>;
}

function TextSlide({ slide, highlight }: { slide: IntroSlide; highlight: string }) {
    return <div className={common}>
        <YearHeading {...slide} />
        <div className="mt-8 grid items-center gap-8 lg:grid-cols-[1fr_0.95fr]">
            <p className="text-center text-lg font-black leading-[1.35] sm:text-2xl">{slide.body?.split(highlight)[0]}<Highlight>{highlight}</Highlight>{slide.body?.split(highlight)[1]}</p>
            <aside className="relative flex min-h-[460px] items-center justify-center pb-2"><div className="absolute -left-2 -top-4 h-48 w-64 -rotate-3 overflow-hidden border-[10px] border-white bg-slate-200 shadow-2xl transition-transform hover:z-30 hover:scale-105 sm:h-56 sm:w-72 md:-left-6"><img src="/apresentacao/2019-1.jpg" alt="Registro visual de 2019" className="h-full w-full object-cover" /></div><div className="absolute bottom-0 left-0 z-10 h-56 w-44 rotate-6 overflow-hidden border-[10px] border-white bg-slate-200 shadow-2xl transition-transform hover:z-30 hover:scale-105 sm:h-64 sm:w-48"><img src="/apresentacao/2019-2.jpg" alt="Registro visual de 2019" className="h-full w-full object-cover" /></div><div className="absolute -right-2 bottom-2 z-20 h-56 w-44 -rotate-4 overflow-hidden border-[10px] border-white bg-slate-200 shadow-2xl transition-transform hover:z-30 hover:scale-105 sm:h-64 sm:w-48 md:-right-6"><img src="/apresentacao/2019-3.jpg" alt="Registro visual de 2019" className="h-full w-full object-cover" /></div></aside>
        </div>
    </div>;
}

function ClientsSlide({ slide }: { slide: IntroSlide }) {
    const clients = [
        { name: "DONNA VALL", img: "/apresentacao/2021-donnavall.jpg", class: "left-0 top-0 h-28 w-44 -rotate-4 bg-white p-2 border-4 border-[#00b6ef]", fit: "object-contain" },
        { name: "tuttipromo", img: "/apresentacao/2021-tuttipromo.jpg", class: "-left-6 top-[100px] h-40 w-52 rotate-3 z-10 border-4 border-white", fit: "object-cover" },
        { name: "BARBEARIA ENÉIAS BITTENCOURT", img: "/apresentacao/2021-barbearia.jpg", class: "left-2 bottom-0 h-28 w-44 -rotate-2 bg-[#251e1a] p-2 border-4 border-[#00b6ef]", fit: "object-contain" },
        { name: "Crefisa", img: "/apresentacao/2021-crefisa.jpg", class: "right-0 bottom-4 h-44 w-44 rotate-4 z-20 border-4 border-white", fit: "object-cover" }
    ];
    return <div className={common}><YearHeading {...slide} /><div className="mt-6 grid items-center gap-7 lg:grid-cols-[1fr_1.1fr]"><div className="relative mx-auto h-[420px] w-96"><svg className="absolute inset-0 h-full w-full" viewBox="0 0 320 390" aria-hidden="true"><path d="M91 58C245 40 304 145 245 244C211 301 125 357 53 299C-1 255 22 137 91 58Z" fill="none" stroke="#111" strokeDasharray="12 10" strokeWidth="5" /><g fill="#00b6ef" stroke="#073b59" strokeWidth="3"><circle cx="91" cy="58" r="10" /><circle cx="31" cy="155" r="10" /><circle cx="53" cy="299" r="10" /><circle cx="205" cy="349" r="10" /></g></svg>{clients.map((client) => <div key={client.name} className={`absolute overflow-hidden rounded-lg shadow-xl transition-transform hover:z-30 hover:scale-105 ${client.class}`}><img src={client.img} alt={client.name} className={`h-full w-full ${client.fit}`} /></div>)}</div><p className="text-center text-lg font-black leading-[1.3] sm:text-2xl">2021 FOI UM ANO DE EVOLUÇÃO. INICIOU A FACULDADE DE MARKETING, APROFUNDANDO SEUS CONHECIMENTOS TEÓRICOS E PRÁTICOS. EM 7 DE AGOSTO, CONQUISTOU O <Highlight>PRIMEIRO CLIENTE</Highlight> PARA UMA NOVA EMPRESA QUE NÃO POSSUÍA PRESENÇA NAS REDES SOCIAIS, MOSTRANDO TALENTO AO CRIAR UMA PRESENÇA ONLINE EFETIVA. ESSE CLIENTE INICIAL FOI O PRIMEIRO DE MUITOS, CONSOLIDANDO SUA REPUTAÇÃO NA ÁREA. APÓS ESSES ACONTECIMENTOS, AINDA EM 2021, COMEÇOU A TRABALHAR NA CREFISA, ONDE APRIMOROU AINDA MAIS SEUS CONHECIMENTOS, EXPANDINDO SUAS HABILIDADES E EXPERIÊNCIAS NO SETOR FINANCEIRO.</p></div></div>;
}

function MacromacSlide({ slide }: { slide: IntroSlide }) {
    const photos = [
        { src: "/apresentacao/2022-1.jpg", alt: "Equipe à noite", class: "-left-4 -top-4 h-44 w-60 -rotate-3 sm:h-48 sm:w-64" },
        { src: "/apresentacao/2022-2.jpg", alt: "Cadeiras azuis", class: "-right-2 top-0 h-48 w-36 rotate-4 sm:h-52 sm:w-40 z-10" },
        { src: "/apresentacao/2022-3.jpg", alt: "Arraiá", class: "left-2 top-28 h-48 w-36 -rotate-6 sm:h-52 sm:w-40 z-20" },
        { src: "/apresentacao/2022-4.jpg", alt: "Empilhadeiras", class: "right-4 top-32 h-48 w-36 rotate-3 sm:h-52 sm:w-40 z-20" },
        { src: "/apresentacao/2022-5.jpg", alt: "Selfie Ambev", class: "left-8 bottom-0 h-44 w-60 rotate-2 sm:h-48 sm:w-64 z-30" }
    ];
    return <div className={common}><YearHeading {...slide} /><div className="mt-8 grid items-center gap-8 lg:grid-cols-[1.1fr_1fr]"><div className="space-y-5 text-center text-lg font-black leading-[1.35] sm:text-2xl"><p>EM 2022, DUDA INICIOU SEU TRABALHO NA MACROMAC, SUA <Highlight>ÚLTIMA EXPERIÊNCIA EM REGIME CLT</Highlight> ANTES DE DAR UM GRANDE PASSO RUMO AO EMPREENDEDORISMO COM A &amp; CONTI.</p><p>NESSA POSIÇÃO, CONTRIBUIU SIGNIFICATIVAMENTE COM SEU CONHECIMENTO EM MARKETING, COLABORANDO NA CRIAÇÃO DE SLIDES, CURSOS E OUTRAS ATIVIDADES QUE <Highlight>ENRIQUECERAM SUA TRAJETÓRIA PROFISSIONAL.</Highlight></p></div><aside className="relative flex min-h-[460px] items-center justify-center pb-2">{photos.map((photo) => <div key={photo.src} className={`absolute overflow-hidden border-[8px] border-white bg-slate-200 shadow-2xl transition-transform hover:z-40 hover:scale-105 ${photo.class}`}><img src={photo.src} alt={photo.alt} className="h-full w-full object-cover" /></div>)}</aside></div></div>;
}

function GraduationSlide({ slide }: { slide: IntroSlide }) {
    const photos = [
        { src: "/apresentacao/2022-grad-1.jpg", alt: "Dia do Profissional de Marketing - Palco", class: "-left-2 -top-4 h-56 w-44 -rotate-4 sm:h-64 sm:w-48" },
        { src: "/apresentacao/2022-grad-2.jpg", alt: "Selfie com Beca de Formatura", class: "left-16 top-12 z-10 h-60 w-44 rotate-3 sm:h-68 sm:w-48" },
        { src: "/apresentacao/2022-grad-3.jpg", alt: "Formatura no Corredor", class: "-right-2 bottom-0 z-20 h-56 w-44 -rotate-3 sm:h-64 sm:w-48 md:-right-6" }
    ];
    return <div className={`${common} overflow-hidden`}><YearHeading {...slide} /><div className="mt-8 grid items-center gap-8 lg:grid-cols-[1.05fr_0.95fr]"><div className="space-y-6 text-center text-lg font-black leading-[1.3] sm:text-2xl"><p>EM 2022, DUDA CELEBROU A FORMATURA NA FACULDADE DE MARKETING, <Highlight>UM MARCO IMPORTANTE EM SUA JORNADA PROFISSIONAL.</Highlight></p><p>COM O CONHECIMENTO TEÓRICO SÓLIDO E PRÁTICO ADQUIRIDO AO LONGO DOS ESTUDOS, ESTAVA MAIS PREPARADA DO QUE NUNCA PARA ENFRENTAR OS DESAFIOS E <Highlight>APROVEITAR AS OPORTUNIDADES EM SUA CARREIRA DE EMPREENDEDORA.</Highlight></p></div><aside className="relative flex min-h-[460px] items-center justify-center pb-2">{photos.map((photo) => <div key={photo.src} className={`absolute overflow-hidden border-[10px] border-white bg-slate-200 shadow-2xl transition-transform hover:z-30 hover:scale-105 ${photo.class}`}><img src={photo.src} alt={photo.alt} className="h-full w-full object-cover" /></div>)}</aside></div></div>;
}

function FoundationSlide({ slide }: { slide: IntroSlide }) {
    const logos = [
        "/apresentacao/2023-logo-1.jpg",
        "/apresentacao/2023-logo-2.jpg",
        "/apresentacao/2023-logo-3.jpg",
        "/apresentacao/2023-logo-4.jpg"
    ];
    return <div className={common}><YearHeading {...slide} /><div className="mt-8 grid items-center gap-8 lg:grid-cols-[1fr_1fr]"><div className="space-y-5 text-center text-lg font-black leading-[1.35] sm:text-2xl"><p>APÓS PEDIR DEMISSÃO DA MACROMAC, DUDA TOMOU UMA DECISÃO CORAJOSA DE SEGUIR SUA PAIXÃO PELO EMPREENDEDORISMO E <Highlight>FUNDOU A &amp;CONTI.</Highlight></p><p>COM ANOS DE EXPERIÊNCIA EM MARKETING, DESDE SEUS DIAS COMO CAIXA NO SHOPPING ATÉ SUA FORMAÇÃO ACADÊMICA E DIVERSAS CONQUISTAS PROFISSIONAIS, ELA TRANSFORMOU SUA VISÃO EM REALIDADE.</p><p><Highlight>A &amp; CONTI NASCEU PARA OFERECER SOLUÇÕES INOVADORAS EM MARKETING DIGITAL, COM FOCO NA CRIAÇÃO DE VALOR E IMPACTO POSITIVO PARA SEUS CLIENTES.</Highlight></p></div><div className="grid grid-cols-2 gap-4">{logos.map((src, i) => <div key={src} className="overflow-hidden rounded-2xl border-4 border-white bg-slate-100 shadow-xl transition-transform hover:scale-105"><img src={src} alt={`Logo ${i + 1} &Conti`} className="aspect-square h-full w-full object-contain" /></div>)}</div></div></div>;
}

function TodaySlide({ slide }: { slide: IntroSlide }) {
    return <div className={common}><YearHeading {...slide} /><div className="mt-8 grid items-center gap-8 lg:grid-cols-[1.1fr_0.9fr]"><div className="space-y-6"><p className="text-center text-lg font-black leading-[1.3] sm:text-2xl">HOJE, A <Highlight>&amp; CONTI CELEBRA UM MARCO SIGNIFICATIVO:</Highlight> JÁ TRABALHAMOS COM <Highlight>MAIS DE 70 EMPRESAS,</Highlight> PARTICIPANDO EM DIVERSOS PROJETOS PARA MARCAS RENOMADAS COMO <Highlight>MERCADO LIVRE E STOCK CAR. SE NÃO FOSSE PELA PERSISTÊNCIA DE EDUARDA</Highlight> DESDE O INÍCIO, NÃO ESTARÍAMOS ONDE ESTAMOS HOJE. NOSSA JORNADA DESDE A FUNDAÇÃO TEM SIDO MARCADA PELO COMPROMISSO COM SOLUÇÕES INOVADORAS EM MARKETING DIGITAL, CRIANDO VALOR E IMPACTO POSITIVO PARA NOSSOS CLIENTES EM CADA PROJETO QUE REALIZAMOS.</p><blockquote className="relative mx-auto max-w-2xl text-center text-lg font-black leading-tight sm:text-3xl"><QuoteGraphic />LEMBRE-SE, SE VOCÊ DESEJA ALGO, VÁ ATÉ O FINAL COM DETERMINAÇÃO E PAIXÃO.</blockquote><div className="flex flex-col items-center gap-2"><span className="text-3xl"><BrandMark dark /></span><span className="rounded bg-[#00aeea] px-4 py-1 text-xs font-black text-white">&amp;CONTI</span></div></div><div className="mx-auto w-full max-w-md"><div className="overflow-hidden rounded-3xl border-[10px] border-white bg-slate-200 shadow-2xl transition-transform hover:scale-105"><img src="/apresentacao/2024.jpg" alt="Eduarda Conti 2024 - &amp;CONTI" className="h-full w-full object-cover" /></div></div></div></div>;
}

function TodayPart2Slide({ slide }: { slide: IntroSlide }) {
    return <div className={common}><YearHeading {...slide} /><div className="mt-8 grid items-center gap-8 lg:grid-cols-[1.1fr_0.9fr]"><div className="space-y-5 text-center text-lg font-black leading-[1.35] sm:text-2xl"><p>EM 2024, A &amp; CONTI EXPANDIU SEU ALCANCE ATENDENDO DIVERSAS EMPRESAS E <Highlight>REALIZANDO INVESTIMENTOS ESTRATÉGICOS EM NOVOS EQUIPAMENTOS</Highlight> PARA ENTREGAR A MÁXIMA QUALIDADE E EFICIÊNCIA AOS CLIENTES.</p><p>PARALELAMENTE, DUDA ASSUMIU O DESAFIO COMO <Highlight>DIRETORA DE COMUNICAÇÃO NA CÂMARA DE VIAMÃO,</Highlight> CONSOLIDANDO AINDA MAIS SEU RECONHECIMENTO E LIDERANÇA NO SETOR DE COMUNICAÇÃO.</p></div><aside className="relative flex min-h-[440px] items-center justify-center pb-2"><a href="https://www.instagram.com/reel/C6Ctr7gL5vW/" target="_blank" rel="noreferrer" title="Ver projeto Mercado Livre no Instagram" className="group absolute -left-2 top-8 z-10 block h-48 w-64 -rotate-4 overflow-hidden rounded-2xl border-[6px] border-white bg-slate-100 shadow-2xl transition-all duration-300 hover:z-30 hover:scale-105 sm:h-56 sm:w-72 md:-left-4"><img src="/apresentacao/2024-mercadolivre.jpg" alt="Mercado Livre - Projeto Instagram" className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-110" /><div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" /><span className="absolute bottom-3 left-3 rounded-full bg-black/70 px-2.5 py-1 text-[11px] font-bold text-white backdrop-blur">Mercado Livre ↗</span></a><a href="https://www.instagram.com/reel/C5hFQSwLxFZ/" target="_blank" rel="noreferrer" title="Ver projeto Stock Car no Instagram" className="group absolute -right-2 bottom-8 z-20 block h-48 w-64 rotate-4 overflow-hidden rounded-2xl border-[6px] border-white bg-slate-100 shadow-2xl transition-all duration-300 hover:z-30 hover:scale-105 sm:h-56 sm:w-72 md:-right-4"><img src="/apresentacao/2024-stockcar.jpg" alt="Stock Car Pro Series - Projeto Instagram" className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-110" /><div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" /><span className="absolute bottom-3 left-3 rounded-full bg-black/70 px-2.5 py-1 text-[11px] font-bold text-white backdrop-blur">Stock Car ↗</span></a></aside></div></div>;
}

function Year2025Slide({ slide }: { slide: IntroSlide }) {
    return (
        <div className={common}>
            <YearHeading {...slide} />
            <div className="mt-8 grid items-center gap-8 lg:grid-cols-[1.1fr_0.9fr]">
                <div className="space-y-5 text-center text-lg font-black leading-[1.35] sm:text-2xl">
                    <p>
                        EM 2025, <Highlight>CONTINUAMOS NOSSA ATUAÇÃO NA CÂMARA DE VEREADORES</Highlight> E FOMOS EVOLUINDO CONTINUAMENTE NO <Highlight>NÚMERO DE CLIENTES E VOLUME DE ENTREGAS.</Highlight>
                    </p>
                    <p>
                        CONSOLIDANDO PRODUÇÕES AUDIOVISUAIS DE ALTO IMPACTO, DESTACAMOS O CLIENTE <Highlight>SCAPINI (VIVENDA SCAPINI),</Highlight> REGISTRANDO A COBERTURA DA COLHEITA MECANIZADA DE OLIVEIRAS COM MÁXIMA PRECISÃO, INOVAÇÃO E QUALIDADE CINEMATOGRÁFICA.
                    </p>
                </div>
                <aside className="relative flex min-h-[460px] items-center justify-center pb-2">
                    <a
                        href="https://www.instagram.com/reel/DJfRa7MyZuE/"
                        target="_blank"
                        rel="noreferrer"
                        title="Ver cobertura Vivenda Scapini no Instagram"
                        className="group absolute -left-2 top-2 z-20 block w-64 overflow-hidden rounded-2xl border-[8px] border-white bg-slate-900 shadow-2xl transition-all duration-300 hover:z-40 hover:scale-105 sm:w-72 md:-left-6"
                    >
                        <div className="relative aspect-[9/16] max-h-[380px] w-full overflow-hidden bg-black">
                            <img
                                src="/apresentacao/2025-scapini.jpg"
                                alt="Cliente Scapini - Vivenda Scapini Colheita Mecanizada"
                                className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-110"
                            />
                            <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/20 to-transparent" />
                            <div className="absolute left-3 right-3 top-3 flex items-center justify-between gap-2">
                                <span className="rounded-full bg-[#00b6ef] px-2.5 py-1 text-[10px] font-black uppercase tracking-wider text-black shadow">
                                    Cliente Scapini
                                </span>
                                <span className="flex h-7 w-7 items-center justify-center rounded-full bg-black/60 text-white backdrop-blur">
                                    <Play size={12} fill="currentColor" />
                                </span>
                            </div>
                            <div className="absolute bottom-3 left-3 right-3 text-left">
                                <p className="text-xs font-bold text-[#00b6ef] uppercase tracking-wider">Vivenda Scapini</p>
                                <p className="text-xs font-semibold text-white/90 line-clamp-2">Cobertura da colheita mecanizada de oliveiras</p>
                                <span className="mt-1 inline-flex items-center gap-1 text-[11px] font-medium text-slate-300">
                                    Ver Reel no Instagram ↗
                                </span>
                            </div>
                        </div>
                    </a>

                    <div className="absolute -right-2 top-8 z-10 w-56 -rotate-3 overflow-hidden rounded-xl border-4 border-white bg-white p-3 shadow-xl transition-transform hover:z-30 hover:scale-105 sm:w-60 md:-right-4">
                        <img
                            src="/apresentacao/2024-viamao.jpg"
                            alt="Câmara de Vereadores - Continuidade em 2025"
                            className="h-36 w-full rounded-lg object-cover"
                        />
                        <div className="mt-2 text-center">
                            <span className="inline-block rounded bg-[#073b59] px-2 py-0.5 text-[10px] font-black uppercase text-white">
                                Câmara de Viamão
                            </span>
                            <p className="mt-1 text-[11px] font-bold text-slate-700">
                                Continuidade &amp; Liderança em Comunicação
                            </p>
                        </div>
                    </div>

                    <div className="absolute -right-1 bottom-4 z-30 flex items-center gap-2 rounded-2xl border-2 border-white/60 bg-[#00b6ef] px-4 py-2.5 text-black shadow-2xl transition-transform hover:scale-105">
                        <span className="text-2xl font-black leading-none">2025</span>
                        <div className="text-left font-bold text-[11px] leading-tight">
                            <p>+ Clientes</p>
                            <p className="opacity-80">+ Entregas</p>
                        </div>
                    </div>
                </aside>
            </div>
        </div>
    );
}

function Year2026Slide({ slide }: { slide: IntroSlide }) {
    return (
        <div className={common}>
            <YearHeading {...slide} />
            <div className="mt-8 grid items-center gap-8 lg:grid-cols-[1.1fr_0.9fr]">
                <div className="space-y-6 text-center text-lg font-black leading-[1.35] sm:text-2xl">
                    <p>
                        EM 2026, TOMAMOS A MAIOR DECISÃO DA NOSSA TRAJETÓRIA: <Highlight>PEDIMOS DEMISSÃO DOS NOSSOS CARGOS</Highlight> PARA NOS DEDICAR 100% AO NOSSO PRÓPRIO NEGÓCIO.
                    </p>
                    <p>
                        HOJE, <Highlight>VIVEMOS EXCLUSIVAMENTE DA &amp; CONTI!</Highlight> COM EQUIPAMENTOS CINEMATOGRÁFICOS DE ÚLTIMA GERAÇÃO, ESTRUTURA COMPLETA E FOCO TOTAL EM RESULTADOS, TRANSFORMAMOS O NOSSO SONHO NA NOSSA MAIOR REALIDADE.
                    </p>
                    <div className="flex flex-col items-center gap-2 pt-2">
                        <span className="text-3xl"><BrandMark dark /></span>
                    </div>
                </div>
                <aside className="relative flex min-h-[470px] items-center justify-center pb-2">
                    <div className="absolute -left-2 top-2 z-20 h-72 w-56 -rotate-3 overflow-hidden rounded-2xl border-[8px] border-white bg-slate-900 shadow-2xl transition-all duration-300 hover:z-40 hover:scale-105 sm:h-80 sm:w-60 md:-left-4">
                        <img
                            src="/apresentacao/2026-2.jpg"
                            alt="Fundadores &CONTI - Vivendo do nosso negócio"
                            className="h-full w-full object-cover object-top"
                        />
                    </div>
                    <div className="absolute -right-2 bottom-6 z-10 h-68 w-52 rotate-4 overflow-hidden rounded-2xl border-[8px] border-white bg-slate-900 shadow-2xl transition-all duration-300 hover:z-40 hover:scale-105 sm:h-76 sm:w-56 md:-right-4">
                        <img
                            src="/apresentacao/2026-1.jpg"
                            alt="Produção audiovisual e equipamentos &CONTI"
                            className="h-full w-full object-cover object-top"
                        />
                    </div>
                    <div className="absolute left-1/2 -bottom-2 z-30 -translate-x-1/2 flex items-center gap-2.5 rounded-2xl border-2 border-white bg-[#073b59] px-5 py-2.5 text-white shadow-2xl transition-transform hover:scale-105">
                        <span className="text-2xl font-black leading-none text-[#00b6ef]">2026</span>
                        <div className="text-left font-bold text-[11px] leading-tight">
                            <p className="text-white">Vivendo da &amp;CONTI</p>
                            <p className="text-slate-300">Tempo Integral</p>
                        </div>
                    </div>
                </aside>
            </div>
        </div>
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
    const stageRef = useRef<HTMLDivElement>(null);
    const currentSlide = slides[currentIndex];
    const progress = useMemo(() => ((currentIndex + 1) / slides.length) * 100, [currentIndex]);
    const goNext = useCallback(() => { setDirection("next"); setCurrentIndex((index) => Math.min(index + 1, slides.length - 1)); }, []);
    const goPrevious = useCallback(() => { setDirection("previous"); setCurrentIndex((index) => Math.max(index - 1, 0)); }, []);
    const closePresentation = useCallback(() => { setStarted(false); if (document.fullscreenElement) void document.exitFullscreen?.().catch(() => undefined); }, []);
    const requestFullscreen = useCallback(() => { void (stageRef.current ?? document.documentElement).requestFullscreen?.(); }, []);
    const startPresentation = () => { flushSync(() => { setCurrentIndex(0); setStarted(true); }); requestFullscreen(); };

    useEffect(() => { if (!started) return; document.body.style.overflow = "hidden"; const handleKeyDown = (event: KeyboardEvent) => { if (event.key === "ArrowRight" || event.key === " ") { event.preventDefault(); goNext(); } if (event.key === "ArrowLeft") { event.preventDefault(); goPrevious(); } if (event.key === "Escape") closePresentation(); }; window.addEventListener("keydown", handleKeyDown); return () => { document.body.style.overflow = ""; window.removeEventListener("keydown", handleKeyDown); }; }, [closePresentation, goNext, goPrevious, started]);

    return <div className="admin-page-stack pb-12 animate-in fade-in slide-in-from-bottom-4 duration-700"><section className="admin-card overflow-hidden p-5 md:p-7"><div className="min-w-0"><span className="admin-kicker">Portfólio</span><h1 className="mt-3 max-w-3xl text-4xl font-semibold leading-none tracking-[-0.055em] text-white md:text-6xl">Apresentação Comercial</h1><p className="mt-5 max-w-2xl text-base leading-7 text-slate-400">Utilize este material interativo para apresentar a &amp; CONTI a parceiros e potenciais clientes. Ative o botão tela cheia para uma experiência imersiva e navegue facilmente pelos slides.</p><div className="mt-8 flex flex-col gap-3 sm:flex-row"><button type="button" onClick={startPresentation} className="admin-primary-button"><Play size={17} fill="currentColor" />Iniciar apresentação</button></div></div></section>
        {started && typeof document !== "undefined" && createPortal(<div ref={stageRef} className="fixed inset-0 z-[9999] flex flex-col bg-[#030303] text-white" role="dialog" aria-modal="true" aria-label="Apresentação em andamento"><div className="flex h-14 shrink-0 items-center justify-between gap-3 border-b border-white/10 bg-black/90 px-3 backdrop-blur-xl md:px-5"><div className="min-w-0"><p className="truncate text-sm font-semibold">Apresentação comercial</p><p className="font-mono text-[10px] uppercase tracking-[0.14em] text-slate-500">{currentIndex + 1} de {slides.length}</p></div><div className="flex items-center gap-2"><button type="button" onClick={requestFullscreen} className="admin-icon-button h-9 w-9" title="Tela cheia" aria-label="Tela cheia"><Expand size={16} /></button><button type="button" onClick={closePresentation} className="admin-icon-button h-9 w-9" title="Fechar" aria-label="Fechar apresentação"><X size={16} /></button></div></div><div className="h-1 shrink-0 bg-white/10"><div className="h-full bg-white transition-all duration-300" style={{ width: `${progress}%` }} /></div><div className="relative flex min-h-0 flex-1 items-center justify-center overflow-hidden bg-black"><div key={currentIndex} className={`flex h-full w-full min-h-0 ${direction === "next" ? "animate-in fade-in slide-in-from-right-8 duration-500" : "animate-in fade-in slide-in-from-left-8 duration-500"}`}>{currentSlide.kind === "image" ? <img src={currentSlide.src} alt={currentSlide.title} className="h-full w-full object-contain" /> : currentSlide.kind === "intro" ? <IntroTimelineSlide slide={currentSlide} /> : currentSlide.kind === "case" ? <CaseStudySlide slide={currentSlide} /> : currentSlide.kind === "pair" ? <PairSlideContent slide={currentSlide} /> : <FormSlideContent />}</div></div><div className="flex shrink-0 items-center justify-between gap-3 border-t border-white/10 bg-black/90 px-3 py-3 backdrop-blur-xl md:px-5"><button type="button" onClick={goPrevious} disabled={currentIndex === 0} className="admin-secondary-button disabled:cursor-not-allowed disabled:opacity-35"><ArrowLeft size={16} />Anterior</button><div className="flex max-w-[24vw] items-center gap-1 overflow-x-auto py-1 sm:max-w-[38vw] md:gap-2" aria-label="Indicadores de slides">{slides.map((slide, index) => <button key={`${slide.kind}-${index}`} type="button" onClick={() => { setDirection(index > currentIndex ? "next" : "previous"); setCurrentIndex(index); }} className={`h-2.5 w-3 shrink-0 rounded-full transition-all focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white md:w-8 ${index === currentIndex ? "bg-white" : "bg-white/20 hover:bg-white/40"}`} aria-label={`Ir para slide ${index + 1}`} aria-current={index === currentIndex ? "step" : undefined} />)}</div><div className="flex items-center gap-2"><button type="button" onClick={() => { setDirection("previous"); setCurrentIndex(0); }} className="admin-icon-button h-10 w-10" title="Reiniciar" aria-label="Reiniciar apresentação"><RotateCcw size={16} /></button>{currentIndex === slides.length - 1 ? <button type="button" onClick={closePresentation} className="admin-primary-button"><Pause size={16} />Encerrar</button> : <button type="button" onClick={goNext} className="admin-primary-button">Próximo<ArrowRight size={16} /></button>}</div></div></div>, document.body)}</div>;
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
