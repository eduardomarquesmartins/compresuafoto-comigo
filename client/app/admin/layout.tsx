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
    }
];

const isCurrentRoute = (pathname: string, href: string) => {
    if (href === "/admin/dashboard") {
        return pathname === href || pathname === "/admin";
    }

    return pathname === href || pathname.startsWith(`${href}/`);
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
        let cancelled = false;

        const validateAdminSession = async () => {
            if (pathname === "/admin/login") {
                setIsAuthorized(true);
                return;
            }

            const token = localStorage.getItem("token");
            if (!token) {
                clearAdminSession();
                if (!cancelled) setIsAuthorized(false);
                router.push("/admin/login");
                return;
            }

            try {
                const response = await api.get("/auth/me");
                const user = response.data?.user;

                if (user?.role !== "ADMIN") {
                    clearAdminSession();
                    if (!cancelled) setIsAuthorized(false);
                    router.push("/admin/login");
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
                router.push("/admin/login");
            }
        };

        validateAdminSession();

        return () => {
            cancelled = true;
        };
    }, [pathname, router]);

    const handleLogout = () => {
        clearAdminSession();
        router.push("/login");
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

            <header className="xl:hidden sticky top-0 z-40 border-b border-zinc-200 bg-white/92 px-4 py-3 backdrop-blur-xl">
                <div className="flex items-center justify-between relative h-12">
                    <Link href="/admin/dashboard" className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 h-12 w-48 flex items-center justify-center overflow-hidden">
                        <Image src={logoAdmin} alt="Compre Sua Foto admin" className="h-28 w-auto object-contain" />
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
                        fixed inset-y-0 left-0 z-50 flex h-dvh w-[292px] max-w-[86vw] flex-col
                        border-r border-zinc-200 bg-white/94 backdrop-blur-2xl
                        transition-transform duration-300 ease-out
                        ${sidebarOpen ? "translate-x-0" : "-translate-x-full xl:translate-x-0"}
                    `}
                >
                    <div className="border-b border-zinc-200 h-20 flex justify-center items-center overflow-hidden">
                        <Link href="/admin/dashboard" className="relative w-full h-full flex justify-center items-center">
                            <Image src={logoAdmin} alt="Compre Sua Foto" className="absolute h-48 w-auto object-contain transition-transform hover:scale-105 duration-200" />
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
                        <Link href="/" className="admin-nav-link">
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

                .admin-shell * {
                    font-family: var(--font-geist), system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif !important;
                }

                .admin-shell aside {
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
                .admin-shell .bg-zinc-900 {
                    background-color: #ffffff !important;
                }
                .admin-shell [class*="bg-slate-950"] {
                    background-color: #fafafa !important;
                }

                /* Specific dark background overrides */
                .admin-shell [class*="bg-[#050505]"],
                .admin-shell [class*="bg-[#0a0a0c]"],
                .admin-shell [class*="bg-[#0b0b0d]"],
                .admin-shell [class*="bg-[#0e0f1d]"],
                .admin-shell [class*="bg-[#131526]"],
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
