import React from 'react';

interface SelectedService {
    id: string;
    category: string;
    name: string;
    price: number;
    description?: string;
}

interface ProposalServicesProps {
    selectedServices: SelectedService[];
    subtotal: number;
    total: number;
}

const CATEGORY_DESCRIPTIONS: Record<string, string> = {
    "Social Media": "Postagens Facebook e Instagram, organização de feed, análise de mercado, estratégia, designer (cards), copyright, pesquisa do mês através do forms, Trello para organização.",
    "Social Media + Audiovisual": "Postagens Facebook e Instagram, organização de feed, análise de mercado, estratégia, designer (cards), copyright, pesquisa do mês através do forms, Trello para organização, social media, + fotografias, vídeos e drone (uma vez ao mês) + cadastro Google meu negócio.",
    "Tráfego Pago": "Gestão estratégica de anúncios para maximizar alcance, leads e conversões através de plataformas de alta performance.",
    "Audiovisual / Fotos": "Produção de conteúdo visual de alto impacto, incluindo fotografia profissional e vídeos dinâmicos para plataformas digitais.",
    "Artes Adicionais": "Criação de identidades visuais e artes gráficas exclusivas para fortalecer a comunicação da sua marca."
};

const ProposalServices: React.FC<ProposalServicesProps> = ({ selectedServices, subtotal, total }) => {
    // Agrupar serviços por categoria
    const groupedServices = selectedServices.reduce((acc, service) => {
        if (!acc[service.category]) {
            acc[service.category] = [];
        }
        acc[service.category].push(service);
        return acc;
    }, {} as Record<string, SelectedService[]>);

    return (
        <div
            className="w-[210mm] min-h-[297mm] mx-auto bg-white p-[20mm] relative flex flex-col text-black"
            style={{ pageBreakAfter: 'always', breakAfter: 'page' }}
        >
            {/* Header da Página de Serviços */}
            <div className="grid grid-cols-3 items-center mb-[15mm] border-b-2 border-slate-100 pb-6">
                <div className="flex items-center justify-start">
                    <img src="/logo.png" alt="Logo" className="h-[10mm] w-auto brightness-0" />
                </div>
                <div className="flex justify-center text-center">
                    <span className="text-[3.5mm] font-bold tracking-[0.35em] text-slate-800 uppercase whitespace-nowrap">Proposta Comercial</span>
                </div>
                <div className="text-right flex justify-end">
                    <p className="text-[2.5mm] text-slate-300 uppercase font-medium">{new Date().toLocaleDateString('pt-BR')}</p>
                </div>
            </div>

            <div className="flex-1 flex flex-col">
                <div className="mb-[8mm]">
                    <p className="text-slate-500 text-[4mm] font-medium">Confira abaixo os detalhes da sua proposta.</p>
                </div>

                <div className="w-full">
                    {Object.entries(groupedServices).map(([category, services], catIndex) => (
                        <div key={catIndex} className="mb-10 break-inside-avoid">
                            <div className="border-b-2 border-slate-900 pb-2 mb-4">
                                <h4 className="text-[4mm] font-black text-blue-600 uppercase tracking-[0.2em]">{category}</h4>
                            </div>

                            {CATEGORY_DESCRIPTIONS[category] && (
                                <p className="text-[3.2mm] text-slate-500 mb-6 leading-relaxed italic border-l-2 border-slate-200 pl-4">
                                    {CATEGORY_DESCRIPTIONS[category]}
                                </p>
                            )}

                            <div className="space-y-4">
                                {services.map((service, index) => (
                                    <div key={index} className="flex justify-between items-start py-4 border-b border-slate-100">
                                        <div className="flex-1">
                                            <p className="text-[4mm] text-slate-900 font-bold tracking-tight">{service.name}</p>
                                            {service.description && (
                                                <p className="text-[3mm] text-slate-400 mt-0.5 leading-tight">
                                                    {service.description}
                                                </p>
                                            )}
                                        </div>
                                        <div className="text-right ml-4">
                                            <p className="text-[4.5mm] font-bold text-slate-900 font-mono">
                                                <span className="text-[3mm] font-semibold text-slate-400 mr-2">R$</span>
                                                {service.price.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                            </p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    ))}
                </div>

                {/* Bloco de Total */}
                <div className="mt-auto bg-blue-50 border-2 border-blue-100 p-[10mm] rounded-3xl space-y-4 break-inside-avoid">
                    <div className="flex justify-between items-center gap-6 pb-4 border-b border-blue-100">
                        <div className="flex flex-col text-left">
                            <span className="text-[3.5mm] uppercase tracking-[0.2em] text-blue-600 font-bold mb-1">Subtotal dos serviços</span>
                            <span className="text-[4mm] text-slate-500 font-medium tracking-tight">Soma automática dos itens selecionados</span>
                        </div>
                        <div className="text-right">
                            <span className="text-[8mm] font-bold text-slate-900 leading-none font-mono tracking-tighter">
                                R$ {subtotal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                            </span>
                        </div>
                    </div>
                    <div className="flex justify-between items-center gap-6">
                        <div className="flex flex-col text-left">
                            <span className="text-[3.5mm] uppercase tracking-[0.2em] text-blue-600 font-bold mb-1">Total final da proposta</span>
                            <span className="text-[4mm] text-slate-500 font-medium tracking-tight">Valor que será salvo, enviado e gerado no PDF</span>
                        </div>
                        <div className="text-right">
                            <span className="text-[12mm] font-bold text-slate-900 leading-none font-mono tracking-tighter">
                                R$ {total.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                            </span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Rodapé da página de valores */}
            <div className="mt-10 pt-10 border-t border-slate-100 text-[3mm] text-slate-400 text-left grid grid-cols-2 gap-10">
                <div className="space-y-1">
                    <p className="font-bold text-slate-500 mb-2 uppercase tracking-wider">Notas Importantes:</p>
                    <p className="leading-relaxed">* Os valores contemplam os serviços selecionados acima.</p>
                    <p className="leading-relaxed">* Eventuais custos externos (anúncios, taxas) não estão inclusos.</p>
                </div>
                <div className="flex flex-col justify-end items-end italic opacity-50">
                    <p>& CONTI Marketing Digital</p>
                    <p>www.econticomigo.com.br</p>
                </div>
            </div>
        </div>
    );
};

export default ProposalServices;
