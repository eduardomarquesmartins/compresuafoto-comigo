"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
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
};

type NavSection = {
    label: string;
    items: NavItem[];
};

const navSections: NavSection[] = [
    {
        label: "Painel",
        items: [
            { href: "/admin/dashboard", label: "Dashboard", icon: LayoutDashboard },
            { href: "/admin/events", label: "Eventos", icon: Calendar },
            { href: "/admin/events/create", label: "Criar evento", icon: CalendarPlus },
            { href: "/admin/users", label: "Usuários", icon: Users }
        ]
    },
    {
        label: "Comercial",
        items: [
            { href: "/admin/coupons", label: "Cupons", icon: Tag },
            { href: "/admin/orders", label: "Pedidos", icon: ShoppingBag },
            { href: "/admin/proposals", label: "Propostas", icon: FileText },
            { href: "/admin/contracts", label: "Contratos", icon: ScrollText },
            { href: "/admin/clients", label: "Clientes", icon: Users },
            { href: "/admin/emails", label: "E-mails", icon: Mail },
            { href: "/admin/presentation", label: "Apresentação", icon: MonitorPlay }
        ]
    },
    {
        label: "Controle",
        items: [
            { href: "/admin/control", label: "Visão geral", icon: Activity },
            { href: "/admin/finance", label: "Financeiro", icon: DollarSign },
            { href: "/admin/debts", label: "Dívidas", icon: ShieldAlert },
            { href: "/admin/demands", label: "Demandas", icon: ClipboardCheck },
            { href: "/admin/imports", label: "Importar histórico", icon: FileSpreadsheet }
        ]
    }
];

const isCurrentRoute = (pathname: string, href: string) => {
    if (href === "/admin/dashboard") {
        return pathname === href || pathname === "/admin";
    }

    return pathname === href || pathname.startsWith(`${href}/`);
};

const hasAdminSession = () => {
    if (typeof window === "undefined") return false;

    const token = localStorage.getItem("token");
    const storedUser = localStorage.getItem("user");

    if (!token || !storedUser) return false;

    try {
        return JSON.parse(storedUser)?.role === "ADMIN";
    } catch {
        return false;
    }
};

const clearAdminSession = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
};

const getRouteMeta = (pathname: string) => {
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
    const [isAuthorized, setIsAuthorized] = useState(pathname === "/admin/login");
    const [sidebarOpen, setSidebarOpen] = useState(false);
    const routeMeta = useMemo(() => getRouteMeta(pathname), [pathname]);
    const RouteIcon = routeMeta.icon;

    useEffect(() => {
        const authTimer = window.setTimeout(() => {
            if (pathname === "/admin/login") {
                setIsAuthorized(true);
                return;
            }

            if (!hasAdminSession()) {
                clearAdminSession();
                setIsAuthorized(false);
                router.push("/admin/login");
                return;
            }

            setIsAuthorized(true);
            setSidebarOpen(false);
        }, 0);

        return () => window.clearTimeout(authTimer);
    }, [pathname, router]);

    const handleLogout = () => {
        clearAdminSession();
        router.push("/admin/login");
    };

    if (pathname === "/admin/login") {
        return <>{children}</>;
    }

    if (!isAuthorized) {
        return (
            <div className="min-h-dvh bg-[#050505] flex items-center justify-center font-mono text-[11px] uppercase tracking-[0.22em] text-zinc-500">
                Acessando painel
            </div>
        );
    }

    return (
        <div className="admin-shell min-h-dvh text-zinc-100 selection:bg-[#0a72ef]/30">
            <div className="admin-grid-background fixed inset-0 -z-10 pointer-events-none" />

            <header className="md:hidden sticky top-0 z-40 border-b border-white/10 bg-[#050505]/92 px-4 py-3 backdrop-blur-xl">
                <div className="flex items-center justify-between">
                    <Link href="/admin/dashboard" className="flex items-center gap-3">
                        <Image src={logoAdmin} alt="Compre Sua Foto admin" className="h-9 w-9 rounded-md object-cover" />
                        <div className="leading-tight">
                            <p className="text-sm font-semibold text-white">Compre Sua Foto</p>
                            <p className="admin-overline">Painel administrativo</p>
                        </div>
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

            <div className="relative flex min-h-dvh">
                {sidebarOpen && (
                    <button
                        type="button"
                        className="fixed inset-0 z-40 bg-black/78 backdrop-blur-sm md:hidden"
                        aria-label="Fechar menu"
                        onClick={() => setSidebarOpen(false)}
                    />
                )}

                <aside
                    className={`
                        fixed md:sticky inset-y-0 left-0 z-50 flex h-dvh w-[292px] flex-col
                        border-r border-white/10 bg-[#050505]/94 backdrop-blur-2xl
                        transition-transform duration-300 ease-out
                        ${sidebarOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"}
                    `}
                >
                    <div className="border-b border-white/10 p-4">
                        <Link href="/admin/dashboard" className="group flex items-center justify-between gap-4 px-1 py-1">
                            <span className="flex items-center gap-3">
                                <Image src={logoAdmin} alt="Compre Sua Foto" className="h-11 w-11 rounded-md object-cover" />
                                <span>
                                    <span className="block text-sm font-semibold text-white">Compre Sua Foto</span>
                                    <span className="admin-overline mt-1 block">Painel administrativo</span>
                                </span>
                            </span>
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

                                            return (
                                                <Link
                                                    key={item.href}
                                                    href={item.href}
                                                    className={`admin-nav-link ${active ? "is-active" : ""}`}
                                                >
                                                    <Icon size={16} />
                                                    <span className="truncate">{item.label}</span>
                                                    {active && <span className="ml-auto h-1.5 w-1.5 rounded-full bg-[#0a72ef]" />}
                                                </Link>
                                            );
                                        })}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </nav>

                    <div className="border-t border-white/10 p-3 space-y-1">
                        <button type="button" onClick={handleLogout} className="admin-nav-link is-danger w-full">
                            <LogOut size={16} />
                            <span>Sair do Admin</span>
                        </button>
                        <Link href="/" className="admin-nav-link">
                            <Home size={16} />
                            <span>Voltar ao site</span>
                        </Link>                    </div>
                </aside>

                <main className="relative z-10 min-w-0 flex-1 px-4 py-5 md:px-7 md:py-6 xl:px-9">
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
                    background: #050505 !important;
                }

                body:has(.admin-shell)::-webkit-scrollbar-thumb,
                html:has(.admin-shell)::-webkit-scrollbar-thumb {
                    background: rgba(10, 114, 239, 0.4) !important;
                    border-radius: 999px;
                }

                body:has(.admin-shell)::-webkit-scrollbar-thumb:hover,
                html:has(.admin-shell)::-webkit-scrollbar-thumb:hover {
                    background: rgba(10, 114, 239, 0.8) !important;
                }

                .admin-shell {
                    --admin-bg: #050505;
                    --admin-surface: rgba(15, 15, 17, 0.86);
                    --admin-surface-strong: rgba(21, 21, 24, 0.94);
                    --admin-border: rgba(255, 255, 255, 0.105);
                    --admin-border-soft: rgba(255, 255, 255, 0.065);
                    --admin-text: #fafafa;
                    --admin-muted: #8a8f98;
                    --admin-blue: #0a72ef;
                    --admin-pink: #de1d8d;
                    --admin-red: #ff5b4f;
                    min-height: 100dvh;
                    background:
                        linear-gradient(180deg, rgba(255,255,255,0.035), transparent 22rem),
                        linear-gradient(180deg, #050505 0%, #09090b 52%, #050505 100%);
                    font-family: var(--font-geist), system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
                    font-feature-settings: "liga", "tnum", "cv01";
                }

                .admin-grid-background {
                    background:
                        linear-gradient(90deg, rgba(255,255,255,0.045) 1px, transparent 1px),
                        linear-gradient(180deg, rgba(255,255,255,0.035) 1px, transparent 1px),
                        linear-gradient(120deg, rgba(10,114,239,0.12), transparent 28%, rgba(222,29,141,0.08), transparent 58%);
                    background-size: 46px 46px, 46px 46px, auto;
                    mask-image: linear-gradient(to bottom, rgba(0,0,0,0.95), rgba(0,0,0,0.68));
                }

                .admin-overline,
                .admin-section-label,
                .admin-kicker,
                .admin-microcopy,
                .admin-pill,
                .admin-metric-label {
                    font-family: var(--font-geist-mono), ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
                    text-transform: uppercase;
                    letter-spacing: 0.14em;
                    font-size: 10px;
                    font-weight: 600;
                    color: var(--admin-muted);
                }

                .admin-section-label {
                    padding: 0 0.625rem;
                    color: #626873;
                }

                .admin-nav-link {
                    display: flex;
                    min-height: 42px;
                    align-items: center;
                    gap: 0.7rem;
                    border-radius: 8px;
                    border: 1px solid transparent;
                    padding: 0.625rem 0.75rem;
                    color: #a1a1aa;
                    font-size: 0.875rem;
                    font-weight: 500;
                    transition: background .16s ease, border-color .16s ease, color .16s ease, transform .16s ease;
                }

                .admin-nav-link:hover {
                    border-color: var(--admin-border-soft);
                    background: rgba(255,255,255,0.045);
                    color: #fff;
                }

                .admin-nav-link.is-active {
                    border-color: rgba(10,114,239,0.45);
                    background: linear-gradient(180deg, rgba(10,114,239,0.18), rgba(10,114,239,0.075));
                    color: #fff;
                    box-shadow: inset 0 1px 0 rgba(255,255,255,0.08), 0 16px 46px -34px rgba(10,114,239,0.95);
                }

                .admin-nav-link.is-danger {
                    color: rgba(255, 91, 79, 0.85) !important;
                }

                .admin-nav-link.is-danger:hover {
                    border-color: rgba(255, 91, 79, 0.3) !important;
                    background: rgba(255, 91, 79, 0.12) !important;
                    color: #fff !important;
                }

                .admin-topbar,
                .admin-card,
                .admin-hero-card,
                .admin-metric-card,
                .admin-command-panel,
                .admin-loading-card {
                    border-radius: 8px !important;
                    border: 1px solid var(--admin-border) !important;
                    background: linear-gradient(180deg, rgba(255,255,255,0.062), rgba(255,255,255,0.026)) !important;
                    box-shadow: inset 0 1px 0 rgba(255,255,255,0.07), 0 24px 80px -50px rgba(0,0,0,0.9) !important;
                    backdrop-filter: blur(20px);
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
                    border-radius: 8px;
                    border: 1px solid var(--admin-border);
                    background: rgba(255,255,255,0.045);
                    color: #d4d4d8;
                    box-shadow: inset 0 1px 0 rgba(255,255,255,0.055);
                }

                .admin-icon-button {
                    height: 40px;
                    width: 40px;
                    transition: border-color .16s ease, background .16s ease, color .16s ease;
                }

                .admin-icon-button:hover {
                    border-color: rgba(10,114,239,0.42);
                    background: rgba(10,114,239,0.12);
                    color: #fff;
                }

                .admin-pill,
                .admin-segmented-status {
                    display: inline-flex;
                    align-items: center;
                    gap: 0.5rem;
                    border-radius: 999px;
                    border: 1px solid var(--admin-border);
                    background: rgba(255,255,255,0.04);
                    padding: 0.45rem 0.65rem;
                    font-family: var(--font-geist-mono), ui-monospace, monospace;
                    font-size: 11px;
                    font-weight: 600;
                    color: #a1a1aa;
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
                    height: 1px;
                    background: linear-gradient(90deg, transparent, rgba(10,114,239,0.8), rgba(222,29,141,0.65), transparent);
                    opacity: 0.8;
                    pointer-events: none;
                }

                .admin-hero-grid {
                    position: absolute;
                    inset: 0;
                    z-index: 0;
                    background:
                        linear-gradient(90deg, rgba(255,255,255,0.045) 1px, transparent 1px),
                        linear-gradient(180deg, rgba(255,255,255,0.035) 1px, transparent 1px),
                        linear-gradient(120deg, transparent, rgba(10,114,239,0.12), transparent 52%, rgba(255,91,79,0.08));
                    background-size: 34px 34px, 34px 34px, auto;
                    opacity: 0.75;
                    mask-image: linear-gradient(110deg, rgba(0,0,0,0.98), transparent 72%);
                }

                .admin-command-panel {
                    overflow: hidden;
                }

                .admin-metric-card {
                    position: relative;
                    min-height: 176px;
                    overflow: hidden;
                    padding: 1.05rem;
                    transition: transform .18s ease, border-color .18s ease;
                }

                .admin-metric-card:hover {
                    transform: translateY(-2px);
                    border-color: rgba(255,255,255,0.18) !important;
                }

                .admin-metric-icon {
                    height: 42px;
                    width: 42px;
                }

                .admin-primary-button,
                .admin-secondary-button {
                    display: inline-flex;
                    align-items: center;
                    justify-content: center;
                    gap: 0.5rem;
                    border-radius: 8px;
                    padding: 0.78rem 1rem;
                    font-size: 0.875rem;
                    font-weight: 600;
                    transition: transform .16s ease, box-shadow .16s ease, background .16s ease, color .16s ease;
                }

                .admin-primary-button {
                    color: #050505;
                    background: #fff;
                    box-shadow: rgba(255,255,255,0.12) 0 0 0 1px, rgba(255,255,255,0.24) 0 18px 54px -32px;
                }

                .admin-primary-button:hover {
                    transform: translateY(-1px);
                    box-shadow: rgba(255,255,255,0.18) 0 0 0 1px, rgba(255,255,255,0.28) 0 24px 72px -36px;
                }

                .admin-secondary-button {
                    color: #f4f4f5;
                    background: rgba(255,255,255,0.055);
                    border: 1px solid var(--admin-border);
                }

                .admin-action-link {
                    display: flex;
                    align-items: center;
                    justify-content: space-between;
                    gap: 1rem;
                    border-radius: 8px;
                    border: 1px solid var(--admin-border-soft);
                    padding: 1rem;
                    color: #f4f4f5;
                    background: rgba(255,255,255,0.035);
                    transition: background .16s ease, border-color .16s ease;
                }

                .admin-action-link:hover {
                    border-color: rgba(10,114,239,0.38);
                    background: rgba(10,114,239,0.085);
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
                    border-radius: 8px;
                    border: 1px solid rgba(255,91,79,0.24);
                    background: rgba(255,91,79,0.08);
                    padding: 1rem;
                }

                .admin-warning-icon {
                    height: 42px;
                    width: 42px;
                    flex-shrink: 0;
                    color: #ffb4ad;
                    background: rgba(255,91,79,0.12);
                    border-color: rgba(255,91,79,0.28);
                }

                .admin-empty-state {
                    max-width: 21rem;
                    border-radius: 8px;
                    border: 1px solid var(--admin-border);
                    background: rgba(5,5,5,0.78);
                    padding: 1.25rem;
                    text-align: center;
                    box-shadow: 0 24px 80px -44px rgba(0,0,0,0.9);
                    backdrop-filter: blur(18px);
                }

                .admin-loader {
                    height: 42px;
                    width: 42px;
                    border-radius: 999px;
                    background: conic-gradient(from 180deg, var(--admin-blue), var(--admin-pink), var(--admin-red), transparent 72%);
                    -webkit-mask: radial-gradient(farthest-side, transparent calc(100% - 4px), #000 0);
                    mask: radial-gradient(farthest-side, transparent calc(100% - 4px), #000 0);
                    animation: admin-spin 1s linear infinite;
                }

                @keyframes admin-spin { to { transform: rotate(360deg); } }

                .admin-shell main h1 {
                    letter-spacing: -0.045em !important;
                    color: var(--admin-text) !important;
                }

                .admin-shell main h2,
                .admin-shell main h3 {
                    letter-spacing: -0.025em;
                }

                .admin-shell section,
                .admin-shell main > div > div:not(.admin-topbar) > div[class*="bg-[#"],
                .admin-shell main > div > div:not(.admin-topbar) > section[class*="bg-[#"] {
                    border-color: var(--admin-border) !important;
                    box-shadow: inset 0 1px 0 rgba(255,255,255,0.06), 0 24px 80px -52px rgba(0,0,0,0.9) !important;
                }

                .admin-shell [class*="rounded-[32px]"],
                .admin-shell [class*="rounded-[24px]"],
                .admin-shell [class*="rounded-2xl"] {
                    border-radius: 8px !important;
                }

                .admin-shell input,
                .admin-shell textarea,
                .admin-shell select {
                    background: rgba(5, 5, 5, 0.62) !important;
                    border-color: var(--admin-border) !important;
                    color: #fff !important;
                    box-shadow: inset 0 1px 0 rgba(255,255,255,0.035);
                    color-scheme: dark;
                }

                .admin-shell input:focus,
                .admin-shell textarea:focus,
                .admin-shell select:focus {
                    border-color: rgba(10,114,239,0.72) !important;
                    box-shadow: 0 0 0 4px rgba(10,114,239,0.16), inset 0 1px 0 rgba(255,255,255,0.05) !important;
                    outline: none !important;
                }

                .admin-shell table {
                    min-width: 760px;
                    border-collapse: separate !important;
                    border-spacing: 0 !important;
                }

                .admin-shell main div:has(> table) {
                    overflow-x: auto !important;
                    -webkit-overflow-scrolling: touch;
                }

                .admin-shell thead {
                    position: sticky;
                    top: 0;
                    z-index: 5;
                    backdrop-filter: blur(16px);
                }

                .admin-shell th {
                    background: rgba(5, 5, 5, 0.88) !important;
                    color: var(--admin-muted) !important;
                    font-size: 10px !important;
                    letter-spacing: 0.16em !important;
                }

                .admin-shell td {
                    border-bottom-color: rgba(255,255,255,0.055) !important;
                }

                .admin-shell tbody tr {
                    transition: background .16s ease;
                }

                .admin-shell tbody tr:hover {
                    background: rgba(10,114,239,0.055) !important;
                }

                .admin-shell main button:focus-visible,
                .admin-shell main a:focus-visible,
                .admin-shell main input:focus-visible,
                .admin-shell main select:focus-visible,
                .admin-shell main textarea:focus-visible {
                    outline: 2px solid rgba(10,114,239,0.72) !important;
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
                    background: rgba(10, 114, 239, 0.4) !important;
                    border-radius: 999px;
                }

                .admin-scroll::-webkit-scrollbar-thumb:hover,
                .custom-scrollbar::-webkit-scrollbar-thumb:hover {
                    background: rgba(10, 114, 239, 0.8) !important;
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
            `}</style>
        </div>
    );
}
