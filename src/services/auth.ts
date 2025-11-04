import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { env } from "../config/env.js";
import { sql } from "../database/connection.js";
import type { LoginDTO, RegisterDTO } from "../validators/auth.validators.js";
import { success } from "zod";
type SafeUser = {
  id: string;
  email: string;
  name: string | null;
  created_at: string;
  updated_at: string;
};

export class AuthService {
  private signToken(userId: string) {
    const secret: jwt.Secret = env.JWT_SECRET as unknown as jwt.Secret;
    const options: jwt.SignOptions = {
      expiresIn: env.JWT_EXPIRES_IN as jwt.SignOptions["expiresIn"],
    };
    return jwt.sign({ sub: userId }, secret, options);
  }

  async register(data: RegisterDTO) {
    // checa duplicidade
    const exists = await sql/*sql*/`
      SELECT id FROM users WHERE email = ${data.email} LIMIT 1
    `;
    if (exists.length > 0) throw new Error("Email já cadastrado");

    const passwordHash = await bcrypt.hash(data.password, env.BCRYPT_SALT_ROUNDS);

    try {
      const inserted = (await sql/*sql*/`
        INSERT INTO users (email, name, password_hash)
        VALUES (${data.email}, ${data.name ?? null}, ${passwordHash})
        RETURNING id, email, name, created_at, updated_at
      `) as SafeUser[];

      const user = inserted[0];
      const token = this.signToken(user.id);
      return { user, token, success: true };
    } catch (err: any) {
      if (err?.code === "23505") throw new Error("Email já cadastrado"); // unique_violation
      throw err;
    }
  }

  async login(data: LoginDTO) {
    const rows = await sql/*sql*/`
      SELECT id, email, name, password_hash, created_at, updated_at
      FROM users
      WHERE email = ${data.email}
      LIMIT 1
    `;
    if (rows.length === 0) throw new Error("INVALID_CREDENTIALS");

    const row = rows[0] as any;
    const ok = await bcrypt.compare(data.password, row.password_hash);
    if (!ok) throw new Error("INVALID_CREDENTIALS");

    const token = this.signToken(row.id);
    const user: SafeUser = {
      id: row.id,
      email: row.email,
      name: row.name,
      created_at: row.created_at,
      updated_at: row.updated_at
    };

    return { user, token };
  }

  async me(userId: string) {
    const rows = await sql/*sql*/`
      SELECT id, email, name, created_at, updated_at
      FROM users
      WHERE id = ${userId}
      LIMIT 1
    `;
    return (rows[0] as SafeUser) ?? null;
  }

  async forgotPassword(data: { email: string, password: string }) {
     const exists = await sql/*sql*/`
      SELECT id FROM users WHERE email = ${data.email} LIMIT 1
    `;
    if (exists.length === 0) throw new Error("Usuário não encontrado");

    const passwordHash = await bcrypt.hash(data.password, env.BCRYPT_SALT_ROUNDS);

    try {
      await sql/*sql*/`
        UPDATE users SET password_hash = ${passwordHash}
        WHERE id = ${exists[0].id}
      `;
      return { message: "Senha alterada com sucesso" };
    } catch (err: any) {
      throw err;
    }
  }
}

export const authService = new AuthService();