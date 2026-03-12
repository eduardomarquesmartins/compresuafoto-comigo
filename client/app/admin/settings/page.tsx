"use client";
import React from 'react';

export default function SettingsPage() {
    return (
        <div className="max-w-4xl mx-auto">
            <h1 className="text-3xl font-light text-white mb-2">Configurações</h1>
            <p className="text-slate-400 mb-8">Gerencie as preferências do sistema</p>

            <div className="bg-gradient-to-br from-slate-900 to-slate-800 rounded-3xl p-8 border border-slate-700/50 shadow-xl">
                <div className="space-y-8">
                    {/* General Settings */}
                    <div>
                        <h3 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
                            Geral
                        </h3>
                        <div className="space-y-4">
                            <div className="flex items-center justify-between p-4 bg-slate-950/30 rounded-xl border border-slate-700/30">
                                <div>
                                    <p className="text-white font-medium">Nome do Sistema</p>
                                    <p className="text-sm text-slate-500">Nome exibido no rodapé e emails</p>
                                </div>
                                <input
                                    type="text"
                                    defaultValue="CONTI"
                                    className="bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                                />
                            </div>
                        </div>
                    </div>

                    {/* Notification Settings */}
                    <div>
                        <h3 className="text-xl font-bold text-white mb-4">Notificações</h3>
                        <div className="space-y-3">
                            <label className="flex items-center justify-between p-4 bg-slate-950/30 rounded-xl border border-slate-700/30 cursor-pointer group">
                                <div>
                                    <p className="text-white font-medium group-hover:text-blue-400 transition-colors">Novos Pedidos</p>
                                    <p className="text-sm text-slate-500">Receber alerta quando entrar um pedido</p>
                                </div>
                                <div className="relative inline-flex items-center cursor-pointer">
                                    <input type="checkbox" className="sr-only peer" defaultChecked />
                                    <div className="w-11 h-6 bg-slate-700 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-800 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                                </div>
                            </label>

                            <label className="flex items-center justify-between p-4 bg-slate-950/30 rounded-xl border border-slate-700/30 cursor-pointer group">
                                <div>
                                    <p className="text-white font-medium group-hover:text-blue-400 transition-colors">Relatórios Semanais</p>
                                    <p className="text-sm text-slate-500">Receber resumo de vendas por email</p>
                                </div>
                                <div className="relative inline-flex items-center cursor-pointer">
                                    <input type="checkbox" className="sr-only peer" />
                                    <div className="w-11 h-6 bg-slate-700 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-800 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                                </div>
                            </label>
                        </div>
                    </div>

                    <div className="pt-4 border-t border-slate-700">
                        <button className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-xl font-bold transition-all shadow-lg shadow-blue-500/20 w-full sm:w-auto">
                            Salvar Alterações
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
