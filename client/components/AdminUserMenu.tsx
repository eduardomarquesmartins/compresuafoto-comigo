"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { LogOut, Settings, User } from "lucide-react";
import { adminLoginPath, adminPath } from "@/lib/adminPath";

export default function AdminUserMenu() {
    const [isOpen, setIsOpen] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);
    const router = useRouter();

    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        }

        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    const handleLogout = () => {
        localStorage.removeItem("token");
        localStorage.removeItem("user");
        setIsOpen(false);
        router.push(adminLoginPath());
    };

    return (
        <div className="relative" ref={dropdownRef}>
            <button
                type="button"
                onClick={() => setIsOpen(!isOpen)}
                className="flex h-10 w-10 items-center justify-center rounded-lg border border-white/10 bg-white/[0.045] text-xs font-semibold text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.06)] transition hover:border-[#0a72ef]/45 hover:bg-[#0a72ef]/12"
                aria-label="Abrir menu do administrador"
                title="Administrador"
            >
                AD
            </button>

            {isOpen && (
                <div className="absolute right-0 z-50 mt-3 w-60 overflow-hidden rounded-lg border border-white/10 bg-[#0b0b0d]/96 shadow-[0_24px_80px_-36px_rgba(0,0,0,1)] backdrop-blur-2xl animate-in fade-in zoom-in-95 duration-150">
                    <div className="border-b border-white/10 p-4">
                        <p className="text-sm font-semibold text-white">Administrador</p>
                        <p className="mt-1 truncate text-xs text-zinc-500">Painel operacional</p>
                    </div>

                    <div className="space-y-1 p-2">
                        <Link
                            href={adminPath("profile")}
                            className="flex items-center gap-2 rounded-md px-3 py-2 text-sm text-zinc-300 transition hover:bg-white/[0.06] hover:text-white"
                            onClick={() => setIsOpen(false)}
                        >
                            <User size={15} />
                            Meu perfil
                        </Link>
                        <Link
                            href={adminPath("settings")}
                            className="flex items-center gap-2 rounded-md px-3 py-2 text-sm text-zinc-300 transition hover:bg-white/[0.06] hover:text-white"
                            onClick={() => setIsOpen(false)}
                        >
                            <Settings size={15} />
                            Configuracoes
                        </Link>
                        <div className="my-1 h-px bg-white/10" />
                        <button
                            type="button"
                            onClick={handleLogout}
                            className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm text-red-200/85 transition hover:bg-red-500/10 hover:text-red-100"
                        >
                            <LogOut size={15} />
                            Sair
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}
