// app/screens/faculty/useMe.ts
import { useCallback, useEffect, useMemo, useState } from "react";
import api from "../../lib/api";
import { getToken, removeToken } from "../../lib/auth";
import { router } from "expo-router";

export type MeUser = {
  _id?: string;
  id?: string;
  email?: string;
  firstName?: string;
  lastName?: string;
  fullName?: string;
  role?: string;
};

function displayNameFrom(u?: MeUser | null) {
  if (!u) return "";
  const fn = (u.fullName || "").trim();
  if (fn) return fn;
  const combo = [u.firstName, u.lastName].filter(Boolean).join(" ").trim();
  if (combo) return combo;
  if (u.email) return u.email.split("@")[0];
  return "";
}

export function useMe() {
  const [user, setUser] = useState<MeUser | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchMe = useCallback(async () => {
    try {
      const token = await getToken();
      if (!token?.token) throw new Error("No token");
      const res = await api.get("/auth/me", {
        headers: { Authorization: `Bearer ${token.token}` },
      });
      // backend returns { user: {...} } in your other screens
      setUser(res?.data?.user || res?.data || null);
    } catch (e: any) {
      // on auth failure, boot to login
      if (e?.response?.status === 401) {
        await removeToken();
        router.replace("/login");
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchMe();
  }, [fetchMe]);

  const name = useMemo(() => displayNameFrom(user) || "Professor", [user]);

  return { user, name, loading, refresh: fetchMe };
}
