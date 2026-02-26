"use client";
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { Menu, X, Home } from 'lucide-react';
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
        // Close sidebar on route change
        setSidebarOpen(false);
    }, [pathname, router]);

    // If on login page, render without sidebar layout to allow full screen design
    if (pathname === '/admin/login') {
        return <>{children}</>;
    }

    // Show loading or nothing while checking auth for protected routes
    if (!isAuthorized) {
        return <div className="min-h-screen bg-slate-950 flex items-center justify-center text-slate-500">Verificando acesso...</div>;
    }

    const isActive = (path: string) => {
        return pathname === path
            ? 'bg-blue-600 text-white shadow-[-4px_4px_10px_rgba(37,99,235,0.2)] rounded-l-2xl border-r-4 border-blue-400'
            : 'text-slate-400 hover:bg-slate-800/50 hover:text-white rounded-l-2xl';
    };

    return (
        <div className="min-h-screen bg-slate-950 text-slate-200 font-sans">
            {/* Mobile Header */}
            <div className="md:hidden bg-slate-900 border-b border-slate-800 p-4 flex items-center justify-between sticky top-0 z-30">
                <div className="flex items-center gap-2">
                    <span className="text-xl font-light text-blue-500 font-sans">&</span>
                    <span className="text-lg font-normal text-white tracking-wide">CONTI ADMIN</span>
                </div>
                <button onClick={() => setSidebarOpen(!sidebarOpen)} className="text-slate-200 p-1">
                    {sidebarOpen ? <X /> : <Menu />}
                </button>
            </div>

            <div className="flex relative">
                {/* Sidebar Overlay for Mobile */}
                {sidebarOpen && (
                    <div
                        className="fixed inset-0 bg-black/50 z-30 md:hidden"
                        onClick={() => setSidebarOpen(false)}
                    />
                )}

                {/* Sidebar */}
                <aside className={`
                    bg-slate-900 min-h-screen py-8 border-r border-slate-800 shadow-xl z-40 
                    fixed md:sticky top-0 left-0 bottom-0 h-screen overflow-y-auto flex flex-col
                    w-64 transition-transform duration-300 ease-in-out
                    ${sidebarOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
                `}>
                    <div className="mb-12 px-6 flex flex-col items-center">
                        {/* Text Logo */}
                        <div className="flex items-center gap-2 mb-1">
                            <span className="text-4xl font-light text-blue-500 font-sans">&</span>
                            <span className="text-3xl font-normal text-white tracking-wide">CONTI</span>
                        </div>
                        <span className="text-[0.6rem] tracking-[0.4em] text-slate-400 font-normal uppercase ml-4">
                            Marketing Digital
                        </span>
                    </div>

                    <nav className="space-y-2 flex-1 pl-4">
                        <Link href="/" className="block px-6 py-3 transition-all font-normal text-slate-400 hover:bg-slate-800/50 hover:text-white rounded-l-2xl flex items-center gap-2">
                            <Home size={18} />
                            <span>Voltar ao Site</span>
                        </Link>
                        <div className="border-t border-slate-800 my-4 mr-4"></div>
                        <Link href="/admin/dashboard" className={`block px-6 py-3 transition-all font-normal ${isActive('/admin/dashboard')}`}>
                            Dashboard
                        </Link>
                        <Link href="/admin/events" className={`block px-6 py-3 transition-all font-normal ${isActive('/admin/events')}`}>
                            Meus Eventos
                        </Link>
                        <Link href="/admin/events/create" className={`block px-6 py-3 transition-all font-normal ${isActive('/admin/events/create')}`}>
                            Criar Evento
                        </Link>
                        {/* Importar do Drive - desativado temporariamente */}
                        <Link href="/admin/users" className={`block px-6 py-3 transition-all font-normal ${isActive('/admin/users')}`}>
                            Usuários
                        </Link>
                        <Link href="/admin/coupons" className={`block px-6 py-3 transition-all font-normal ${isActive('/admin/coupons')}`}>
                            Cupons de Desconto
                        </Link>
                        <Link href="/admin/orders" className={`block px-6 py-3 transition-all font-normal ${isActive('/admin/orders')}`}>
                            Pedidos
                        </Link>
                    </nav>

                    <div className="text-center text-xs text-slate-600 mt-10 px-6">
                        &copy; 2026 Admin Panel
                    </div>
                </aside>

                <main className="flex-1 p-4 md:p-10 bg-slate-950 w-full md:w-auto min-h-screen">
                    {children}
                </main>
            </div>
        </div>
    );
}
