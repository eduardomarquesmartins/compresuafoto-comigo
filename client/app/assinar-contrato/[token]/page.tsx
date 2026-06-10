"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { CheckCircle2, Download, Eraser, FileText, Loader2, PenLine, ShieldCheck } from "lucide-react";
import { downloadPublicContractPdf, getPublicContract, signPublicContract } from "@/lib/api";
import { useParams } from "next/navigation";

const money = (value: number) => value.toLocaleString("pt-BR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
});

const getPoint = (canvas: HTMLCanvasElement, clientX: number, clientY: number) => {
    const rect = canvas.getBoundingClientRect();
    return {
        x: clientX - rect.left,
        y: clientY - rect.top
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

        context.strokeStyle = "rgba(96,165,250,0.15)";
        context.lineWidth = 1;
        context.setLineDash([6, 6]);
        context.beginPath();
        context.moveTo(20, height * 0.72);
        context.lineTo(width - 20, height * 0.72);
        context.stroke();
        context.setLineDash([]);

        context.fillStyle = "rgba(148,163,184,0.45)";
        context.font = "500 16px Inter, Arial, sans-serif";
        context.fillText("Assine aqui com o dedo ou mouse", 24, 34);
    };

    const configureCanvas = () => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        const context = canvas.getContext("2d");
        if (!context) return;

        const ratio = window.devicePixelRatio || 1;
        const width = canvas.clientWidth || 520;
        const height = canvas.clientHeight || 220;

        canvas.width = Math.floor(width * ratio);
        canvas.height = Math.floor(height * ratio);
        context.setTransform(1, 0, 0, 1, 0, 0);
        context.scale(ratio, ratio);
        context.lineCap = "round";
        context.lineJoin = "round";
        context.lineWidth = 3.5;
        context.strokeStyle = "#60a5fa";
        drawGuide(context, width, height);
        setCanvasReady(true);
    };

    const drawDot = (point: { x: number; y: number }) => {
        const canvas = canvasRef.current;
        const context = canvas?.getContext("2d");
        if (!canvas || !context) return;

        context.beginPath();
        context.fillStyle = "#60a5fa";
        context.arc(point.x, point.y, 2.2, 0, Math.PI * 2);
        context.fill();
    };

    const drawSegment = (from: { x: number; y: number }, to: { x: number; y: number }) => {
        const canvas = canvasRef.current;
        const context = canvas?.getContext("2d");
        if (!canvas || !context) return;

        context.beginPath();
        context.moveTo(from.x, from.y);
        context.lineTo(to.x, to.y);
        context.stroke();
    };

    const beginDrawing = (clientX: number, clientY: number) => {
        const canvas = canvasRef.current;
        if (!canvas) return;

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
        setHasSignatureDrawing(true);
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

        configureCanvas();
        window.addEventListener("resize", configureCanvas);
        return () => window.removeEventListener("resize", configureCanvas);
    }, [signed]);

    const clearSignature = () => {
        configureCanvas();
        setHasSignatureDrawing(false);
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

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-[#090b12] text-white">
                <div className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/5 px-5 py-4">
                    <Loader2 className="animate-spin text-blue-500" size={20} />
                    <span className="text-sm font-bold uppercase tracking-[0.2em]">Carregando contrato</span>
                </div>
            </div>
        );
    }

    if (error && !contract) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-[#090b12] p-6 text-white">
                <div className="max-w-xl rounded-3xl border border-white/10 bg-[#161826] p-8 text-center">
                    <p className="text-xl font-bold">Contrato indisponível</p>
                    <p className="mt-3 text-slate-400">{error}</p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-[radial-gradient(circle_at_top,#1a2a55_0%,#0b0d14_28%,#090b12_100%)] text-white">
            <div className="mx-auto max-w-6xl px-4 py-8 md:px-6 md:py-12">
                <div className="mb-8 flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
                    <div className="max-w-2xl">
                        <p className="text-xs font-bold uppercase tracking-[0.35em] text-blue-400">Assinatura Digital</p>
                        <h1 className="mt-3 text-4xl font-light tracking-tight text-white md:text-6xl">
                            Validação final do contrato
                        </h1>
                        <p className="mt-4 max-w-xl text-sm leading-6 text-slate-400 md:text-base">
                            Revise os dados do contrato e assine no quadro abaixo. A assinatura fica registrada no sistema e no PDF final.
                        </p>
                    </div>

                    <button
                        onClick={handleDownload}
                        className="inline-flex items-center justify-center gap-2 rounded-2xl border border-white/10 bg-white/5 px-5 py-4 text-sm font-bold uppercase tracking-[0.18em] text-white transition-colors hover:border-blue-500/40 hover:bg-blue-500/10"
                    >
                        <Download size={16} />
                        Baixar PDF
                    </button>
                </div>

                {error && (
                    <div className="mb-6 rounded-2xl border border-amber-500/20 bg-amber-500/10 px-4 py-3 text-sm text-amber-100">
                        {error}
                    </div>
                )}

                <div className="grid grid-cols-1 gap-6 xl:grid-cols-[1.15fr_0.85fr]">
                    <section className="overflow-hidden rounded-[28px] border border-white/10 bg-[linear-gradient(180deg,rgba(22,24,38,0.98),rgba(15,17,26,0.98))] shadow-2xl">
                        <div className="border-b border-white/5 px-6 py-6 md:px-8">
                            <div className="flex items-center gap-4">
                                <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-blue-500/20 bg-blue-500/10 text-blue-400">
                                    <FileText size={22} />
                                </div>
                                <div>
                                    <p className="text-[11px] font-bold uppercase tracking-[0.25em] text-slate-500">Contrato</p>
                                    <h2 className="text-2xl font-semibold text-white">{contract?.client?.name || contract?.clientName || "Contratante"}</h2>
                                </div>
                            </div>
                        </div>

                        <div className="space-y-6 px-6 py-6 md:px-8">
                            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                                <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
                                    <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-slate-500">Documento</p>
                                    <p className="mt-2 text-sm text-slate-200">{contract?.client?.document || "-"}</p>
                                </div>
                                <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
                                    <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-slate-500">Vigência</p>
                                    <p className="mt-2 text-sm text-slate-200">{contract?.durationMonths || "-"} meses</p>
                                </div>
                                <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
                                    <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-slate-500">Valor mensal</p>
                                    <p className="mt-2 text-sm text-slate-200">R$ {money(Number(contract?.monthlyValue || 0))}</p>
                                </div>
                                <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
                                    <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-slate-500">Pagamento</p>
                                    <p className="mt-2 text-sm text-slate-200">Todo dia {contract?.paymentDay || "-"}</p>
                                </div>
                            </div>

                            <div className="rounded-3xl border border-white/10 bg-black/20 p-5">
                                <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-slate-500">Escopo</p>
                                <p className="mt-3 text-sm leading-7 text-slate-300">{contract?.scope || "-"}</p>
                            </div>
                        </div>
                    </section>

                    <aside className="rounded-[28px] border border-white/10 bg-[linear-gradient(180deg,rgba(22,24,38,0.98),rgba(15,17,26,0.98))] p-6 shadow-2xl md:p-7">
                        {signed ? (
                            <div className="space-y-5 text-center">
                                <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-emerald-500/15 text-emerald-400">
                                    <CheckCircle2 size={30} />
                                </div>
                                <div>
                                    <p className="text-2xl font-semibold text-white">Contrato assinado</p>
                                    <p className="mt-2 text-sm leading-6 text-slate-400">
                                        A assinatura foi registrada no sistema e o PDF final já pode ser baixado.
                                    </p>
                                </div>
                                {contract?.signedSignatureData && (
                                    <div className="rounded-2xl border border-white/10 bg-[#0f111a] p-4">
                                        <img
                                            src={contract.signedSignatureData}
                                            alt="Assinatura"
                                            className="mx-auto max-h-28 w-full object-contain"
                                        />
                                    </div>
                                )}
                                <button
                                    onClick={handleDownload}
                                    className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-blue-600 px-4 py-4 text-sm font-bold uppercase tracking-[0.18em] text-white transition-colors hover:bg-blue-500"
                                >
                                    <Download size={16} />
                                    Baixar versão final
                                </button>
                            </div>
                        ) : (
                            <div className="space-y-5">
                                <div className="flex items-start gap-4">
                                    <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-blue-500/20 bg-blue-500/10 text-blue-400">
                                        <PenLine size={22} />
                                    </div>
                                    <div>
                                        <p className="text-[11px] font-bold uppercase tracking-[0.25em] text-slate-500">Assinatura</p>
                                        <h2 className="mt-1 text-2xl font-semibold text-white">Assine no quadro</h2>
                                        <p className="mt-2 text-sm leading-6 text-slate-400">
                                            O sistema vai registrar a assinatura usando os dados já vinculados ao contrato.
                                        </p>
                                    </div>
                                </div>

                                <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
                                    <div className="flex items-center gap-3">
                                        <ShieldCheck size={18} className="text-blue-400" />
                                        <div>
                                            <p className="text-sm font-semibold text-white">{signerName || "Contratante"}</p>
                                            <p className="text-xs text-slate-500">{signerDocument || "Documento vinculado ao contrato"}</p>
                                        </div>
                                    </div>
                                </div>

                                <div className="space-y-3">
                                    <div className="flex items-center justify-between gap-3">
                                        <span className="text-[10px] font-bold uppercase tracking-[0.22em] text-slate-500">Assinatura manual</span>
                                        <button
                                            type="button"
                                            onClick={clearSignature}
                                            className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs font-bold uppercase tracking-[0.15em] text-slate-200 transition-colors hover:border-cyan-400/40 hover:bg-cyan-500/10"
                                        >
                                            <Eraser size={14} />
                                            Limpar
                                        </button>
                                    </div>

                                    <div className="rounded-[24px] border border-white/10 bg-[#0b0d14] p-3 shadow-inner">
                                        <canvas
                                            ref={canvasRef}
                                            onMouseDown={(event) => beginDrawing(event.clientX, event.clientY)}
                                            onMouseMove={(event) => continueDrawing(event.clientX, event.clientY)}
                                            onMouseUp={stopDrawing}
                                            onMouseLeave={stopDrawing}
                                            onTouchStart={(event) => {
                                                const touch = event.touches[0];
                                                if (!touch) return;
                                                beginDrawing(touch.clientX, touch.clientY);
                                            }}
                                            onTouchMove={(event) => {
                                                const touch = event.touches[0];
                                                if (!touch) return;
                                                continueDrawing(touch.clientX, touch.clientY);
                                            }}
                                            onTouchEnd={stopDrawing}
                                            className="h-56 w-full touch-none rounded-[18px] border border-dashed border-blue-500/20 bg-[#070910] select-none"
                                            style={{ cursor: "crosshair" }}
                                        />
                                    </div>

                                    <div className="flex items-start gap-3 rounded-2xl border border-white/10 bg-black/20 p-4 text-sm text-slate-300">
                                        <input
                                            type="checkbox"
                                            checked={accepted}
                                            onChange={(event) => setAccepted(event.target.checked)}
                                            className="mt-1 h-4 w-4 rounded border-slate-600 bg-slate-950 text-blue-500 focus:ring-blue-500/20"
                                        />
                                        <span>
                                            Li o contrato e autorizo a assinatura digital deste documento.
                                        </span>
                                    </div>

                                    <button
                                        onClick={handleSign}
                                        disabled={signing || !canvasReady}
                                        className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-blue-600 px-4 py-4 text-sm font-bold uppercase tracking-[0.18em] text-white transition-colors hover:bg-blue-500 disabled:bg-slate-800 disabled:text-slate-500"
                                    >
                                        {signing ? <Loader2 className="animate-spin" size={16} /> : <CheckCircle2 size={16} />}
                                        {signing ? "Registrando assinatura..." : "Assinar contrato"}
                                    </button>
                                </div>
                            </div>
                        )}
                    </aside>
                </div>
            </div>
        </div>
    );
}
