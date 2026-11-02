import { z } from "zod";

export const sharingSchema = z.object({ share: z.boolean() });

export type SharingInput = z.infer<typeof sharingSchema>;
