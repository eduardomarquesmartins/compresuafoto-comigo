"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { CheckCircle2, Download, Eraser, FileText, Loader2, PenLine, ShieldCheck } from "lucide-react";
import { downloadPublicContractPdf, getPublicContract, signPublicContract } from "@/lib/api";
import { useParams } from "next/navigation";
import Image from "next/image";
import logoAdmin from "../../admin/logo-admin.jpg";

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
        const width = canvas.clientWidth || 520;
        const height = canvas.clientHeight || 220;

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
            const width = canvas.clientWidth || 520;
            const height = canvas.clientHeight || 220;
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
            <div className="min-h-screen flex items-center justify-center bg-[#060814] text-white">
                <div className="flex items-center gap-3 rounded-2xl border border-white/[0.06] bg-white/[0.02] backdrop-blur-md px-6 py-4 shadow-xl">
                    <Loader2 className="animate-spin text-blue-500" size={20} />
                    <span className="text-xs font-bold uppercase tracking-[0.2em] text-slate-300">Autenticando sessão segura...</span>
                </div>
            </div>
        );
    }

    if (error && !contract) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-[#060814] p-6 text-white">
                <div className="max-w-xl w-full rounded-[32px] border border-white/[0.06] bg-gradient-to-b from-[#111322] to-[#0a0c16] p-8 text-center shadow-2xl">
                    <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-red-500/10 border border-red-500/20 text-red-400 mb-4">
                        <FileText size={24} />
                    </div>
                    <p className="text-2xl font-bold text-white tracking-tight">Contrato indisponível</p>
                    <p className="mt-3 text-slate-400 text-sm leading-relaxed">{error}</p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-[#060814] bg-[radial-gradient(ellipse_80%_80%_at_50%_-20%,rgba(99,102,241,0.15),rgba(255,255,255,0))] text-white font-sans antialiased">
            {/* Header / Topbar da Marca */}
            <header className="border-b border-white/[0.06] bg-black/20 backdrop-blur-md sticky top-0 z-50">
                <div className="mx-auto max-w-6xl px-4 py-4 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <Image src={logoAdmin} alt="Conti Marketing Digital" className="h-9 w-9 rounded-md object-cover" />
                        <span className="font-normal tracking-tight text-white text-sm">Conti Marketing Digital</span>
                    </div>
                </div>
            </header>

            <div className="mx-auto max-w-6xl px-4 py-8 md:px-6 md:py-12">
                <div className="mb-10 flex flex-col gap-6 md:flex-row md:items-end md:justify-between border-b border-white/[0.05] pb-8">
                    <div className="max-w-2xl">
                        <h1 className="mt-4 text-4xl font-black tracking-tight text-white md:text-5xl bg-clip-text text-transparent bg-gradient-to-r from-white via-white to-slate-400">
                            Assinatura do Contrato
                        </h1>
                        <p className="mt-3 max-w-xl text-sm leading-relaxed text-slate-400 md:text-base">
                            Revise os termos e assine digitalmente no painel interativo. A assinatura gerada será vinculada ao contrato e registrada com validade jurídica.
                        </p>
                    </div>
                </div>

                {error && (
                    <div className="mb-6 rounded-2xl border border-amber-500/25 bg-amber-500/10 px-5 py-4 text-sm text-amber-200 flex items-center gap-3">
                        <span className="h-2 w-2 rounded-full bg-amber-500 animate-ping"></span>
                        {error}
                    </div>
                )}

                <div className="grid grid-cols-1 gap-8 xl:grid-cols-[1.15fr_0.85fr] items-start">
                    {/* Card de Detalhes do Contrato à Esquerda */}
                    <section className="overflow-hidden rounded-[32px] border border-white/[0.06] bg-[linear-gradient(180deg,rgba(15,18,36,0.7),rgba(9,11,20,0.7))] backdrop-blur-xl shadow-2xl p-6 md:p-8 space-y-6">
                        <div className="flex items-center gap-4 border-b border-white/[0.06] pb-5">
                            <FileText size={22} className="text-blue-400 shrink-0 mt-1" />
                            <div>
                                <p className="text-[10px] font-bold uppercase tracking-[0.25em] text-slate-500">CONTRATANTE</p>
                                <h2 className="text-2xl font-bold text-white tracking-tight">{contract?.client?.name || contract?.clientName || "Contratante"}</h2>
                            </div>
                        </div>

                        <div className="space-y-6">
                            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                                <div className="rounded-2xl border border-white/[0.05] bg-white/[0.01] p-4 transition-all hover:bg-white/[0.02] hover:border-white/[0.08]">
                                    <p className="text-[9px] font-bold uppercase tracking-[0.22em] text-slate-500">Documento</p>
                                    <p className="mt-1.5 text-sm font-semibold text-slate-200">{contract?.client?.document || "-"}</p>
                                </div>
                                <div className="rounded-2xl border border-white/[0.05] bg-white/[0.01] p-4 transition-all hover:bg-white/[0.02] hover:border-white/[0.08]">
                                    <p className="text-[9px] font-bold uppercase tracking-[0.22em] text-slate-500">Vigência</p>
                                    <p className="mt-1.5 text-sm font-semibold text-slate-200">{contract?.durationMonths || "-"} meses</p>
                                </div>
                                <div className="rounded-2xl border border-white/[0.05] bg-white/[0.01] p-4 transition-all hover:bg-white/[0.02] hover:border-white/[0.08]">
                                    <p className="text-[9px] font-bold uppercase tracking-[0.22em] text-slate-500">Valor mensal</p>
                                    <p className="mt-1.5 text-sm font-semibold text-blue-400 font-mono">R$ {money(Number(contract?.monthlyValue || 0))}</p>
                                </div>
                                <div className="rounded-2xl border border-white/[0.05] bg-white/[0.01] p-4 transition-all hover:bg-white/[0.02] hover:border-white/[0.08]">
                                    <p className="text-[9px] font-bold uppercase tracking-[0.22em] text-slate-500">Pagamento</p>
                                    <p className="mt-1.5 text-sm font-semibold text-slate-200">Todo dia {contract?.paymentDay || "-"}</p>
                                </div>
                            </div>

                            <div className="rounded-3xl border border-white/[0.05] bg-black/40 p-5 space-y-2">
                                <p className="text-[9px] font-bold uppercase tracking-[0.22em] text-slate-500">Escopo da Prestação de Serviços</p>
                                <p className="text-sm leading-relaxed text-slate-300 font-normal max-h-72 overflow-y-auto pr-2 scrollbar-thin scrollbar-thumb-white/10">{contract?.scope || "-"}</p>
                            </div>
                        </div>
                    </section>

                    {/* Painel da Assinatura Interativa à Direita */}
                    <aside className="rounded-[32px] border border-white/[0.06] bg-[linear-gradient(180deg,rgba(15,18,36,0.7),rgba(9,11,20,0.7))] backdrop-blur-xl p-6 md:p-8 shadow-2xl">
                        {signed ? (
                            <div className="space-y-6 text-center py-6">
                                <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 shadow-lg shadow-emerald-500/10">
                                    <CheckCircle2 size={36} />
                                </div>
                                <div>
                                    <h3 className="text-2xl font-bold text-white">Contrato Assinado</h3>
                                    <p className="mt-2 text-sm leading-relaxed text-slate-400">
                                        Sua assinatura eletrônica foi autenticada e gravada com sucesso. O PDF oficial com validade jurídica já está disponível para download.
                                    </p>
                                </div>
                                {contract?.signedSignatureData && (
                                    <div className="rounded-2xl border border-white/[0.08] bg-black/30 p-4 shadow-inner">
                                        <img
                                            src={contract.signedSignatureData}
                                            alt="Assinatura Autenticada"
                                            className="mx-auto max-h-24 w-full object-contain invert hue-rotate-180 brightness-200"
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
                                    <PenLine size={22} className="text-blue-400 shrink-0 mt-1" />
                                    <div>
                                        <p className="text-[10px] font-bold uppercase tracking-[0.25em] text-slate-500">PAINEL DE ASSINATURA</p>
                                        <h2 className="mt-1 text-2xl font-bold text-white tracking-tight">Assine no quadro</h2>
                                        <p className="mt-2 text-xs leading-relaxed text-slate-400">
                                            Desenhe sua assinatura no quadro abaixo. Ela será incorporada digitalmente ao termo de contrato.
                                        </p>
                                    </div>
                                </div>

                                <div className="rounded-2xl border border-white/[0.05] bg-white/[0.02] p-4 transition-all hover:bg-white/[0.03]">
                                    <div className="flex items-center gap-3">
                                        <div>
                                            <p className="text-sm font-bold text-white leading-tight">{signerName || "Contratante"}</p>
                                            <p className="text-[10px] text-slate-500 mt-1">{signerDocument || "CPF/CNPJ vinculado"}</p>
                                        </div>
                                    </div>
                                </div>

                                <div className="space-y-3">
                                    <div className="flex items-center justify-between gap-3">
                                        <span className="text-[10px] font-bold uppercase tracking-[0.22em] text-slate-500">Assinatura Manual</span>
                                        <button
                                            type="button"
                                            onClick={clearSignature}
                                            className="inline-flex items-center gap-1.5 rounded-xl border border-white/[0.08] bg-white/[0.03] px-3.5 py-2 text-[10px] font-bold uppercase tracking-[0.15em] text-slate-300 transition-all hover:border-red-500/30 hover:bg-red-500/10 hover:text-white active:scale-95"
                                        >
                                            <Eraser size={12} />
                                            Limpar
                                        </button>
                                    </div>

                                    {/* Canvas da Assinatura com efeito neon quando focado/desenhado */}
                                    <div className={`rounded-[28px] border p-1 bg-black/40 shadow-inner transition-all duration-300 ${hasSignatureDrawing ? 'border-blue-500/50 shadow-[0_0_20px_rgba(59,130,246,0.15)]' : 'border-white/10 hover:border-white/20'}`}>
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
                                            className="h-56 w-full touch-none rounded-[24px] border border-dashed border-slate-300 bg-white select-none shadow-[inset_0_2px_4px_rgba(0,0,0,0.06)]"
                                            style={{ cursor: "crosshair" }}
                                        />
                                    </div>

                                    {/* Checkbox customizado sofisticado */}
                                    <label className="flex items-start gap-3 rounded-2xl border border-white/[0.05] bg-black/20 p-4 text-xs text-slate-300 cursor-pointer select-none transition-all hover:bg-black/35 hover:border-white/[0.08]">
                                        <input
                                            type="checkbox"
                                            checked={accepted}
                                            onChange={(event) => setAccepted(event.target.checked)}
                                            className="mt-0.5 h-4 w-4 rounded border-white/20 bg-slate-950 text-blue-500 focus:ring-blue-500/20 focus:ring-offset-0"
                                        />
                                        <span className="leading-relaxed">
                                            Declaro que li integralmente o contrato e autorizo a inserção da minha assinatura digital como validação jurídica definitiva deste documento.
                                        </span>
                                    </label>

                                    <button
                                        onClick={handleSign}
                                        disabled={signing || !canvasReady}
                                        className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 px-5 py-4 text-xs font-bold uppercase tracking-[0.18em] text-white transition-all hover:scale-[1.02] active:scale-[0.98] shadow-lg shadow-blue-500/20 disabled:bg-slate-800 disabled:from-slate-800 disabled:to-slate-800 disabled:text-slate-500 disabled:shadow-none disabled:scale-100 disabled:cursor-not-allowed"
                                    >
                                        {signing ? <Loader2 className="animate-spin" size={14} /> : <CheckCircle2 size={14} />}
                                        {signing ? "Registrando assinatura..." : "Assinar Contrato"}
                                    </button>

                                    <p className="text-[10px] text-center text-slate-500 leading-relaxed pt-2 flex items-center justify-center gap-1.5">
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
