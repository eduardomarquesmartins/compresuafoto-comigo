"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { CheckCircle2, Download, Eraser, FileText, Loader2, PenLine, ShieldCheck } from "lucide-react";
import { downloadPublicContractPdf, getPublicContract, signPublicContract } from "@/lib/api";
import { useParams } from "next/navigation";
import Image from "next/image";

type Point = { x: number; y: number };

const money = (value: number) => value.toLocaleString("pt-BR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
});

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
    const strokesRef = useRef<Point[][]>([]);
    const currentStrokeRef = useRef<Point[]>([]);
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

    const getPoint = (canvas: HTMLCanvasElement, clientX: number, clientY: number): Point => {
        const rect = canvas.getBoundingClientRect();
        if (rect.width === 0 || rect.height === 0) return { x: 0, y: 0 };
        const logicalWidth = prevWidthRef.current || rect.width;
        const logicalHeight = prevHeightRef.current || rect.height;
        return {
            x: ((clientX - rect.left) / rect.width) * logicalWidth,
            y: ((clientY - rect.top) / rect.height) * logicalHeight
        };
    };

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
        context.font = "500 15px Montserrat, Inter, Arial, sans-serif";
        context.fillText("Assine aqui com o dedo ou mouse", 24, 34);
    };

    const redrawCanvas = () => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const context = canvas.getContext("2d");
        if (!context) return;

        const width = prevWidthRef.current || 520;
        const height = prevHeightRef.current || 220;

        context.clearRect(0, 0, width, height);

        if (strokesRef.current.length === 0) {
            drawGuide(context, width, height);
            return;
        }

        context.save();
        context.strokeStyle = "#000000";
        context.fillStyle = "#000000";
        context.lineWidth = 3.5;
        context.lineCap = "round";
        context.lineJoin = "round";

        for (const stroke of strokesRef.current) {
            if (stroke.length === 1) {
                context.beginPath();
                context.arc(stroke[0].x, stroke[0].y, 1.75, 0, Math.PI * 2);
                context.fill();
            } else if (stroke.length > 1) {
                context.beginPath();
                context.moveTo(stroke[0].x, stroke[0].y);
                for (let i = 1; i < stroke.length; i++) {
                    context.lineTo(stroke[i].x, stroke[i].y);
                }
                context.stroke();
            }
        }
        context.restore();
    };

    const configureCanvas = () => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        const context = canvas.getContext("2d");
        if (!context) return;

        const rect = canvas.getBoundingClientRect();
        const cssWidth = Math.max(1, Math.round(rect.width || canvas.clientWidth || 520));
        const cssHeight = Math.max(1, Math.round(rect.height || canvas.clientHeight || 220));
        const dpr = Math.max(1, window.devicePixelRatio || 1);

        prevWidthRef.current = cssWidth;
        prevHeightRef.current = cssHeight;

        canvas.width = Math.round(cssWidth * dpr);
        canvas.height = Math.round(cssHeight * dpr);

        context.setTransform(dpr, 0, 0, dpr, 0, 0);
        context.lineCap = "round";
        context.lineJoin = "round";
        context.lineWidth = 3.5;
        context.strokeStyle = "#000000";

        redrawCanvas();
        setCanvasReady(true);
    };

    const beginDrawing = (clientX: number, clientY: number) => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        const context = canvas.getContext("2d");
        if (!context) return;

        const point = getPoint(canvas, clientX, clientY);
        drawingRef.current = true;
        currentStrokeRef.current = [point];
        strokesRef.current.push(currentStrokeRef.current);

        if (!hasSignatureDrawing) {
            setHasSignatureDrawing(true);
        }

        redrawCanvas();
        setError(null);
    };

    const continueDrawing = (clientX: number, clientY: number) => {
        const canvas = canvasRef.current;
        if (!canvas || !drawingRef.current) return;

        const context = canvas.getContext("2d");
        if (!context) return;

        const nextPoint = getPoint(canvas, clientX, clientY);
        currentStrokeRef.current.push(nextPoint);

        const stroke = currentStrokeRef.current;
        if (stroke.length >= 2) {
            const from = stroke[stroke.length - 2];
            const to = stroke[stroke.length - 1];
            context.beginPath();
            context.strokeStyle = "#000000";
            context.lineWidth = 3.5;
            context.lineCap = "round";
            context.lineJoin = "round";
            context.moveTo(from.x, from.y);
            context.lineTo(to.x, to.y);
            context.stroke();
        }
    };

    const stopDrawing = () => {
        drawingRef.current = false;
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
                setError("Não foi possível carregar as informações deste contrato.");
            } finally {
                setLoading(false);
            }
        };

        loadContract();
    }, [token]);

    useEffect(() => {
        if (signed || loading) return;

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
    }, [signed, loading]);

    const clearSignature = () => {
        strokesRef.current = [];
        currentStrokeRef.current = [];
        drawingRef.current = false;
        setHasSignatureDrawing(false);
        redrawCanvas();
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
            <div className="min-h-[75vh] flex items-center justify-center text-zinc-900 font-sans">
                <div className="flex items-center gap-3 rounded-2xl border border-zinc-200 bg-white px-6 py-4 shadow-sm">
                    <Loader2 className="animate-spin text-blue-600" size={20} />
                    <span className="text-xs font-bold uppercase tracking-[0.2em] text-zinc-500">Autenticando contrato...</span>
                </div>
            </div>
        );
    }

    if (error && !contract) {
        return (
            <div className="min-h-[75vh] flex items-center justify-center p-6 text-zinc-900 font-sans">
                <div className="max-w-xl w-full rounded-2xl border border-zinc-200 bg-white p-8 text-center shadow-sm">
                    <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-rose-50 border border-rose-200 text-rose-600 mb-4">
                        <FileText size={24} />
                    </div>
                    <p className="text-2xl font-bold text-zinc-950 tracking-tight">Contrato indisponível</p>
                    <p className="mt-3 text-zinc-500 text-sm leading-relaxed">{error}</p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen text-zinc-900 font-sans antialiased pb-16 selection:bg-blue-600 selection:text-white">
            {/* Header / Topbar da Marca */}
            <header className="border-b border-zinc-200/80 bg-white/95 sticky top-0 z-50 shadow-xs backdrop-blur-md">
                <div className="mx-auto max-w-6xl px-4 py-4 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <Image src="/logo.png" alt="Conti Marketing Digital" width={160} height={45} className="h-10 w-auto object-contain" priority />
                    </div>
                </div>
            </header>

            <div className="mx-auto max-w-6xl px-4 py-8 md:px-6 md:py-10">
                <div className="mb-8 border-b border-zinc-200 pb-6 flex flex-col sm:flex-row sm:items-end justify-between gap-4">
                    <div className="max-w-2xl space-y-2">
                        <h1 className="text-3xl font-extrabold tracking-tight text-zinc-950 md:text-4xl">
                            Assinatura do Contrato
                        </h1>
                        <p className="text-xs sm:text-sm leading-relaxed text-zinc-600">
                            Revise os termos e assine digitalmente no quadro interativo. A assinatura gerada será vinculada ao contrato e registrada com validade jurídica.
                        </p>
                    </div>

                    {!signed && (
                        <div>
                            <button
                                type="button"
                                onClick={handleDownload}
                                className="inline-flex items-center justify-center gap-2 rounded-xl border border-zinc-200 bg-white hover:bg-zinc-50 hover:border-blue-300 px-5 py-3 text-xs font-bold uppercase tracking-[0.15em] text-zinc-700 transition-all active:scale-95 shadow-sm"
                            >
                                <Download size={14} />
                                Baixar contrato (PDF)
                            </button>
                        </div>
                    )}
                </div>

                {error && (
                    <div className="mb-6 rounded-xl border border-amber-300 bg-amber-50 px-5 py-4 text-xs sm:text-sm font-medium text-amber-900 flex items-center gap-3">
                        <span className="h-2 w-2 rounded-full bg-amber-500 animate-ping"></span>
                        {error}
                    </div>
                )}

                <div className="grid grid-cols-1 gap-8 xl:grid-cols-[1.15fr_0.85fr] items-start">
                    {/* Card de Detalhes do Contrato à Esquerda */}
                    <section className="overflow-hidden rounded-2xl border border-zinc-200/90 bg-white shadow-sm p-6 md:p-8 space-y-6">
                        <div className="flex items-center gap-3 border-b border-zinc-100 pb-5">
                            <FileText size={20} className="text-blue-600 shrink-0" />
                            <div>
                                <p className="text-[10px] font-extrabold uppercase tracking-[0.2em] text-zinc-400">CONTRATANTE</p>
                                <h2 className="text-xl font-bold text-zinc-950 tracking-tight">{contract?.client?.name || contract?.clientName || "Contratante"}</h2>
                            </div>
                        </div>

                        <div className="space-y-6">
                            <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2">
                                <div className="rounded-xl border border-zinc-200 bg-zinc-50/70 p-4">
                                    <p className="text-[9px] font-extrabold uppercase tracking-[0.18em] text-zinc-500">Documento</p>
                                    <p className="mt-1 text-sm font-semibold text-zinc-800">{contract?.client?.document || "-"}</p>
                                </div>
                                <div className="rounded-xl border border-zinc-200 bg-zinc-50/70 p-4">
                                    <p className="text-[9px] font-extrabold uppercase tracking-[0.18em] text-zinc-500">Vigência</p>
                                    <p className="mt-1 text-sm font-semibold text-zinc-800">{contract?.durationMonths || "-"} meses</p>
                                </div>
                                <div className="rounded-xl border border-zinc-200 bg-zinc-50/70 p-4">
                                    <p className="text-[9px] font-extrabold uppercase tracking-[0.18em] text-zinc-500">Valor mensal</p>
                                    <p className="mt-1 text-sm font-bold text-blue-600 font-sans tabular-nums">R$ {money(Number(contract?.monthlyValue || 0))}</p>
                                </div>
                                <div className="rounded-xl border border-zinc-200 bg-zinc-50/70 p-4">
                                    <p className="text-[9px] font-extrabold uppercase tracking-[0.18em] text-zinc-500">Pagamento</p>
                                    <p className="mt-1 text-sm font-semibold text-zinc-800">Todo dia {contract?.paymentDay || "-"}</p>
                                </div>
                            </div>

                            <div className="rounded-xl border border-zinc-200 bg-zinc-50/70 p-5 space-y-2">
                                <p className="text-[9px] font-extrabold uppercase tracking-[0.18em] text-zinc-500">Escopo da Prestação de Serviços</p>
                                <p className="text-xs sm:text-sm leading-relaxed text-zinc-700 max-h-72 overflow-y-auto pr-2">{contract?.scope || "-"}</p>
                            </div>
                        </div>
                    </section>

                    {/* Painel da Assinatura Interativa à Direita */}
                    <aside className="rounded-2xl border border-zinc-200/90 bg-white p-6 md:p-8 shadow-sm">
                        {signed ? (
                            <div className="space-y-6 text-center py-6">
                                <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-emerald-50 border border-emerald-200 text-emerald-600 shadow-sm">
                                    <CheckCircle2 size={32} />
                                </div>
                                <div>
                                    <h3 className="text-xl font-bold text-zinc-950">Contrato Assinado</h3>
                                    <p className="mt-2 text-xs sm:text-sm leading-relaxed text-zinc-500">
                                        Sua assinatura eletrônica foi autenticada e gravada com sucesso. O PDF oficial com validade jurídica já está disponível para download.
                                    </p>
                                </div>
                                {contract?.signedSignatureData && (
                                    <div className="rounded-xl border border-zinc-200 bg-zinc-50 p-4">
                                        <img
                                            src={contract.signedSignatureData}
                                            alt="Assinatura Autenticada"
                                            className="mx-auto max-h-24 w-full object-contain"
                                        />
                                    </div>
                                )}
                                <button
                                    onClick={handleDownload}
                                    className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white px-5 py-3.5 text-xs font-bold uppercase tracking-[0.18em] shadow-sm transition-all focus-visible:ring-2 focus-visible:ring-blue-500"
                                >
                                    <Download size={15} />
                                    Baixar Versão Final
                                </button>
                            </div>
                        ) : (
                            <div className="space-y-6">
                                <div className="flex items-start gap-3.5">
                                    <PenLine size={20} className="text-blue-600 shrink-0 mt-0.5" />
                                    <div>
                                        <p className="text-[10px] font-extrabold uppercase tracking-[0.2em] text-zinc-400">PAINEL DE ASSINATURA</p>
                                        <h2 className="mt-0.5 text-xl font-bold text-zinc-950 tracking-tight">Assine no quadro</h2>
                                        <p className="mt-1 text-xs leading-relaxed text-zinc-500">
                                            Desenhe sua assinatura no quadro abaixo. Ela será incorporada digitalmente ao termo de contrato.
                                        </p>
                                    </div>
                                </div>

                                <div className="rounded-xl border border-zinc-200 bg-zinc-50/70 p-4">
                                    <div>
                                        <p className="text-sm font-bold text-zinc-950 leading-tight">{signerName || "Contratante"}</p>
                                        <p className="text-xs text-zinc-500 mt-0.5">{signerDocument || "CPF/CNPJ vinculado"}</p>
                                    </div>
                                </div>

                                <div className="space-y-3">
                                    <div className="flex items-center justify-between gap-3">
                                        <span className="text-[10px] font-extrabold uppercase tracking-[0.18em] text-zinc-500">Assinatura Manual</span>
                                        <button
                                            type="button"
                                            onClick={clearSignature}
                                            className="inline-flex items-center gap-1.5 rounded-lg border border-zinc-200 bg-white px-3 py-1.5 text-[10px] font-bold uppercase tracking-[0.15em] text-zinc-600 transition-all hover:border-red-300 hover:bg-rose-50 hover:text-rose-600 active:scale-95"
                                        >
                                            <Eraser size={12} />
                                            Limpar
                                        </button>
                                    </div>

                                    {/* Canvas da Assinatura com mapeamento de coordenadas 1:1 sem deslocamento */}
                                    <div className={`rounded-2xl border p-1 bg-zinc-50 shadow-inner transition-all duration-200 ${hasSignatureDrawing ? 'border-blue-400 shadow-[0_0_12px_rgba(59,130,246,0.1)]' : 'border-zinc-200 hover:border-blue-200'}`}>
                                        <canvas
                                            ref={canvasRef}
                                            onPointerDown={(event) => {
                                                event.preventDefault();
                                                event.currentTarget.setPointerCapture(event.pointerId);
                                                beginDrawing(event.clientX, event.clientY);
                                            }}
                                            onPointerMove={(event) => {
                                                event.preventDefault();
                                                if (drawingRef.current) {
                                                    continueDrawing(event.clientX, event.clientY);
                                                }
                                            }}
                                            onPointerUp={(event) => {
                                                event.preventDefault();
                                                if (event.currentTarget.hasPointerCapture(event.pointerId)) {
                                                    event.currentTarget.releasePointerCapture(event.pointerId);
                                                }
                                                stopDrawing();
                                            }}
                                            onPointerCancel={(event) => {
                                                if (event.currentTarget.hasPointerCapture(event.pointerId)) {
                                                    event.currentTarget.releasePointerCapture(event.pointerId);
                                                }
                                                stopDrawing();
                                            }}
                                            className="h-56 w-full touch-none rounded-xl border border-dashed border-zinc-300 bg-white select-none shadow-[inset_0_2px_4px_rgba(0,0,0,0.04)]"
                                            style={{ cursor: "crosshair", touchAction: "none" }}
                                        />
                                    </div>

                                    {/* Checkbox de Aceite dos Termos */}
                                    <label className="flex items-start gap-3 rounded-xl border border-zinc-200 bg-zinc-50/70 p-4 text-xs text-zinc-700 cursor-pointer select-none transition-all hover:border-blue-200 hover:bg-blue-50/30">
                                        <input
                                            type="checkbox"
                                            checked={accepted}
                                            onChange={(event) => setAccepted(event.target.checked)}
                                            className="mt-0.5 h-4 w-4 shrink-0 rounded border-zinc-300 bg-white text-blue-600 focus:ring-blue-500/20"
                                        />
                                        <span className="leading-relaxed">
                                            Declaro que li integralmente o contrato e autorizo a inserção da minha assinatura digital como validação jurídica definitiva deste documento.
                                        </span>
                                    </label>

                                    <button
                                        onClick={handleSign}
                                        disabled={!canSubmitSignature}
                                        className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white px-5 py-3.5 text-xs font-bold uppercase tracking-[0.18em] shadow-sm transition-all focus-visible:ring-2 focus-visible:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
                                    >
                                        {signing ? <Loader2 className="animate-spin" size={14} /> : <CheckCircle2 size={14} />}
                                        {signatureButtonLabel}
                                    </button>

                                    {/* Observação Legal perfeitamente alinhada */}
                                    <div className="pt-2 flex items-center justify-center gap-1.5 text-center text-[11px] text-zinc-500 leading-normal">
                                        <ShieldCheck size={14} className="text-emerald-500 shrink-0" />
                                        <span>Assinatura criptografada e em conformidade com a MP 2.200-2/2001.</span>
                                    </div>
                                </div>
                            </div>
                        )}
                    </aside>
                </div>
            </div>
        </div>
    );
}
