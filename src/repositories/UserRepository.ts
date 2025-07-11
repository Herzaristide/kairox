import { pgPool } from '../database/connection';
import { User } from '../types';
import bcrypt from 'bcryptjs';

export class UserRepository {
  async createUser(
    username: string,
    email: string,
    password: string
  ): Promise<User> {
    const passwordHash = await bcrypt.hash(password, 10);

    const query = `
      INSERT INTO users (username, email, password_hash)
      VALUES ($1, $2, $3)
      RETURNING id, username, email, level, experience, coins, created_at, updated_at
    `;

    const result = await pgPool.query(query, [username, email, passwordHash]);
    const row = result.rows[0];

    return {
      id: row.id,
      username: row.username,
      email: row.email,
      level: row.level,
      experience: row.experience,
      coins: row.coins,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }

  async findByUsername(
    username: string
  ): Promise<(User & { passwordHash: string }) | null> {
    const query = `
      SELECT id, username, email, password_hash, level, experience, coins, created_at, updated_at
      FROM users
      WHERE username = $1
    `;

    const result = await pgPool.query(query, [username]);
    if (result.rows.length === 0) return null;

    const row = result.rows[0];
    return {
      id: row.id,
      username: row.username,
      email: row.email,
      passwordHash: row.password_hash,
      level: row.level,
      experience: row.experience,
      coins: row.coins,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }

  async findById(id: number): Promise<User | null> {
    const query = `
      SELECT id, username, email, level, experience, coins, created_at, updated_at
      FROM users
      WHERE id = $1
    `;

    const result = await pgPool.query(query, [id]);
    if (result.rows.length === 0) return null;

    const row = result.rows[0];
    return {
      id: row.id,
      username: row.username,
      email: row.email,
      level: row.level,
      experience: row.experience,
      coins: row.coins,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }

  async updateCoins(userId: number, coins: number): Promise<void> {
    const query = `
      UPDATE users 
      SET coins = $2, updated_at = CURRENT_TIMESTAMP
      WHERE id = $1
    `;

    await pgPool.query(query, [userId, coins]);
  }

  async updateExperience(
    userId: number,
    experience: number,
    level?: number
  ): Promise<void> {
    const query = level
      ? `UPDATE users SET experience = $2, level = $3, updated_at = CURRENT_TIMESTAMP WHERE id = $1`
      : `UPDATE users SET experience = $2, updated_at = CURRENT_TIMESTAMP WHERE id = $1`;

    const params = level ? [userId, experience, level] : [userId, experience];
    await pgPool.query(query, params);
  }

  async verifyPassword(
    username: string,
    password: string
  ): Promise<User | null> {
    const user = await this.findByUsername(username);
    if (!user) return null;

    const isValid = await bcrypt.compare(password, user.passwordHash);
    if (!isValid) return null;

    // Return user without password hash
    const { passwordHash, ...userWithoutPassword } = user;
    return userWithoutPassword;
  }
}
