"use client";

import { useEffect, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { ArrowLeft, ArrowRight, FolderKanban, Plus, X } from "lucide-react";
import { BoardHeader } from "@/components/kanban/board-header";
import { BoardTableView } from "@/components/kanban/board-table-view";
import { BoardCalendarView } from "@/components/kanban/board-calendar-view";
import { BoardTimelineView } from "@/components/kanban/board-timeline-view";
import { BoardDashboardView } from "@/components/kanban/board-dashboard-view";
import { KanbanBoard } from "@/components/kanban/kanban-board";
import { CardDetailModal } from "@/components/card-detail/card-detail-modal";
import { useKonti, KontiProvider } from "@/features/kanban/use-konti";
import { Toaster } from "sonner";
import api from "@/lib/api";
import { adminLoginPath } from "@/lib/adminPath";

function KontiWorkspace() {
  const { currentBoard, boards, setCurrentBoard, createBoard, boardView, isAuthLoading, isPersistenceAvailable } = useKonti();
  const [mounted, setMounted] = useState(false);
  const [hasEnteredBoard, setHasEnteredBoard] = useState(false);
  const [showCreateProject, setShowCreateProject] = useState(false);
  const [newProjectName, setNewProjectName] = useState("");

  useEffect(() => setMounted(true), []);

  if (!mounted || isAuthLoading) {
    return <div className="flex min-h-[55vh] items-center justify-center text-sm text-slate-500">Carregando espaço de trabalho…</div>;
  }

  const availableBoards = boards.filter((board) => !board.is_archived);
  const canvasStyle = currentBoard?.background_type === "image"
    ? { backgroundImage: `linear-gradient(rgba(0,0,0,.12), rgba(0,0,0,.24)), url(${currentBoard.background_value})`, backgroundSize: "cover", backgroundPosition: "center" }
    : currentBoard?.background_type === "color"
      ? { backgroundColor: currentBoard.background_value }
      : { background: currentBoard?.background_value || "#f1f5f9" };

  const handleCreateProject = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const title = newProjectName.trim();
    if (!title) return;
    createBoard({
      title,
      backgroundType: "color",
      backgroundValue: "#f1f5f9",
      visibility: "workspace",
    });
    setNewProjectName("");
    setShowCreateProject(false);
    setHasEnteredBoard(true);
  };

  return (
    <section className="konti-app flex h-full min-w-0 flex-col overflow-hidden bg-white">
      <div className="flex min-h-14 items-center justify-between gap-4 border-b border-slate-200 bg-white px-5 py-2.5">
        <div className="flex min-w-0 items-center gap-4">
          <Image src="/logo.png" alt="& CONTI Marketing Digital" width={160} height={46} priority className="h-8 w-auto object-contain object-left" />
        </div>
        <Link href="/admin/control" className="inline-flex shrink-0 items-center gap-2 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50">
          <ArrowLeft size={16} />
          <span className="hidden sm:inline">Voltar ao admin</span>
          <span className="sm:hidden">Admin</span>
        </Link>
      </div>
      <div className="flex min-h-12 flex-wrap items-center justify-between gap-3 border-b border-slate-200 px-5 py-2">
        <div className="flex items-center gap-2">
          {hasEnteredBoard && availableBoards.length > 1 && (
            <label className="flex items-center gap-2 text-xs text-slate-500">
              Quadro
              <select
                aria-label="Selecionar quadro"
                className="max-w-44 rounded-lg border border-slate-200 bg-white px-2.5 py-2 text-sm font-medium text-slate-800 outline-none focus:border-blue-400"
                value={currentBoard?.id || ""}
                onChange={(event) => setCurrentBoard(availableBoards.find((board) => board.id === event.target.value) || null)}
              >
                {availableBoards.map((board) => <option key={board.id} value={board.id}>{board.title}</option>)}
              </select>
            </label>
          )}
          <button type="button" onClick={() => setShowCreateProject(true)} className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-3 py-2 text-sm font-semibold text-white transition hover:bg-blue-700">
            <Plus size={15} /> Novo projeto
          </button>
        </div>
        <div className="flex items-center gap-3">
          <span className={`hidden rounded-full border px-3 py-1 text-xs font-medium sm:inline-flex ${isPersistenceAvailable ? "border-emerald-200 bg-emerald-50 text-emerald-700" : "border-amber-200 bg-amber-50 text-amber-800"}`}>
            {isPersistenceAvailable ? "Dados salvos no sistema" : "Salvando neste navegador"}
          </span>
        </div>
      </div>
      {!hasEnteredBoard ? (
        <div className="min-h-0 flex-1 overflow-y-auto bg-slate-50 px-5 py-8 sm:px-8 lg:px-12">
          <div className="mx-auto w-full max-w-6xl">
            <div className="mb-6">
              <h1 className="text-2xl font-semibold tracking-tight text-slate-950 sm:text-3xl">Qual projeto você quer abrir?</h1>
              <p className="mt-1 text-sm text-slate-500">Escolha um projeto para continuar ou crie um novo.</p>
            </div>
            {availableBoards.length ? (
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
                {availableBoards.map((board) => (
                  <button
                    key={board.id}
                    type="button"
                    onClick={() => { setCurrentBoard(board); setHasEnteredBoard(true); }}
                    className="group flex min-h-40 flex-col rounded-xl border border-slate-200 bg-white p-5 text-left shadow-sm transition hover:-translate-y-0.5 hover:border-blue-300 hover:shadow-md"
                  >
                    <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-50 text-blue-700"><FolderKanban size={19} /></span>
                    <span className="mt-4 flex w-full items-center justify-between gap-3">
                      <span className="truncate text-base font-semibold text-slate-900">{board.title}</span>
                      <ArrowRight size={16} className="shrink-0 text-slate-400 transition group-hover:translate-x-0.5 group-hover:text-blue-700" />
                    </span>
                    {board.description && <span className="mt-1 line-clamp-2 text-sm text-slate-500">{board.description}</span>}
                  </button>
                ))}
                <button type="button" onClick={() => setShowCreateProject(true)} className="flex min-h-40 flex-col items-start justify-center rounded-xl border border-dashed border-slate-300 bg-white/70 p-5 text-left transition hover:border-blue-400 hover:bg-blue-50/60">
                  <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-slate-100 text-slate-600"><Plus size={19} /></span>
                  <span className="mt-4 text-base font-semibold text-slate-800">Criar novo projeto</span>
                  <span className="mt-1 text-sm text-slate-500">Comece com um quadro em branco.</span>
                </button>
              </div>
            ) : (
              <div className="rounded-xl border border-dashed border-slate-300 bg-white p-10 text-center">
                <FolderKanban className="mx-auto text-slate-400" size={28} />
                <p className="mt-3 font-medium text-slate-800">Você ainda não tem projetos.</p>
                <p className="mt-1 text-sm text-slate-500">Crie o primeiro para começar a organizar o trabalho.</p>
                <button type="button" onClick={() => setShowCreateProject(true)} className="mt-5 inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-700"><Plus size={16} /> Criar projeto</button>
              </div>
            )}
          </div>
        </div>
      ) : currentBoard ? (
        <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
          <BoardHeader />
          <div className="min-h-0 flex-1 overflow-auto transition-colors" style={canvasStyle}>
            {boardView === "kanban" && <KanbanBoard />}
            {boardView === "table" && <BoardTableView />}
            {boardView === "calendar" && <BoardCalendarView />}
            {boardView === "timeline" && <BoardTimelineView />}
            {boardView === "dashboard" && <BoardDashboardView />}
          </div>
        </div>
      ) : null}
      {hasEnteredBoard && <CardDetailModal />}
      {showCreateProject && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/40 p-4" onMouseDown={(event) => { if (event.target === event.currentTarget) setShowCreateProject(false); }}>
          <form role="dialog" aria-modal="true" aria-labelledby="create-project-title" onSubmit={handleCreateProject} className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 id="create-project-title" className="text-lg font-semibold text-slate-950">Novo projeto</h2>
                <p className="mt-1 text-sm text-slate-500">Dê um nome ao projeto. Você poderá personalizar o quadro depois.</p>
              </div>
              <button type="button" aria-label="Fechar" onClick={() => setShowCreateProject(false)} className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100 hover:text-slate-800"><X size={18} /></button>
            </div>
            <label htmlFor="konti-project-name" className="mt-5 block text-sm font-medium text-slate-700">Nome do projeto</label>
            <input id="konti-project-name" autoFocus required maxLength={80} value={newProjectName} onChange={(event) => setNewProjectName(event.target.value)} placeholder="Ex.: Site institucional" className="mt-2 h-11 w-full rounded-lg border border-slate-300 px-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-100" />
            <div className="mt-6 flex justify-end gap-2">
              <button type="button" onClick={() => setShowCreateProject(false)} className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50">Cancelar</button>
              <button type="submit" disabled={!newProjectName.trim()} className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"><Plus size={16} /> Criar projeto</button>
            </div>
          </form>
        </div>
      )}
      <Toaster position="bottom-right" richColors />
      <style jsx global>{`
        html:has(.konti-app) {
          --background: #ffffff;
          --foreground: #172033;
          --card: #ffffff;
          --card-foreground: #172033;
          --popover: #ffffff;
          --popover-foreground: #172033;
          --primary: #155eef;
          --primary-foreground: #ffffff;
          --secondary: #f1f5f9;
          --secondary-foreground: #334155;
          --muted: #f1f5f9;
          --muted-foreground: #64748b;
          --accent: #eff6ff;
          --accent-foreground: #1d4ed8;
          --destructive: #dc2626;
          --border: #e2e8f0;
          --input: #cbd5e1;
          --ring: #60a5fa;
          --color-background: var(--background);
          --color-foreground: var(--foreground);
          --color-card: var(--card);
          --color-card-foreground: var(--card-foreground);
          --color-popover: var(--popover);
          --color-popover-foreground: var(--popover-foreground);
          --color-primary: var(--primary);
          --color-primary-foreground: var(--primary-foreground);
          --color-secondary: var(--secondary);
          --color-secondary-foreground: var(--secondary-foreground);
          --color-muted: var(--muted);
          --color-muted-foreground: var(--muted-foreground);
          --color-accent: var(--accent);
          --color-accent-foreground: var(--accent-foreground);
          --color-destructive: var(--destructive);
          --color-border: var(--border);
          --color-input: var(--input);
          --color-ring: var(--ring);
        }
        .konti-app {
          --color-background: var(--background);
          --color-foreground: var(--foreground);
          --color-card: var(--card);
          --color-card-foreground: var(--card-foreground);
          --color-popover: var(--popover);
          --color-popover-foreground: var(--popover-foreground);
          --color-primary: var(--primary);
          --color-primary-foreground: var(--primary-foreground);
          --color-secondary: var(--secondary);
          --color-secondary-foreground: var(--secondary-foreground);
          --color-muted: var(--muted);
          --color-muted-foreground: var(--muted-foreground);
          --color-accent: var(--accent);
          --color-accent-foreground: var(--accent-foreground);
          --color-destructive: var(--destructive);
          --color-border: var(--border);
          --color-input: var(--input);
          --color-ring: var(--ring);
          --background: #ffffff;
          --foreground: #172033;
          --card: #ffffff;
          --card-foreground: #172033;
          --popover: #ffffff;
          --popover-foreground: #172033;
          --primary: #155eef;
          --primary-foreground: #ffffff;
          --secondary: #f1f5f9;
          --secondary-foreground: #334155;
          --muted: #f1f5f9;
          --muted-foreground: #64748b;
          --accent: #eff6ff;
          --accent-foreground: #1d4ed8;
          --destructive: #dc2626;
          --border: #e2e8f0;
          --input: #cbd5e1;
          --ring: #60a5fa;
          color: var(--foreground);
          background: var(--background);
        }
        .konti-app button, .konti-app input, .konti-app textarea, .konti-app select { font: inherit; }
      `}</style>
    </section>
  );
}

export default function KontiAdminPage() {
  const router = useRouter();
  const [authorized, setAuthorized] = useState(false);
  const [checkingSession, setCheckingSession] = useState(true);

  useEffect(() => {
    let cancelled = false;
    const validate = async () => {
      if (!localStorage.getItem("token")) {
        router.replace(adminLoginPath());
        return;
      }
      try {
        const response = await api.get("/auth/me");
        if (response.data?.user?.role !== "ADMIN") {
          router.replace(adminLoginPath());
          return;
        }
        if (!cancelled) setAuthorized(true);
      } catch {
        router.replace(adminLoginPath());
      } finally {
        if (!cancelled) setCheckingSession(false);
      }
    };
    void validate();
    return () => { cancelled = true; };
  }, [router]);

  if (checkingSession || !authorized) {
    return <main className="flex min-h-dvh items-center justify-center bg-slate-100 text-sm text-slate-500">Acessando KONTI…</main>;
  }

  return (
    <main className="konti-standalone h-dvh w-full overflow-hidden bg-white">
      <div className="h-full w-full">
        <KontiProvider>
          <KontiWorkspace />
        </KontiProvider>
      </div>
      <style jsx global>{`
        html:has(.konti-standalone), body:has(.konti-standalone) { min-height: 100%; background: #ffffff !important; }
        body:has(.konti-standalone) { overflow: hidden; }
        body:has(.konti-standalone) footer, body:has(.konti-standalone) [data-cart-drawer] { display: none !important; }
      `}</style>
    </main>
  );
}
