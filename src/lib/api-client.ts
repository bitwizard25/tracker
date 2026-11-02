import type {
  CompareSeries,
  LeaderboardEntry,
  LoginInput,
  PublicUser,
  RegisterInput,
  SaveWeightInput,
  SaveWeightResult,
  WeightEntry,
} from "@/lib/types";

export class ApiError extends Error {
  constructor(
    public readonly status: number,
    public readonly code: string,
    message: string,
    public readonly details?: unknown,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

const PUBLIC_AUTH_PATHS = ["/api/auth/login", "/api/auth/register"];

type RawResult<T> = { status: number; data: T };

async function toApiError(res: Response): Promise<ApiError> {
  try {
    const body = (await res.json()) as {
      error?: { code?: string; message?: string; details?: unknown };
    };
    if (body.error?.code && body.error.message) {
      return new ApiError(res.status, body.error.code, body.error.message, body.error.details);
    }
  } catch {
    // body was not JSON; fall through to the generic error
  }
  return new ApiError(res.status, "UNKNOWN_ERROR", "Something went wrong. Please try again.");
}

function redirectToLogin(path: string): void {
  if (typeof window === "undefined" || PUBLIC_AUTH_PATHS.includes(path)) return;
  window.location.assign("/login");
}

async function request<T>(path: string, init?: RequestInit): Promise<RawResult<T>> {
  const res = await fetch(path, { credentials: "same-origin", ...init });
  if (!res.ok) {
    if (res.status === 401) redirectToLogin(path);
    throw await toApiError(res);
  }
  if (res.status === 204) return { status: 204, data: undefined as T };
  return { status: res.status, data: (await res.json()) as T };
}

export async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  return (await request<T>(path, init)).data;
}

function jsonInit(method: string, body?: unknown): RequestInit {
  if (body === undefined) return { method };
  return {
    method,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  };
}

export const api = {
  auth: {
    register: (input: RegisterInput) =>
      apiFetch<{ user: PublicUser }>("/api/auth/register", jsonInit("POST", input)),
    login: (input: LoginInput) =>
      apiFetch<{ user: PublicUser }>("/api/auth/login", jsonInit("POST", input)),
    logout: () => apiFetch<void>("/api/auth/logout", jsonInit("POST")),
    me: () => apiFetch<{ user: PublicUser }>("/api/auth/me"),
  },
  weights: {
    list: () => apiFetch<{ entries: WeightEntry[] }>("/api/weights"),
    save: async (input: SaveWeightInput): Promise<SaveWeightResult> => {
      const { status, data } = await request<{ entry: WeightEntry }>(
        "/api/weights",
        jsonInit("POST", input),
      );
      return { entry: data.entry, created: status === 201 };
    },
    update: (id: number, weightKg: number) =>
      apiFetch<{ entry: WeightEntry }>(`/api/weights/${id}`, jsonInit("PATCH", { weightKg })),
    remove: (id: number) => apiFetch<void>(`/api/weights/${id}`, jsonInit("DELETE")),
  },
  sharing: {
    set: (share: boolean) =>
      apiFetch<{ user: PublicUser }>("/api/sharing", jsonInit("PUT", { share })),
  },
  leaderboard: {
    get: () => apiFetch<{ entries: LeaderboardEntry[] }>("/api/leaderboard"),
  },
  compare: {
    get: (userIds?: number[]) =>
      apiFetch<{ series: CompareSeries[] }>(
        userIds && userIds.length > 0 ? `/api/compare?userIds=${userIds.join(",")}` : "/api/compare",
      ),
  },
};
