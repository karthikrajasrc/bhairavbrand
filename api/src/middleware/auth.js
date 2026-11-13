import { createHash, randomBytes } from 'node:crypto';

const SESSION_COOKIE = 'bb_session';
const SESSION_DURATION = 7 * 24 * 60 * 60 * 1000;
const hashToken = (token) => createHash('sha256').update(token).digest('hex');

export function createAuthMiddleware({ Session, adminEmail, secureCookie }) {
  const configuredAdminEmail = adminEmail.trim().toLowerCase();

  const publicUser = (user) => ({
    id: user._id.toString(),
    email: user.email,
    name: user.name,
    role: user.role === 'admin' && user.email?.toLowerCase() === configuredAdminEmail ? 'admin' : 'customer',
    createdAt: user.createdAt,
  });

  const setSessionCookie = (res, token) => {
    res.cookie(SESSION_COOKIE, token, {
      httpOnly: true,
      secure: secureCookie,
      sameSite: secureCookie ? 'none' : 'lax',
      path: '/',
      maxAge: SESSION_DURATION,
    });
  };

  const clearSessionCookie = (res) => {
    res.clearCookie(SESSION_COOKIE, {
      httpOnly: true,
      secure: secureCookie,
      sameSite: secureCookie ? 'none' : 'lax',
      path: '/',
    });
  };

  const createSession = async (user, res) => {
    const token = randomBytes(32).toString('base64url');
    const createdAt = new Date();
    await Session.create({
      tokenHash: hashToken(token),
      user: user._id,
      createdAt,
      expiresAt: new Date(createdAt.getTime() + SESSION_DURATION),
    });
    setSessionCookie(res, token);
    return publicUser(user);
  };

  const requireUser = async (req, res, next) => {
    const token = req.cookies?.[SESSION_COOKIE];
    if (!token || token.length > 128) return res.status(401).json({ error: 'Sign in required' });
    try {
      const session = await Session.findOne({
        tokenHash: hashToken(token),
        expiresAt: { $gt: new Date() },
      }).populate('user', 'email name role createdAt');
      if (!session?.user) return res.status(401).json({ error: 'Sign in required' });
      req.user = session.user;
      req.sessionId = session._id;
      return next();
    } catch (error) {
      return next(error);
    }
  };

  const requireAdmin = (req, res, next) => {
    if (
      req.user?.role !== 'admin'
      || req.user.email?.toLowerCase() !== configuredAdminEmail
    ) return res.status(403).json({ error: 'Admin access required' });
    return next();
  };

  const destroySession = async (sessionId) => Session.deleteOne({ _id: sessionId });

  return {
    clearSessionCookie,
    createSession,
    destroySession,
    publicUser,
    requireAdmin,
    requireUser,
  };
}
