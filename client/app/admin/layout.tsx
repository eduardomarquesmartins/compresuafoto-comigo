"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import api from "@/lib/api";
import AdminUserMenu from "@/components/AdminUserMenu";
import logoAdmin from "./logo-admin.jpg";
import {
    ArrowUpRight,
    Bell,
    Calendar,
    CalendarPlus,
    ClipboardCheck,
    DollarSign,
    FileSpreadsheet,
    FileText,
    Home,
    LayoutDashboard,
    LogOut,
    Mail,
    Menu,
    MonitorPlay,
    Activity,
    ScrollText,
    ShieldAlert,
    ShoppingBag,
    Tag,
    Users,
    X,
    type LucideIcon
} from "lucide-react";

type NavItem = {
    href: string;
    label: string;
    icon: LucideIcon;
    external?: boolean;
};

type NavSection = {
    label: string;
    items: NavItem[];
};

const kontiUrl = process.env.NEXT_PUBLIC_KONTI_URL || "https://konti.econticomigo.com.br";

const econtiNavSections: NavSection[] = [
    {
        label: "Operação",
        items: [
            { href: "/admin/control", label: "Visão geral", icon: LayoutDashboard },
            { href: "/admin/clients", label: "Clientes", icon: Users },
            { href: "/admin/proposals", label: "Propostas", icon: FileText },
            { href: "/admin/contracts", label: "Contratos e assinaturas", icon: ScrollText },
            { href: "/admin/emails", label: "E-mails", icon: Mail },
            { href: "/admin/presentation", label: "Apresentação", icon: MonitorPlay }
        ]
    },
    {
        label: "Gestão",
        items: [
            { href: "/admin/finance", label: "Financeiro", icon: DollarSign },
            { href: "/admin/debts", label: "Dívidas", icon: ShieldAlert },
            { href: "/admin/demands", label: "Demandas", icon: ClipboardCheck },
            { href: "/admin/collaborators", label: "Colaboradores", icon: Users },
            { href: "/admin/imports", label: "Importações", icon: FileSpreadsheet }
        ]
    },
    {
        label: "Ferramentas",
        items: [
            { href: kontiUrl, label: "KONTI", icon: Activity, external: true }
        ]
    }
];

const photoNavSections: NavSection[] = [
    {
        label: "Painel",
        items: [
            { href: "/compresuafoto/admin/dashboard", label: "Dashboard", icon: LayoutDashboard },
            { href: "/compresuafoto/admin/events", label: "Eventos", icon: Calendar },
            { href: "/compresuafoto/admin/events/create", label: "Criar evento", icon: CalendarPlus },
            { href: "/compresuafoto/admin/users", label: "Usuários", icon: Users }
        ]
    },
    {
        label: "Vendas de fotos",
        items: [
            { href: "/compresuafoto/admin/coupons", label: "Cupons", icon: Tag },
            { href: "/compresuafoto/admin/orders", label: "Pedidos", icon: ShoppingBag }
        ]
    }
];

const isCurrentRoute = (pathname: string, href: string) => pathname === href || pathname.startsWith(`${href}/`);

const clearAdminSession = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
};

const getRouteMeta = (pathname: string, navSections: NavSection[]) => {
    const currentItem = navSections
        .flatMap(section => section.items.map(item => ({ ...item, section: section.label })))
        .find(item => isCurrentRoute(pathname, item.href));

    return currentItem ?? {
        href: pathname,
        label: "Admin",
        icon: LayoutDashboard,
        section: "Painel"
    };
};

export default function AdminLayout({ children }: { children: React.ReactNode }) {
    const pathname = usePathname();
    const router = useRouter();
    const isPhotoAdmin = pathname.startsWith("/compresuafoto/admin");
    const adminBasePath = isPhotoAdmin ? "/compresuafoto/admin" : "/admin";
    const loginPath = `${adminBasePath}/login`;
    const dashboardPath = isPhotoAdmin ? "/compresuafoto/admin/dashboard" : "/admin/control";
    const publicSitePath = isPhotoAdmin ? "/compresuafoto" : "/";
    const navSections = isPhotoAdmin ? photoNavSections : econtiNavSections;
    const [isAuthorized, setIsAuthorized] = useState(pathname === loginPath);
    const [sidebarOpen, setSidebarOpen] = useState(false);
    const [activeRequests, setActiveRequests] = useState(0);
    const routeMeta = useMemo(() => getRouteMeta(pathname, navSections), [pathname, navSections]);
    const RouteIcon = routeMeta.icon;

    useEffect(() => {
        const handleApiLoading = (event: Event) => {
            const detail = (event as CustomEvent<{ count?: number }>).detail;
            setActiveRequests(Math.max(0, detail?.count || 0));
        };

        window.addEventListener("admin-api-loading", handleApiLoading);

        return () => {
            window.removeEventListener("admin-api-loading", handleApiLoading);
        };
    }, []);

    useEffect(() => {
        let cancelled = false;

        const validateAdminSession = async () => {
            if (pathname === loginPath) {
                setIsAuthorized(true);
                return;
            }

            const token = localStorage.getItem("token");
            if (!token) {
                clearAdminSession();
                if (!cancelled) setIsAuthorized(false);
                router.push(loginPath);
                return;
            }

            try {
                const response = await api.get("/auth/me");
                const user = response.data?.user;

                if (user?.role !== "ADMIN") {
                    clearAdminSession();
                    if (!cancelled) setIsAuthorized(false);
                    router.push(loginPath);
                    return;
                }

                localStorage.setItem("user", JSON.stringify(user));
                if (!cancelled) {
                    setIsAuthorized(true);
                    setSidebarOpen(false);
                }
            } catch {
                clearAdminSession();
                if (!cancelled) setIsAuthorized(false);
                router.push(loginPath);
            }
        };

        validateAdminSession();

        return () => {
            cancelled = true;
        };
    }, [pathname, router, loginPath]);

    const handleLogout = () => {
        clearAdminSession();
        router.push(isPhotoAdmin ? "/compresuafoto/login" : "/login");
    };

    if (!isAuthorized) {
        return (
            <div className="min-h-dvh bg-white flex items-center justify-center font-mono text-[11px] uppercase tracking-[0.22em] text-zinc-400">
                Acessando painel
            </div>
        );
    }

    return (
        <div className="admin-shell min-h-dvh text-zinc-900 selection:bg-[#0044ff]/20">
            <div className="admin-grid-background fixed inset-0 -z-10 pointer-events-none" />
                {activeRequests > 0 && (
                    <div className="admin-global-loading" role="status" aria-live="polite">
                        <div className="admin-global-loading-bar" />
                    </div>
                )}

            <header className="xl:hidden sticky top-0 z-40 border-b border-zinc-200 bg-white/92 px-4 py-3 backdrop-blur-xl">
                <div className="flex items-center justify-between relative h-12">
                    <Link href={dashboardPath} className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 h-12 w-48 flex items-center justify-center overflow-hidden">
                        <Image src={logoAdmin} alt={isPhotoAdmin ? "Compre Sua Foto admin" : "Econti admin"} className="h-28 w-auto object-contain" />
                    </Link>

                    <button
                        type="button"
                        onClick={() => setSidebarOpen(!sidebarOpen)}
                        className="admin-icon-button"
                        title={sidebarOpen ? "Fechar menu" : "Abrir menu"}
                        aria-label={sidebarOpen ? "Fechar menu" : "Abrir menu"}
                    >
                        {sidebarOpen ? <X size={18} /> : <Menu size={18} />}
                    </button>
                </div>
            </header>

            <div className="relative flex min-h-dvh xl:pl-[292px]">
                {sidebarOpen && (
                    <button
                        type="button"
                        className="fixed inset-0 z-40 bg-black/30 backdrop-blur-sm xl:hidden"
                        aria-label="Fechar menu"
                        onClick={() => setSidebarOpen(false)}
                    />
                )}

                <aside
                    className={`
                        admin-sidebar
                        fixed inset-y-0 left-0 z-50 flex h-dvh w-[292px] max-w-[86vw] flex-col
                        border-r border-zinc-200 bg-white/94 backdrop-blur-2xl
                        transition-transform duration-300 ease-out
                        ${sidebarOpen ? "translate-x-0" : "-translate-x-full xl:translate-x-0"}
                    `}
                >
                    <div className="border-b border-zinc-200 h-20 flex justify-center items-center overflow-hidden">
                        <Link href={dashboardPath} className="relative w-full h-full flex justify-center items-center">
                            <Image src={logoAdmin} alt={isPhotoAdmin ? "Compre Sua Foto" : "Econti"} className="absolute h-48 w-auto object-contain transition-transform hover:scale-105 duration-200" />
                        </Link>
                    </div>

                    <nav className="admin-scroll flex-1 overflow-y-auto px-3 py-4">
                        <div className="space-y-6">
                            {navSections.map(section => (
                                <div key={section.label}>
                                    <p className="admin-section-label">{section.label}</p>

                                    <div className="mt-2 space-y-1">
                                        {section.items.map(item => {
                                            const active = isCurrentRoute(pathname, item.href);
                                            const Icon = item.icon;

                                            if (item.external) {
                                                return (
                                                    <a
                                                        key={item.href}
                                                        href={item.href}
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                        className="admin-nav-link"
                                                        title="Abrir KONTI em uma nova guia"
                                                    >
                                                        <Icon size={16} />
                                                        <span className="truncate">{item.label}</span>
                                                        <ArrowUpRight size={14} className="ml-auto opacity-60" />
                                                    </a>
                                                );
                                            }

                                            return (
                                                <Link
                                                    key={item.href}
                                                    href={item.href}
                                                    className={`admin-nav-link ${active ? "is-active" : ""}`}
                                                >
                                                    <Icon size={16} />
                                                    <span className="truncate">{item.label}</span>
                                                    {active && <span className="ml-auto h-1.5 w-1.5 rounded-full bg-[#0044ff]" />}
                                                </Link>
                                            );
                                        })}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </nav>

                    <div className="border-t border-zinc-200 p-3 space-y-1">
                        <button type="button" onClick={handleLogout} className="admin-nav-link is-danger w-full">
                            <LogOut size={16} />
                            <span>Sair do Admin</span>
                        </button>
                        <Link href={publicSitePath} className="admin-nav-link">
                            <Home size={16} />
                            <span>Voltar ao site</span>
                        </Link>                    </div>
                </aside>

                <main className="relative z-10 min-w-0 flex-1 px-4 py-5 md:px-6 md:py-6 xl:px-9">
                    <div className="mx-auto w-full max-w-[1500px]">
                        {children}
                    </div>
                </main>
            </div>

            <style jsx global>{`
                body:has(.admin-shell) footer,
                body:has(.admin-shell) [data-cart-drawer] {
                    display: none !important;
                }

                body:has(.admin-shell)::-webkit-scrollbar-track,
                html:has(.admin-shell)::-webkit-scrollbar-track {
                    background: #ffffff !important;
                }

                body:has(.admin-shell)::-webkit-scrollbar-thumb,
                html:has(.admin-shell)::-webkit-scrollbar-thumb {
                    background: rgba(0, 68, 255, 0.2) !important;
                    border-radius: 999px;
                }

                body:has(.admin-shell)::-webkit-scrollbar-thumb:hover,
                html:has(.admin-shell)::-webkit-scrollbar-thumb:hover {
                    background: rgba(0, 68, 255, 0.6) !important;
                }

                .admin-shell {
                    --admin-bg: #ffffff;
                    --admin-surface: #ffffff;
                    --admin-surface-strong: #fafafa;
                    --admin-border: #eaeaea;
                    --admin-border-soft: #eaeaea;
                    --admin-text: #000000;
                    --admin-muted: #666666;
                    --admin-blue: #0044ff;
                    --admin-pink: #f81ce5;
                    --admin-red: #ff0000;
                    min-height: 100dvh;
                    background: #ffffff;
                    font-family: var(--font-geist), system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
                    font-feature-settings: "liga", "tnum", "cv01";
                    overflow-x: clip;
                }

                .admin-global-loading {
                    position: fixed;
                    inset: 0 0 auto 0;
                    z-index: 9999;
                    pointer-events: none;
                }

                .admin-global-loading-bar {
                    height: 3px;
                    width: 100%;
                    background: linear-gradient(90deg, transparent, #0044ff, #60a5fa, transparent);
                    background-size: 180% 100%;
                    animation: admin-loading-slide 1.1s ease-in-out infinite;
                    box-shadow: 0 0 18px rgba(0, 68, 255, 0.45);
                }

                .admin-global-loading-pill {
                    position: fixed;
                    top: 14px;
                    left: 50%;
                    transform: translateX(-50%);
                    display: inline-flex;
                    align-items: center;
                    gap: 0.55rem;
                    border: 1px solid rgba(0, 68, 255, 0.2);
                    border-radius: 999px;
                    background: rgba(255, 255, 255, 0.94);
                    padding: 0.55rem 0.75rem;
                    color: #0044ff;
                    font-size: 11px;
                    font-weight: 800;
                    letter-spacing: 0.14em;
                    text-transform: uppercase;
                    box-shadow: 0 16px 40px rgba(0, 0, 0, 0.12);
                    backdrop-filter: blur(12px);
                }

                .admin-global-loading-spinner {
                    height: 14px;
                    width: 14px;
                    border-radius: 999px;
                    border: 2px solid rgba(0, 68, 255, 0.18);
                    border-top-color: #0044ff;
                    animation: admin-spin 0.7s linear infinite;
                }

                @keyframes admin-loading-slide {
                    0% { background-position: 180% 0; }
                    100% { background-position: -180% 0; }
                }

                .admin-shell * {
                    font-family: var(--font-geist), system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif !important;
                }

                .admin-shell .admin-sidebar {
                    background-color: #ffffff !important;
                    height: 100vh !important;
                    height: 100dvh !important;
                }

                .admin-shell,
                .admin-shell main,
                .admin-shell main > div {
                    width: 100%;
                    max-width: 100%;
                    min-width: 0;
                }

                .admin-grid-background {
                    background:
                        linear-gradient(90deg, rgba(0,0,0,0.015) 1px, transparent 1px),
                        linear-gradient(180deg, rgba(0,0,0,0.015) 1px, transparent 1px),
                        linear-gradient(120deg, rgba(0,68,255,0.02), transparent 28%, rgba(248,28,229,0.01), transparent 58%);
                    background-size: 46px 46px, 46px 46px, auto;
                    mask-image: linear-gradient(to bottom, rgba(255,255,255,1), rgba(255,255,255,0.6));
                }

                .admin-overline,
                .admin-section-label,
                .admin-kicker,
                .admin-microcopy,
                .admin-pill,
                .admin-metric-label,
                .admin-shell .font-mono,
                .admin-shell [class*="font-mono"] {
                    font-family: var(--font-geist-mono), ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace !important;
                    text-transform: uppercase;
                    letter-spacing: 0.14em;
                    font-size: 10px;
                    font-weight: 600;
                    color: var(--admin-muted);
                }

                .admin-section-label {
                    padding: 0 0.625rem;
                    color: #888888;
                }

                .admin-nav-link {
                    display: flex;
                    min-height: 42px;
                    align-items: center;
                    gap: 0.7rem;
                    border-radius: 6px;
                    border: 1px solid transparent;
                    padding: 0.625rem 0.75rem;
                    color: #666666;
                    font-size: 0.875rem;
                    font-weight: 500;
                    transition: background .16s ease, border-color .16s ease, color .16s ease, transform .16s ease;
                }

                .admin-nav-link:hover {
                    border-color: var(--admin-border-soft);
                    background: #fafafa;
                    color: #000;
                }

                .admin-nav-link.is-active {
                    border-color: rgba(0, 68, 255, 0.2);
                    background: rgba(0, 68, 255, 0.05);
                    color: #0044ff;
                    font-weight: 600;
                }

                .admin-nav-link.is-danger {
                    color: rgba(255, 0, 0, 0.85) !important;
                }

                .admin-nav-link.is-danger:hover {
                    border-color: rgba(255, 0, 0, 0.15) !important;
                    background: rgba(255, 0, 0, 0.05) !important;
                    color: #ff0000 !important;
                }

                .admin-topbar,
                .admin-card,
                .admin-hero-card,
                .admin-metric-card,
                .admin-command-panel,
                .admin-loading-card {
                    border-radius: 8px !important;
                    border: 1px solid var(--admin-border) !important;
                    background: #ffffff !important;
                    box-shadow: 0 1px 3px rgba(0,0,0,0.05), 0 10px 20px -10px rgba(0,0,0,0.04) !important;
                }

                .admin-topbar {
                    padding: 0.8rem;
                }

                .admin-icon-button,
                .admin-metric-icon,
                .admin-warning-icon {
                    display: inline-flex;
                    align-items: center;
                    justify-content: center;
                    border-radius: 6px;
                    border: 1px solid var(--admin-border);
                    background: #ffffff;
                    color: #444444;
                }

                .admin-icon-button {
                    height: 40px;
                    width: 40px;
                    transition: border-color .16s ease, background .16s ease, color .16s ease;
                }

                .admin-icon-button:hover {
                    border-color: rgba(0, 68, 255, 0.4);
                    background: rgba(0, 68, 255, 0.05);
                    color: #0044ff;
                }

                .admin-pill,
                .admin-segmented-status {
                    display: inline-flex;
                    align-items: center;
                    gap: 0.5rem;
                    border-radius: 999px;
                    border: 1px solid var(--admin-border);
                    background: #fafafa;
                    padding: 0.45rem 0.65rem;
                    font-family: var(--font-mono), ui-monospace, monospace;
                    font-size: 11px;
                    font-weight: 600;
                    color: #666666;
                }

                .admin-page-stack {
                    display: flex;
                    flex-direction: column;
                    gap: 1.1rem;
                }

                .admin-hero-card {
                    position: relative;
                    min-height: 330px;
                    overflow: hidden;
                    padding: clamp(1.25rem, 3vw, 2.5rem);
                    isolation: isolate;
                }

                .admin-hero-card::before,
                .admin-card::before,
                .admin-metric-card::before {
                    content: "";
                    position: absolute;
                    inset: 0 0 auto 0;
                    height: 2px;
                    background: linear-gradient(90deg, transparent, rgba(0, 68, 255, 0.5), transparent);
                    opacity: 0.8;
                    pointer-events: none;
                }

                .admin-hero-grid {
                    position: absolute;
                    inset: 0;
                    z-index: 0;
                    background:
                        linear-gradient(90deg, rgba(0,0,0,0.01) 1px, transparent 1px),
                        linear-gradient(180deg, rgba(0,0,0,0.01) 1px, transparent 1px);
                    background-size: 34px 34px, 34px 34px;
                    opacity: 0.75;
                }

                .admin-command-panel {
                    overflow: hidden;
                }

                .admin-metric-card {
                    position: relative;
                    min-height: 176px;
                    overflow: hidden;
                    padding: 1.05rem;
                    transition: transform .18s ease, border-color .18s ease, box-shadow .18s ease;
                }

                .admin-metric-card:hover {
                    transform: translateY(-2px);
                    border-color: rgba(0, 68, 255, 0.3) !important;
                    box-shadow: 0 4px 20px rgba(0,0,0,0.08) !important;
                }

                .admin-metric-icon {
                    height: 42px;
                    width: 42px;
                    border: 1px solid #eaeaea;
                    background: #fafafa;
                }

                .admin-primary-button,
                .admin-secondary-button {
                    display: inline-flex;
                    align-items: center;
                    justify-content: center;
                    gap: 0.5rem;
                    border-radius: 6px;
                    padding: 0.78rem 1rem;
                    font-size: 0.875rem;
                    font-weight: 600;
                    transition: transform .16s ease, box-shadow .16s ease, background .16s ease, color .16s ease;
                }

                .admin-primary-button {
                    color: #ffffff;
                    background: #000000;
                    box-shadow: 0 4px 14px rgba(0, 0, 0, 0.1);
                }

                .admin-primary-button:hover {
                    transform: translateY(-1px);
                    background: #222222;
                    box-shadow: 0 6px 20px rgba(0, 0, 0, 0.15);
                }

                .admin-secondary-button {
                    color: #333333;
                    background: #ffffff;
                    border: 1px solid #eaeaea;
                }

                .admin-secondary-button:hover {
                    background: #fafafa;
                    border-color: #d1d1d1;
                    color: #000000;
                }

                .admin-action-link {
                    display: flex;
                    align-items: center;
                    justify-content: space-between;
                    gap: 1rem;
                    border-radius: 6px;
                    border: 1px solid #eaeaea;
                    padding: 1rem;
                    color: #111111;
                    background: #ffffff;
                    transition: background .16s ease, border-color .16s ease, box-shadow .16s ease;
                }

                .admin-action-link:hover {
                    border-color: rgba(0, 68, 255, 0.3);
                    background: rgba(0, 68, 255, 0.02);
                    box-shadow: 0 2px 8px rgba(0,0,0,0.02);
                }

                .admin-action-link strong {
                    display: block;
                    font-size: 0.92rem;
                    font-weight: 600;
                }

                .admin-action-link small {
                    display: block;
                    margin-top: 0.25rem;
                    color: var(--admin-muted);
                }

                .admin-warning-banner {
                    display: flex;
                    flex-direction: column;
                    gap: 1rem;
                    justify-content: space-between;
                    border-radius: 6px;
                    border: 1px solid rgba(255, 0, 0, 0.15);
                    background: rgba(255, 0, 0, 0.02);
                    padding: 1rem;
                }

                .admin-warning-icon {
                    height: 42px;
                    width: 42px;
                    flex-shrink: 0;
                    color: #ff0000;
                    background: rgba(255, 0, 0, 0.05);
                    border-color: rgba(255, 0, 0, 0.1);
                }

                /* Feedback must remain readable on the light admin surface. */
                .admin-shell main .bg-blue-500\/10 {
                    background-color: #eaf2ff !important;
                }

                .admin-shell main .border-blue-400\/20,
                .admin-shell main .border-blue-500\/20 {
                    border-color: #8cb8ff !important;
                }

                .admin-shell main .text-blue-100 {
                    color: #173b73 !important;
                    font-weight: 600;
                }

                .admin-shell .admin-card .text-white {
                    color: #111111 !important;
                }

                .admin-shell .admin-card .text-slate-400,
                .admin-shell .admin-card .text-slate-500 {
                    color: #64748b !important;
                }

                .admin-shell .admin-card [class*="bg-black"] {
                    background-color: #fafafa !important;
                    border-color: #e5e7eb !important;
                    color: #111111 !important;
                }

                .admin-shell .admin-card .admin-primary-button,
                .admin-shell .admin-card .admin-primary-button * {
                    color: #ffffff !important;
                }

                .admin-shell main button.bg-blue-500\/10 .text-white {
                    color: #ffffff !important;
                }

                .admin-shell main button.bg-blue-500\/10 .text-slate-400,
                .admin-shell main button.bg-blue-500\/10 .text-slate-500 {
                    color: #dbeafe !important;
                    font-weight: 500;
                }

                .admin-empty-state {
                    max-width: 21rem;
                    border-radius: 8px;
                    border: 1px solid #eaeaea;
                    background: #ffffff;
                    padding: 1.25rem;
                    text-align: center;
                    box-shadow: 0 10px 30px rgba(0,0,0,0.05);
                }

                .admin-loader {
                    height: 42px;
                    width: 42px;
                    border-radius: 999px;
                    background: conic-gradient(from 180deg, var(--admin-blue), #4488ff, #88b3ff, transparent 72%);
                    -webkit-mask: radial-gradient(farthest-side, transparent calc(100% - 4px), #000 0);
                    mask: radial-gradient(farthest-side, transparent calc(100% - 4px), #000 0);
                    animation: admin-spin 1s linear infinite;
                }

                @keyframes admin-spin { to { transform: rotate(360deg); } }

                .admin-shell main h1 {
                    letter-spacing: -0.045em !important;
                    color: #000000 !important;
                }

                .admin-shell main h2,
                .admin-shell main h3 {
                    letter-spacing: -0.025em;
                    color: #111111 !important;
                }

                .admin-shell section,
                .admin-shell main > div > div:not(.admin-topbar) > div[class*="bg-[#"],
                .admin-shell main > div > div:not(.admin-topbar) > section[class*="bg-[#"] {
                    border-color: var(--admin-border) !important;
                    background: #ffffff !important;
                    box-shadow: 0 1px 3px rgba(0,0,0,0.05), 0 10px 20px -10px rgba(0,0,0,0.04) !important;
                }

                .admin-shell [class*="rounded-[32px]"],
                .admin-shell [class*="rounded-[24px]"],
                .admin-shell [class*="rounded-2xl"] {
                    border-radius: 8px !important;
                }

                .admin-shell input,
                .admin-shell textarea,
                .admin-shell select {
                    background: #ffffff !important;
                    border-color: #eaeaea !important;
                    color: #000000 !important;
                    box-shadow: inset 0 1px 2px rgba(0,0,0,0.02);
                    color-scheme: light;
                }

                .admin-shell input:focus,
                .admin-shell textarea:focus,
                .admin-shell select:focus {
                    border-color: #0044ff !important;
                    box-shadow: 0 0 0 3px rgba(0, 68, 255, 0.15), inset 0 1px 2px rgba(0,0,0,0.02) !important;
                    outline: none !important;
                }

                .admin-shell table {
                    min-width: 760px;
                    border-collapse: separate !important;
                    border-spacing: 0 !important;
                    background: #ffffff !important;
                }

                .admin-shell main div:has(> table) {
                    overflow-x: auto !important;
                    -webkit-overflow-scrolling: touch;
                }

                .admin-shell thead {
                    position: sticky;
                    top: 0;
                    z-index: 5;
                }

                .admin-shell th {
                    background: #fafafa !important;
                    color: var(--admin-muted) !important;
                    font-size: 10px !important;
                    letter-spacing: 0.16em !important;
                    border-bottom: 1px solid #eaeaea !important;
                }

                .admin-shell td {
                    border-bottom-color: #eaeaea !important;
                    color: #333333 !important;
                }

                .admin-shell tbody tr {
                    transition: background .16s ease;
                    background: #ffffff !important;
                }

                .admin-shell tbody tr:hover {
                    background: rgba(0, 68, 255, 0.02) !important;
                }

                .admin-shell main button:focus-visible,
                .admin-shell main a:focus-visible,
                .admin-shell main input:focus-visible,
                .admin-shell main select:focus-visible,
                .admin-shell main textarea:focus-visible {
                    outline: 2px solid #0044ff !important;
                    outline-offset: 2px !important;
                }

                .admin-scroll::-webkit-scrollbar,
                .custom-scrollbar::-webkit-scrollbar {
                    width: 5px;
                    height: 5px;
                }

                .admin-scroll::-webkit-scrollbar-track,
                .custom-scrollbar::-webkit-scrollbar-track {
                    background: transparent;
                }

                .admin-scroll::-webkit-scrollbar-thumb,
                .custom-scrollbar::-webkit-scrollbar-thumb {
                    background: rgba(0, 68, 255, 0.2) !important;
                    border-radius: 999px;
                }

                .admin-scroll::-webkit-scrollbar-thumb:hover,
                .custom-scrollbar::-webkit-scrollbar-thumb:hover {
                    background: rgba(0, 68, 255, 0.6) !important;
                }

                /* ─────────────────                    GLOBAL OVERRIDES FOR INDIVIDUAL SUBPAGE ELEMENTS (LIGHT MODE)
                    ──────────────────────────────────────────────────────── */

                .admin-shell .text-white {
                    color: #000000 !important;
                }
                .admin-shell h1, .admin-shell h2, .admin-shell h3, .admin-shell h4, .admin-shell h5 {
                    color: #000000 !important;
                }
                .admin-shell .text-zinc-100 {
                    color: #111111 !important;
                }
                .admin-shell .text-zinc-300 {
                    color: #333333 !important;
                }
                .admin-shell .text-zinc-400, .admin-shell .text-slate-400 {
                    color: #666666 !important;
                }
                .admin-shell .text-zinc-500, .admin-shell .text-slate-500 {
                    color: #888888 !important;
                }
                .admin-shell .text-slate-300 {
                    color: #444444 !important;
                }
                .admin-shell .text-slate-600 {
                    color: #888888 !important;
                }
                .admin-shell .text-slate-700 {
                    color: #666666 !important;
                }

                /* Low-contrast text adjustments for accessibility */
                .admin-shell .text-emerald-300, .admin-shell .text-emerald-400 {
                    color: #10b981 !important;
                }
                .admin-shell .text-red-300, .admin-shell .text-red-400 {
                    color: #ef4444 !important;
                }
                .admin-shell .text-amber-200, .admin-shell .text-amber-300, .admin-shell .text-amber-400 {
                    color: #d97706 !important;
                }
                .admin-shell .text-blue-300, .admin-shell .text-blue-400 {
                    color: #0044ff !important;
                }
                .admin-shell .text-\[\#0a72ef\] {
                    color: #0044ff !important;
                }

                /* User role badges */
                .admin-shell [class*="bg-[#de1d8d]"] {
                    background-color: rgba(222, 29, 141, 0.08) !important;
                }
                .admin-shell .text-\[\#ff8ccf\] {
                    color: #de1d8d !important;
                }
                .admin-shell [class*="bg-[#0a72ef]"] {
                    background-color: rgba(0, 68, 255, 0.08) !important;
                }
                .admin-shell .text-\[\#7fbdff\] {
                    color: #0044ff !important;
                }
                .admin-shell .text-\[\#9ecbff\] {
                    color: #0044ff !important;
                }

                /* Border overrides */
                .admin-shell [class*="border-white/"],
                .admin-shell [class*="border-slate-700"],
                .admin-shell [class*="border-slate-800"] {
                    border-color: #eaeaea !important;
                }

                /* Background overrides */
                .admin-shell [class*="bg-black/"],
                .admin-shell [class*="bg-white/"] {
                    background-color: rgba(0, 0, 0, 0.02) !important;
                }
                .admin-shell .bg-black {
                    background-color: #ffffff !important;
                }
                .admin-shell .bg-slate-900, 
                .admin-shell .bg-slate-800,
                .admin-shell .bg-zinc-900 {
                    background-color: #ffffff !important;
                }
                .admin-shell [class*="bg-slate-950"] {
                    background-color: #fafafa !important;
                }

                /* Specific dark background overrides */
                .admin-shell [class*="bg-[#030303]"],
                .admin-shell [class*="bg-[#050505]"],
                .admin-shell [class*="bg-[#0a0a0c]"],
                .admin-shell [class*="bg-[#0b0b0d]"],
                .admin-shell [class*="bg-[#0e0f1d]"],
                .admin-shell [class*="bg-[#10121a]"],
                .admin-shell [class*="bg-[#131526]"],
                .admin-shell [class*="bg-[#161825]"],
                .admin-shell [class*="bg-[#161827]"],
                .admin-shell [class*="bg-[#1b1c31]"],
                .admin-shell [class*="bg-[#242742]"],
                .admin-shell [class*="bg-[#1b1d30]"],
                .admin-shell [class*="bg-[#1c1e2e]"],
                .admin-shell [class*="bg-[#111322]"],
                .admin-shell [class*="bg-[#121320]"],
                .admin-shell [class*="bg-[#1f2136]"] {
                    background-color: #ffffff !important;
                    background-image: none !important;
                }

                /* Sub-cards and internal boxes (e.g., client page contracts lists) */
                .admin-shell [class*="bg-[#0f111a]"],
                .admin-shell [class*="bg-[#161826]"] {
                    background-color: #fafafa !important;
                    background-image: none !important;
                }

                /* Outer card container gradients */
                .admin-shell [class*="bg-gradient-to-"][class*="from-slate-"],
                .admin-shell [class*="bg-gradient-to-"][class*="from-zinc-"],
                .admin-shell [class*="from-[#161826]"] {
                    background: #ffffff !important;
                }

                /* Active sidebar bullet dot override */
                .admin-shell .bg-\[\#0044ff\],
                .admin-shell .bg-\[\#0a72ef\] {
                    background-color: #0044ff !important;
                }

                /* Form check input toggle switches */
                .admin-shell .bg-slate-700 {
                    background-color: #e5e7eb !important;
                }
                .admin-shell input[type="checkbox"]:checked + div {
                    background-color: #0044ff !important;
                }

                /* Recharts Horizontal lines and tooltip styling */
                .admin-shell .recharts-cartesian-grid-horizontal line, 
                .admin-shell .recharts-cartesian-grid-vertical line {
                    stroke: #eaeaea !important;
                    stroke-opacity: 1 !important;
                }
                .admin-shell .recharts-default-tooltip {
                    background-color: #ffffff !important;
                    border: 1px solid #eaeaea !important;
                    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08) !important;
                }
                .admin-shell .recharts-default-tooltip * {
                    color: #111111 !important;
                }

                /* Blue/Indigo custom buttons - Keep the text readable */
                .admin-shell a[class*="bg-gradient-to-r"][class*="from-blue-"],
                .admin-shell button[class*="bg-gradient-to-r"][class*="from-blue-"],
                .admin-shell a[class*="bg-blue-"],
                .admin-shell button[class*="bg-blue-"] {
                    background: #0044ff !important;
                    color: #ffffff !important;
                    border-color: #0044ff !important;
                    box-shadow: 0 4px 12px rgba(0, 68, 255, 0.15) !important;
                }

                .admin-shell a[class*="bg-gradient-to-r"][class*="from-blue-"] *,
                .admin-shell button[class*="bg-gradient-to-r"][class*="from-blue-"] *,
                .admin-shell a[class*="bg-blue-"] *,
                .admin-shell button[class*="bg-blue-"] * {
                    color: #ffffff !important;
                }

                .admin-shell button[class*="bg-green-"]:not([class*="/10"]):not([class*="/15"]):not([class*="/20"]),
                .admin-shell button[class*="bg-emerald-"]:not([class*="/10"]):not([class*="/15"]):not([class*="/20"]),
                .admin-shell button[class*="bg-red-"]:not([class*="/10"]):not([class*="/15"]):not([class*="/20"]),
                .admin-shell button[class*="bg-rose-"]:not([class*="/10"]):not([class*="/15"]):not([class*="/20"]),
                .admin-shell button[class*="bg-amber-"]:not([class*="/10"]):not([class*="/15"]):not([class*="/20"]),
                .admin-shell button[class*="bg-yellow-"]:not([class*="/10"]):not([class*="/15"]):not([class*="/20"]) {
                    color: #ffffff !important;
                }

                .admin-shell button[class*="bg-green-"]:not([class*="/10"]):not([class*="/15"]):not([class*="/20"]) *,
                .admin-shell button[class*="bg-emerald-"]:not([class*="/10"]):not([class*="/15"]):not([class*="/20"]) *,
                .admin-shell button[class*="bg-red-"]:not([class*="/10"]):not([class*="/15"]):not([class*="/20"]) *,
                .admin-shell button[class*="bg-rose-"]:not([class*="/10"]):not([class*="/15"]):not([class*="/20"]) *,
                .admin-shell button[class*="bg-amber-"]:not([class*="/10"]):not([class*="/15"]):not([class*="/20"]) *,
                .admin-shell button[class*="bg-yellow-"]:not([class*="/10"]):not([class*="/15"]):not([class*="/20"]) * {
                    color: #ffffff !important;
                }

                .admin-shell .text-amber-500,
                .admin-shell .text-amber-600 {
                    color: #d97706 !important;
                }

                .admin-shell .text-emerald-500,
                .admin-shell .text-emerald-600 {
                    color: #059669 !important;
                }

                .admin-shell .text-red-500,
                .admin-shell .text-red-600 {
                    color: #dc2626 !important;
                }
                .admin-shell a[class*="bg-gradient-to-r"][class*="from-blue-"]:hover,
                .admin-shell button[class*="bg-gradient-to-r"][class*="from-blue-"]:hover,
                .admin-shell a[class*="bg-blue-"]:hover,
                .admin-shell button[class*="bg-blue-"]:hover {
                    background: #0033cc !important;
                    box-shadow: 0 6px 20px rgba(0, 68, 255, 0.25) !important;
                }

                /* Keep tone metrics visible */
                .admin-shell .tone-green {
                    border-top: 3px solid #00d215 !important;
                }
                .admin-shell .tone-blue {
                    border-top: 3px solid #0044ff !important;
                }
                .admin-shell .tone-pink {
                    border-top: 3px solid #f81ce5 !important;
                }
                .admin-shell .tone-red {
                    border-top: 3px solid #ff0000 !important;
                }

                /* Fixed bottom footer wrapper for proposals */
                .admin-shell div.fixed.bottom-0 {
                    background-color: rgba(255, 255, 255, 0.9) !important;
                    border-top: 1px solid #eaeaea !important;
                    box-shadow: 0 -10px 30px rgba(0, 0, 0, 0.04) !important;
                    backdrop-filter: blur(12px) !important;
                }

                .admin-shell div.fixed.bottom-0 * {
                    color: #111111 !important;
                }

                .admin-shell div.fixed.bottom-0 span[class*="text-slate-400"],
                .admin-shell div.fixed.bottom-0 span[class*="text-zinc-500"] {
                    color: #888888 !important;
                }

                .admin-shell div.fixed.bottom-0 input {
                    background-color: #ffffff !important;
                    border-color: #eaeaea !important;
                    color: #000000 !important;
                }

                .admin-shell div.fixed.bottom-0 button {
                    border-color: #eaeaea !important;
                    color: #333333 !important;
                    background-color: #ffffff !important;
                }

                .admin-shell div.fixed.bottom-0 button[class*="bg-blue-"],
                .admin-shell div.fixed.bottom-0 button[class*="bg-emerald-"] {
                    background-color: #0044ff !important;
                    color: #ffffff !important;
                    border-color: #0044ff !important;
                }

                .admin-shell div.fixed.bottom-0 button[class*="bg-blue-"] *,
                .admin-shell div.fixed.bottom-0 button[class*="bg-emerald-"] * {
                    color: #ffffff !important;
                }

                .admin-shell div.fixed.bottom-0 button[class*="bg-blue-"]:hover,
                .admin-shell div.fixed.bottom-0 button[class*="bg-emerald-"]:hover {
                    background-color: #0033cc !important;
                }

                /* ────────────────────────────────────────────────────────
                   ECONTI OPERATIONS SYSTEM
                   The navigation rail remains untouched. Everything below
                   is scoped to the working canvas so every admin module has
                   one deliberate, editorial visual language.
                   ──────────────────────────────────────────────────────── */

                .admin-shell main {
                    --workspace-paper: #f1f0eb;
                    --workspace-panel: #fffefa;
                    --workspace-ink: #15171a;
                    --workspace-muted: #6c6b66;
                    --workspace-line: #d5d2c9;
                    --workspace-blue: #0648ff;
                    background: var(--workspace-paper) !important;
                    background-image: none !important;
                    padding-bottom: 5rem !important;
                }

                .admin-shell main > div {
                    max-width: 1580px !important;
                    margin-inline: auto;
                }

                .admin-shell main h1 {
                    max-width: 22ch;
                    color: var(--workspace-ink) !important;
                    font-size: clamp(2.25rem, 3.4vw, 3.75rem) !important;
                    font-weight: 720 !important;
                    line-height: 0.94 !important;
                    letter-spacing: -0.07em !important;
                }

                .admin-shell main h2 {
                    color: var(--workspace-ink) !important;
                    font-weight: 700 !important;
                    letter-spacing: -0.04em !important;
                }

                .admin-shell main h3,
                .admin-shell main h4 {
                    color: var(--workspace-ink) !important;
                    font-weight: 650 !important;
                    letter-spacing: -0.025em !important;
                }

                .admin-shell main p {
                    text-wrap: pretty;
                }

                .admin-shell main .admin-kicker,
                .admin-shell main .admin-overline {
                    color: var(--workspace-blue) !important;
                    font-size: 10px !important;
                    font-weight: 800 !important;
                    letter-spacing: 0.19em !important;
                }

                .admin-shell main .admin-page-stack {
                    gap: 1.5rem;
                }

                .admin-shell main .admin-card,
                .admin-shell main .admin-hero-card,
                .admin-shell main .admin-metric-card,
                .admin-shell main .admin-command-panel,
                .admin-shell main .admin-loading-card,
                .admin-shell main section {
                    border: 1px solid var(--workspace-line) !important;
                    border-radius: 3px !important;
                    background: var(--workspace-panel) !important;
                    box-shadow: none !important;
                }

                .admin-shell main .admin-card::before,
                .admin-shell main .admin-hero-card::before,
                .admin-shell main .admin-metric-card::before {
                    right: auto;
                    width: 52px;
                    height: 4px;
                    background: var(--workspace-blue) !important;
                    opacity: 1;
                }

                .admin-shell main .admin-metric-card {
                    min-height: 158px;
                    padding: 1.25rem !important;
                }

                .admin-shell main .admin-metric-card:hover {
                    transform: none;
                    border-color: var(--workspace-ink) !important;
                    box-shadow: inset 0 -3px 0 var(--workspace-blue) !important;
                }

                .admin-shell main .admin-metric-icon,
                .admin-shell main .admin-warning-icon,
                .admin-shell main .admin-icon-button {
                    border-color: var(--workspace-line) !important;
                    border-radius: 2px !important;
                    background: transparent !important;
                    box-shadow: none !important;
                }

                .admin-shell main .admin-metric-icon {
                    color: var(--workspace-blue) !important;
                }

                .admin-shell main [class*="rounded-[32px]"],
                .admin-shell main [class*="rounded-[24px]"],
                .admin-shell main [class*="rounded-3xl"],
                .admin-shell main [class*="rounded-2xl"],
                .admin-shell main [class*="rounded-xl"] {
                    border-radius: 3px !important;
                }

                .admin-shell main [class*="shadow-2xl"],
                .admin-shell main [class*="shadow-xl"],
                .admin-shell main [class*="shadow-lg"],
                .admin-shell main [class*="shadow-["] {
                    box-shadow: none !important;
                }

                .admin-shell main [class*="bg-gradient-to-"] {
                    background-image: none !important;
                }

                .admin-shell main [class*="bg-[#12141d]"],
                .admin-shell main [class*="bg-[#251e1a]"] {
                    border-color: var(--workspace-line) !important;
                    background: var(--workspace-panel) !important;
                    background-image: none !important;
                    box-shadow: none !important;
                }

                .admin-shell main [class*="bg-[#12141d]"]:hover,
                .admin-shell main [class*="bg-[#251e1a]"]:hover {
                    border-color: #aaa79e !important;
                }

                .admin-shell main [class*="bg-[#12141d]"][class*="min-h-"]:has(.text-emerald-400) {
                    border-top: 3px solid #059669 !important;
                }

                .admin-shell main [class*="bg-[#12141d]"][class*="min-h-"]:has(.text-red-400),
                .admin-shell main [class*="bg-[#12141d]"][class*="min-h-"]:has(.text-rose-400) {
                    border-top: 3px solid #dc2626 !important;
                }

                .admin-shell main [class*="bg-[#12141d]"][class*="min-h-"]:has(.text-blue-400) {
                    border-top: 3px solid var(--workspace-blue) !important;
                }

                .admin-shell main [class*="bg-[#12141d]"][class*="min-h-"]:has(.text-indigo-300),
                .admin-shell main [class*="bg-[#12141d]"][class*="min-h-"]:has(.text-indigo-400) {
                    border-top: 3px solid #4f46e5 !important;
                }

                .admin-shell main .text-indigo-300,
                .admin-shell main .text-indigo-400 {
                    color: #4338ca !important;
                }

                .admin-shell main .text-cyan-400 {
                    color: #087985 !important;
                }

                .admin-shell main .text-pink-400 {
                    color: #c026d3 !important;
                }

                .admin-shell main .text-rose-300,
                .admin-shell main .text-rose-400 {
                    color: #e11d48 !important;
                }

                /* Legacy dark-theme text utilities need an explicit light-theme
                   contrast scale. This keeps labels and empty states readable. */
                .admin-shell main .text-slate-200,
                .admin-shell main .text-zinc-100 {
                    color: #292c31 !important;
                }

                .admin-shell main .text-slate-300,
                .admin-shell main .text-zinc-300 {
                    color: #3f4247 !important;
                }

                .admin-shell main .text-slate-400,
                .admin-shell main .text-zinc-400 {
                    color: #55595f !important;
                }

                .admin-shell main .text-slate-500,
                .admin-shell main .text-zinc-500 {
                    color: #666a70 !important;
                }

                .admin-shell main .text-slate-600,
                .admin-shell main .text-zinc-600 {
                    color: #4d5055 !important;
                }

                .admin-shell main .text-slate-700 {
                    color: #34373b !important;
                }

                .admin-shell main .text-slate-800,
                .admin-shell main .text-zinc-900 {
                    color: #24262a !important;
                }

                .admin-shell main .text-slate-900,
                .admin-shell main .text-slate-950,
                .admin-shell main .text-zinc-950 {
                    color: #15171a !important;
                }

                .admin-shell main .text-white\/20 {
                    color: #74777c !important;
                }

                .admin-shell main .text-white\/70,
                .admin-shell main .text-white\/80,
                .admin-shell main .text-white\/90,
                .admin-shell main .text-white\/95 {
                    color: #2f3237 !important;
                }

                .admin-shell main th,
                .admin-shell main th[class*="text-"],
                .admin-shell main th * {
                    color: #ffffff !important;
                }

                .admin-shell main a[class*="bg-blue-"]:not([class*="/10"]):not([class*="/15"]):not([class*="/20"]) *,
                .admin-shell main button[class*="bg-blue-"]:not([class*="/10"]):not([class*="/15"]):not([class*="/20"]) *,
                .admin-shell main a[class*="from-blue-"] *,
                .admin-shell main button[class*="from-blue-"] *,
                .admin-shell main button[class*="bg-green-"]:not([class*="/10"]):not([class*="/15"]):not([class*="/20"]) *,
                .admin-shell main button[class*="bg-emerald-"]:not([class*="/10"]):not([class*="/15"]):not([class*="/20"]) *,
                .admin-shell main button[class*="bg-red-"]:not([class*="/10"]):not([class*="/15"]):not([class*="/20"]) *,
                .admin-shell main button[class*="bg-rose-"]:not([class*="/10"]):not([class*="/15"]):not([class*="/20"]) * {
                    color: #ffffff !important;
                }

                .admin-shell main .admin-primary-button,
                .admin-shell main a[class*="bg-blue-"],
                .admin-shell main button[class*="bg-blue-"],
                .admin-shell main a[class*="from-blue-"],
                .admin-shell main button[class*="from-blue-"] {
                    min-height: 42px;
                    border: 1px solid var(--workspace-blue) !important;
                    border-radius: 2px !important;
                    background: var(--workspace-blue) !important;
                    box-shadow: none !important;
                    color: #ffffff !important;
                    font-size: 11px !important;
                    font-weight: 800 !important;
                    letter-spacing: 0.12em !important;
                    text-transform: uppercase;
                }

                .admin-shell main .admin-primary-button:hover,
                .admin-shell main a[class*="bg-blue-"]:hover,
                .admin-shell main button[class*="bg-blue-"]:hover,
                .admin-shell main a[class*="from-blue-"]:hover,
                .admin-shell main button[class*="from-blue-"]:hover {
                    transform: none !important;
                    border-color: var(--workspace-ink) !important;
                    background: var(--workspace-ink) !important;
                }

                .admin-shell main .admin-danger-button {
                    min-height: 42px;
                    border: 1px solid #d92d20 !important;
                    border-radius: 2px !important;
                    background: #d92d20 !important;
                    box-shadow: none !important;
                    color: #ffffff !important;
                    font-size: 11px !important;
                    font-weight: 800 !important;
                    letter-spacing: 0.12em !important;
                    text-transform: uppercase;
                }

                .admin-shell main .admin-danger-button *,
                .admin-shell main .admin-danger-button:hover {
                    color: #ffffff !important;
                }

                .admin-shell main .admin-danger-button:hover {
                    border-color: #b42318 !important;
                    background: #b42318 !important;
                }

                .admin-shell main .admin-secondary-button,
                .admin-shell main button[class*="bg-transparent"] {
                    min-height: 42px;
                    border: 1px solid var(--workspace-ink) !important;
                    border-radius: 2px !important;
                    background: transparent !important;
                    box-shadow: none !important;
                    color: var(--workspace-ink) !important;
                    font-size: 11px !important;
                    font-weight: 750 !important;
                    letter-spacing: 0.1em;
                    text-transform: uppercase;
                }

                .admin-shell main .admin-secondary-button:hover,
                .admin-shell main button[class*="bg-transparent"]:hover {
                    background: var(--workspace-ink) !important;
                    color: #ffffff !important;
                }

                .admin-shell main .admin-action-link {
                    border-color: var(--workspace-line) !important;
                    border-radius: 2px !important;
                    background: transparent !important;
                    box-shadow: none !important;
                }

                .admin-shell main .admin-action-link:hover {
                    border-color: var(--workspace-blue) !important;
                    background: #f7f8ff !important;
                }

                .admin-shell main input,
                .admin-shell main textarea,
                .admin-shell main select {
                    min-height: 44px;
                    border: 1px solid #c8c5bc !important;
                    border-radius: 2px !important;
                    background: #faf9f5 !important;
                    box-shadow: none !important;
                    color: var(--workspace-ink) !important;
                }

                .admin-shell main input::placeholder,
                .admin-shell main textarea::placeholder {
                    color: #96938a !important;
                }

                .admin-shell main input:focus,
                .admin-shell main textarea:focus,
                .admin-shell main select:focus {
                    border-color: var(--workspace-blue) !important;
                    box-shadow: inset 4px 0 0 var(--workspace-blue) !important;
                }

                .admin-shell main div:has(> table) {
                    border: 1px solid var(--workspace-line);
                    border-radius: 2px !important;
                    background: var(--workspace-panel) !important;
                    box-shadow: none !important;
                }

                .admin-shell main table {
                    background: var(--workspace-panel) !important;
                    font-variant-numeric: tabular-nums;
                }

                .admin-shell main thead {
                    top: 0;
                }

                .admin-shell main th {
                    height: 48px;
                    border-bottom: 0 !important;
                    background: var(--workspace-ink) !important;
                    color: #ffffff !important;
                    font-size: 9px !important;
                    font-weight: 750 !important;
                    letter-spacing: 0.17em !important;
                }

                .admin-shell main td {
                    border-bottom: 1px solid #dedbd2 !important;
                    background: transparent !important;
                    color: #313236 !important;
                }

                .admin-shell main tbody tr:nth-child(even) {
                    background: #f8f7f2 !important;
                }

                .admin-shell main tbody tr:hover {
                    background: #eef2ff !important;
                }

                .admin-shell main .admin-pill,
                .admin-shell main .admin-segmented-status {
                    border-radius: 2px !important;
                }

                .admin-shell main .admin-empty-state {
                    border: 1px dashed #aaa69b !important;
                    border-radius: 2px !important;
                    background: transparent !important;
                    box-shadow: none !important;
                }

                .admin-shell main .admin-warning-banner {
                    border: 1px solid #d77d38 !important;
                    border-left-width: 5px !important;
                    border-radius: 2px !important;
                    background: #fff9ec !important;
                }

                .admin-shell main .recharts-cartesian-grid-horizontal line,
                .admin-shell main .recharts-cartesian-grid-vertical line {
                    stroke: #cfccc2 !important;
                    stroke-dasharray: 2 4;
                }

                .admin-shell main .recharts-default-tooltip {
                    border: 1px solid var(--workspace-ink) !important;
                    border-radius: 2px !important;
                    background: var(--workspace-panel) !important;
                    box-shadow: 6px 6px 0 rgba(21, 23, 26, 0.12) !important;
                }

                .admin-shell main div.fixed.inset-0 {
                    background: rgba(18, 19, 22, 0.72) !important;
                    backdrop-filter: blur(5px) !important;
                }

                .admin-shell main div.fixed.inset-0 > div {
                    border: 1px solid #bcb9b0 !important;
                    background: var(--workspace-panel) !important;
                    box-shadow: 10px 12px 0 rgba(18, 19, 22, 0.18) !important;
                }

                .admin-shell main [class*="py-24"][class*="justify-center"],
                .admin-shell main [class*="py-28"][class*="justify-center"] {
                    min-height: 300px;
                    background: #f8f7f2 !important;
                }

                .admin-shell main [class*="divide-y"] > *:last-child,
                .admin-shell main tbody tr:last-child td {
                    border-bottom: 0 !important;
                }

                @media (min-width: 1280px) {
                    .admin-shell main {
                        padding: 2.25rem 2.75rem 5rem !important;
                    }
                }

                @media (max-width: 767px) {
                    .admin-shell main h1 {
                        font-size: 2.25rem !important;
                        line-height: 0.98 !important;
                    }
                }


                @media (min-width: 768px) {
                    .admin-warning-banner {
                        flex-direction: row;
                        align-items: center;
                    }
                }

                @media (max-width: 767px) {
                    .admin-shell main {
                        padding-top: 1rem !important;
                    }

                    .admin-shell main h1 {
                        font-size: 2rem !important;
                        line-height: 1.05 !important;
                    }

                .admin-shell main [class*="grid-cols-4"],
                .admin-shell main [class*="lg:grid-cols-4"] {
                    grid-template-columns: minmax(0, 1fr) !important;
                }
                }

                @media (max-width: 1279px) {
                    .admin-shell main h1 {
                        font-size: clamp(2rem, 4vw, 2.75rem) !important;
                        line-height: 1.02 !important;
                    }

                    .admin-shell main [class*="xl:grid-cols-"],
                    .admin-shell main [class*="lg:grid-cols-3"],
                    .admin-shell main [class*="lg:grid-cols-4"] {
                        grid-template-columns: minmax(0, 1fr) !important;
                    }
                }
            `}</style>
        </div>
    );
}
