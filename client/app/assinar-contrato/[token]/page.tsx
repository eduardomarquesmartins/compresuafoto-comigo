"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { CheckCircle2, Download, Eraser, FileText, Loader2, PenLine, ShieldCheck } from "lucide-react";
import { downloadPublicContractPdf, getPublicContract, signPublicContract } from "@/lib/api";
import { useParams } from "next/navigation";
import Image from "next/image";

const money = (value: number) => value.toLocaleString("pt-BR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
});

const getPoint = (canvas: HTMLCanvasElement, clientX: number, clientY: number) => {
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.clientWidth / rect.width || 1;
    const scaleY = canvas.clientHeight / rect.height || 1;

    return {
        x: (clientX - rect.left) * scaleX,
        y: (clientY - rect.top) * scaleY
    };
};

export default function SignContractPage() {
    const params = useParams<{ token: string }>();
    const token = typeof params?.token === "string" ? params.token : Array.isArray(params?.token) ? params.token[0] : "";

    const [contract, setContract] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [signing, setSigning] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [signed, setSigned] = useState(false);
    const [accepted, setAccepted] = useState(false);
    const [hasSignatureDrawing, setHasSignatureDrawing] = useState(false);
    const [canvasReady, setCanvasReady] = useState(false);

    const canvasRef = useRef<HTMLCanvasElement | null>(null);
    const drawingRef = useRef(false);
    const lastPointRef = useRef<{ x: number; y: number } | null>(null);
    const prevWidthRef = useRef(0);
    const prevHeightRef = useRef(0);

    const signerName = useMemo(
        () => contract?.signedName || contract?.client?.signerName || contract?.client?.name || contract?.clientName || "",
        [contract]
    );
    const signerDocument = useMemo(
        () => contract?.signedDocument || contract?.client?.signerDocument || contract?.client?.document || "",
        [contract]
    );

    const drawGuide = (context: CanvasRenderingContext2D, width: number, height: number) => {
        context.clearRect(0, 0, width, height);

        context.strokeStyle = "rgba(15, 23, 42, 0.12)";
        context.lineWidth = 1;
        context.setLineDash([6, 6]);
        context.beginPath();
        context.moveTo(20, height * 0.72);
        context.lineTo(width - 20, height * 0.72);
        context.stroke();
        context.setLineDash([]);

        context.fillStyle = "rgba(15, 23, 42, 0.38)";
        context.font = "500 16px Inter, Arial, sans-serif";
        context.fillText("Assine aqui com o dedo ou mouse", 24, 34);
    };

    const configureCanvas = () => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        const context = canvas.getContext("2d");
        if (!context) return;

        const ratio = window.devicePixelRatio || 1;
        const rect = canvas.getBoundingClientRect();
        const width = Math.max(1, Math.round(rect.width || canvas.clientWidth || 520));
        const height = Math.max(1, Math.round(rect.height || canvas.clientHeight || 220));

        // Se as dimensões CSS não mudaram, não reconfigura o canvas físico para evitar limpar o desenho!
        if (width === prevWidthRef.current && height === prevHeightRef.current) {
            return;
        }

        prevWidthRef.current = width;
        prevHeightRef.current = height;

        canvas.width = Math.floor(width * ratio);
        canvas.height = Math.floor(height * ratio);
        context.setTransform(1, 0, 0, 1, 0, 0);
        context.scale(ratio, ratio);
        context.lineCap = "round";
        context.lineJoin = "round";
        context.lineWidth = 3.5;
        context.strokeStyle = "#000000";
        drawGuide(context, width, height);
        setCanvasReady(true);
    };

    const drawDot = (point: { x: number; y: number }) => {
        const canvas = canvasRef.current;
        const context = canvas?.getContext("2d");
        if (!canvas || !context) return;

        context.beginPath();
        context.fillStyle = "#000000";
        context.arc(point.x, point.y, 2.2, 0, Math.PI * 2);
        context.fill();
    };

    const drawSegment = (from: { x: number; y: number }, to: { x: number; y: number }) => {
        const canvas = canvasRef.current;
        const context = canvas?.getContext("2d");
        if (!canvas || !context) return;

        context.beginPath();
        context.strokeStyle = "#000000"; // Garante a cor preta
        context.lineWidth = 3.5;          // Garante a espessura ideal
        context.lineCap = "round";
        context.lineJoin = "round";
        context.moveTo(from.x, from.y);
        context.lineTo(to.x, to.y);
        context.stroke();
    };

    const beginDrawing = (clientX: number, clientY: number) => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        const context = canvas.getContext("2d");
        if (!context) return;

        // Limpa o guia e placeholder no primeiro toque/desenho
        if (!hasSignatureDrawing) {
            const rect = canvas.getBoundingClientRect();
            const width = Math.max(1, Math.round(rect.width || canvas.clientWidth || 520));
            const height = Math.max(1, Math.round(rect.height || canvas.clientHeight || 220));
            context.clearRect(0, 0, width, height);
        }

        const point = getPoint(canvas, clientX, clientY);
        drawingRef.current = true;
        lastPointRef.current = point;
        drawDot(point);
        setHasSignatureDrawing(true);
        setError(null);
    };

    const continueDrawing = (clientX: number, clientY: number) => {
        const canvas = canvasRef.current;
        if (!canvas || !drawingRef.current || !lastPointRef.current) return;

        const nextPoint = getPoint(canvas, clientX, clientY);
        drawSegment(lastPointRef.current, nextPoint);
        lastPointRef.current = nextPoint;
    };

    const stopDrawing = () => {
        drawingRef.current = false;
        lastPointRef.current = null;
    };

    useEffect(() => {
        if (!token) return;

        const loadContract = async () => {
            try {
                setLoading(true);
                setError(null);
                const data = await getPublicContract(token);
                setContract(data);
                setSigned(Boolean(data.signedAt));
                setHasSignatureDrawing(Boolean(data.signedSignatureData));
            } catch (err) {
                console.warn("Erro ao carregar contrato publico:", err);
                setError("Não consegui carregar esse contrato.");
            } finally {
                setLoading(false);
            }
        };

        loadContract();
    }, [token]);

    useEffect(() => {
        if (signed) return;

        const canvas = canvasRef.current;
        configureCanvas();

        const resizeObserver = canvas && typeof ResizeObserver !== "undefined"
            ? new ResizeObserver(() => configureCanvas())
            : null;

        if (canvas && resizeObserver) {
            resizeObserver.observe(canvas);
        }

        window.addEventListener("resize", configureCanvas);
        return () => {
            window.removeEventListener("resize", configureCanvas);
            resizeObserver?.disconnect();
        };
    }, [signed]);

    const clearSignature = () => {
        const canvas = canvasRef.current;
        const context = canvas?.getContext("2d");

        if (canvas && context) {
            const rect = canvas.getBoundingClientRect();
            const width = Math.max(1, Math.round(rect.width || canvas.clientWidth || 520));
            const height = Math.max(1, Math.round(rect.height || canvas.clientHeight || 220));
            context.clearRect(0, 0, width, height);
            drawGuide(context, width, height);
        }

        drawingRef.current = false;
        lastPointRef.current = null;
        setHasSignatureDrawing(false);
        setError(null);
    };

    const getSignatureDataUrl = () => {
        const canvas = canvasRef.current;
        if (!canvas || !hasSignatureDrawing) return "";
        return canvas.toDataURL("image/png");
    };

    const handleSign = async () => {
        if (!hasSignatureDrawing) {
            setError("Desenhe a assinatura no quadro antes de concluir.");
            return;
        }

        if (!accepted) {
            setError("Confirme a leitura do contrato para concluir a assinatura.");
            return;
        }

        try {
            setSigning(true);
            setError(null);

            const signedSignatureData = getSignatureDataUrl();
            const result = await signPublicContract(token, {
                signedSignatureData
            });

            setContract((prev: any) => prev ? {
                ...prev,
                ...result?.contract,
                signedSignatureData
            } : prev);
            setSigned(true);
        } catch (err) {
            console.warn("Erro ao assinar contrato:", err);
            setError("Houve um erro ao registrar a assinatura.");
        } finally {
            setSigning(false);
        }
    };

    const handleDownload = async () => {
        try {
            const blob = await downloadPublicContractPdf(token);
            const url = window.URL.createObjectURL(new Blob([blob], { type: "application/pdf" }));
            const link = document.createElement("a");
            link.href = url;
            link.download = `contrato_${String(contract?.client?.name || "cliente").replace(/\s+/g, "_").toLowerCase()}.pdf`;
            document.body.appendChild(link);
            link.click();
            link.remove();
            window.URL.revokeObjectURL(url);
        } catch (err) {
            console.warn("Erro ao baixar PDF do contrato:", err);
            setError("Não consegui baixar o PDF do contrato.");
        }
    };

    const canSubmitSignature = canvasReady && hasSignatureDrawing && accepted && !signing;
    const signatureButtonLabel = signing
        ? "Registrando assinatura..."
        : !hasSignatureDrawing
            ? "Desenhe sua assinatura"
            : !accepted
                ? "Confirme a leitura para assinar"
                : "Assinar Contrato";

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-white text-zinc-900">
                <div className="flex items-center gap-3 rounded-2xl border border-zinc-200 bg-white px-6 py-4 shadow-xl">
                    <Loader2 className="animate-spin text-blue-500" size={20} />
                    <span className="text-xs font-bold uppercase tracking-[0.2em] text-zinc-500">Autenticando sessão segura...</span>
                </div>
            </div>
        );
    }

    if (error && !contract) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-white p-6 text-zinc-900">
                <div className="max-w-xl w-full rounded-[32px] border border-zinc-200 bg-white p-8 text-center shadow-2xl">
                    <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-red-50 border border-red-200 text-red-600 mb-4">
                        <FileText size={24} />
                    </div>
                    <p className="text-2xl font-bold text-zinc-950 tracking-tight">Contrato indisponível</p>
                    <p className="mt-3 text-zinc-500 text-sm leading-relaxed">{error}</p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-white text-zinc-900 font-sans antialiased">
            {/* Header / Topbar da Marca */}
            <header className="border-b border-zinc-200 bg-white/92 backdrop-blur-md sticky top-0 z-50">
                <div className="mx-auto max-w-6xl px-4 py-4 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <Image src="/logo.png" alt="Conti Marketing Digital" width={160} height={45} className="h-12 w-auto object-contain" priority />
                    </div>
                </div>
            </header>

            <div className="mx-auto max-w-6xl px-4 py-8 md:px-6 md:py-12">
                <div className="mb-10 flex flex-col gap-6 md:flex-row md:items-end md:justify-between border-b border-zinc-200 pb-8">
                    <div className="max-w-2xl">
                        <h1 className="mt-4 text-4xl font-black tracking-tight text-zinc-950 md:text-5xl">
                            Assinatura do Contrato
                        </h1>
                        <p className="mt-3 max-w-xl text-sm leading-relaxed text-zinc-500 md:text-base">
                            Revise os termos e assine digitalmente no painel interativo. A assinatura gerada será vinculada ao contrato e registrada com validade jurídica.
                        </p>
                        <div className="mt-5 flex flex-wrap gap-3">
                            <button
                                type="button"
                                onClick={handleDownload}
                                className="inline-flex items-center justify-center gap-2 rounded-2xl border border-zinc-200 bg-white hover:bg-zinc-50 hover:border-blue-300 px-5 py-3 text-xs font-bold uppercase tracking-[0.15em] text-zinc-700 transition-all active:scale-95 shadow-md"
                            >
                                <Download size={14} />
                                Baixar Contrato Original (PDF)
                            </button>
                        </div>
                    </div>
                </div>

                {error && (
                    <div className="mb-6 rounded-2xl border border-amber-300 bg-amber-50 px-5 py-4 text-sm font-medium text-amber-800 flex items-center gap-3">
                        <span className="h-2 w-2 rounded-full bg-amber-500 animate-ping"></span>
                        {error}
                    </div>
                )}

                <div className="grid grid-cols-1 gap-8 xl:grid-cols-[1.15fr_0.85fr] items-start">
                    {/* Card de Detalhes do Contrato à Esquerda */}
                    <section className="overflow-hidden rounded-[32px] border border-zinc-200 bg-white shadow-2xl p-6 md:p-8 space-y-6">
                        <div className="flex items-center gap-4 border-b border-zinc-200 pb-5">
                            <FileText size={22} className="text-blue-600 shrink-0 mt-1" />
                            <div>
                                <p className="text-[10px] font-bold uppercase tracking-[0.25em] text-zinc-500">CONTRATANTE</p>
                                <h2 className="text-2xl font-bold text-zinc-950 tracking-tight">{contract?.client?.name || contract?.clientName || "Contratante"}</h2>
                            </div>
                        </div>

                        <div className="space-y-6">
                            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                                <div className="rounded-2xl border border-zinc-200 bg-zinc-50 p-4 transition-all hover:border-blue-200">
                                    <p className="text-[9px] font-bold uppercase tracking-[0.22em] text-zinc-500">Documento</p>
                                    <p className="mt-1.5 text-sm font-semibold text-zinc-800">{contract?.client?.document || "-"}</p>
                                </div>
                                <div className="rounded-2xl border border-zinc-200 bg-zinc-50 p-4 transition-all hover:border-blue-200">
                                    <p className="text-[9px] font-bold uppercase tracking-[0.22em] text-zinc-500">Vigência</p>
                                    <p className="mt-1.5 text-sm font-semibold text-zinc-800">{contract?.durationMonths || "-"} meses</p>
                                </div>
                                <div className="rounded-2xl border border-zinc-200 bg-zinc-50 p-4 transition-all hover:border-blue-200">
                                    <p className="text-[9px] font-bold uppercase tracking-[0.22em] text-zinc-500">Valor mensal</p>
                                    <p className="mt-1.5 text-sm font-semibold text-blue-600 font-mono">R$ {money(Number(contract?.monthlyValue || 0))}</p>
                                </div>
                                <div className="rounded-2xl border border-zinc-200 bg-zinc-50 p-4 transition-all hover:border-blue-200">
                                    <p className="text-[9px] font-bold uppercase tracking-[0.22em] text-zinc-500">Pagamento</p>
                                    <p className="mt-1.5 text-sm font-semibold text-zinc-800">Todo dia {contract?.paymentDay || "-"}</p>
                                </div>
                            </div>

                            <div className="rounded-3xl border border-zinc-200 bg-zinc-50 p-5 space-y-2">
                                <p className="text-[9px] font-bold uppercase tracking-[0.22em] text-zinc-500">Escopo da Prestação de Serviços</p>
                                <p className="text-sm leading-relaxed text-zinc-700 font-normal max-h-72 overflow-y-auto pr-2">{contract?.scope || "-"}</p>
                            </div>
                        </div>
                    </section>

                    {/* Painel da Assinatura Interativa à Direita */}
                    <aside className="rounded-[32px] border border-zinc-200 bg-white p-6 md:p-8 shadow-2xl">
                        {signed ? (
                            <div className="space-y-6 text-center py-6">
                                <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-emerald-50 border border-emerald-200 text-emerald-600 shadow-lg shadow-emerald-500/10">
                                    <CheckCircle2 size={36} />
                                </div>
                                <div>
                                    <h3 className="text-2xl font-bold text-zinc-950">Contrato Assinado</h3>
                                    <p className="mt-2 text-sm leading-relaxed text-zinc-500">
                                        Sua assinatura eletrônica foi autenticada e gravada com sucesso. O PDF oficial com validade jurídica já está disponível para download.
                                    </p>
                                </div>
                                {contract?.signedSignatureData && (
                                    <div className="rounded-2xl border border-zinc-200 bg-zinc-50 p-4 shadow-inner">
                                        <img
                                            src={contract.signedSignatureData}
                                            alt="Assinatura Autenticada"
                                            className="mx-auto max-h-24 w-full object-contain"
                                        />
                                    </div>
                                )}
                                <button
                                    onClick={handleDownload}
                                    className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 px-5 py-4 text-xs font-bold uppercase tracking-[0.18em] text-white shadow-lg shadow-blue-500/20 transition-all hover:scale-[1.02] active:scale-[0.98]"
                                >
                                    <Download size={15} />
                                    Baixar Versão Final
                                </button>
                            </div>
                        ) : (
                            <div className="space-y-6">
                                <div className="flex items-start gap-4">
                                    <PenLine size={22} className="text-blue-600 shrink-0 mt-1" />
                                    <div>
                                        <p className="text-[10px] font-bold uppercase tracking-[0.25em] text-zinc-500">PAINEL DE ASSINATURA</p>
                                        <h2 className="mt-1 text-2xl font-bold text-zinc-950 tracking-tight">Assine no quadro</h2>
                                        <p className="mt-2 text-xs leading-relaxed text-zinc-500">
                                            Desenhe sua assinatura no quadro abaixo. Ela será incorporada digitalmente ao termo de contrato.
                                        </p>
                                    </div>
                                </div>

                                <div className="rounded-2xl border border-zinc-200 bg-zinc-50 p-4 transition-all hover:border-blue-200">
                                    <div className="flex items-center gap-3">
                                        <div>
                                            <p className="text-sm font-bold text-zinc-950 leading-tight">{signerName || "Contratante"}</p>
                                            <p className="text-[10px] text-zinc-500 mt-1">{signerDocument || "CPF/CNPJ vinculado"}</p>
                                        </div>
                                    </div>
                                </div>

                                <div className="space-y-3">
                                    <div className="flex items-center justify-between gap-3">
                                        <span className="text-[10px] font-bold uppercase tracking-[0.22em] text-zinc-500">Assinatura Manual</span>
                                        <button
                                            type="button"
                                            onClick={clearSignature}
                                            className="inline-flex items-center gap-1.5 rounded-xl border border-zinc-200 bg-white px-3.5 py-2 text-[10px] font-bold uppercase tracking-[0.15em] text-zinc-600 transition-all hover:border-red-300 hover:bg-red-50 hover:text-red-600 active:scale-95"
                                        >
                                            <Eraser size={12} />
                                            Limpar
                                        </button>
                                    </div>

                                    {/* Canvas da Assinatura com efeito neon quando focado/desenhado */}
                                    <div className={`rounded-[28px] border p-1 bg-zinc-50 shadow-inner transition-all duration-300 ${hasSignatureDrawing ? 'border-blue-500/50 shadow-[0_0_20px_rgba(59,130,246,0.15)]' : 'border-zinc-200 hover:border-blue-200'}`}>
                                        <canvas
                                            ref={canvasRef}
                                            onPointerDown={(event) => {
                                                event.preventDefault();
                                                event.currentTarget.setPointerCapture(event.pointerId);
                                                beginDrawing(event.clientX, event.clientY);
                                            }}
                                            onPointerMove={(event) => {
                                                event.preventDefault();
                                                continueDrawing(event.clientX, event.clientY);
                                            }}
                                            onPointerUp={(event) => {
                                                event.preventDefault();
                                                if (event.currentTarget.hasPointerCapture(event.pointerId)) {
                                                    event.currentTarget.releasePointerCapture(event.pointerId);
                                                }
                                                stopDrawing();
                                            }}
                                            onPointerCancel={stopDrawing}
                                            onLostPointerCapture={stopDrawing}
                                            className="h-56 w-full touch-none rounded-[24px] border border-dashed border-slate-300 bg-white select-none shadow-[inset_0_2px_4px_rgba(0,0,0,0.06)]"
                                            style={{ cursor: "crosshair" }}
                                        />
                                    </div>

                                    {/* Checkbox customizado sofisticado */}
                                    <label className="flex items-start gap-3 rounded-2xl border border-zinc-200 bg-zinc-50 p-4 text-xs text-zinc-700 cursor-pointer select-none transition-all hover:border-blue-200 hover:bg-blue-50/40">
                                        <input
                                            type="checkbox"
                                            checked={accepted}
                                            onChange={(event) => setAccepted(event.target.checked)}
                                            className="mt-0.5 h-4 w-4 rounded border-zinc-300 bg-white text-blue-600 focus:ring-blue-500/20 focus:ring-offset-0"
                                        />
                                        <span className="leading-relaxed">
                                            Declaro que li integralmente o contrato e autorizo a inserção da minha assinatura digital como validação jurídica definitiva deste documento.
                                        </span>
                                    </label>

                                    <button
                                        onClick={handleSign}
                                        disabled={!canSubmitSignature}
                                        className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-blue-600 hover:bg-blue-500 px-5 py-4 text-xs font-bold uppercase tracking-[0.18em] text-white transition-all hover:scale-[1.02] active:scale-[0.98] shadow-lg shadow-blue-500/20 disabled:bg-blue-100 disabled:text-blue-700 disabled:shadow-none disabled:scale-100 disabled:cursor-not-allowed"
                                    >
                                        {signing ? <Loader2 className="animate-spin" size={14} /> : <CheckCircle2 size={14} />}
                                        {signatureButtonLabel}
                                    </button>

                                    <p className="text-[10px] text-center text-zinc-500 leading-relaxed pt-2 flex items-center justify-center gap-1.5">
                                        <ShieldCheck size={12} className="text-emerald-500" />
                                        Assinatura criptografada e em conformidade com a MP 2.200-2/2001.
                                    </p>
                                </div>
                            </div>
                        )}
                    </aside>
                </div>
            </div>
        </div>
    );
}
