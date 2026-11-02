"use client";

import { useCallback, useEffect, useState } from "react";
import { api } from "@/lib/api-client";
import type { PublicUser } from "@/lib/types";

type CurrentUser = {
  user: PublicUser | null;
  isLoading: boolean;
  refresh: () => Promise<void>;
};

export function useCurrentUser(): CurrentUser {
  const [user, setUser] = useState<PublicUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const refresh = useCallback(async () => {
    try {
      setUser((await api.auth.me()).user);
    } catch {
      // a 401 is redirected to /login by the api client; other errors leave the user unset
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    api.auth
      .me()
      .then(({ user: me }) => setUser(me))
      .catch(() => setUser(null))
      .finally(() => setIsLoading(false));
  }, []);

  return { user, isLoading, refresh };
}
