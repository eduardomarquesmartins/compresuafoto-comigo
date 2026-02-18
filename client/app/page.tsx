"use client";
import React from "react";
import { motion } from "framer-motion";
import { Camera, CreditCard, ScanFace, CheckCircle2, ArrowRight, Zap } from "lucide-react";
import Navbar from "@/components/Navbar";
import { useRouter } from "next/navigation";

export default function LandingPage() {
  const router = useRouter();

  const sections = [
    {
      icon: <Camera className="w-8 h-8 text-brand" />,
      title: "Sua Experiência & Conti",
      description: "Nós participamos dos maiores e melhores eventos, capturando cada detalhe com qualidade profissional. Este portal é o lugar oficial onde você encontra as fotos dessas participações especiais.",
      details: ["Cobertura profissional", "Eventos exclusivos", "Fotos em alta resolução"]
    },
    {
      icon: <ScanFace className="w-8 h-8 text-purple-500" />,
      title: "Busca Inteligente por IA",
      description: "Não perca tempo procurando em galerias infinitas. Nossa inteligência artificial identifica seu rosto e traz todas as suas fotos em segundos. Agilidade e praticidade para você.",
      details: ["Reconhecimento facial", "Busca instantânea", "Economize tempo real"]
    },
    {
      icon: <CreditCard className="w-8 h-8 text-blue-500" />,
      title: "Pagamento Facilitado",
      description: "Adquira suas fotos favoritas de forma rápida e segura. Oferecemos checkout integrado com opções modernas de pagamento para sua comodidade.",
      details: ["PIX Instantâneo", "Cartões de Crédito", "Download imediato após a compra"]
    }
  ];

  return (
    <main className="min-h-screen bg-background font-sans selection:bg-brand/10 selection:text-brand">
      <Navbar />

      <div className="pt-48 pb-20 px-6">
        <div className="container mx-auto max-w-5xl">


          {/* Top CTA (Hero) */}
          <div className="text-center mb-24">
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className="bg-brand text-white px-12 py-4 rounded-full text-lg font-normal shadow-xl shadow-brand/20 hover:bg-slate-900 transition-all flex items-center gap-3 mx-auto uppercase tracking-wider"
              onClick={() => router.push('/events')}
            >
              VER EVENTOS DISPONÍVEIS
              <ArrowRight className="w-5 h-5" />
            </motion.button>
            <h2 className="mt-6 text-slate-500 font-normal text-sm">
              Na & Conti Marketing Digital, tecnologia e inovação se unem para conectar <br /> você aos melhores momentos do evento que participou.
            </h2>
          </div>

          {/* AI Highlight Section (Middle) */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            className="relative bg-slate-900/90 backdrop-blur-3xl rounded-[3rem] p-10 md:p-16 overflow-hidden text-white border border-white/10 mb-24"
          >
            <div className="absolute top-0 right-0 w-1/2 h-full bg-gradient-to-l from-brand/20 to-transparent pointer-events-none" />
            <div className="relative z-10 flex flex-col md:flex-row items-center gap-12">
              <div className="flex-1">
                <div className="flex items-center gap-2 text-brand mb-4">
                  <Zap className="w-5 h-5 fill-brand" />
                  <span className="text-sm font-semibold uppercase tracking-widest">Tecnologia Exclusiva</span>
                </div>
                <h2 className="text-3xl md:text-4xl font-normal mb-6 uppercase tracking-tight">
                  Inteligência Artificial que <br />
                  <span className="text-brand">trabalha para você</span>
                </h2>
                <p className="text-slate-300 font-normal text-lg mb-8 leading-relaxed">
                  Nossa busca por IA elimina a necessidade de procurar imagem por imagem. Basta fazer o upload de uma selfie e nós encontramos todas as suas fotos instantaneamente em qualquer evento da & Conti.
                </p>
                <div className="flex flex-wrap gap-4">
                  <div className="flex items-center gap-3 px-5 py-3 bg-white/5 rounded-2xl border border-white/10">
                    <div className="text-3xl font-light text-brand">5s</div>
                    <div className="text-xs text-slate-300 font-medium uppercase tracking-tighter">Tempo Médio <br />de Busca</div>
                  </div>
                  <div className="flex items-center gap-3 px-5 py-3 bg-white/5 rounded-2xl border border-white/10">
                    <div className="text-3xl font-light text-brand">99%</div>
                    <div className="text-xs text-slate-300 font-medium uppercase tracking-tighter">Precisão de <br />Reconhecimento</div>
                  </div>
                </div>
              </div>
              <div className="flex-1 flex justify-center">
                <div className="relative w-64 h-64 md:w-80 md:h-80">
                  <div className="absolute inset-0 bg-brand/20 blur-[80px] rounded-full animate-pulse" />
                  <div className="relative bg-white/5 border border-white/10 rounded-[2.5rem] w-full h-full flex items-center justify-center backdrop-blur-3xl">
                    <ScanFace className="w-32 h-32 text-brand/80" />
                    <div className="absolute top-1/2 left-0 w-full h-0.5 bg-brand/50 shadow-[0_0_15px_rgba(var(--brand-rgb),0.5)] animate-scan" style={{ top: '20%' }} />
                  </div>
                </div>
              </div>
            </div>
          </motion.div>

          {/* Features Grid (Bottom) */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 pb-10">
            {sections.map((section, idx) => (
              <motion.div
                key={idx}
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.1 }}
                className="bg-white/[0.15] backdrop-blur-lg border border-white/30 p-8 rounded-[2.5rem] shadow-sm hover:shadow-brand/10 hover:bg-white/[0.25] transition-all duration-500 group"
              >
                <div className="p-4 bg-brand/5 rounded-2xl mb-6 w-fit group-hover:scale-110 transition-transform duration-300 border border-brand/10 shadow-sm">
                  {section.icon}
                </div>
                <h3 className="text-xl font-medium text-slate-900 mb-4 uppercase tracking-widest">{section.title}</h3>
                <p className="text-slate-600 font-normal mb-8 leading-relaxed">
                  {section.description}
                </p>
                <ul className="space-y-3">
                  {section.details.map((detail, dIdx) => (
                    <li key={dIdx} className="flex items-center gap-2 text-sm text-slate-500 font-normal uppercase tracking-tight">
                      <CheckCircle2 className="w-5 h-5 text-brand/40" />
                      {detail}
                    </li>
                  ))}
                </ul>
              </motion.div>
            ))}
          </div>
        </div>
      </div>

      <style jsx global>{`
                @keyframes scan {
                    0% { top: 10%; opacity: 0; }
                    50% { opacity: 1; }
                    100% { top: 90%; opacity: 0; }
                }
                .animate-scan {
                    animation: scan 3s linear infinite;
                    position: absolute;
                }
            `}</style>
    </main>
  );
}


