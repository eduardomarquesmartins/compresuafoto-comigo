import React from 'react';

interface ProposalCoverProps {
    clientName: string;
}

const ProposalCover: React.FC<ProposalCoverProps> = ({ clientName }) => {
    return (
        <div
            className="w-[210mm] h-[297mm] mx-auto bg-black flex flex-col items-center justify-start pt-[30mm] p-[20mm] relative overflow-hidden text-white"
            style={{ pageBreakAfter: 'always', breakAfter: 'page' }}
        >
            {/* Background decoration (logo gigante sutil) */}
            <div className="absolute inset-0 flex items-center justify-center opacity-[0.05] pointer-events-none">
                <span className="text-[180mm] font-light">&</span>
            </div>

            <div className="relative z-10 flex flex-col items-center text-center">
                <div className="flex flex-col items-center gap-6 mb-8">
                    {/* Logo Principal */}
                    <img src="/logo.png" alt="Logo" className="w-[80mm] h-auto object-contain mb-4" />

                    <div className="w-[40mm] h-1 bg-blue-500 mb-6"></div>

                    <h2 className="text-[10mm] font-bold uppercase tracking-[0.2em] text-white leading-none">
                        Proposta
                    </h2>
                    <h3 className="text-[7mm] font-light uppercase tracking-[0.4em] text-blue-500 mt-2">
                        Comercial
                    </h3>
                </div>

                <div className="mt-[50mm] text-center">
                    <p className="text-[4mm] text-slate-500 font-bold uppercase tracking-[0.3em] mb-3">Preparado exclusivamente para:</p>
                    <div className="px-10 py-4 border-2 border-blue-500/20 rounded-full inline-block">
                        <p className="text-[6mm] font-bold uppercase tracking-widest text-white leading-none">
                            {clientName || 'Cliente'}
                        </p>
                    </div>
                </div>
            </div>

            <div className="absolute bottom-[20mm] left-0 right-0 flex flex-col items-center gap-2">
                <div className="text-blue-500 text-[4mm] font-bold tracking-[0.5em] uppercase">& CONTI</div>
                <div className="text-slate-600 text-[3mm] uppercase tracking-[0.2em]">
                    {new Date().getFullYear()} &copy; Marketing Digital
                </div>
            </div>
        </div>
    );
};

export default ProposalCover;
