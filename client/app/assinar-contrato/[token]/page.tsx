"use client";

import { useEffect, useRef, useState } from "react";
import { CheckCircle2, Download, Eraser, FileText, Loader2, PenLine } from "lucide-react";
import { downloadPublicContractPdf, getPublicContract, signPublicContract } from "@/lib/api";
import { useParams } from "next/navigation";

const money = (value: number) => value.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const getCanvasPoint = (canvas: HTMLCanvasElement, event: PointerEvent) => {
    const rect = canvas.getBoundingClientRect();
    return {
        x: event.clientX - rect.left,
        y: event.clientY - rect.top
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
    const [signerName, setSignerName] = useState("");
    const [signerDocument, setSignerDocument] = useState("");
    const [accepted, setAccepted] = useState(false);
    const [hasSignatureDrawing, setHasSignatureDrawing] = useState(false);

    const canvasRef = useRef<HTMLCanvasElement | null>(null);
    const isDrawingRef = useRef(false);
    const lastPointRef = useRef<{ x: number; y: number } | null>(null);

    const drawPoint = (context: CanvasRenderingContext2D, point: { x: number; y: number }) => {
        context.beginPath();
        context.arc(point.x, point.y, 1.6, 0, Math.PI * 2);
        context.fillStyle = "#f8fafc";
        context.fill();
    };

    const drawLine = (context: CanvasRenderingContext2D, from: { x: number; y: number }, to: { x: number; y: number }) => {
        context.beginPath();
        context.moveTo(from.x, from.y);
        context.lineTo(to.x, to.y);
        context.stroke();
    };

    useEffect(() => {
        if (!token) return;

        const loadContract = async () => {
            try {
                setLoading(true);
                setError(null);
                const data = await getPublicContract(token);
                setContract(data);
                setSignerName(data.signedName || data.client?.signerName || "");
                setSignerDocument(data.signedDocument || data.client?.signerDocument || "");
                setSigned(Boolean(data.signedAt));
                setHasSignatureDrawing(Boolean(data.signedSignatureData));
            } catch (err) {
                console.warn("Erro ao carregar contrato publico:", err);
                setError("Nao consegui carregar esse contrato.");
            } finally {
                setLoading(false);
            }
        };

        loadContract();
    }, [token]);

    useEffect(() => {
        if (signed) return;

        const canvas = canvasRef.current;
        if (!canvas) return;

        const context = canvas.getContext("2d");
        if (!context) return;

        const setupCanvas = () => {
            const ratio = window.devicePixelRatio || 1;
            const width = canvas.clientWidth || 520;
            const height = canvas.clientHeight || 180;

            canvas.width = Math.floor(width * ratio);
            canvas.height = Math.floor(height * ratio);
            context.setTransform(1, 0, 0, 1, 0, 0);
            context.scale(ratio, ratio);
            context.lineCap = "round";
            context.lineJoin = "round";
            context.lineWidth = 2.2;
            context.strokeStyle = "#f8fafc";
            context.clearRect(0, 0, width, height);
        };

        setupCanvas();
        window.addEventListener("resize", setupCanvas);

        return () => window.removeEventListener("resize", setupCanvas);
    }, [signed]);

    useEffect(() => {
        if (signed) return;

        const canvas = canvasRef.current;
        if (!canvas) return;

        const context = canvas.getContext("2d");
        if (!context) return;

        const handlePointerDown = (event: PointerEvent) => {
            event.preventDefault();
            const point = getCanvasPoint(canvas, event);
            isDrawingRef.current = true;
            lastPointRef.current = point;
            canvas.setPointerCapture(event.pointerId);
            drawPoint(context, point);
            setHasSignatureDrawing(true);
        };

        const handlePointerMove = (event: PointerEvent) => {
            if (!isDrawingRef.current || !lastPointRef.current) return;
            event.preventDefault();

            const point = getCanvasPoint(canvas, event);
            drawLine(context, lastPointRef.current, point);

            lastPointRef.current = point;
            setHasSignatureDrawing(true);
        };

        const stopDrawing = (event?: PointerEvent) => {
            if (event) {
                event.preventDefault();
            }
            isDrawingRef.current = false;
            lastPointRef.current = null;
        };

        canvas.addEventListener("pointerdown", handlePointerDown);
        canvas.addEventListener("pointermove", handlePointerMove);
        canvas.addEventListener("pointerup", stopDrawing);
        canvas.addEventListener("pointerleave", stopDrawing);
        canvas.addEventListener("pointercancel", stopDrawing);
        canvas.style.touchAction = "none";

        return () => {
            canvas.removeEventListener("pointerdown", handlePointerDown);
            canvas.removeEventListener("pointermove", handlePointerMove);
            canvas.removeEventListener("pointerup", stopDrawing);
            canvas.removeEventListener("pointerleave", stopDrawing);
            canvas.removeEventListener("pointercancel", stopDrawing);
        };
    }, [signed]);

    const clearSignature = () => {
        const canvas = canvasRef.current;
        const context = canvas?.getContext("2d");
        if (!canvas || !context) return;

        context.clearRect(0, 0, canvas.clientWidth, canvas.clientHeight);
        setHasSignatureDrawing(false);
    };

    const getSignatureDataUrl = () => {
        const canvas = canvasRef.current;
        if (!canvas || !hasSignatureDrawing) return "";
        return canvas.toDataURL("image/png");
    };

    const handleSign = async () => {
        if (!signerName.trim() || !signerDocument.trim()) {
            setError("Preencha o nome e o documento do assinante.");
            return;
        }

        if (!hasSignatureDrawing) {
            setError("Desenhe sua assinatura no quadro antes de concluir.");
            return;
        }

        if (!accepted) {
            setError("Voce precisa aceitar os termos antes de assinar.");
            return;
        }

        try {
            setSigning(true);
            setError(null);

            const signedSignatureData = getSignatureDataUrl();
            const result = await signPublicContract(token, {
                signerName,
                signerDocument,
                signedSignatureData
            });

            setContract((prev: any) => prev ? {
                ...prev,
                signedAt: result?.contract?.signedAt,
                signedName: signerName,
                signedDocument: signerDocument,
                signedSignatureData,
                status: "ACTIVE"
            } : prev);
            setSigned(true);
            setHasSignatureDrawing(true);
        } catch (err) {
            console.warn("Erro ao assinar contrato:", err);
            setError("Houve um erro ao registrar sua assinatura.");
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
            setError("Nao consegui baixar o PDF do contrato.");
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-[#0b0d14] text-white">
                <div className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/5 px-5 py-4">
                    <Loader2 className="animate-spin text-blue-500" size={20} />
                    <span className="text-sm font-bold uppercase tracking-[0.2em]">Carregando contrato</span>
                </div>
            </div>
        );
    }

    if (error && !contract) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-[#0b0d14] p-6 text-white">
                <div className="max-w-xl rounded-3xl border border-white/10 bg-[#161826] p-8 text-center">
                    <p className="text-xl font-bold">Contrato indisponivel</p>
                    <p className="mt-3 text-slate-400">{error}</p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-[#0b0d14] text-white">
            <div className="mx-auto max-w-5xl px-4 py-10">
                <div className="mb-8 flex items-center justify-between gap-4">
                    <div>
                        <p className="text-xs font-bold uppercase tracking-[0.3em] text-blue-400">Assinatura digital</p>
                        <h1 className="mt-2 text-4xl font-light tracking-tight">Contrato para assinatura</h1>
                    </div>
                    <button
                        onClick={handleDownload}
                        className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm font-bold uppercase tracking-[0.15em] text-white transition-colors hover:border-blue-500/40 hover:bg-blue-500/10"
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

                <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1.2fr_0.8fr]">
                    <section className="rounded-3xl border border-white/10 bg-[#161826] p-6 shadow-2xl">
                        <div className="mb-6 flex items-center gap-3">
                            <div className="flex h-11 w-11 items-center justify-center rounded-xl border border-blue-500/20 bg-blue-500/10 text-blue-400">
                                <FileText size={20} />
                            </div>
                            <div>
                                <p className="text-sm font-bold uppercase tracking-[0.2em] text-slate-500">Resumo</p>
                                <h2 className="text-xl font-semibold text-white">{contract?.client?.name || "Cliente"}</h2>
                            </div>
                        </div>

                        <div className="space-y-3 text-sm text-slate-300">
                            <p><span className="text-slate-500">Documento:</span> {contract?.client?.document || "-"}</p>
                            <p><span className="text-slate-500">Valor mensal:</span> R$ {money(Number(contract?.monthlyValue || 0))}</p>
                            <p><span className="text-slate-500">Vigencia:</span> {contract?.durationMonths || "-"} meses</p>
                            <p><span className="text-slate-500">Pagamento:</span> todo dia {contract?.paymentDay || "-"}</p>
                            <p className="leading-relaxed"><span className="text-slate-500">Escopo:</span> {contract?.scope || "-"}</p>
                        </div>

                        <div className="mt-6 rounded-2xl border border-white/10 bg-black/20 p-4 text-sm text-slate-400">
                            Leia o contrato no PDF, confira os dados e conclua a assinatura abaixo.
                        </div>
                    </section>

                    <aside className="rounded-3xl border border-white/10 bg-[#161826] p-6 shadow-2xl">
                        {signed ? (
                            <div className="space-y-4 text-center">
                                <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-emerald-500/15 text-emerald-400">
                                    <CheckCircle2 size={28} />
                                </div>
                                <div>
                                    <p className="text-xl font-semibold text-white">Contrato assinado</p>
                                    <p className="mt-2 text-sm text-slate-400">Sua assinatura desenhada foi registrada com sucesso.</p>
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
                                    className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-3 text-sm font-bold uppercase tracking-[0.15em] text-white transition-colors hover:bg-blue-500"
                                >
                                    <Download size={16} />
                                    Baixar versao final
                                </button>
                            </div>
                        ) : (
                            <div className="space-y-4">
                                <div className="flex items-center gap-3">
                                    <div className="flex h-11 w-11 items-center justify-center rounded-xl border border-blue-500/20 bg-blue-500/10 text-blue-400">
                                        <PenLine size={20} />
                                    </div>
                                    <div>
                                        <p className="text-sm font-bold uppercase tracking-[0.2em] text-slate-500">Assinatura</p>
                                        <h2 className="text-xl font-semibold text-white">Assine no quadro abaixo</h2>
                                    </div>
                                </div>

                                <label className="block space-y-2">
                                    <span className="ml-1 text-[10px] font-bold uppercase tracking-[0.2em] text-slate-500">Nome do assinante</span>
                                    <input
                                        value={signerName}
                                        onChange={(e) => setSignerName(e.target.value)}
                                        className="w-full rounded-xl border border-white/10 bg-[#0f111a] px-4 py-3 text-white outline-none transition-all focus:border-blue-500 focus:ring-1 focus:ring-blue-500/35"
                                        placeholder="Nome completo"
                                    />
                                </label>

                                <label className="block space-y-2">
                                    <span className="ml-1 text-[10px] font-bold uppercase tracking-[0.2em] text-slate-500">CPF / CNPJ</span>
                                    <input
                                        value={signerDocument}
                                        onChange={(e) => setSignerDocument(e.target.value)}
                                        className="w-full rounded-xl border border-white/10 bg-[#0f111a] px-4 py-3 text-white outline-none transition-all focus:border-blue-500 focus:ring-1 focus:ring-blue-500/35"
                                        placeholder="Documento do assinante"
                                    />
                                </label>

                                <div className="space-y-2">
                                    <div className="flex items-center justify-between gap-3">
                                        <span className="ml-1 text-[10px] font-bold uppercase tracking-[0.2em] text-slate-500">Assinatura manual</span>
                                        <button
                                            type="button"
                                            onClick={clearSignature}
                                            className="inline-flex items-center gap-2 rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-xs font-bold uppercase tracking-[0.15em] text-slate-200 transition-colors hover:border-cyan-400/40 hover:bg-cyan-500/10"
                                        >
                                            <Eraser size={14} />
                                            Limpar
                                        </button>
                                    </div>
                                    <div className="rounded-2xl border border-white/10 bg-[#0f111a] p-3">
                                        <canvas
                                            ref={canvasRef}
                                            className="h-44 w-full touch-none rounded-xl border border-dashed border-white/10 bg-[#0b0d14]"
                                        />
                                    </div>
                                    <p className="text-xs text-slate-500">Use o dedo no celular ou o mouse no computador para desenhar a assinatura.</p>
                                </div>

                                <label className="flex items-start gap-3 rounded-2xl border border-white/10 bg-black/20 p-4 text-sm text-slate-300">
                                    <input
                                        type="checkbox"
                                        checked={accepted}
                                        onChange={(e) => setAccepted(e.target.checked)}
                                        className="mt-1 h-4 w-4 rounded border-slate-600 bg-slate-950 text-blue-500 focus:ring-blue-500/20"
                                    />
                                    <span>Li o contrato e confirmo que estou autorizado a assina-lo digitalmente.</span>
                                </label>

                                <button
                                    onClick={handleSign}
                                    disabled={signing}
                                    className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-3 text-sm font-bold uppercase tracking-[0.15em] text-white transition-colors hover:bg-blue-500 disabled:bg-slate-800 disabled:text-slate-500"
                                >
                                    {signing ? <Loader2 className="animate-spin" size={16} /> : <CheckCircle2 size={16} />}
                                    {signing ? "Assinando..." : "Assinar contrato"}
                                </button>
                            </div>
                        )}
                    </aside>
                </div>
            </div>
        </div>
    );
}
