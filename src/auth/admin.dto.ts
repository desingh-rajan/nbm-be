import { z } from "zod";

export const CreateAdminSchema = z.object({
  email: z.string().email("Invalid email format"),
  username: z.string().min(3, "Username must be at least 3 characters").max(50),
  password: z.string().min(8, "Password must be at least 8 characters"),
  role: z
    .enum(["user", "admin", "moderator"])
    .optional()
    .default("user")
    .describe(
      "Role for the user (user, admin, or moderator). Defaults to user.",
    ),
});

export const UpdateUserSchema = z.object({
  username: z.string().min(3).max(50).optional(),
  email: z.string().email().optional(),
  isActive: z.boolean().optional(),
});

export const GetUsersQuerySchema = z.object({
  page: z.coerce.number().min(1, "Page must be >= 1").default(1),
  limit: z.coerce.number().min(1, "Limit must be >= 1").max(100, "Limit must be <= 100").default(20),
});

export type CreateAdminDTO = z.infer<typeof CreateAdminSchema>;
export type UpdateUserDTO = z.infer<typeof UpdateUserSchema>;
export type GetUsersQueryDTO = z.infer<typeof GetUsersQuerySchema>;
