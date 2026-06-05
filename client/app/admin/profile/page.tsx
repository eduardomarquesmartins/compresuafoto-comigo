"use client";

export default function ProfilePage() {
    return (
        <div className="mx-auto max-w-4xl">
            <h1 className="mb-2 text-3xl font-light text-white">Meu Perfil</h1>
            <p className="mb-8 text-slate-400">Gerencie suas informações pessoais</p>

            <div className="rounded-3xl border border-slate-700/50 bg-gradient-to-br from-slate-900 to-slate-800 p-8 shadow-xl">
                <h3 className="mb-6 text-xl font-bold text-white">Informacoes Basicas</h3>

                <form className="space-y-6">
                    <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                        <div>
                            <label className="mb-2 block text-sm font-medium text-slate-300">Nome</label>
                            <input
                                type="text"
                                defaultValue="Administrador"
                                className="w-full rounded-xl border border-slate-700 bg-slate-950/50 p-3 text-white outline-none transition-colors focus:border-blue-500"
                            />
                        </div>

                        <div>
                            <label className="mb-2 block text-sm font-medium text-slate-300">Sobrenome</label>
                            <input
                                type="text"
                                defaultValue="Sistema"
                                className="w-full rounded-xl border border-slate-700 bg-slate-950/50 p-3 text-white outline-none transition-colors focus:border-blue-500"
                            />
                        </div>
                    </div>

                    <div>
                        <label className="mb-2 block text-sm font-medium text-slate-300">Email</label>
                        <input
                            type="email"
                            defaultValue="admin@conti.com"
                            className="w-full rounded-xl border border-slate-700 bg-slate-950/50 p-3 text-white outline-none transition-colors focus:border-blue-500"
                        />
                    </div>

                    <div className="border-t border-slate-700 pt-4">
                        <h3 className="mb-4 text-lg font-bold text-white">Alterar Senha</h3>
                        <div className="space-y-4">
                            <input
                                type="password"
                                placeholder="Senha Atual"
                                className="w-full rounded-xl border border-slate-700 bg-slate-950/50 p-3 text-white outline-none transition-colors focus:border-blue-500"
                            />
                            <input
                                type="password"
                                placeholder="Nova Senha"
                                className="w-full rounded-xl border border-slate-700 bg-slate-950/50 p-3 text-white outline-none transition-colors focus:border-blue-500"
                            />
                        </div>
                    </div>

                    <button className="rounded-xl bg-blue-600 px-6 py-3 font-bold text-white shadow-lg shadow-blue-500/20 transition-all hover:bg-blue-700">
                        Salvar Perfil
                    </button>
                </form>
            </div>
        </div>
    );
}
