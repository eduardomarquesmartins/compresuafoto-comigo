const prisma = require('../lib/prisma');
const path = require('path');
const collaboratorContractService = require('../services/collaboratorContractService');
const collaboratorReceiptService = require('../services/collaboratorReceiptService');

const collaboratorRoles = ['DESIGNER', 'DEMANDAS'];
const validRole = (role) => collaboratorRoles.includes(role);
const profileToServiceRole = (user) => user.role === 'COLLABORATOR' ? (user.collaboratorProfile === 'COMPANY_DEMANDS' ? 'DEMANDAS' : 'DESIGNER') : user.role;

exports.getMyPortal = async (req, res) => {
    try {
        const services = await prisma.serviceDefinition.findMany({ where: { role: profileToServiceRole(req.user), active: true, OR: [{ collaboratorId: req.user.userId }, { collaboratorId: null }] }, orderBy: { name: 'asc' } });
        const completions = await prisma.serviceCompletion.findMany({
            where: { collaboratorId: req.user.userId }, include: { service: true }, orderBy: { completedAt: 'desc' }
        });
        const pendingTotal = completions.filter(item => item.paymentStatus === 'PENDING').reduce((total, item) => total + item.totalValue, 0);
        res.json({ services, completions, pendingTotal });
    } catch (error) { console.error('[COLLABORATOR PORTAL]', error); res.status(500).json({ error: 'Erro ao carregar portal do colaborador' }); }
};

exports.createCompletion = async (req, res) => {
    try {
        const serviceId = Number(req.body.serviceId);
        const quantity = Math.max(1, Number(req.body.quantity) || 1);
        const service = await prisma.serviceDefinition.findFirst({ where: { id: serviceId, role: profileToServiceRole(req.user), active: true, OR: [{ collaboratorId: req.user.userId }, { collaboratorId: null }] } });
        if (!service) return res.status(400).json({ error: 'Serviço indisponível para este acesso' });
        const completion = await prisma.serviceCompletion.create({ data: {
            serviceId: service.id, collaboratorId: req.user.userId, quantity, unitValue: service.value,
            totalValue: service.value * quantity, notes: String(req.body.notes || '').trim() || null,
            completedAt: req.body.completedAt ? new Date(req.body.completedAt) : new Date()
        }, include: { service: true } });
        res.status(201).json(completion);
    } catch (error) { console.error('[COLLABORATOR COMPLETION]', error); res.status(500).json({ error: 'Erro ao registrar serviço realizado' }); }
};

exports.deleteMyCompletion = async (req, res) => {
    try {
        const completion = await prisma.serviceCompletion.findFirst({
            where: { id: Number(req.params.id), collaboratorId: req.user.userId }
        });
        if (!completion) return res.status(404).json({ error: 'Lançamento não encontrado' });
        if (completion.paymentStatus !== 'PENDING') return res.status(400).json({ error: 'Lançamentos pagos não podem ser removidos' });
        await prisma.serviceCompletion.delete({ where: { id: completion.id } });
        res.json({ message: 'Lançamento removido' });
    } catch (error) {
        console.error('[DELETE COLLABORATOR COMPLETION]', error);
        res.status(500).json({ error: 'Erro ao remover lançamento' });
    }
};

exports.downloadMyReceipt = async (req, res) => {
    try {
        const competence = String(req.query.competence || '');
        if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(competence)) return res.status(400).json({ error: 'Informe uma competencia valida' });
        const [year, month] = competence.split('-').map(Number);
        const start = new Date(year, month - 1, 1);
        const end = new Date(year, month, 1);
        const [collaborator, completions] = await Promise.all([
            prisma.user.findUnique({ where: { id: req.user.userId }, select: { name: true, fullName: true, email: true } }),
            prisma.serviceCompletion.findMany({ where: { collaboratorId: req.user.userId, completedAt: { gte: start, lt: end } }, include: { service: true }, orderBy: { completedAt: 'asc' } })
        ]);
        if (!collaborator || !completions.length) return res.status(400).json({ error: 'Nao ha servicos registrados nesta competencia' });
        const pdf = await collaboratorReceiptService.generateReceiptBuffer({ collaborator, competence, completions });
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename=recibo-servicos-${competence}.pdf`);
        res.send(pdf);
    } catch (error) { console.error('[DOWNLOAD COLLABORATOR RECEIPT]', error); res.status(500).json({ error: 'Erro ao gerar o recibo de servicos' }); }
};

exports.getAdminOverview = async (_req, res) => {
    try {
        const [collaborators, services, completions] = await Promise.all([
            prisma.user.findMany({ where: { OR: [{ role: { in: collaboratorRoles } }, { role: 'COLLABORATOR' }] }, select: { id: true, name: true, fullName: true, email: true, role: true, collaboratorProfile: true, createdAt: true }, orderBy: { name: 'asc' } }),
            prisma.serviceDefinition.findMany({ include: { collaborator: { select: { id: true, name: true, fullName: true, email: true, collaboratorProfile: true } } }, orderBy: [{ role: 'asc' }, { name: 'asc' }] }),
            prisma.serviceCompletion.findMany({ include: { service: true, collaborator: { select: { id: true, name: true, fullName: true, email: true, role: true } } }, orderBy: { completedAt: 'desc' } })
        ]);
        res.json({ collaborators, services, completions });
    } catch (error) { console.error('[COLLABORATOR ADMIN]', error); res.status(500).json({ error: 'Erro ao carregar colaboradores' }); }
};

exports.createService = async (req, res) => {
    try {
        const { name, description, collaboratorId } = req.body;
        const collaborator = await prisma.user.findUnique({ where: { id: Number(collaboratorId) }, select: { id: true, role: true, collaboratorProfile: true } });
        const role = collaborator?.collaboratorProfile === 'COMPANY_DEMANDS' ? 'DEMANDAS' : collaborator?.collaboratorProfile === 'DESIGNER' ? 'DESIGNER' : null;
        const value = Number(req.body.value);
        if (!name || !collaborator || collaborator.role !== 'COLLABORATOR' || !validRole(role) || !Number.isFinite(value) || value < 0) return res.status(400).json({ error: 'Informe colaborador, nome e valor válido' });
        res.status(201).json(await prisma.serviceDefinition.create({ data: { name: String(name).trim(), description: String(description || '').trim() || null, role, value, collaboratorId: collaborator.id } }));
    } catch (error) { console.error('[CREATE COLLABORATOR SERVICE]', error); res.status(500).json({ error: 'Erro ao criar serviço' }); }
};

exports.updateService = async (req, res) => {
    try {
        const data = {};
        ['name', 'description', 'active'].forEach(key => { if (req.body[key] !== undefined) data[key] = req.body[key]; });
        if (req.body.value !== undefined) data.value = Number(req.body.value);
        res.json(await prisma.serviceDefinition.update({ where: { id: Number(req.params.id) }, data }));
    } catch (error) { console.error('[UPDATE COLLABORATOR SERVICE]', error); res.status(500).json({ error: 'Erro ao atualizar serviço' }); }
};

exports.markPaid = async (req, res) => {
    try { res.json(await prisma.serviceCompletion.update({ where: { id: Number(req.params.id) }, data: { paymentStatus: 'PAID', paidAt: new Date() } })); }
    catch (error) { console.error('[PAY COLLABORATOR SERVICE]', error); res.status(500).json({ error: 'Erro ao confirmar pagamento' }); }
};

exports.createAdminCompletion = async (req, res) => {
    try {
        const collaboratorId = Number(req.body.collaboratorId);
        const serviceId = Number(req.body.serviceId);
        const quantity = Math.max(1, Number(req.body.quantity) || 1);
        const collaborator = await prisma.user.findUnique({ where: { id: collaboratorId }, select: { id: true, role: true, collaboratorProfile: true } });
        if (!collaborator || collaborator.role !== 'COLLABORATOR') return res.status(400).json({ error: 'Colaborador inválido' });
        const service = await prisma.serviceDefinition.findFirst({ where: { id: serviceId, collaboratorId, active: true } });
        if (!service) return res.status(400).json({ error: 'Selecione um serviço ativo deste colaborador' });
        const completedAt = new Date(req.body.completedAt);
        if (Number.isNaN(completedAt.getTime())) return res.status(400).json({ error: 'Informe uma data válida' });
        const completion = await prisma.serviceCompletion.create({ data: {
            serviceId, collaboratorId, quantity, unitValue: service.value, totalValue: service.value * quantity,
            notes: String(req.body.notes || '').trim() || null, completedAt
        }, include: { service: true } });
        res.status(201).json(completion);
    } catch (error) { console.error('[CREATE ADMIN COMPLETION]', error); res.status(500).json({ error: 'Erro ao adicionar serviço ao fechamento' }); }
};

exports.deleteAdminCompletion = async (req, res) => {
    try {
        const completion = await prisma.serviceCompletion.findUnique({ where: { id: Number(req.params.id) } });
        if (!completion) return res.status(404).json({ error: 'Lançamento não encontrado' });
        if (completion.paymentStatus === 'PAID') return res.status(400).json({ error: 'Lançamentos pagos não podem ser removidos' });
        await prisma.serviceCompletion.delete({ where: { id: completion.id } });
        res.json({ message: 'Serviço removido do fechamento' });
    } catch (error) { console.error('[DELETE ADMIN COMPLETION]', error); res.status(500).json({ error: 'Erro ao remover serviço' }); }
};

exports.generateMonthlyContract = async (req, res) => {
    try {
        const collaboratorId = Number(req.body.collaboratorId);
        const competence = String(req.body.competence || '');
        if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(competence)) return res.status(400).json({ error: 'Informe uma competência válida' });
        const [year, month] = competence.split('-').map(Number);
        const start = new Date(year, month - 1, 1);
        const end = new Date(year, month, 1);
        const collaborator = await prisma.user.findUnique({ where: { id: collaboratorId }, select: { id: true, name: true, fullName: true, email: true, role: true, collaboratorProfile: true, contractUrl: true } });
        if (!collaborator || collaborator.role !== 'COLLABORATOR') return res.status(400).json({ error: 'Colaborador inválido' });
        const completions = await prisma.serviceCompletion.findMany({
            where: { collaboratorId, completedAt: { gte: start, lt: end } }, include: { service: true }, orderBy: { completedAt: 'asc' }
        });
        if (!completions.length) return res.status(400).json({ error: 'Não há serviços lançados nesta competência' });
        const baseContractPath = collaborator.contractUrl
            ? path.join(__dirname, '..', String(collaborator.contractUrl).replace(/^[\\/]+/, ''))
            : null;
        const pdf = await collaboratorContractService.generateMonthlyContractBuffer({ collaborator, competence, completions, additionalClauses: req.body.additionalClauses, closingDate: req.body.closingDate, baseContractPath });
        const baseName = String(collaborator.fullName || collaborator.name || 'colaborador').normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-zA-Z0-9]+/g, '-').toLowerCase();
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename=fechamento-${baseName}-${competence}.pdf`);
        res.send(pdf);
    } catch (error) { console.error('[GENERATE COLLABORATOR CONTRACT]', error); res.status(500).json({ error: 'Erro ao gerar o contrato mensal' }); }
};
