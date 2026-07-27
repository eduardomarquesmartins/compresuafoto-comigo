const jwt = require('jsonwebtoken');
const prisma = require('../lib/prisma');
const bcrypt = require('bcryptjs');
const { OAuth2Client } = require('google-auth-library');
const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);
const emailService = require('../services/email');

const getConfiguredClientUrl = () => {
    const clientUrl = process.env.CLIENT_URL || 'https://compresuafoto-comigo.vercel.app';
    return clientUrl.startsWith('http') ? clientUrl : `http://${clientUrl}`;
};

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

const buildLoginWhere = (rawValue) => {
    const loginIdentifier = String(rawValue || '').trim();
    const normalizedPhone = cleanPhone(loginIdentifier);

    return {
        OR: [
            { email: loginIdentifier.toLowerCase() },
            ...(normalizedPhone ? [{ phone: normalizedPhone }] : [])
        ]
    };
};

exports.me = async (req, res) => {
    try {
        const user = await prisma.user.findUnique({
            where: { id: req.user.userId },
            select: {
                id: true,
                name: true,
                fullName: true,
                cpf: true,
                email: true,
                role: true,
                phone: true
            }
        });

        if (!user) {
            return res.status(404).json({ error: 'Usuario nao encontrado' });
        }

        res.json({ user });
    } catch (error) {
        console.error('Me Error:', error);
        res.status(500).json({ error: 'Erro ao validar sessao' });
    }
};

exports.register = async (req, res) => {
    const { name, fullName, cpf, email, password, phone, securityQuestion, securityAnswer } = req.body;
    try {
        const normalizedEmail = String(email || '').trim().toLowerCase();
        const normalizedCpf = cleanCpf(cpf);
        const normalizedPhone = cleanPhone(phone);

        const existingUser = await prisma.user.findFirst({
            where: {
                OR: [
                    { email: normalizedEmail },
                    ...(normalizedPhone ? [{ phone: normalizedPhone }] : []),
                    ...(normalizedCpf ? [{ cpf: normalizedCpf }] : [])
                ]
            }
        });

        if (existingUser) {
            return res.status(400).json({ error: 'Email, CPF ou telefone ja cadastrado' });
        }

        const hashedPassword = await bcrypt.hash(password, 10);

        let hashedSecurityAnswer = null;
        if (securityAnswer) {
            hashedSecurityAnswer = await bcrypt.hash(securityAnswer.toLowerCase(), 10);
        }

        const user = await prisma.user.create({
            data: {
                name,
                fullName,
                cpf: normalizedCpf,
                email: normalizedEmail,
                password: hashedPassword,
                phone: normalizedPhone,
                securityQuestion,
                securityAnswer: hashedSecurityAnswer,
                role: 'CUSTOMER'
            }
        });

        const token = jwt.sign(
            { userId: user.id, email: user.email, role: user.role },
            process.env.JWT_SECRET,
            { expiresIn: '1d' }
        );

        res.status(201).json({
            token,
            user: {
                name: user.name,
                fullName: user.fullName,
                cpf: user.cpf,
                email: user.email,
                role: user.role,
                phone: user.phone
            }
        });
    } catch (error) {
        console.error('Register Error:', error);
        res.status(500).json({ error: 'Erro ao criar conta' });
    }
};

exports.login = async (req, res) => {
    const { login, email, password } = req.body;
    const loginIdentifier = login || email;

    try {
        const user = await prisma.user.findFirst({
            where: buildLoginWhere(loginIdentifier)
        });

        if (!user) {
            return res.status(401).json({ error: 'Credenciais invalidas' });
        }

        const isValid = await bcrypt.compare(password, user.password);

        if (!isValid) {
            return res.status(401).json({ error: 'Credenciais invalidas' });
        }

        const token = jwt.sign(
            { userId: user.id, email: user.email, role: user.role },
            process.env.JWT_SECRET,
            { expiresIn: '1d' }
        );

        res.json({
            token,
            user: {
                name: user.name,
                fullName: user.fullName,
                cpf: user.cpf,
                email: user.email,
                role: user.role,
                phone: user.phone
            }
        });
    } catch (error) {
        console.error('Login Error:', error);
        res.status(500).json({ error: 'Login failed' });
    }
};

exports.getSecurityQuestion = async (req, res) => {
    const { login, email } = req.query;
    const loginIdentifier = login || email;

    try {
        const user = await prisma.user.findFirst({
            where: buildLoginWhere(loginIdentifier)
        });

        if (!user) {
            return res.status(404).json({ error: 'Usuario nao encontrado' });
        }

        if (!user.securityQuestion) {
            return res.status(400).json({ error: 'Usuario nao possui pergunta de seguranca cadastrada' });
        }

        res.json({ question: user.securityQuestion });
    } catch (error) {
        console.error('Get Question Error:', error);
        res.status(500).json({ error: 'Erro ao buscar pergunta' });
    }
};

exports.resetPassword = async (req, res) => {
    const { login, email, answer, newPassword } = req.body;
    const loginIdentifier = login || email;

    try {
        const user = await prisma.user.findFirst({
            where: buildLoginWhere(loginIdentifier)
        });

        if (!user || !user.securityAnswer) {
            return res.status(400).json({ error: 'Dados invalidos' });
        }

        const isAnswerValid = await bcrypt.compare(String(answer || '').toLowerCase(), user.securityAnswer);

        if (!isAnswerValid) {
            return res.status(401).json({ error: 'Resposta incorreta' });
        }

        const hashedPassword = await bcrypt.hash(newPassword, 10);

        await prisma.user.update({
            where: { id: user.id },
            data: { password: hashedPassword }
        });

        res.json({ message: 'Senha redefinida com sucesso' });
    } catch (error) {
        console.error('Reset Password Error:', error);
        res.status(500).json({ error: 'Erro ao redefinir senha' });
    }
};

exports.googleLogin = async (req, res) => {
    const { credential } = req.body;

    try {
        const ticket = await googleClient.verifyIdToken({
            idToken: credential,
            audience: process.env.GOOGLE_CLIENT_ID
        });

        const payload = ticket.getPayload();
        const { sub: googleId, email, name, picture } = payload;
        const normalizedEmail = String(email || '').trim().toLowerCase();

        let user = await prisma.user.findUnique({
            where: { googleId }
        });

        if (!user) {
            user = await prisma.user.findUnique({
                where: { email: normalizedEmail }
            });

            if (user) {
                user = await prisma.user.update({
                    where: { id: user.id },
                    data: { googleId }
                });
            } else {
                user = await prisma.user.create({
                    data: {
                        email: normalizedEmail,
                        name,
                        fullName: name,
                        cpf: null,
                        phone: null,
                        googleId,
                        password: await bcrypt.hash(require('crypto').randomBytes(32).toString('hex'), 10),
                        role: 'CUSTOMER'
                    }
                });
            }
        }

        const token = jwt.sign(
            { userId: user.id, email: user.email, role: user.role },
            process.env.JWT_SECRET,
            { expiresIn: '1d' }
        );

        res.json({
            token,
            user: {
                id: user.id,
                name: user.name,
                fullName: user.fullName,
                cpf: user.cpf,
                phone: user.phone,
                email: user.email,
                role: user.role,
                picture,
                googleId: user.googleId
            },
            incompleteProfile: !user.cpf || !user.phone
        });
    } catch (error) {
        console.error('Google Login Error:', error);
        res.status(500).json({ error: 'Erro no login com Google' });
    }
};

exports.forgotPassword = async (req, res) => {
    const { login } = req.body;
    try {
        const user = await prisma.user.findFirst({
            where: buildLoginWhere(login)
        });

        if (!user || !user.email) {
            return res.json({ message: 'Se o usuario existir, um e-mail de recuperacao sera enviado.' });
        }

        const resetToken = jwt.sign(
            { userId: user.id },
            process.env.JWT_SECRET,
            { expiresIn: '1h' }
        );

        const clientUrl = getConfiguredClientUrl();

        await emailService.sendPasswordResetEmail(user.email, resetToken, clientUrl);

        res.json({ message: 'E-mail de recuperacao enviado com sucesso.' });
    } catch (error) {
        console.error('Forgot Password Error:', error);
        res.status(500).json({ error: 'Erro ao processar solicitacao' });
    }
};

exports.resetPasswordWithToken = async (req, res) => {
    const { token, newPassword } = req.body;
    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const userId = decoded.userId;
        const hashedPassword = await bcrypt.hash(newPassword, 10);

        await prisma.user.update({
            where: { id: userId },
            data: { password: hashedPassword }
        });

        res.json({ message: 'Senha redefinida com sucesso!' });
    } catch (error) {
        console.error('Reset with Token Error:', error);
        if (error.name === 'TokenExpiredError') {
            return res.status(401).json({ error: 'O link de recuperacao expirou. Solicite um novo.' });
        }
        res.status(401).json({ error: 'Link de recuperacao invalido.' });
    }
};
