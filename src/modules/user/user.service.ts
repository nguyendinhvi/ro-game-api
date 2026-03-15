import bcrypt from 'bcryptjs';
import { OAuth2Client } from 'google-auth-library';
import { UserModel } from './user.model';
import type { IUserDocument } from './user.model';
import type { IUser, IUserCreate, ILoginBody, IAuthResponse, IUserQuery, IUserDailyAnalytics } from './user.interface';
import { AppError } from '../../middleware/errorHandler';
import { createAccessToken, verifyAccessToken } from '../../utils/jwt';
import { env } from '../../config/env';
import { serializeDoc } from '../../utils/mongoose';

const SALT_ROUNDS = 10;
const MIN_PASSWORD_LENGTH = 8;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

function assertEmail(email: string): void {
  if (!email || !EMAIL_RE.test(email)) {
    throw new AppError(400, 'Invalid email');
  }
}

function assertPassword(password: string): void {
  if (password.length < MIN_PASSWORD_LENGTH) {
    throw new AppError(400, `Password must be at least ${MIN_PASSWORD_LENGTH} characters`);
  }
}

const ANALYTICS_TIMEZONE = "Asia/Ho_Chi_Minh";

function formatLocalDateKey(day: Date): string {
  const y = day.getFullYear();
  const m = String(day.getMonth() + 1).padStart(2, "0");
  const d = String(day.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

async function issueAuthForUser(doc: IUserDocument): Promise<IAuthResponse> {
  const { access_token, jti } = createAccessToken({
    sub: String(doc._id),
    email: doc.email,
  });
  doc.session_jti = jti;
  await doc.save();

  const user = serializeDoc<IUser>(doc);
  return {
    user,
    access_token,
    token_type: 'Bearer',
    expires_in: env.jwtExpiresIn,
  };
}

export class UserService {
  async register(data: IUserCreate): Promise<IAuthResponse> {
    assertPassword(data.password);
    const email = normalizeEmail(data.email);
    assertEmail(email);

    const password_hash = await bcrypt.hash(data.password, SALT_ROUNDS);
    try {
      const doc = await UserModel.create({
        email,
        password_hash,
        display_name: data.display_name?.trim() || undefined,
        role: "user",
      });
      return issueAuthForUser(doc);
    } catch (err: unknown) {
      if (
        typeof err === 'object' &&
        err !== null &&
        'code' in err &&
        (err as { code?: number }).code === 11000
      ) {
        throw new AppError(409, 'Email already registered');
      }
      throw err;
    }
  }

  async login(body: ILoginBody): Promise<IAuthResponse> {
    const email = normalizeEmail(body.email);
    assertEmail(email);
    const doc = await UserModel.findOne({ email }).select('+password_hash');
    if (!doc) {
      throw new AppError(401, 'Invalid email or password');
    }

    if (!doc.password_hash) {
      throw new AppError(401, 'This account uses Google sign-in');
    }

    const ok = await bcrypt.compare(body.password, doc.password_hash);
    if (!ok) {
      throw new AppError(401, 'Invalid email or password');
    }

    return issueAuthForUser(doc);
  }

  async loginWithGoogle(idToken: string): Promise<IAuthResponse> {
    const token = idToken?.trim();
    if (!token) {
      throw new AppError(400, 'Google id_token is required');
    }

    if (!env.googleClientId) {
      throw new AppError(503, 'Google login is not configured');
    }

    const client = new OAuth2Client(env.googleClientId);
    let payload;

    try {
      const ticket = await client.verifyIdToken({
        idToken: token,
        audience: env.googleClientId,
      });
      payload = ticket.getPayload();
    } catch {
      throw new AppError(401, 'Invalid Google token');
    }

    if (!payload?.email || !payload.sub) {
      throw new AppError(401, 'Google account must have a verified email');
    }

    if (payload.email_verified === false) {
      throw new AppError(401, 'Google email is not verified');
    }

    const email = normalizeEmail(payload.email);
    assertEmail(email);
    const googleId = payload.sub;
    const displayName =
      payload.name?.trim() || payload.given_name?.trim() || undefined;

    let doc = await UserModel.findOne({
      $or: [{ google_id: googleId }, { email }],
    });

    if (doc) {
      if (doc.google_id && doc.google_id !== googleId) {
        throw new AppError(
          409,
          'Email is already linked to another Google account',
        );
      }

      if (!doc.google_id) {
        doc.google_id = googleId;
      }

      if (!doc.display_name && displayName) {
        doc.display_name = displayName;
      }

      await doc.save();
    } else {
      try {
        doc = await UserModel.create({
          email,
          google_id: googleId,
          display_name: displayName,
          role: 'user',
        });
      } catch (err: unknown) {
        if (
          typeof err === 'object' &&
          err !== null &&
          'code' in err &&
          (err as { code?: number }).code === 11000
        ) {
          doc = await UserModel.findOne({ email });
          if (!doc) throw err;
          if (!doc.google_id) doc.google_id = googleId;
          if (!doc.display_name && displayName) doc.display_name = displayName;
          await doc.save();
        } else {
          throw err;
        }
      }
    }

    return issueAuthForUser(doc);
  }

  async logout(userId: string, accessToken: string): Promise<{ revoked: boolean }> {
    const payload = verifyAccessToken(accessToken);
    if (payload.sub !== userId) {
      throw new AppError(403, 'Forbidden');
    }

    if (!payload.jti) {
      return { revoked: false };
    }

    const doc = await UserModel.findById(userId).select('+session_jti');
    if (!doc) {
      throw new AppError(404, 'User not found');
    }

    if (doc.session_jti === payload.jti) {
      doc.session_jti = undefined;
      await doc.save();
    }

    return { revoked: true };
  }

  async isSessionTokenValid(userId: string, jti: string): Promise<boolean> {
    const doc = await UserModel.findById(userId).select('session_jti');
    if (!doc?.session_jti) return false;
    return doc.session_jti === jti;
  }

  async findById(id: string): Promise<IUser | null> {
    const doc = await UserModel.findById(id);
    return doc ? serializeDoc<IUser>(doc) : null;
  }

  async findMany(query: IUserQuery): Promise<{
    data: IUser[];
    total: number;
    page: number;
    limit: number;
    total_pages: number;
  }> {
    const DEFAULT_PAGE = 1;
    const DEFAULT_LIMIT = 10;
    const MAX_LIMIT = 100;
    const page = Math.max(1, query.page ?? DEFAULT_PAGE);
    const limit = Math.min(MAX_LIMIT, Math.max(1, query.limit ?? DEFAULT_LIMIT));
    const skip = (page - 1) * limit;

    const sort: Record<string, 1 | -1> = { created_at: -1 };

    const [docs, total] = await Promise.all([
      UserModel.find().sort(sort).skip(skip).limit(limit),
      UserModel.countDocuments(),
    ]);

    const data = docs.map((doc) => serializeDoc<IUser>(doc));
    const total_pages = Math.ceil(total / limit);

    return { data, total, page, limit, total_pages };
  }

  async delete(id: string): Promise<boolean> {
    const result = await UserModel.findByIdAndDelete(id);
    return result !== null;
  }

  async getDailyAnalytics(days = 14): Promise<IUserDailyAnalytics> {
    const safeDays = Math.min(90, Math.max(1, Math.floor(days)));
    const end = new Date();
    end.setHours(23, 59, 59, 999);

    const periodStart = new Date(end);
    periodStart.setDate(periodStart.getDate() - (safeDays - 1));
    periodStart.setHours(0, 0, 0, 0);

    const previousEnd = new Date(periodStart);
    previousEnd.setMilliseconds(-1);
    const previousStart = new Date(previousEnd);
    previousStart.setDate(previousStart.getDate() - (safeDays - 1));
    previousStart.setHours(0, 0, 0, 0);

    const todayStart = new Date(end);
    todayStart.setHours(0, 0, 0, 0);

    const [groupedCurrent, groupedPrevious, total, periodTotal, previousPeriodTotal, today, adminCount] =
      await Promise.all([
        UserModel.aggregate<{ _id: string; count: number }>([
          { $match: { created_at: { $gte: periodStart, $lte: end } } },
          {
            $group: {
              _id: {
                $dateToString: {
                  format: "%Y-%m-%d",
                  date: "$created_at",
                  timezone: ANALYTICS_TIMEZONE,
                },
              },
              count: { $sum: 1 },
            },
          },
          { $sort: { _id: 1 } },
        ]),
        UserModel.aggregate<{ _id: string; count: number }>([
          { $match: { created_at: { $gte: previousStart, $lte: previousEnd } } },
          {
            $group: {
              _id: {
                $dateToString: {
                  format: "%Y-%m-%d",
                  date: "$created_at",
                  timezone: ANALYTICS_TIMEZONE,
                },
              },
              count: { $sum: 1 },
            },
          },
          { $sort: { _id: 1 } },
        ]),
        UserModel.countDocuments(),
        UserModel.countDocuments({ created_at: { $gte: periodStart, $lte: end } }),
        UserModel.countDocuments({
          created_at: { $gte: previousStart, $lte: previousEnd },
        }),
        UserModel.countDocuments({ created_at: { $gte: todayStart, $lte: end } }),
        UserModel.countDocuments({ role: "admin" }),
      ]);

    const currentCountsByDate = new Map(
      groupedCurrent.map((row) => [row._id, row.count]),
    );
    const previousCountsByDate = new Map(
      groupedPrevious.map((row) => [row._id, row.count]),
    );

    const points = Array.from({ length: safeDays }, (_, index) => {
      const day = new Date(periodStart);
      day.setDate(day.getDate() + index);
      const date = formatLocalDateKey(day);
      const label = `${String(day.getDate()).padStart(2, "0")}/${String(day.getMonth() + 1).padStart(2, "0")}`;
      return {
        label,
        date,
        count: currentCountsByDate.get(date) ?? 0,
      };
    });

    const previous_points = Array.from({ length: safeDays }, (_, index) => {
      const day = new Date(previousStart);
      day.setDate(day.getDate() + index);
      const date = formatLocalDateKey(day);
      const label = `${String(day.getDate()).padStart(2, "0")}/${String(day.getMonth() + 1).padStart(2, "0")}`;
      return {
        label,
        date,
        count: previousCountsByDate.get(date) ?? 0,
      };
    });

    const current_period_label = end.toLocaleString("en-US", { month: "long" });
    const previous_period_label = previousEnd.toLocaleString("en-US", {
      month: "long",
    });

    return {
      days: safeDays,
      points,
      previous_points,
      current_period_label,
      previous_period_label,
      summary: {
        total,
        period_total: periodTotal,
        previous_period_total: previousPeriodTotal,
        today,
        admin_count: adminCount,
      },
    };
  }
}

export const userService = new UserService();
