import { z } from "zod";

export const MAX_COMPARE_USERS = 5;

const userIdsSchema = z
  .string()
  .transform((raw) => (raw.trim() === "" ? [] : raw.split(",").map((part) => part.trim())))
  .pipe(z.array(z.string().regex(/^[1-9]\d*$/)).max(MAX_COMPARE_USERS))
  .transform((parts) => parts.map(Number));

export const compareQuerySchema = z.object({
  userIds: userIdsSchema.default([]),
});

export type CompareQuery = z.infer<typeof compareQuerySchema>;
