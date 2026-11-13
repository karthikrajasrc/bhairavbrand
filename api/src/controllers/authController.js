import bcrypt from 'bcryptjs';
import { OAuth2Client } from 'google-auth-library';
import { googleSchema, loginSchema, registerSchema } from '../validation/schemas.js';

const isDuplicateKeyError = (error) => error?.code === 11000;
const dummyPasswordHash = '$2a$12$C6UzMDM.H6dfI/f/IKcEe.1zYv7kMkU9i6eZsX0gH5XQcx7f/2SeK';

export function createAuthController({
  User,
  auth,
  googleClientId,
  adminEmail,
  verifyGoogleCredential,
}) {
  const configuredAdminEmail = adminEmail.trim().toLowerCase();
  const googleClient = new OAuth2Client(googleClientId || undefined);

  return {
    register: async (req, res, next) => {
      try {
        const input = registerSchema.parse(req.body);
        const user = await User.create({
          email: input.email.toLowerCase(),
          name: input.name,
          passwordHash: await bcrypt.hash(input.password, 12),
          role: 'customer',
        });
        return res.status(201).json({ user: await auth.createSession(user, res) });
      } catch (error) {
        if (isDuplicateKeyError(error)) {
          return res.status(409).json({ error: 'An account with that email already exists' });
        }
        return next(error);
      }
    },

    login: async (req, res, next) => {
      try {
        const input = loginSchema.parse(req.body);
        const user = await User.findOne({ email: input.email.toLowerCase() }).select('+passwordHash');
        const validPassword = user?.passwordHash
          ? await bcrypt.compare(input.password, user.passwordHash)
          : await bcrypt.compare(input.password, dummyPasswordHash);
        if (!user || !validPassword) return res.status(401).json({ error: 'Email or password is incorrect' });
        return res.json({ user: await auth.createSession(user, res) });
      } catch (error) {
        return next(error);
      }
    },

    google: async (req, res, next) => {
      try {
        if (!googleClientId) return res.status(503).json({ error: 'Google sign-in is not configured' });
        const { credential } = googleSchema.parse(req.body);
        let ticket;
        try {
          ticket = verifyGoogleCredential
            ? await verifyGoogleCredential(credential)
            : await googleClient.verifyIdToken({ idToken: credential, audience: googleClientId });
        } catch {
          return res.status(401).json({ error: 'Google credential is invalid or expired' });
        }
        const payload = ticket.getPayload();
        if (!payload?.sub || !payload.email || payload.email_verified !== true) {
          return res.status(401).json({ error: 'Google account could not be verified' });
        }

        const email = payload.email.toLowerCase();
        const isAdminEmail = email === configuredAdminEmail;
        const googleName = payload.name?.trim().slice(0, 80);
        let user = await User.findOne({ googleSub: payload.sub }).select('+googleSub');

        if (!user) {
          const existingEmailUser = await User.findOne({ email }).select('+googleSub');
          if (existingEmailUser) {
            if (existingEmailUser.googleSub) {
              return res.status(409).json({ error: 'This email is already linked to another Google account' });
            }
            user = await User.findOneAndUpdate(
              { _id: existingEmailUser._id, googleSub: { $exists: false } },
              { $set: {
                googleSub: payload.sub,
                name: googleName || existingEmailUser.name,
                ...(isAdminEmail ? { role: 'admin' } : {}),
              }, ...(isAdminEmail ? { $unset: { passwordHash: 1 } } : {}) },
              { new: true, runValidators: true },
            );
            if (!user) {
              return res.status(409).json({ error: 'This email is already linked to another Google account' });
            }
          } else {
            try {
              user = await User.create({
                email,
                name: googleName || email,
                googleSub: payload.sub,
                role: isAdminEmail ? 'admin' : 'customer',
              });
            } catch (error) {
              if (!isDuplicateKeyError(error)) throw error;
              user = await User.findOne({ googleSub: payload.sub }).select('+googleSub');
              if (!user) {
                return res.status(409).json({ error: 'This Google account could not be linked to the email address' });
              }
            }
          }
        }

        if (isAdminEmail) {
          user = await User.findOneAndUpdate(
            { _id: user._id },
            { $set: { role: 'admin' }, $unset: { passwordHash: 1 } },
            { new: true, runValidators: true },
          );
          if (!user) return res.status(409).json({ error: 'The admin account could not be updated' });
        }

        return res.json({ user: await auth.createSession(user, res) });
      } catch (error) {
        if (isDuplicateKeyError(error)) {
          return res.status(409).json({ error: 'This Google account could not be linked to the email address' });
        }
        return next(error);
      }
    },

    me: (req, res) => res.json({ user: auth.publicUser(req.user) }),

    logout: async (req, res, next) => {
      try {
        await auth.destroySession(req.sessionId);
        auth.clearSessionCookie(res);
        return res.status(204).end();
      } catch (error) {
        return next(error);
      }
    },
  };
}
