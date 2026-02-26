const jwt = require('jsonwebtoken');
const prisma = require('../lib/prisma');
const bcrypt = require('bcryptjs');
const { OAuth2Client } = require('google-auth-library');
const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);
const emailService = require('../services/email');

exports.register = async (req, res) => {
    const { name, fullName, cpf, email, password, phone, securityQuestion, securityAnswer } = req.body;
    try {
        // Check if user exists (email or phone)
        const existingUser = await prisma.user.findFirst({
            where: {
                OR: [
                    { email },
                    { phone: phone || undefined } // Only check phone if provided
                ]
            }
        });

        if (existingUser) {
            return res.status(400).json({ error: 'Email ou Telefone já cadastrado' });
        }

        // Hash password
        const hashedPassword = await bcrypt.hash(password, 10);

        // Hash security answer if provided
        let hashedSecurityAnswer = null;
        if (securityAnswer) {
            hashedSecurityAnswer = await bcrypt.hash(securityAnswer.toLowerCase(), 10);
        }

        // Create user (CUSTOMER role by default)
        const user = await prisma.user.create({
            data: {
                name,
                fullName,
                cpf,
                email,
                password: hashedPassword,
                phone,
                securityQuestion,
                securityAnswer: hashedSecurityAnswer,
                role: 'CUSTOMER'
            }
        });

        // Generate Token
        const token = jwt.sign(
            { userId: user.id, email: user.email, role: user.role },
            process.env.JWT_SECRET || 'secret',
            { expiresIn: '1d' }
        );

        res.status(201).json({ token, user: { name: user.name, fullName: user.fullName, cpf: user.cpf, email: user.email, role: user.role } });

    } catch (error) {
        console.error('Register Error:', error);
        res.status(500).json({ error: 'Erro ao criar conta' });
    }
};

exports.login = async (req, res) => {
    const { login, email, password } = req.body;
    const loginIdentifier = login || email; // support both property names

    try {
        // Find user by email OR phone
        const user = await prisma.user.findFirst({
            where: {
                OR: [
                    { email: loginIdentifier },
                    { phone: loginIdentifier }
                ]
            }
        });

        if (!user) {
            return res.status(401).json({ error: 'Credenciais inválidas' });
        }

        // Check password
        const isValid = await bcrypt.compare(password, user.password);

        if (!isValid) {
            return res.status(401).json({ error: 'Credenciais inválidas' });
        }

        // Generate Token
        const token = jwt.sign(
            { userId: user.id, email: user.email, role: user.role },
            process.env.JWT_SECRET || 'secret',
            { expiresIn: '1d' }
        );

        res.json({ token, user: { name: user.name, fullName: user.fullName, cpf: user.cpf, email: user.email, role: user.role, phone: user.phone } });

    } catch (error) {
        console.error('Login Error:', error);
        res.status(500).json({ error: 'Login failed' });
    }
};

// Get security question for a user
exports.getSecurityQuestion = async (req, res) => {
    const { login, email } = req.query; // email or phone
    const loginIdentifier = login || email;

    try {
        const user = await prisma.user.findFirst({
            where: {
                OR: [
                    { email: loginIdentifier },
                    { phone: loginIdentifier }
                ]
            }
        });

        if (!user) {
            return res.status(404).json({ error: 'Usuário não encontrado' });
        }

        if (!user.securityQuestion) {
            return res.status(400).json({ error: 'Usuário não possui pergunta de segurança cadastrada' });
        }

        res.json({ question: user.securityQuestion });

    } catch (error) {
        console.error('Get Question Error:', error);
        res.status(500).json({ error: 'Erro ao buscar pergunta' });
    }
};

// Reset password using security answer
exports.resetPassword = async (req, res) => {
    const { login, email, answer, newPassword } = req.body;
    const loginIdentifier = login || email;

    try {
        const user = await prisma.user.findFirst({
            where: {
                OR: [
                    { email: loginIdentifier },
                    { phone: loginIdentifier }
                ]
            }
        });

        if (!user || !user.securityAnswer) {
            return res.status(400).json({ error: 'Dados inválidos' });
        }

        // Verify answer
        const isAnswerValid = await bcrypt.compare(answer.toLowerCase(), user.securityAnswer);

        if (!isAnswerValid) {
            return res.status(401).json({ error: 'Resposta incorreta' });
        }

        // Update password
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

// Google Login
exports.googleLogin = async (req, res) => {
    const { credential } = req.body;

    try {
        const ticket = await googleClient.verifyIdToken({
            idToken: credential,
            audience: process.env.GOOGLE_CLIENT_ID
        });

        const payload = ticket.getPayload();
        const { sub: googleId, email, name, picture } = payload;

        // Find or create user
        let user = await prisma.user.findUnique({
            where: { googleId }
        });

        if (!user) {
            // Check if user exists with same email
            user = await prisma.user.findUnique({
                where: { email }
            });

            if (user) {
                // Link account
                user = await prisma.user.update({
                    where: { id: user.id },
                    data: { googleId }
                });
            } else {
                // Create new user
                user = await prisma.user.create({
                    data: {
                        email,
                        name,
                        fullName: name, // Fallback Google name to fullName
                        cpf: null, // CPF is not provided by Google, set to null
                        googleId,
                        password: await bcrypt.hash(Math.random().toString(36), 10), // Random password
                        role: 'CUSTOMER'
                    }
                });
            }
        }

        // Generate Token
        const token = jwt.sign(
            { userId: user.id, email: user.email, role: user.role },
            process.env.JWT_SECRET || 'secret',
            { expiresIn: '1d' }
        );

        res.json({
            token,
            user: {
                id: user.id,
                name: user.name,
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

// Request Password Reset Link via Email
exports.forgotPassword = async (req, res) => {
    const { login } = req.body;
    try {
        const user = await prisma.user.findFirst({
            where: {
                OR: [
                    { email: login },
                    { phone: login }
                ]
            }
        });

        if (!user || !user.email) {
            // Shadow success to prevent email enumeration, but log internally
            return res.json({ message: 'Se o usuário existir, um e-mail de recuperação será enviado.' });
        }

        // Generate a reset token (JWT) valid for 1 hour
        const resetToken = jwt.sign(
            { userId: user.id },
            process.env.JWT_SECRET || 'secret',
            { expiresIn: '1h' }
        );

        let clientUrl = process.env.CLIENT_URL || 'https://compresuafoto-comigo.vercel.app';

        // Dynamically detect client URL
        const referer = req.headers.referer || req.headers.origin;
        if (referer) {
            try {
                const urlObj = new URL(referer);
                clientUrl = `${urlObj.protocol}//${urlObj.host}`;
            } catch (e) {
                // Ignore parse errors
            }
        }

        if (!clientUrl.startsWith('http')) {
            clientUrl = `http://${clientUrl}`;
        }

        await emailService.sendPasswordResetEmail(user.email, resetToken, clientUrl);

        res.json({ message: 'E-mail de recuperação enviado com sucesso.' });
    } catch (error) {
        console.error('Forgot Password Error:', error);
        res.status(500).json({ error: 'Erro ao processar solicitação' });
    }
};

// Reset Password using Token
exports.resetPasswordWithToken = async (req, res) => {
    const { token, newPassword } = req.body;
    try {
        // Verify token
        const decoded = jwt.verify(token, process.env.JWT_SECRET || 'secret');
        const userId = decoded.userId;

        // Hash new password
        const hashedPassword = await bcrypt.hash(newPassword, 10);

        await prisma.user.update({
            where: { id: userId },
            data: { password: hashedPassword }
        });

        res.json({ message: 'Senha redefinida com sucesso!' });
    } catch (error) {
        console.error('Reset with Token Error:', error);
        if (error.name === 'TokenExpiredError') {
            return res.status(401).json({ error: 'O link de recuperação expirou. Solicite um novo.' });
        }
        res.status(401).json({ error: 'Link de recuperação inválido.' });
    }
};
