const puppeteer = require('puppeteer');
const { PDFDocument } = require('pdf-lib');
const fs = require('fs');
const path = require('path');

// Logo local — lido do disco uma vez, sem depender de rede
const LOGO_PATH = path.join(__dirname, '../../client/public/logo.png');
const LOGO_B64 = (() => {
    try {
        const buf = fs.readFileSync(LOGO_PATH);
        return `data:image/png;base64,${buf.toString('base64')}`;
    } catch {
        return null; // continua sem logo se o arquivo não existir
    }
})();

const CATEGORY_DESCRIPTIONS = {
    "Social Media": "Postagens Facebook e Instagram, organização de feed, análise de mercado, estratégia, designer (cards), copyright, pesquisa do mês através do forms, Trello para organização.",
    "Social Media + Audiovisual": "Postagens Facebook e Instagram, organização de feed, análise de mercado, estratégia, designer (cards), copyright, pesquisa do mês através do forms, Trello para organização, social media, + fotografias, vídeos e drone (uma vez ao mês) + cadastro Google meu negócio.",
    "Tráfego Pago": "Gestão estratégica de anúncios para maximizar alcance, leads e conversões através de plataformas de alta performance.",
    "Audiovisual / Fotos": "Produção de conteúdo visual de alto impacto, incluindo fotografia profissional e vídeos dinâmicos para plataformas digitais.",
    "Artes Adicionais": "Criação de identidades visuais e artes gráficas exclusivas para fortalecer a comunicação da sua marca."
};



/* ──────────────────────────────────────────────────────────
   Estilos base reutilizados em todos os HTMLs
────────────────────────────────────────────────────────── */
/* Estilos para capa e fechamento — margin:0 explícito (sem header/footer Puppeteer) */
const BASE_STYLES = `
    @page { size: A4 portrait; margin: 0; }
    * { box-sizing: border-box; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    body { margin: 0; padding: 0; font-family: 'Helvetica', Arial, sans-serif; background: white; }
    h1,h2,h3,h4,p { margin: 0; padding: 0; }
`;

/* Estilos para serviços — SEM @page margin para o Puppeteer margin.top funcionar */
const BASE_STYLES_SERVICES = `
    @page { size: A4 portrait; }
    * { box-sizing: border-box; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    body { margin: 0; padding: 0; font-family: 'Helvetica', Arial, sans-serif; background: white; }
    h1,h2,h3,h4,p { margin: 0; padding: 0; }
`;

/* ──────────────────────────────────────────────────────────
   HTML da CAPA
────────────────────────────────────────────────────────── */
const buildCoverHtml = (clientName, year) => `
<html><head><style>
    ${BASE_STYLES}
    body { background:#000; color:#fff; }
    .page { width:794px; height:1122px; overflow:hidden; display:flex; flex-direction:column;
            align-items:center; padding-top:60px; position:relative; text-align:center; }
    .centered { flex:1; display:flex; flex-direction:column; justify-content:center;
                align-items:center; margin-top:-60px; }
    .line { width:120px; height:4px; background:#2563eb; margin-bottom:30px; }
    .client-tag { display:inline-block; padding:10px 40px; border:1px solid rgba(37,99,235,0.4);
                  border-radius:50px; font-size:22px; font-weight:900; margin-top:15px; text-transform:uppercase; }
</style></head><body>
<div class="page">
    <div style="position:absolute;inset:0;display:flex;align-items:center;justify-content:center;
                opacity:0.05;font-size:500px;font-weight:100;color:white;pointer-events:none;">&amp;</div>
    ${LOGO_B64 ? `<img src="${LOGO_B64}" style="width:260px;margin-bottom:20px;" />` : ''}
    <div class="centered">
        <div class="line"></div>
        <h1 style="font-size:40px;font-weight:900;letter-spacing:6px;text-transform:uppercase;">Proposta</h1>
        <h2 style="font-size:24px;font-weight:300;letter-spacing:12px;color:#2563eb;text-transform:uppercase;margin-top:5px;">Comercial</h2>
        <div style="margin-top:120px;">
            <p style="font-size:14px;color:#94a3b8;font-weight:900;letter-spacing:3px;text-transform:uppercase;margin-bottom:10px;">
                Preparado exclusivamente para:</p>
            <div class="client-tag">${clientName || 'Cliente'}</div>
        </div>
    </div>
    <div style="position:absolute;bottom:60px;width:100%;text-align:center;">
        <div style="font-size:14px;font-weight:900;letter-spacing:4px;color:#2563eb;text-transform:uppercase;">&amp; CONTI</div>
        <div style="font-size:11px;color:#64748b;margin-top:8px;text-transform:uppercase;">${year} &copy; Marketing Digital</div>
    </div>
</div>
</body></html>`;

/* ──────────────────────────────────────────────────────────
   HTML dos SERVIÇOS
────────────────────────────────────────────────────────── */
const buildServicesHtml = (selectedServices, total) => {
    const groupedServices = selectedServices.reduce((acc, s) => {
        if (!acc[s.category]) acc[s.category] = [];
        acc[s.category].push(s);
        return acc;
    }, {});

    const categories = Object.entries(groupedServices);
    const servicesPdfHtml = categories.map(([category, items], idx) => {
        const isLast = idx === categories.length - 1;
        return `
        <div style="margin-bottom:28px;break-inside:avoid;">
            <div style="border-bottom:2px solid #000;padding-bottom:5px;margin-bottom:12px;">
                <h3 style="text-transform:uppercase;font-size:16px;color:#2563eb;">${category}</h3>
            </div>
            ${CATEGORY_DESCRIPTIONS[category]
                ? `<p style="font-style:italic;color:#64748b;font-size:12px;margin-bottom:12px;">${CATEGORY_DESCRIPTIONS[category]}</p>`
                : ''}
            <div style="margin-left:10px;">
                ${items.map(item => `
                <div style="display:flex;justify-content:space-between;margin-bottom:10px;">
                    <div style="flex:1;">
                        <div style="font-weight:bold;font-size:14px;">${item.name}</div>
                        ${item.description ? `<div style="font-size:11px;color:#94a3b8;">${item.description}</div>` : ''}
                    </div>
                    <div style="font-weight:bold;font-size:14px;white-space:nowrap;padding-left:20px;">
                        R$ ${item.price.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </div>
                </div>`).join('')}
            </div>
            ${isLast ? `
            <div style="display:flex;justify-content:flex-end;width:100%;margin-top:18px;">
                <div style="background:#fdfdfd;padding:15px 25px;text-align:right;border-radius:8px;
                            border-left:4px solid #2563eb;box-shadow:0 2px 4px rgba(0,0,0,0.05);display:inline-block;">
                    <span style="font-size:10px;text-transform:uppercase;color:#94a3b8;font-weight:900;
                                 letter-spacing:2px;display:block;margin-bottom:2px;">Investimento Total</span>
                    <span style="font-size:24px;color:#0f172a;font-weight:900;">
                        R$ ${total.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </span>
                </div>
            </div>` : ''}
        </div>`;
    }).join('');

    return `
<html><head><style>
    ${BASE_STYLES_SERVICES}
</style></head><body>
<div style="padding:30px 55px 40px;">
    <h3 style="font-size:24px;font-weight:900;color:#0f172a;margin-bottom:10px;">Seus Serviços</h3>
    <p style="font-size:14px;color:#64748b;margin-bottom:36px;">Confira abaixo o detalhamento estratégico do seu projeto.</p>
    ${servicesPdfHtml}
</div>
</body></html>`;
};

/* ──────────────────────────────────────────────────────────
   HTML do FECHAMENTO
────────────────────────────────────────────────────────── */
const buildClosingHtml = () => `
<html><head><style>
    ${BASE_STYLES}
    body { background:#fff; color:#0f172a; }
    .page { width:794px; height:1122px; overflow:hidden; display:flex; flex-direction:column;
            align-items:center; padding-top:80px; position:relative; text-align:center; }
    .centered { flex:1; display:flex; flex-direction:column; justify-content:center;
                align-items:center; margin-top:-60px; }
    .line { width:120px; height:4px; background:#2563eb; margin-top:20px; margin-bottom:30px; }
</style></head><body>
<div class="page">
    <div style="position:absolute;inset:0;display:flex;align-items:center;justify-content:center;
                opacity:0.03;font-size:400px;font-weight:900;pointer-events:none;">&amp;</div>
    ${LOGO_B64 ? `<img src="${LOGO_B64}" style="height:60px;filter:brightness(0);opacity:0.15;margin-bottom:30px;" />` : ''}
    <div class="centered">
        <h1 style="font-size:70px;font-weight:300;letter-spacing:-3px;">Obrigado!</h1>
        <div class="line"></div>
        <div style="background:#f8fafc;padding:25px 40px;border-radius:15px;border:1px solid #f1f5f9;
                    display:inline-block;margin:60px 0;">
            <p style="font-size:13px;color:#475569;text-transform:uppercase;letter-spacing:3px;font-weight:900;">
                PROPOSTA VÁLIDA POR 30 DIAS</p>
        </div>
        <div style="display:flex;flex-direction:column;align-items:center;margin-top:40px;">
            <div style="width:250px;height:1px;background:#e2e8f0;margin-bottom:25px;"></div>
            <span style="font-size:16px;font-weight:900;letter-spacing:1px;">EDUARDA CONTI &amp; FERNANDO</span>
            <span style="font-size:12px;color:#2563eb;font-weight:900;letter-spacing:3px;text-transform:uppercase;margin-top:5px;">
                CEOs &amp; Estrategistas</span>
        </div>
    </div>
    <div style="position:absolute;bottom:50px;width:100%;text-align:center;">
        <p style="font-size:10px;color:#cbd5e1;text-transform:uppercase;letter-spacing:4px;">
            Transformando Visão em Resultados Digitais</p>
    </div>
</div>
</body></html>`;

/* ──────────────────────────────────────────────────────────
   Helper: renderiza HTML → PDF buffer reutilizando a page
────────────────────────────────────────────────────────── */
async function renderPdf(browserPage, html, pdfOptions) {
    // 'domcontentloaded' não espera recursos externos (imagens CDN etc.)
    await browserPage.setContent(html, { waitUntil: 'domcontentloaded', timeout: 15000 });
    // Pequena pausa para garantir que o layout CSS foi aplicado
    await new Promise(r => setTimeout(r, 300));
    return browserPage.pdf(pdfOptions);
}

/* ──────────────────────────────────────────────────────────
   Header template do Puppeteer
────────────────────────────────────────────────────────── */
const buildHeaderTemplate = (dateStr) => `
<div style="width:100%;padding:16px 55px 10px;box-sizing:border-box;font-family:Helvetica,Arial,sans-serif;">
    <div style="display:flex;justify-content:space-between;align-items:center;
                border-bottom:1px solid #e2e8f0;padding-bottom:12px;">
        <div style="display:flex;align-items:center;gap:12px;">
            ${LOGO_B64
        ? `<img src="${LOGO_B64}" style="height:30px;filter:brightness(0);" />`
        : `<span style="font-size:13px;font-weight:900;color:#0f172a;letter-spacing:2px;">&amp; CONTI</span>`}
            <div style="width:1px;height:20px;background:#cbd5e1;"></div>
            <span style="font-size:10px;font-weight:900;letter-spacing:2px;color:#475569;text-transform:uppercase;">
                Proposta Comercial</span>
        </div>
        <div style="text-align:right;">
            <p style="font-size:9px;color:#94a3b8;font-weight:900;letter-spacing:1px;text-transform:uppercase;margin:0;">
                Investimento Detalhado</p>
            <p style="font-size:8px;color:#cbd5e1;margin:2px 0 0;">${dateStr}</p>
        </div>
    </div>
</div>`;

const FOOTER_TEMPLATE = `
<div style="width:100%;padding:8px 55px 12px;box-sizing:border-box;font-family:Helvetica,Arial,sans-serif;">
    <div style="border-top:1px solid #e2e8f0;padding-top:8px;text-align:center;">
        <div style="font-size:11px;font-weight:900;letter-spacing:4px;color:#2563eb;text-transform:uppercase;">
            &amp; CONTI</div>
        <div style="font-size:8px;color:#cbd5e1;text-transform:uppercase;letter-spacing:3px;margin-top:3px;">
            Transformando Visão em Resultados Digitais</div>
    </div>
</div>`;

/* ──────────────────────────────────────────────────────────
   Exportação principal
────────────────────────────────────────────────────────── */
exports.generatePDFBuffer = async (clientName, selectedServices, total) => {
    let browser;
    try {
        const dateStr = new Date().toLocaleDateString('pt-BR');
        const year = new Date().getFullYear();

        browser = await puppeteer.launch({
            headless: 'new',
            args: ['--no-sandbox', '--disable-setuid-sandbox']
        });
        const p = await browser.newPage();
        await p.setViewport({ width: 794, height: 1122, deviceScaleFactor: 1 });

        // ── 1) Capa (sem header/footer) ───────────────────────────────
        const coverBuf = await renderPdf(p, buildCoverHtml(clientName, year), {
            format: 'A4',
            printBackground: true,
            margin: { top: 0, bottom: 0, left: 0, right: 0 }
        });

        // ── 2) Serviços (header + footer em TODAS as páginas via Puppeteer) ──
        const servicesBuf = await renderPdf(p, buildServicesHtml(selectedServices, total), {
            format: 'A4',
            printBackground: true,
            displayHeaderFooter: true,
            headerTemplate: buildHeaderTemplate(dateStr),
            footerTemplate: FOOTER_TEMPLATE,
            margin: { top: '80px', bottom: '60px', left: '0', right: '0' }
        });

        // ── 3) Fechamento (sem header/footer) ─────────────────────────
        const closingBuf = await renderPdf(p, buildClosingHtml(), {
            format: 'A4',
            printBackground: true,
            margin: { top: 0, bottom: 0, left: 0, right: 0 }
        });

        // ── 4) Mescla com pdf-lib ──────────────────────────────────────
        const finalDoc = await PDFDocument.create();
        for (const buf of [coverBuf, servicesBuf, closingBuf]) {
            const src = await PDFDocument.load(buf);
            const pages = await finalDoc.copyPages(src, src.getPageIndices());
            pages.forEach(pg => finalDoc.addPage(pg));
        }

        return Buffer.from(await finalDoc.save());

    } catch (err) {
        console.error('[PDF SERVICE ERROR]:', err);
        throw err;
    } finally {
        if (browser) await browser.close();
    }
};

exports.CATEGORY_DESCRIPTIONS = CATEGORY_DESCRIPTIONS;
