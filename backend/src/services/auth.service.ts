import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { query } from '../db/pool';
import { config } from '../config';
import { AuthTokenPayload, SafeUser, User, UserRole } from '../types/models';
import { AppError } from '../middleware/error.middleware';

export interface SignupInput {
  name: string;
  email: string;
  password: string;
  role: UserRole;
}

export interface LoginInput {
  email: string;
  password: string;
}

export interface AuthResult {
  user: SafeUser;
  token: string;
}

export class AuthService {
  private static readonly SALT_ROUNDS = 12;

  public static async signup(input: SignupInput): Promise<AuthResult> {
    const normalizedEmail = input.email.trim().toLowerCase();

    const existingUser = await query<User>(
      'SELECT id FROM users WHERE LOWER(email) = LOWER($1)',
      [normalizedEmail]
    );

    if (existingUser.rows.length > 0) {
      throw new AppError('An account with this email address already exists', 409, 'EMAIL_EXISTS');
    }

    const passwordHash = await bcrypt.hash(input.password, AuthService.SALT_ROUNDS);

    const insertResult = await query<User>(
      `INSERT INTO users (name, email, password_hash, role)
       VALUES ($1, $2, $3, $4)
       RETURNING id, name, email, role, created_at, updated_at`,
      [input.name.trim(), normalizedEmail, passwordHash, input.role]
    );

    const createdUser = insertResult.rows[0];
    const safeUser: SafeUser = {
      id: createdUser.id,
      name: createdUser.name,
      email: createdUser.email,
      role: createdUser.role,
      created_at: createdUser.created_at,
      updated_at: createdUser.updated_at
    };

    const token = this.generateToken({
      id: safeUser.id,
      email: safeUser.email,
      role: safeUser.role
    });

    return { user: safeUser, token };
  }

  public static async login(input: LoginInput): Promise<AuthResult> {
    const normalizedEmail = input.email.trim().toLowerCase();

    const result = await query<User>(
      'SELECT id, name, email, password_hash, role, created_at, updated_at FROM users WHERE LOWER(email) = LOWER($1)',
      [normalizedEmail]
    );

    if (result.rows.length === 0) {
      throw new AppError('Invalid email or password', 401, 'INVALID_CREDENTIALS');
    }

    const user = result.rows[0];
    const isPasswordValid = await bcrypt.compare(input.password, user.password_hash);

    if (!isPasswordValid) {
      throw new AppError('Invalid email or password', 401, 'INVALID_CREDENTIALS');
    }

    const safeUser: SafeUser = {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      created_at: user.created_at,
      updated_at: user.updated_at
    };

    const token = this.generateToken({
      id: safeUser.id,
      email: safeUser.email,
      role: safeUser.role
    });

    return { user: safeUser, token };
  }

  public static generateToken(payload: AuthTokenPayload): string {
    return jwt.sign(payload, config.jwt.secret, {
      expiresIn: config.jwt.expiresIn as any
    });
  }
}
