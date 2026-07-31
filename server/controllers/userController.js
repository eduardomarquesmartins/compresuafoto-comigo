const prisma = require('../lib/prisma');
const bcrypt = require('bcryptjs');

const cleanOptionalUniqueValue = (value) => {
    if (typeof value !== 'string') return null;
    const trimmed = value.trim();
    return trimmed || null;
};

const cleanCpf = (value) => {
    const normalized = cleanOptionalUniqueValue(value);
    return normalized ? normalized.replace(/\D/g, '') : null;
};

const cleanPhone = (value) => {
    const normalized = cleanOptionalUniqueValue(value);
    return normalized ? normalized.replace(/\D/g, '') : null;
};

exports.updateProfile = async (req, res) => {
    const userId = req.user.userId;
    const { name, fullName, cpf, phone, password, newPassword } = req.body;

    try {
        const user = await prisma.user.findUnique({ where: { id: userId } });

        if (!user) {
            return res.status(404).json({ error: 'Usuario nao encontrado' });
        }

        const normalizedCpf = cleanCpf(cpf);
        const normalizedPhone = cleanPhone(phone);
        const dataToUpdate = { name, fullName, cpf: normalizedCpf, phone: normalizedPhone };

        if (normalizedCpf || normalizedPhone) {
            const conflictingUser = await prisma.user.findFirst({
                where: {
                    id: { not: userId },
                    OR: [
                        ...(normalizedCpf ? [{ cpf: normalizedCpf }] : []),
                        ...(normalizedPhone ? [{ phone: normalizedPhone }] : [])
                    ]
                }
            });

            if (conflictingUser) {
                return res.status(400).json({ error: 'CPF ou telefone ja cadastrado em outra conta' });
            }
        }

        if (newPassword) {
            if (!password) {
                return res.status(400).json({ error: 'Senha atual obrigatoria para alterar senha' });
            }
            const isValid = await bcrypt.compare(password, user.password);
            if (!isValid) {
                return res.status(401).json({ error: 'Senha atual incorreta' });
            }
            dataToUpdate.password = await bcrypt.hash(newPassword, 10);
        }

        const updatedUser = await prisma.user.update({
            where: { id: userId },
            data: dataToUpdate
        });

        res.json({
            message: 'Perfil atualizado com sucesso',
            user: {
                name: updatedUser.name,
                fullName: updatedUser.fullName,
                cpf: updatedUser.cpf,
                email: updatedUser.email,
                phone: updatedUser.phone,
                role: updatedUser.role
            }
        });
    } catch (error) {
        console.error('Update Profile Error:', error);
        res.status(500).json({ error: 'Erro ao atualizar perfil' });
    }
};

exports.getUsers = async (req, res) => {
    try {
        const users = await prisma.user.findMany({
            select: {
                id: true,
                email: true,
                name: true,
                fullName: true,
                cpf: true,
                phone: true,
                role: true,
                collaboratorProfile: true,
                contractUrl: true,
                createdAt: true
            },
            orderBy: { createdAt: 'desc' }
        });
        res.json(users);
    } catch (error) {
        console.error('Get Users Error:', error);
        res.status(500).json({ error: 'Erro ao buscar usuarios' });
    }
};

exports.deleteUser = async (req, res) => {
    try {
        const { id } = req.params;
        await prisma.user.delete({
            where: { id: parseInt(id, 10) }
        });
        res.json({ message: 'Usuario excluido com sucesso' });
    } catch (error) {
        console.error('Delete User Error:', error);
        res.status(500).json({ error: 'Erro ao excluir usuario' });
    }
};

exports.updateRole = async (req, res) => {
    const allowedRoles = ['DESIGNER', 'DEMANDAS'];
    const { role } = req.body;
    if (!allowedRoles.includes(role)) return res.status(400).json({ error: 'Perfil inválido' });
    try {
        const user = await prisma.user.update({
            where: { id: parseInt(req.params.id, 10) },
            data: { role: 'COLLABORATOR', collaboratorProfile: role === 'DESIGNER' ? 'DESIGNER' : 'COMPANY_DEMANDS' },
            select: { id: true, name: true, fullName: true, email: true, role: true, collaboratorProfile: true, createdAt: true }
        });
        res.json(user);
    } catch (error) {
        console.error('Update user role error:', error);
        res.status(500).json({ error: 'Erro ao atualizar perfil do usuário' });
    }
};

exports.createUser = async (req, res) => {
    try {
        const { name, fullName, cpf, email, password, role } = req.body;
        const allowedRoles = ['ADMIN', 'PHOTOGRAPHER', 'DESIGNER', 'DEMANDAS', 'COLLABORATOR'];
        const selectedRole = allowedRoles.includes(role) ? role : 'PHOTOGRAPHER';
        const normalizedEmail = String(email || '').trim().toLowerCase();
        const normalizedCpf = cleanCpf(cpf);

        const existing = await prisma.user.findFirst({
            where: {
                OR: [
                    { email: normalizedEmail },
                    ...(normalizedCpf ? [{ cpf: normalizedCpf }] : [])
                ]
            }
        });

        if (existing) {
            return res.status(400).json({ error: 'Este email ou CPF ja esta cadastrado.' });
        }

        const hashedPassword = await bcrypt.hash(password, 10);

        const user = await prisma.user.create({
            data: {
                name,
                fullName,
                cpf: normalizedCpf,
                email: normalizedEmail,
                password: hashedPassword,
                role: ['DESIGNER', 'DEMANDAS'].includes(selectedRole) ? 'COLLABORATOR' : selectedRole,
                collaboratorProfile: selectedRole === 'DESIGNER' ? 'DESIGNER' : selectedRole === 'DEMANDAS' ? 'COMPANY_DEMANDS' : null
            }
        });

        res.status(201).json(user);
    } catch (error) {
        console.error('Create User Error:', error);
        res.status(500).json({ error: 'Erro ao criar usuario' });
    }
};
