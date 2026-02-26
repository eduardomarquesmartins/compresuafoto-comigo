"use client";
import { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { User, Settings, LogOut } from 'lucide-react';

export default function AdminUserMenu() {
    const [isOpen, setIsOpen] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);
    const router = useRouter();

    // Close on click outside
    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        }
        document.addEventListener("mousedown", handleClickOutside);
        return () => {
            document.removeEventListener("mousedown", handleClickOutside);
        };
    }, [dropdownRef]);

    const handleLogout = () => {
        // Here you would typically clear the session/token
        // localStorage.removeItem('token'); 
        router.push('/admin/login');
    };

    return (
        <div className="relative" ref={dropdownRef}>
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="w-10 h-10 rounded-full bg-blue-600 text-white flex items-center justify-center font-bold shadow-lg shadow-blue-500/30 hover:bg-blue-700 transition-all border border-white/10"
            >
                AD
            </button>

            {isOpen && (
                <div className="absolute right-0 mt-3 w-56 bg-gradient-to-br from-slate-900 to-slate-800 border border-slate-700/50 rounded-2xl shadow-xl z-50 overflow-hidden animate-in fade-in zoom-in duration-200">
                    <div className="p-4 border-b border-slate-700/50">
                        <p className="text-white font-bold">Admin</p>
                        <p className="text-xs text-slate-400">admin@conti.com</p>
                    </div>
                    <div className="p-2 space-y-1">
                        <Link
                            href="/admin/profile"
                            className="flex items-center gap-2 px-3 py-2 text-sm text-slate-300 hover:text-white hover:bg-slate-700/50 rounded-lg transition-colors"
                            onClick={() => setIsOpen(false)}
                        >
                            <User size={16} />
                            Meu Perfil
                        </Link>
                        <Link
                            href="/admin/settings"
                            className="flex items-center gap-2 px-3 py-2 text-sm text-slate-300 hover:text-white hover:bg-slate-700/50 rounded-lg transition-colors"
                            onClick={() => setIsOpen(false)}
                        >
                            <Settings size={16} />
                            Configurações
                        </Link>
                        <div className="h-px bg-slate-700/50 my-1"></div>
                        <button
                            onClick={handleLogout}
                            className="w-full flex items-center gap-2 px-3 py-2 text-sm text-red-400 hover:text-red-300 hover:bg-red-500/10 rounded-lg transition-colors"
                        >
                            <LogOut size={16} />
                            Sair
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}
