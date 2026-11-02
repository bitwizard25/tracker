import type { Db } from "@/server/db/client";
import { NotFoundError } from "@/server/errors";
import { setSharing as persistSharing, type PublicUser } from "@/server/repositories/user.repository";

export function setSharing(db: Db, userId: number, share: boolean): PublicUser {
  const user = persistSharing(db, userId, share);
  if (!user) throw new NotFoundError("User not found");
  return user;
}
