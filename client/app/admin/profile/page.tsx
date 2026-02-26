"use client";
import React from 'react';

export default function ProfilePage() {
    return (
        <div className="max-w-4xl mx-auto">
            <h1 className="text-3xl font-light text-white mb-2">Meu Perfil</h1>
            <p className="text-slate-400 mb-8">Gerencie suas informações pessoais</p>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                {/* Profile Card */}
                <div className="md:col-span-1">
                    <div className="bg-gradient-to-br from-slate-900 to-slate-800 rounded-3xl p-6 border border-slate-700/50 shadow-xl flex flex-col items-center text-center">
                        <div className="w-32 h-32 rounded-full bg-blue-600 flex items-center justify-center text-4xl font-bold text-white mb-4 shadow-lg shadow-blue-500/30">
                            AD
                        </div>
                        <h2 className="text-xl font-bold text-white">Administrador</h2>
                        <p className="text-slate-400 text-sm mb-6">admin@conti.com</p>

                        <div className="w-full space-y-2">
                            <span className="inline-block px-3 py-1 rounded-full bg-purple-500/20 text-purple-400 text-xs font-bold w-full">
                                MASTER ADMIN
                            </span>
                        </div>
                    </div>
                </div>

                {/* Edit Form */}
                <div className="md:col-span-2">
                    <div className="bg-gradient-to-br from-slate-900 to-slate-800 rounded-3xl p-8 border border-slate-700/50 shadow-xl">
                        <h3 className="text-xl font-bold text-white mb-6">Informações Básicas</h3>
                        <form className="space-y-6">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div>
                                    <label className="block text-sm font-medium text-slate-300 mb-2">Nome</label>
                                    <input
                                        type="text"
                                        defaultValue="Administrador"
                                        className="w-full bg-slate-950/50 border border-slate-700 rounded-xl p-3 text-white outline-none focus:border-blue-500 transition-colors"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-300 mb-2">Sobrenome</label>
                                    <input
                                        type="text"
                                        defaultValue="Sistema"
                                        className="w-full bg-slate-950/50 border border-slate-700 rounded-xl p-3 text-white outline-none focus:border-blue-500 transition-colors"
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-slate-300 mb-2">Email</label>
                                <input
                                    type="email"
                                    defaultValue="admin@conti.com"
                                    className="w-full bg-slate-950/50 border border-slate-700 rounded-xl p-3 text-white outline-none focus:border-blue-500 transition-colors"
                                />
                            </div>

                            <div className="pt-4 border-t border-slate-700">
                                <h3 className="text-lg font-bold text-white mb-4">Alterar Senha</h3>
                                <div className="space-y-4">
                                    <input
                                        type="password"
                                        placeholder="Senha Atual"
                                        className="w-full bg-slate-950/50 border border-slate-700 rounded-xl p-3 text-white outline-none focus:border-blue-500 transition-colors"
                                    />
                                    <input
                                        type="password"
                                        placeholder="Nova Senha"
                                        className="w-full bg-slate-950/50 border border-slate-700 rounded-xl p-3 text-white outline-none focus:border-blue-500 transition-colors"
                                    />
                                </div>
                            </div>

                            <button className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-xl font-bold transition-all shadow-lg shadow-blue-500/20">
                                Salvar Perfil
                            </button>
                        </form>
                    </div>
                </div>
            </div>
        </div>
    );
}
