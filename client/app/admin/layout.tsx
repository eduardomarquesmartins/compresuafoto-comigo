"use client";
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { Menu, X, Home, LayoutDashboard, Calendar, CalendarPlus, Users, Tag, ShoppingBag, FileText, Settings } from 'lucide-react';
import Image from 'next/image';
import logoAdmin from './logo-admin.jpg'; // Importing the image from the same directory

export default function AdminLayout({
    children,
}: {
    children: React.ReactNode
}) {
    const pathname = usePathname();
    const router = useRouter();
    const [isAuthorized, setIsAuthorized] = useState(false);
    const [sidebarOpen, setSidebarOpen] = useState(false);

    useEffect(() => {
        const token = localStorage.getItem('token');

        if (pathname === '/admin/login') {
            setIsAuthorized(true);
        } else {
            if (!token) {
                router.push('/admin/login');
            } else {
                setIsAuthorized(true);
            }
        }
        setSidebarOpen(false);
    }, [pathname, router]);

    if (pathname === '/admin/login') {
        return <>{children}</>;
    }

    if (!isAuthorized) {
        return <div className="min-h-screen bg-[#0a0a0c] flex items-center justify-center text-slate-500 font-sans tracking-widest uppercase text-xs">Acessando sistema...</div>;
    }

    const isActive = (path: string) => {
        return pathname === path
            ? 'bg-gradient-to-r from-blue-600/20 to-transparent text-white border-l-2 border-blue-500 shadow-[inset_4px_0_10px_rgba(37,99,235,0.1)]'
            : 'text-slate-400 hover:bg-white/5 hover:text-white border-l-2 border-transparent hover:border-slate-700 transition-all duration-300';
    };

    return (
        <div className="min-h-screen bg-[#050507] text-slate-200 font-sans relative overflow-hidden selection:bg-blue-500/30">
            {/* Background Glows */}
            <div className="fixed top-0 left-0 w-full h-full overflow-hidden -z-10 pointer-events-none">
                <div className="absolute -top-[20%] -left-[10%] w-[50%] h-[50%] bg-blue-600/10 blur-[120px] rounded-full mix-blend-screen"></div>
                <div className="absolute top-[60%] -right-[10%] w-[40%] h-[60%] bg-indigo-600/5 blur-[120px] rounded-full mix-blend-screen"></div>
                {/* Subtle Grid Pattern */}
                <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAiIGhlaWdodD0iNDAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CjxwYXRoIGQ9Ik0wIDBoNDB2NDBIMHoiIGZpbGw9Im5vbmUiLz4KPHBhdGggZD0iTTAgNDBoNDBWMCIgc3Ryb2tlPSJyZ2JhKDI1NSwyNTUsMjU1LDAuMDIpIiBzdHJva2Utd2lkdGg9IjEiLz4KPC9zdmc+')] opacity-50"></div>
            </div>

            {/* Mobile Header */}
            <div className="md:hidden print:hidden bg-[#0a0a0c]/80 backdrop-blur-md border-b border-white/5 p-4 flex items-center justify-between sticky top-0 z-30">
                <div className="flex items-center gap-2">
                    <span className="text-xl font-light text-blue-500 font-sans">&</span>
                    <span className="text-sm font-medium text-white tracking-[0.2em] uppercase">Conti Admin</span>
                </div>
                <button onClick={() => setSidebarOpen(!sidebarOpen)} className="text-slate-200 p-2 rounded-lg bg-white/5 border border-white/10 hover:bg-white/10 transition">
                    {sidebarOpen ? <X size={20} /> : <Menu size={20} />}
                </button>
            </div>

            <div className="flex relative min-h-screen">
                {/* Sidebar Overlay for Mobile */}
                {sidebarOpen && (
                    <div
                        className="fixed inset-0 bg-black/80 backdrop-blur-sm z-30 md:hidden transition-opacity"
                        onClick={() => setSidebarOpen(false)}
                    />
                )}

                {/* Sidebar */}
                <aside className={`
                    bg-[#0a0a0c]/90 backdrop-blur-xl border-r border-white/5 shadow-2xl z-40 print:hidden
                    fixed md:sticky top-0 left-0 bottom-0 h-screen flex flex-col
                    w-72 transition-all duration-500 ease-[cubic-bezier(0.23,1,0.32,1)]
                    ${sidebarOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
                `}>
                    <div className="mt-8 mb-10 px-8 flex flex-col">
                        {/* Text Logo */}
                        <div className="flex items-center gap-3 mb-2">
                            <span className="text-3xl font-light text-transparent bg-clip-text bg-gradient-to-b from-blue-400 to-blue-600 font-sans">&</span>
                            <span className="text-2xl font-semibold text-white tracking-[0.15em] uppercase">Conti</span>
                        </div>
                        <div className="h-[1px] w-12 bg-gradient-to-r from-blue-500 to-transparent mt-2 mb-3"></div>
                        <span className="text-[0.65rem] tracking-[0.3em] text-slate-500 font-medium uppercase">
                            Admin System
                        </span>
                    </div>

                    <nav className="space-y-1 flex-1 px-4 overflow-y-auto custom-scrollbar">
                        <Link href="/" className="px-4 py-3 text-sm font-medium text-slate-400 hover:text-white rounded-lg hover:bg-white/5 transition-all flex items-center gap-3">
                            <Home size={16} className="text-slate-500 group-hover:text-white" />
                            <span>Voltar ao Site</span>
                        </Link>
                        
                        <div className="h-px bg-white/5 my-4 mx-4"></div>
                        
                        <div className="text-[0.65rem] font-bold text-slate-600 uppercase tracking-wider px-4 mb-2">Principal</div>
                        
                        <Link href="/admin/dashboard" className={`flex items-center gap-3 px-4 py-3 text-sm font-medium rounded-r-lg ${isActive('/admin/dashboard')}`}>
                            <LayoutDashboard size={16} />
                            <span>Dashboard</span>
                        </Link>
                        
                        <div className="text-[0.65rem] font-bold text-slate-600 uppercase tracking-wider px-4 mt-6 mb-2">Gestão</div>

                        <Link href="/admin/events" className={`flex items-center gap-3 px-4 py-3 text-sm font-medium rounded-r-lg ${isActive('/admin/events')}`}>
                            <Calendar size={16} />
                            <span>Meus Eventos</span>
                        </Link>
                        <Link href="/admin/events/create" className={`flex items-center gap-3 px-4 py-3 text-sm font-medium rounded-r-lg ${isActive('/admin/events/create')}`}>
                            <CalendarPlus size={16} />
                            <span>Criar Evento</span>
                        </Link>
                        <Link href="/admin/users" className={`flex items-center gap-3 px-4 py-3 text-sm font-medium rounded-r-lg ${isActive('/admin/users')}`}>
                            <Users size={16} />
                            <span>Usuários</span>
                        </Link>
                        
                        <div className="text-[0.65rem] font-bold text-slate-600 uppercase tracking-wider px-4 mt-6 mb-2">Comercial</div>

                        <Link href="/admin/coupons" className={`flex items-center gap-3 px-4 py-3 text-sm font-medium rounded-r-lg ${isActive('/admin/coupons')}`}>
                            <Tag size={16} />
                            <span>Cupons de Desconto</span>
                        </Link>
                        <Link href="/admin/orders" className={`flex items-center gap-3 px-4 py-3 text-sm font-medium rounded-r-lg ${isActive('/admin/orders')}`}>
                            <ShoppingBag size={16} />
                            <span>Pedidos</span>
                        </Link>
                        <Link href="/admin/proposals" className={`flex items-center gap-3 px-4 py-3 text-sm font-medium rounded-r-lg ${isActive('/admin/proposals')}`}>
                            <FileText size={16} />
                            <span>Propostas</span>
                        </Link>
                    </nav>

                    <div className="px-6 py-6 border-t border-white/5 bg-black/20">
                        <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center shadow-lg shadow-blue-500/20">
                                <span className="text-white text-xs font-bold">AD</span>
                            </div>
                            <div className="flex flex-col">
                                <span className="text-xs font-semibold text-white">Administrador</span>
                                <span className="text-[0.65rem] text-slate-500">Sistema Premium</span>
                            </div>
                        </div>
                    </div>
                </aside>

                <main className="flex-1 p-4 md:p-10 w-full min-h-screen relative z-10">
                    <div className="max-w-7xl mx-auto">
                        {children}
                    </div>
                </main>
            </div>
            
            <style jsx global>{`
                .custom-scrollbar::-webkit-scrollbar {
                    width: 4px;
                }
                .custom-scrollbar::-webkit-scrollbar-track {
                    background: transparent;
                }
                .custom-scrollbar::-webkit-scrollbar-thumb {
                    background: rgba(255,255,255,0.1);
                    border-radius: 4px;
                }
                .custom-scrollbar::-webkit-scrollbar-thumb:hover {
                    background: rgba(255,255,255,0.2);
                }
            `}</style>
        </div>
    );
}
