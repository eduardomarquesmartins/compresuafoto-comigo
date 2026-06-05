"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createPortal, flushSync } from "react-dom";
import {
    ArrowLeft,
    ArrowRight,
    Expand,
    Pause,
    Play,
    RotateCcw,
    X
} from "lucide-react";

const formUrl = "https://docs.google.com/forms/d/e/1FAIpQLSfAkyeXUOrtnlk0QTrBMGkleWwEryJTlIRLEKcya1_e53d2bQ/viewform";

type ImageSlide = {
    kind: "image";
    title: string;
    src: string;
};

type FormSlide = {
    kind: "form";
    title: string;
};

type Slide = ImageSlide | FormSlide;

const imageSlides: ImageSlide[] = Array.from({ length: 14 }, (_, index) => ({
    kind: "image",
    title: `Slide ${index + 1}`,
    src: `/apresentacao/${index + 1}.jpg`
}));

const slides: Slide[] = [
    ...imageSlides.slice(0, 13),
    {
        kind: "form",
        title: "Formulário de conteúdos do mês"
    },
    imageSlides[13]
];

export default function AdminPresentationPage() {
    const [started, setStarted] = useState(false);
    const [currentIndex, setCurrentIndex] = useState(0);
    const stageRef = useRef<HTMLDivElement>(null);
    const currentSlide = slides[currentIndex];
    const progress = useMemo(() => ((currentIndex + 1) / slides.length) * 100, [currentIndex]);

    const goNext = useCallback(() => {
        setCurrentIndex((index) => Math.min(index + 1, slides.length - 1));
    }, []);

    const goPrevious = useCallback(() => {
        setCurrentIndex((index) => Math.max(index - 1, 0));
    }, []);

    const closePresentation = useCallback(() => {
        setStarted(false);
        if (document.fullscreenElement) {
            void document.exitFullscreen?.().catch(() => undefined);
        }
    }, []);

    const requestFullscreen = useCallback(() => {
        const target = stageRef.current ?? document.documentElement;
        void target.requestFullscreen?.();
    }, []);

    const startPresentation = () => {
        flushSync(() => {
            setCurrentIndex(0);
            setStarted(true);
        });
        requestFullscreen();
    };

    useEffect(() => {
        if (!started) return;

        document.body.style.overflow = "hidden";

        const handleKeyDown = (event: KeyboardEvent) => {
            if (event.key === "ArrowRight" || event.key === " ") {
                event.preventDefault();
                goNext();
            }

            if (event.key === "ArrowLeft") {
                event.preventDefault();
                goPrevious();
            }

            if (event.key === "Escape") {
                closePresentation();
            }
        };

        window.addEventListener("keydown", handleKeyDown);
        return () => {
            document.body.style.overflow = "";
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
                        Utilize este material interativo para apresentar a & CONTI a parceiros e potenciais clientes. Ative o botão tela cheia para uma experiência imersiva e navegue facilmente pelos slides.
                    </p>

                    <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                        <button type="button" onClick={startPresentation} className="admin-primary-button">
                            <Play size={17} fill="currentColor" />
                            Iniciar apresentação
                        </button>
                    </div>
                </div>
            </section>

            {started && typeof document !== "undefined" && createPortal(
                <div
                    ref={stageRef}
                    className="fixed inset-0 z-[9999] flex flex-col bg-[#030303] text-white"
                    role="dialog"
                    aria-modal="true"
                    aria-label="Apresentação em andamento"
                >
                    <div className="flex h-14 shrink-0 items-center justify-between gap-3 border-b border-white/10 bg-black/90 px-3 backdrop-blur-xl md:px-5">
                        <div className="flex min-w-0 items-center gap-3">
                            <div className="min-w-0">
                                <p className="truncate text-sm font-semibold">Apresentação comercial</p>
                                <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-slate-500">
                                    {currentIndex + 1} de {slides.length}
                                </p>
                            </div>
                        </div>

                        <div className="flex items-center gap-2">
                            <button type="button" onClick={requestFullscreen} className="admin-icon-button h-9 w-9" title="Tela cheia" aria-label="Tela cheia">
                                <Expand size={16} />
                            </button>
                            <button type="button" onClick={closePresentation} className="admin-icon-button h-9 w-9" title="Fechar" aria-label="Fechar apresentação">
                                <X size={16} />
                            </button>
                        </div>
                    </div>

                    <div className="h-1 shrink-0 bg-white/10">
                        <div className="h-full bg-white transition-all duration-300" style={{ width: `${progress}%` }} />
                    </div>

                    <div className="relative flex min-h-0 flex-1 items-center justify-center overflow-hidden bg-black">
                        {currentSlide.kind === "image" ? (
                            <img
                                key={currentSlide.src}
                                src={currentSlide.src}
                                alt={currentSlide.title}
                                className="h-full w-full object-contain"
                            />
                        ) : (
                            <div className="flex h-full w-full items-center justify-center overflow-y-auto bg-[#050505] px-5 py-6 md:px-10">
                                <div className="grid w-full max-w-[1480px] items-center gap-8 xl:grid-cols-[minmax(0,0.9fr)_minmax(520px,1.1fr)]">
                                    <div className="min-w-0">
                                        <p className="font-mono text-[11px] font-semibold uppercase tracking-[0.22em] text-[#9ecbff]">
                                            Conteúdos do mês
                                        </p>
                                        <h2 className="mt-4 max-w-3xl text-4xl font-semibold leading-[0.98] tracking-[-0.055em] text-white md:text-6xl">
                                            Precisamos organizar a pauta do mês.
                                        </h2>
                                        <div className="mt-6 max-w-2xl space-y-4 text-base leading-7 text-slate-300 md:text-lg md:leading-8">
                                            <p>
                                                Criamos um formulário referente aos conteúdos importantes do <strong className="text-white">mês</strong>, com datas que podem ser muito relevantes para o seu negócio.
                                            </p>
                                            <p>
                                                Por isso, precisamos que você o preencha, para que possamos deixar a pauta do mês organizada com aquilo que a sua empresa precisa.
                                            </p>
                                            <p>
                                                É rapidinho, <strong className="text-white">menos de 5 minutos</strong>, e muito importante!
                                            </p>
                                            <p>Obrigada e qualquer dúvida estamos à disposição!</p>
                                        </div>
                                        <a
                                            href={formUrl}
                                            target="_blank"
                                            rel="noreferrer"
                                            className="admin-primary-button mt-8"
                                        >
                                            Link do formulário
                                            <ArrowRight size={16} />
                                        </a>
                                    </div>

                                    <div className="grid min-h-0 gap-4">
                                        <img
                                            src="/apresentacao/form-1.png"
                                            alt="Captura do formulário de conteúdos"
                                            className="max-h-[36vh] w-full rounded-lg border border-white/12 bg-black object-cover object-center shadow-2xl shadow-black/40"
                                        />
                                        <img
                                            src="/apresentacao/form-2.png"
                                            alt="Segunda captura do formulário de conteúdos"
                                            className="max-h-[36vh] w-full rounded-lg border border-white/12 bg-black object-cover object-center shadow-2xl shadow-black/40"
                                        />
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>

                    <div className="flex shrink-0 items-center justify-between gap-3 border-t border-white/10 bg-black/90 px-3 py-3 backdrop-blur-xl md:px-5">
                        <button type="button" onClick={goPrevious} disabled={currentIndex === 0} className="admin-secondary-button disabled:cursor-not-allowed disabled:opacity-35">
                            <ArrowLeft size={16} />
                            Anterior
                        </button>

                        <div className="hidden items-center gap-2 md:flex">
                            {slides.map((slide, index) => (
                                <button
                                    key={`${slide.kind}-${index}`}
                                    type="button"
                                    onClick={() => setCurrentIndex(index)}
                                    className={`h-2.5 w-8 rounded-full transition-all ${index === currentIndex ? "bg-white" : "bg-white/20 hover:bg-white/40"}`}
                                    aria-label={`Ir para slide ${index + 1}`}
                                />
                            ))}
                        </div>

                        <div className="flex items-center gap-2">
                            <button type="button" onClick={() => setCurrentIndex(0)} className="admin-icon-button h-10 w-10" title="Reiniciar" aria-label="Reiniciar apresentação">
                                <RotateCcw size={16} />
                            </button>
                            {currentIndex === slides.length - 1 ? (
                                <button type="button" onClick={closePresentation} className="admin-primary-button">
                                    <Pause size={16} />
                                    Encerrar
                                </button>
                            ) : (
                                <button type="button" onClick={goNext} className="admin-primary-button">
                                    Próximo
                                    <ArrowRight size={16} />
                                </button>
                            )}
                        </div>
                    </div>
                </div>,
                document.body
            )}
        </div>
    );
}
