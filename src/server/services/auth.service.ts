import { compare, hash } from "bcryptjs";
import type { Db } from "@/server/db/client";
import { AppError, ConflictError, NotFoundError } from "@/server/errors";
import {
  createUser,
  findByEmail,
  findById,
  type PublicUser,
} from "@/server/repositories/user.repository";
import type { LoginInput, RegisterInput } from "@/lib/validation/auth";

const BCRYPT_COST = 10;
// Valid cost-10 hash compared against when the email is unknown, so timing does not reveal it.
const DUMMY_HASH = "$2b$10$ygEueCArVVlgGZCB5EOGceUvX8ccSUcaV23RHMiX9XH8gqi5T7MxC";

const normalizeEmail = (email: string): string => email.trim().toLowerCase();

export async function register(db: Db, input: RegisterInput): Promise<PublicUser> {
  const email = normalizeEmail(input.email);
  if (findByEmail(db, email)) {
    throw new ConflictError("Email already registered");
  }
  const passwordHash = await hash(input.password, BCRYPT_COST);
  try {
    return createUser(db, {
      email,
      passwordHash,
      displayName: input.displayName,
      goalType: input.goalType,
      goalWeightKg: input.goalWeightKg,
    });
  } catch (error) {
    if (error instanceof Error && "code" in error && error.code === "SQLITE_CONSTRAINT_UNIQUE") {
      throw new ConflictError("Email already registered");
    }
    throw error;
  }
}

export async function login(db: Db, input: LoginInput): Promise<PublicUser> {
  const found = findByEmail(db, normalizeEmail(input.email));
  const valid = await compare(input.password, found?.passwordHash ?? DUMMY_HASH);
  if (!found || !valid) {
    throw new AppError(401, "INVALID_CREDENTIALS", "Invalid email or password");
  }
  return found.user;
}

export function getUser(db: Db, id: number): PublicUser {
  const user = findById(db, id);
  if (!user) {
    throw new NotFoundError("User not found");
  }
  return user;
}
