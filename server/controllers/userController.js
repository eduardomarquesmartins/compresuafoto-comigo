const prisma = require('../lib/prisma');
const bcrypt = require('bcryptjs');

exports.updateProfile = async (req, res) => {
    const userId = req.user.userId;
    const { name, fullName, cpf, phone, password, newPassword } = req.body;

    try {
        const user = await prisma.user.findUnique({ where: { id: userId } });

        if (!user) {
            return res.status(404).json({ error: 'Usuário não encontrado' });
        }

        const dataToUpdate = { name, fullName, cpf, phone };

        // If updating password
        if (newPassword) {
            if (!password) {
                return res.status(400).json({ error: 'Senha atual obrigatória para alterar senha' });
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
            user: { name: updatedUser.name, fullName: updatedUser.fullName, cpf: updatedUser.cpf, email: updatedUser.email, phone: updatedUser.phone, role: updatedUser.role }
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
                createdAt: true
            },
            orderBy: { createdAt: 'desc' }
        });
        res.json(users);
    } catch (error) {
        console.error('Get Users Error:', error);
        res.status(500).json({ error: 'Erro ao buscar usuários' });
    }
};

exports.deleteUser = async (req, res) => {
    try {
        const { id } = req.params;
        await prisma.user.delete({
            where: { id: parseInt(id) }
        });
        res.json({ message: 'Usuário excluído com sucesso' });
    } catch (error) {
        console.error('Delete User Error:', error);
        res.status(500).json({ error: 'Erro ao excluir usuário' });
    }
};

exports.createUser = async (req, res) => {
    try {
        const { name, fullName, cpf, email, password, role } = req.body;

        // Check if user exists
        const existing = await prisma.user.findUnique({ where: { email } });
        if (existing) {
            return res.status(400).json({ error: "Este email já está cadastrado." });
        }

        const hashedPassword = await bcrypt.hash(password, 10);

        const user = await prisma.user.create({
            data: {
                name,
                fullName,
                cpf,
                email,
                password: hashedPassword,
                role: role || 'ADMIN'
            }
        });

        res.status(201).json(user);
    } catch (error) {
        console.error('Create User Error:', error);
        res.status(500).json({ error: 'Erro ao criar usuário' });
    }
};
