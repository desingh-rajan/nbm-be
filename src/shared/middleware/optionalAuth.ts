import { Context, Next } from "hono";
import { verifyToken } from "../utils/jwt.ts";
import { db } from "../../config/database.ts";
import { users } from "../../auth/user.model.ts";
import { eq } from "drizzle-orm";

/**
 * Optional Authentication Middleware
 * 
 * Similar to requireAuth but doesn't throw errors if no token is present.
 * If a valid token is provided, sets c.get('user') with user info.
 * If no token or invalid token, simply continues without setting user.
 * 
 * Use this for routes that want to behave differently based on auth status
 * but should work for both authenticated and unauthenticated users.
 * 
 * Example: Public articles list that shows more data to admins
 */
export async function optionalAuth(c: Context, next: Next) {
  try {
    const authHeader = c.req.header("Authorization");

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      // No token provided - continue as unauthenticated
      return await next();
    }

    const token = authHeader.substring(7);
    const payload = await verifyToken(token);

    if (!payload || !payload.userId) {
      // Invalid token - continue as unauthenticated
      return await next();
    }

    // Fetch user from database
    const result = await db
      .select()
      .from(users)
      .where(eq(users.id, payload.userId))
      .limit(1);

    if (result.length === 0 || !result[0].isActive) {
      // User not found or inactive - continue as unauthenticated
      return await next();
    }

    // Set user in context for downstream handlers
    c.set("user", {
      id: result[0].id,
      email: result[0].email,
      role: result[0].role,
    });
  } catch {
    // Any error - just continue as unauthenticated
  }

  await next();
}
