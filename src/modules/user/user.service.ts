import bcrypt from 'bcryptjs';
import { UserModel, mapDocToUser, toMongoCreate } from './user.model';
import type { IUser, IUserCreate, ILoginBody, IAuthResponse } from './user.interface';
import { AppError } from '../../middleware/errorHandler';
import { signAccessToken } from '../../utils/jwt';
import { env } from '../../config/env';

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

export class UserService {
  async register(data: IUserCreate): Promise<IAuthResponse> {
    assertPassword(data.password);
    const email = normalizeEmail(data.email);
    assertEmail(email);

    const passwordHash = await bcrypt.hash(data.password, SALT_ROUNDS);
    try {
      const doc = await UserModel.create(
        toMongoCreate({ ...data, email }, passwordHash),
      );
      const user = mapDocToUser(doc);
      const accessToken = signAccessToken({ sub: user.id, email: user.email });
      return {
        user,
        accessToken,
        tokenType: 'Bearer',
        expiresIn: env.jwtExpiresIn,
      };
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
    const doc = await UserModel.findOne({ email }).select('+passwordHash');
    if (!doc) {
      throw new AppError(401, 'Invalid email or password');
    }

    const ok = await bcrypt.compare(body.password, doc.passwordHash);
    if (!ok) {
      throw new AppError(401, 'Invalid email or password');
    }

    const user = mapDocToUser(doc);
    const accessToken = signAccessToken({ sub: user.id, email: user.email });
    return {
      user,
      accessToken,
      tokenType: 'Bearer',
      expiresIn: env.jwtExpiresIn,
    };
  }

  async findById(id: string): Promise<IUser | null> {
    const doc = await UserModel.findById(id);
    return doc ? mapDocToUser(doc) : null;
  }
}

export const userService = new UserService();
