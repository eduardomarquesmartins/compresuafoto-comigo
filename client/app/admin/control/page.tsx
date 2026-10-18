"use client";

import Link from "next/link";
import {
    Activity,
    ArrowRight,
    Briefcase,
    ClipboardCheck,
    FileSpreadsheet,
    Mail,
    MonitorPlay,
    ShieldAlert,
    Users,
    Wallet,
    type LucideIcon
} from "lucide-react";

const categories: {
    title: string;
    description: string;
    tone: string;
    icon: LucideIcon;
    items: { title: string; description: string; href: string; icon: LucideIcon }[];
}[] = [
    {
        title: "Operação",
        description: "Clientes e rotina comercial.",
        tone: "bg-sky-50 text-sky-700",
        icon: Briefcase,
        items: [
            { title: "Clientes", description: "Cadastre e acompanhe os clientes da empresa.", href: "/admin/clients", icon: Users },
            { title: "Comercial", description: "Acompanhe propostas, contratos e oportunidades.", href: "/admin/commercial", icon: Briefcase },
            { title: "E-mails", description: "Consulte e organize as comunicações da equipe.", href: "/admin/emails", icon: Mail },
            { title: "Apresentação", description: "Gerencie a apresentação institucional e comercial.", href: "/admin/presentation", icon: MonitorPlay }
        ]
    },
    {
        title: "Gestão",
        description: "Finanças, tarefas e acompanhamento da equipe.",
        tone: "bg-indigo-50 text-indigo-700",
        icon: Wallet,
        items: [
            { title: "Financeiro", description: "Registre receitas, despesas e cobranças.", href: "/admin/finance", icon: Wallet },
            { title: "Dívidas", description: "Acompanhe saldos, negociações e prioridades.", href: "/admin/debts", icon: ShieldAlert },
            { title: "Demandas", description: "Organize tarefas, responsáveis e prazos.", href: "/admin/demands", icon: ClipboardCheck },
            { title: "Colaboradores", description: "Gerencie a equipe e os serviços realizados.", href: "/admin/collaborators", icon: Users },
            { title: "Importações", description: "Envie e confira dados financeiros importados.", href: "/admin/imports", icon: FileSpreadsheet }
        ]
    },
    {
        title: "Ferramentas",
        description: "Recursos de apoio ao trabalho do time.",
        tone: "bg-violet-50 text-violet-700",
        icon: Activity,
        items: [
            { title: "KONTI", description: "Organize projetos e fluxos de trabalho.", href: "/konti", icon: Activity }
        ]
    }
];

export default function AdminControlPage() {
    return (
        <div className="w-full space-y-7 pb-12">
            <h1 className="text-3xl font-semibold tracking-[-0.045em] text-zinc-950 sm:text-[34px]">Escolha uma categoria</h1>

            <div className="space-y-8">
                {categories.map(category => (
                    <div key={category.title} className="space-y-3">
                        <div className="flex items-center gap-3 pb-1">
                            <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${category.tone}`}>
                                <category.icon aria-hidden="true" size={19} strokeWidth={1.8} />
                            </span>
                            <div>
                                <h2 className="text-lg font-semibold tracking-[-0.025em] text-zinc-900">{category.title}</h2>
                                <p className="mt-0.5 text-sm text-zinc-500">{category.description}</p>
                            </div>
                        </div>
                        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                            {category.items.map(item => (
                                <Link
                                    key={item.href}
                                    href={item.href}
                                    aria-label={`Abrir ${item.title}: ${item.description}`}
                                    className="group flex min-h-48 flex-col rounded-2xl border border-zinc-200 bg-white p-5 transition duration-200 hover:-translate-y-1 hover:border-blue-200 hover:shadow-[0_12px_30px_rgba(30,41,59,0.09)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0758d8] focus-visible:ring-offset-2"
                                >
                                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-zinc-100 text-zinc-600 transition group-hover:bg-blue-50 group-hover:text-[#0758d8]">
                                        <item.icon aria-hidden="true" size={19} strokeWidth={1.8} />
                                    </div>
                                    <h3 className="mt-4 text-base font-semibold text-zinc-950">{item.title}</h3>
                                    <p className="mt-1.5 text-sm leading-5 text-zinc-500">{item.description}</p>
                                    <ArrowRight aria-hidden="true" size={16} strokeWidth={1.8} className="mt-auto self-end text-[#0758d8] transition-transform group-hover:translate-x-1" />
                                </Link>
                            ))}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
