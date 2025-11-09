import { eq, sql } from "drizzle-orm";
import { db } from "../config/database.ts";
import { type SafeUser, users } from "./user.model.ts";
import { hashPassword } from "../shared/utils/password.ts";
import {
  BadRequestError,
  ForbiddenError,
  NotFoundError,
} from "../shared/utils/errors.ts";

export class AdminService {
  /**
   * Create a new user (only superadmin can do this)
   */
  static async createAdmin(
    data: {
      email: string;
      password: string;
      username: string;
      role?: "user" | "admin" | "moderator";
    },
    requestingUser: { role: string },
  ): Promise<SafeUser> {
    // Only superadmin can create users
    if (requestingUser.role !== "superadmin") {
      throw new ForbiddenError(
        "Only superadmin can create users",
      );
    }

    // Check if user already exists
    const existingUser = await db
      .select()
      .from(users)
      .where(eq(users.email, data.email))
      .limit(1);

    if (existingUser.length > 0) {
      throw new BadRequestError("User with this email already exists");
    }

    // Hash password
    const hashedPassword = await hashPassword(data.password);

    // Create user (default to "user" role)
    const [newUser] = await db
      .insert(users)
      .values({
        email: data.email,
        username: data.username,
        password: hashedPassword,
        role: data.role || "user", // Default to user role
        isActive: true,
        isEmailVerified: true, // Users created by admin are verified by default
      })
      .returning();

    // Return user without password
    const { password: _, ...safeUser } = newUser;
    return safeUser;
  }

  /**
   * Get all users (paginated)
   * @param page - Page number (1-indexed, default 1)
   * @param limit - Items per page (1-100, default 20)
   */
  static async getAllUsers(
    page?: string | number,
    limit?: string | number,
  ): Promise<{
    users: SafeUser[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  }> {
    // Validate and coerce page and limit
    const pageNum = Math.max(1, Number(page ?? 1));
    const limitNum = Math.min(100, Math.max(1, Number(limit ?? 20)));

    const offset = (pageNum - 1) * limitNum;

    // Get users
    const userList = await db
      .select()
      .from(users)
      .limit(limitNum)
      .offset(offset);

    // Get total count (use COUNT aggregate to avoid fetching all rows)
    const totalResult = await db
      .select({ count: sql`count(${users.id})` })
      .from(users);

    // totalResult[0].count may be returned as string depending on driver; coerce to number
    const firstRow = (totalResult[0] as unknown) as { count?: string | number };
    const total = Number(firstRow.count ?? 0);

    // Remove passwords
    const safeUsers = userList.map(({ password: _, ...user }) => user);

    return {
      users: safeUsers,
      total,
      page: pageNum,
      limit: limitNum,
      totalPages: Math.ceil(total / limitNum),
    };
  }

  /**
   * Get user by ID
   */
  static async getUserById(userId: number): Promise<SafeUser> {
    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);

    if (!user) {
      throw new NotFoundError("User not found");
    }

    const { password: _, ...safeUser } = user;
    return safeUser;
  }

  /**
   * Update user (email, username, active status)
   */
  static async updateUser(
    userId: number,
    currentUserId: number,
    data: {
      username?: string;
      email?: string;
      isActive?: boolean;
    },
  ): Promise<SafeUser> {
    // Get user
    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);

    if (!user) {
      throw new NotFoundError("User not found");
    }

    // Check if trying to modify superadmin (system-defined, cannot be changed)
    if (user.role === "superadmin" && userId !== currentUserId) {
      throw new ForbiddenError("Cannot modify superadmin account");
    }

    // Check if email is already taken
    if (data.email && data.email !== user.email) {
      const existingUser = await db
        .select()
        .from(users)
        .where(eq(users.email, data.email))
        .limit(1);

      if (existingUser.length > 0) {
        throw new BadRequestError("Email already in use");
      }
    }

    // Update user
    const [updatedUser] = await db
      .update(users)
      .set({
        ...data,
        updatedAt: new Date(),
      })
      .where(eq(users.id, userId))
      .returning();

    const { password: _, ...safeUser } = updatedUser;
    return safeUser;
  }

  /**
   * Delete user (soft delete by deactivating)
   */
  static async deleteUser(
    userId: number,
    currentUserId: number,
  ): Promise<void> {
    // Get user
    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);

    if (!user) {
      throw new NotFoundError("User not found");
    }

    // Prevent deleting superadmin (system-defined, protected)
    if (user.role === "superadmin") {
      throw new ForbiddenError("Cannot delete superadmin account");
    }

    // Prevent self-deletion
    if (userId === currentUserId) {
      throw new ForbiddenError("Cannot delete your own account");
    }

    // Soft delete by deactivating
    await db
      .update(users)
      .set({ isActive: false })
      .where(eq(users.id, userId));
  }
}
