import { z } from "zod";

export const goalTypeSchema = z.enum(["lose", "gain"]);

export const registerSchema = z.object({
  email: z.string().trim().toLowerCase().pipe(z.email()),
  password: z.string().min(8),
  displayName: z.string().trim().min(2).max(30),
  goalType: goalTypeSchema,
  goalWeightKg: z.number().min(20).max(500).optional(),
});

export const loginSchema = z.object({
  email: z.string().trim().toLowerCase().pipe(z.email()),
  password: z.string().min(1),
});

export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
