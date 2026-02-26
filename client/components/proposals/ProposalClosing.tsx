import React from 'react';

const ProposalClosing: React.FC = () => {
    return (
        <div
            className="w-[210mm] h-[297mm] mx-auto bg-white p-[20mm] pt-[30mm] relative flex flex-col items-center justify-start text-center text-black"
            style={{ pageBreakAfter: 'avoid', breakAfter: 'auto' }}
        >
            <div className="absolute inset-0 flex items-center justify-center opacity-[0.03] pointer-events-none text-black">
                <span className="text-[150mm] font-black leading-none">&</span>
            </div>

            <img src="/logo.png" alt="Logo" className="h-[20mm] w-auto brightness-0 opacity-10 mb-10" />

            <div className="space-y-4 mb-16 relative z-10">
                <h1 className="text-[25mm] font-light text-slate-900 tracking-tighter leading-none">
                    Obrigado!
                </h1>
                <div className="w-24 h-1 bg-blue-500 mx-auto"></div>

            </div>

            <div className="bg-slate-50 px-10 py-6 rounded-2xl relative z-10 border border-slate-100 mb-20">
                <p className="text-[4.5mm] text-slate-600 uppercase tracking-[0.3em] font-bold">
                    PROPOSTA VÁLIDA POR 30 DIAS
                </p>
                <p className="text-[3mm] text-slate-400 mt-2 uppercase tracking-widest font-medium">
                    Sujeito a disponibilidade de agenda após este período
                </p>
            </div>

            <div className="mt-[20mm] flex flex-col items-center gap-12 relative z-10">
                <div className="flex flex-col items-center">
                    <div className="w-[80mm] h-px bg-slate-200 mb-6"></div>
                    <span className="text-[3.5mm] font-bold text-slate-900 uppercase tracking-[0.2em] mb-1">EDUARDA CONTI & FERNANDO</span>
                    <span className="text-[2.5mm] text-blue-500 font-bold uppercase tracking-[0.3em]">CEOs & Estrategistas</span>
                    <span className="text-[2.5mm] text-slate-400 uppercase tracking-widest mt-1">& CONTI Marketing Digital</span>
                </div>
            </div>

            <div className="absolute bottom-[20mm] w-full flex justify-center text-[2.5mm] text-slate-300 uppercase tracking-[0.4em] font-medium">
                Transformando Visão em Resultados Digitais
            </div>
        </div>
    );
};

export default ProposalClosing;
