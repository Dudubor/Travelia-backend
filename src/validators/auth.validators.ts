import { z } from "zod";

export const registerSchema = z.object({
  name: z.string().min(2).max(80).optional(),
  email: z.string().email(),
  password: z.string().min(6).max(72)
});

export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6).max(72)
});

export const forgotPasswordSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6).max(72)
});

export type RegisterDTO = z.infer<typeof registerSchema>;
export type LoginDTO = z.infer<typeof loginSchema>;
export type ForgotPasswordDTO = z.infer<typeof forgotPasswordSchema>;
