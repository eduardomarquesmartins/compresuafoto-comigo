const jwt = require('jsonwebtoken');
const prisma = require('../lib/prisma');

const resolveCurrentUser = async (token) => {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await prisma.user.findUnique({
        where: { id: decoded.userId },
        select: { id: true, email: true, role: true, collaboratorProfile: true, authVersion: true }
    });

    if (!user || decoded.authVersion !== user.authVersion) throw new Error('Invalid token');

    return {
        userId: user.id,
        email: user.email,
        role: user.role,
        collaboratorProfile: user.collaboratorProfile,
        authVersion: user.authVersion
    };
};

exports.authenticate = async (req, res, next) => {
    const authHeader = req.headers.authorization;
    const token = authHeader && authHeader.split(' ')[1];
    if (!token) return res.status(401).json({ error: 'Access token required' });

    try {
        req.user = await resolveCurrentUser(token);
        next();
    } catch {
        return res.status(403).json({ error: 'Invalid token' });
    }
};

exports.optionalAuth = async (req, res, next) => {
    const authHeader = req.headers.authorization;
    const token = authHeader && authHeader.split(' ')[1];
    if (!token) {
        req.user = null;
        return next();
    }

    try {
        req.user = await resolveCurrentUser(token);
    } catch {
        req.user = null;
    }
    next();
};

exports.isAdmin = (req, res, next) => {
    if (req.user?.role === 'ADMIN') return next();
    return res.status(403).json({ error: 'Admin access required' });
};

exports.isCollaborator = (req, res, next) => {
    if (req.user && (['DESIGNER', 'DEMANDAS'].includes(req.user.role) || (req.user.role === 'COLLABORATOR' && req.user.collaboratorProfile))) return next();
    return res.status(403).json({ error: 'Acesso de colaborador obrigatório' });
};
