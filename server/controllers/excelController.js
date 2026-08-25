const xlsx = require('xlsx');
const prisma = require('../lib/prisma');

const parseExcelNumber = (val) => {
    if (val === undefined || val === null || val === '') return 0;
    if (typeof val === 'number') return val;
    const cleaned = String(val)
        .replace(/R\$\s?/g, '')
        .replace(/\./g, '')
        .replace(',', '.')
        .trim();
    const parsed = parseFloat(cleaned);
    return isNaN(parsed) ? 0 : parsed;
};

// Converte string de data DD/MM/AAAA para objeto Date
const parseExcelDate = (dateStr) => {
    if (!dateStr) return null;
    if (dateStr instanceof Date) return dateStr;
    const parts = String(dateStr).split('/');
    if (parts.length === 3) {
        const day = parseInt(parts[0]);
        const month = parseInt(parts[1]) - 1; // Mês base zero no JS
        const year = parseInt(parts[2]);
        if (!isNaN(day) && !isNaN(month) && !isNaN(year)) {
            return new Date(year, month, day);
        }
    }
    const parsed = Date.parse(dateStr);
    return isNaN(parsed) ? null : new Date(parsed);
};

exports.importExcel = async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: 'Nenhum arquivo enviado.' });
        }

        const workbook = xlsx.read(req.file.buffer, { type: 'buffer' });
        const requiredSheets = ['💸 Gastos Mai 2026', '💛 Dívidas CPF', '🏢 Dívidas CNPJ', '📌 Demandas Mentoria'];
        const missingSheets = requiredSheets.filter(sheetName => !workbook.Sheets[sheetName]);

        if (missingSheets.length > 0) {
            return res.status(422).json({
                error: `Planilha incompatível. Aba(s) obrigatória(s) ausente(s): ${missingSheets.join(', ')}. Nenhum dado foi alterado.`
            });
        }

        let summary;
        await prisma.$transaction(async (tx) => {

        // 1. Limpar tabelas existentes de Dívidas e Demandas para evitar duplicidade
        await tx.debt.deleteMany();
        await tx.mentoriaDemand.deleteMany();

        // 2. Limpar contratos para importação limpa de parceiros (clientes são preservados para evitar perda de dados financeiros)
        await tx.contract.deleteMany();

        // 3. Limpar registros financeiros apenas do mês de Maio de 2026
        const startDate = new Date(2026, 4, 1); // 01/05/2026
        const endDate = new Date(2026, 4, 31, 23, 59, 59); // 31/05/2026
        await tx.financialRecord.deleteMany({
            where: {
                date: {
                    gte: startDate,
                    lte: endDate
                }
            }
        });

        let importedClientsCount = 0;
        let importedContractsCount = 0;
        let importedGastosCount = 0;
        let importedDebtsCount = 0;
        let importedDemandsCount = 0;

        // Mapa para vincular lançamentos a clientes criados
        const clientMap = new Map();

        // 4. Processar aba: Parceiros
        const parceirosSheetName = workbook.SheetNames.find(n => n.includes('Parceiros'));
        if (parceirosSheetName) {
            const sheet = workbook.Sheets[parceirosSheetName];
            const rows = xlsx.utils.sheet_to_json(sheet, { header: 1 });

            // Os parceiros começam na linha 4 (índice 3)
            for (let i = 3; i < rows.length; i++) {
                const row = rows[i];
                if (!row || row.length < 2) continue;

                const idVal = row[0];
                const parceiroName = row[1] ? String(row[1]).trim() : '';
                const mensalidadeStr = row[2];
                const venctoStr = row[3];
                const inicioStr = row[4];
                const encerramentoStr = row[5];
                const contratoTipo = row[6] ? String(row[6]).trim() : '6 MESES';
                const statusStr = row[7] ? String(row[7]).trim() : 'ATIVO';
                const obs = row[8] ? String(row[8]).trim() : '';

                // Validar se é uma linha de parceiro válida
                if (!parceiroName || parceiroName.includes('TOTAL') || parceiroName.includes('GESTÃO') || isNaN(parseInt(idVal))) continue;

                // Gerar e-mail único para o cliente
                const emailSlug = parceiroName.toLowerCase()
                    .replace(/@/g, '')
                    .replace(/[\s,]+/g, '-')
                    .replace(/-+/g, '-')
                    .replace(/^-|-$/g, '');
                
                // A planilha não contém e-mail dos parceiros. Use um endereço interno que
                // não possa receber campanhas, em vez de inventar um e-mail real da empresa.
                const email = emailSlug ? `${emailSlug}-${idVal}@sem-email.local` : `cliente-${idVal}@sem-email.local`;

                // Status do cliente e do contrato (se obs contiver "CANCELOU", cancela)
                const isCancelled = obs.toUpperCase().includes('CANCELOU');
                const clientStatus = isCancelled ? 'INACTIVE' : (statusStr.toUpperCase() === 'ATIVO' ? 'ACTIVE' : 'INACTIVE');
                const contractStatus = isCancelled ? 'CANCELLED' : (statusStr.toUpperCase() === 'ATIVO' ? 'ACTIVE' : 'EXPIRED');

                // Cadastrar/atualizar cliente
                const existingClient = await tx.client.findUnique({ where: { email } });
                let client;
                if (existingClient) {
                    client = await tx.client.update({
                        where: { id: existingClient.id },
                        data: {
                            name: parceiroName,
                            status: clientStatus,
                            address: obs || null
                        }
                    });
                } else {
                    client = await tx.client.create({
                        data: {
                            name: parceiroName,
                            email: email,
                            status: clientStatus,
                            address: obs || null
                        }
                    });
                }
                importedClientsCount++;

                // Mapear nome inteiro e sub-nomes para vincular lançamentos depois
                clientMap.set(parceiroName.toLowerCase().trim(), client.id);
                // Dividir por vírgula, " e ", "&" ou espaço
                const names = parceiroName.split(/\s*,\s*|\s+e\s+|\s*&\s+|\s+/);
                names.forEach(n => {
                    const cleanN = n.trim().toLowerCase();
                    if (cleanN && cleanN.startsWith('@') && cleanN.length > 2) {
                        clientMap.set(cleanN, client.id);
                    }
                });

                // Cadastrar contrato do cliente
                const monthlyValue = parseExcelNumber(mensalidadeStr);
                const paymentDay = parseInt(venctoStr) || 25;
                
                let durationMonths = 6;
                if (contratoTipo.toUpperCase().includes('ANUAL')) {
                    durationMonths = 12;
                } else {
                    const match = contratoTipo.match(/(\d+)\s*MESES/i);
                    if (match) {
                        durationMonths = parseInt(match[1]);
                    }
                }

                const startDate = parseExcelDate(inicioStr) || new Date();
                const endDate = parseExcelDate(encerramentoStr);

                await tx.contract.create({
                    data: {
                        clientId: client.id,
                        scope: `Prestação de serviços de marketing digital e gestão de redes sociais para ${parceiroName}, conforme vigência de ${contratoTipo}.`,
                        monthlyValue: monthlyValue,
                        durationMonths: durationMonths,
                        paymentDay: paymentDay,
                        startDate: startDate,
                        endDate: endDate,
                        status: contractStatus,
                        contractDate: String(inicioStr || new Date().toLocaleDateString('pt-BR'))
                    }
                });
                importedContractsCount++;
            }
        }

        const helperFindClientId = (description) => {
            if (!description) return null;
            const descLower = description.toLowerCase().trim();
            for (const [key, clientId] of clientMap.entries()) {
                if (descLower.includes(key)) {
                    return clientId;
                }
            }
            return null;
        };

        const recordsToInsert = [];

        // 5. Processar aba: 💸 Gastos Mai 2026
        const gastosSheet = workbook.Sheets['💸 Gastos Mai 2026'];
        if (gastosSheet) {
            const rows = xlsx.utils.sheet_to_json(gastosSheet, { header: 1 });

            // Os lançamentos reais iniciam na linha 11 (índice 10)
            for (let i = 10; i < rows.length; i++) {
                const row = rows[i];
                if (!row || row.length === 0) continue;

                const day = parseInt(row[0]);
                const description = row[1];
                const category = row[2];
                const account = row[3];
                const entradaVal = parseExcelNumber(row[4]);
                const saidaVal = parseExcelNumber(row[5]);
                const obs = row[6] ? String(row[6]).trim() : '';

                // Validar se é uma linha de transação válida
                if (isNaN(day) || !description || (!entradaVal && !saidaVal)) continue;

                // Não importar cabeçalhos extras que possam estar no meio
                if (String(description).includes('DESCRIÇÃO') || String(category).includes('CATEGORIA')) continue;

                const date = new Date(2026, 4, day); // Maio de 2026
                const type = entradaVal > 0 ? 'INCOME' : 'EXPENSE';
                const amount = entradaVal > 0 ? entradaVal : saidaVal;
                const descStr = String(description).trim();

                recordsToInsert.push({
                    type,
                    description: descStr,
                    amount,
                    date,
                    category: category ? String(category).trim() : 'Outros',
                    account: account ? String(account).trim() : 'SALDO',
                    status: 'PAID', // Gastos ocorridos
                    obs,
                    clientId: helperFindClientId(descStr)
                });
            }
        }

        // 6. Processar aba: MAI 2026 (Lançamentos Corporativos e Pessoais)
        const maiSheetName = workbook.SheetNames.find(n => n.includes('MAI 2026'));
        if (maiSheetName) {
            const sheet = workbook.Sheets[maiSheetName];
            const rows = xlsx.utils.sheet_to_json(sheet, { header: 1 });
            
            let isEmpresaSection = false;
            let isPessoalSection = false;

            for (let i = 0; i < rows.length; i++) {
                const row = rows[i];
                if (!row || row.length === 0) continue;

                const firstCell = String(row[0] || '').trim();

                // Divisores de total/saldo resetam a seção
                if (firstCell.includes('TOTAL') || firstCell.includes('SALDO') || firstCell === '—') {
                    isEmpresaSection = false;
                    isPessoalSection = false;
                    continue;
                }

                // Detectar seções
                if (firstCell.includes('EMPRESA') && !firstCell.includes('TOTAL') && !firstCell.includes('SALDO')) {
                    isEmpresaSection = true;
                    isPessoalSection = false;
                    continue;
                }

                if (firstCell.includes('PESSOAL') && !firstCell.includes('TOTAL') && !firstCell.includes('SALDO')) {
                    isEmpresaSection = false;
                    isPessoalSection = true;
                    continue;
                }

                // Pular cabeçalhos DIA
                if (firstCell === 'DIA') continue;

                if (isEmpresaSection || isPessoalSection) {
                    const dayStr = String(row[0]).trim();
                    const day = parseInt(dayStr);
                    const description = row[1] ? String(row[1]).trim() : '';
                    const entradaVal = parseExcelNumber(row[2]);
                    const saidaVal = parseExcelNumber(row[3]);
                    const status = row[4] ? String(row[4]).trim() : '';
                    const category = row[5] ? String(row[5]).trim() : '';
                    const obs = row[6] ? String(row[6]).trim() : '';

                    if (!description || (!entradaVal && !saidaVal)) continue;

                    const date = new Date(2026, 4, isNaN(day) ? 15 : day);
                    const type = entradaVal > 0 ? 'INCOME' : 'EXPENSE';
                    const amount = entradaVal > 0 ? entradaVal : saidaVal;

                    recordsToInsert.push({
                        type,
                        description,
                        amount,
                        date,
                        category: category || (isEmpresaSection ? 'Empresa Outros' : 'Pessoal Outros'),
                        account: isEmpresaSection ? 'CORA & CONTI' : 'SICRED EDUARDA',
                        status: status.toUpperCase() === 'OK' ? 'PAID' : 'PENDING',
                        obs,
                        clientId: helperFindClientId(description)
                    });
                }
            }
        }

        // Inserir todos os lançamentos financeiros acumulados
        if (recordsToInsert.length > 0) {
            await tx.financialRecord.createMany({
                data: recordsToInsert
            });
            importedGastosCount = recordsToInsert.length;
        }

        // 7. Processar aba: 💛 Dívidas CPF
        const dividasCpfSheet = workbook.Sheets['💛 Dívidas CPF'];
        if (dividasCpfSheet) {
            const rows = xlsx.utils.sheet_to_json(dividasCpfSheet, { header: 1 });
            const debtsToInsert = [];

            // Começa na linha 5 (índice 4)
            for (let i = 4; i < rows.length; i++) {
                const row = rows[i];
                if (!row || row.length < 2) continue;

                const priority = row[0] ? String(row[0]).trim() : '';
                const credor = row[1] ? String(row[1]).trim() : '';
                const titular = row[2] ? String(row[2]).trim() : '';
                const valorOriginal = parseExcelNumber(row[3]);
                const melhorOferta = parseExcelNumber(row[4]);
                const tipo = row[5] ? String(row[5]).trim() : '';
                const status = row[6] ? String(row[6]).trim() : '';
                const obs = row[7] ? String(row[7]).trim() : '';

                if (!credor || (!valorOriginal && !melhorOferta)) continue;

                debtsToInsert.push({
                    priority,
                    creditor: credor,
                    holder: titular,
                    originalAmount: valorOriginal,
                    bestOffer: melhorOferta,
                    type: tipo || 'Outros',
                    status: status || 'Pendente',
                    obs,
                    isCnpj: false
                });
            }

            if (debtsToInsert.length > 0) {
                await tx.debt.createMany({
                    data: debtsToInsert
                });
                importedDebtsCount += debtsToInsert.length;
            }
        }

        // 8. Processar aba: 🏢 Dívidas CNPJ
        const dividasCnpjSheet = workbook.Sheets['🏢 Dívidas CNPJ'];
        if (dividasCnpjSheet) {
            const rows = xlsx.utils.sheet_to_json(dividasCnpjSheet, { header: 1 });
            const debtsToInsert = [];

            // Começa na linha 15 (índice 14)
            for (let i = 14; i < rows.length; i++) {
                const row = rows[i];
                if (!row || row.length < 3) continue;

                const cnpjVal = row[0] ? String(row[0]).trim() : '';
                const empresa = row[1] ? String(row[1]).trim() : '';
                const item = row[2] ? String(row[2]).trim() : '';
                const valor = parseExcelNumber(row[3]);
                const vencimento = row[4] ? String(row[4]).trim() : '';
                const status = row[5] ? String(row[5]).trim() : '';
                const obs = row[6] ? String(row[6]).trim() : '';

                if (!item || !valor) continue;
                if (String(cnpjVal).includes('CNPJ') || String(empresa).includes('EMPRESA')) continue;

                debtsToInsert.push({
                    priority: cnpjVal,
                    creditor: item,
                    holder: empresa,
                    originalAmount: valor,
                    bestOffer: valor,
                    type: 'Fiscal/Contratual',
                    status: status || 'A vencer',
                    obs: `CNPJ do devedor: ${cnpjVal}. Vencimento: ${vencimento}. ${obs}`,
                    isCnpj: true
                });
            }

            if (debtsToInsert.length > 0) {
                await tx.debt.createMany({
                    data: debtsToInsert
                });
                importedDebtsCount += debtsToInsert.length;
            }
        }

        // 9. Processar aba: 📌 Demandas Mentoria
        const demandasSheet = workbook.Sheets['📌 Demandas Mentoria'];
        if (demandasSheet) {
            const rows = xlsx.utils.sheet_to_json(demandasSheet, { header: 1 });
            const demandsToInsert = [];

            // Começa na linha 4 (índice 3)
            for (let i = 3; i < rows.length; i++) {
                const row = rows[i];
                if (!row || row.length < 2) continue;

                const area = row[0] ? String(row[0]).trim() : '';
                const acao = row[1] ? String(row[1]).trim() : '';
                const prazo = row[2] ? String(row[2]).trim() : '';
                const responsavel = row[3] ? String(row[3]).trim() : '';
                const status = row[4] ? String(row[4]).trim() : '';
                const tipo = row[5] ? String(row[5]).trim() : '';
                const obs = row[6] ? String(row[6]).trim() : '';

                if (!acao) continue;
                if (String(area).includes('ÁREA') || String(acao).includes('AÇÃO')) continue;

                demandsToInsert.push({
                    area,
                    action: acao,
                    deadline: prazo,
                    responsible: responsavel || 'Ambos',
                    status: status || 'Pendente',
                    type: tipo,
                    obs
                });
            }

            if (demandsToInsert.length > 0) {
                await tx.mentoriaDemand.createMany({
                    data: demandsToInsert
                });
                importedDemandsCount = demandsToInsert.length;
            }
        }

        summary = {
                clients: importedClientsCount,
                contracts: importedContractsCount,
                incomesAndExpenses: importedGastosCount,
                debts: importedDebtsCount,
                mentoriaDemands: importedDemandsCount
        };
        });

        res.json({
            message: 'Planilha importada com sucesso!',
            summary
        });

    } catch (err) {
        console.error('[IMPORT EXCEL ERROR]:', err);
        res.status(500).json({ error: 'Erro ao processar e importar planilha: ' + err.message });
    }
};
