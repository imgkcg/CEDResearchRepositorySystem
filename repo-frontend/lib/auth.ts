// lib/auth.ts
import * as SecureStore from "expo-secure-store";
import { Platform } from "react-native";

export type UserToken = {
  id: string;
  firstName: string;
  lastName: string;
  email?: string;
  role?: string;
  token: string;
  expiry?: string;
};

const STORAGE_KEY = "userToken";

function isExpired(expiry?: string) {
  if (!expiry) return true;
  return new Date(expiry) < new Date();
}

export async function saveToken(user: Omit<UserToken, "expiry">, hoursValid = 24) {
  const expiry = new Date(Date.now() + hoursValid * 3600_000).toISOString();
  const serialized = JSON.stringify({ ...user, expiry });

  if (Platform.OS === "web") {
    try {
      // migrate once
      const legacy = sessionStorage.getItem(STORAGE_KEY);
      if (legacy) {
        localStorage.setItem(STORAGE_KEY, legacy);
        sessionStorage.removeItem(STORAGE_KEY);
      }
      localStorage.setItem(STORAGE_KEY, serialized);
    } catch {}
    return;
  }

  // native
  try { await SecureStore.setItemAsync(STORAGE_KEY, serialized); } catch {}
}

export async function getToken(): Promise<UserToken | null> {
  try {
    let raw: string | null = null;

    if (Platform.OS === "web") {
      // web first, no SecureStore at all
      const legacy = sessionStorage.getItem(STORAGE_KEY);
      if (legacy) {
        try { localStorage.setItem(STORAGE_KEY, legacy); } catch {}
        sessionStorage.removeItem(STORAGE_KEY);
        raw = legacy;
      } else {
        raw = localStorage.getItem(STORAGE_KEY);
      }
    } else {
      // native only
      try { raw = await SecureStore.getItemAsync(STORAGE_KEY); } catch { raw = null; }
    }

    if (!raw) return null;

    const tok = JSON.parse(raw) as UserToken;
    const valid =
      tok && typeof tok.token === "string" && tok.token.trim() !== "" &&
      typeof tok.id === "string" && tok.id.trim() !== "";

    if (!valid || isExpired(tok.expiry)) {
      await removeToken();
      return null;
    }
    return tok;
  } catch {
    await removeToken();
    return null;
  }
}

export async function removeToken() {
  if (Platform.OS === "web") {
    try {
      localStorage.removeItem(STORAGE_KEY);
      sessionStorage.removeItem(STORAGE_KEY);
      sessionStorage.removeItem("repo-email");
      localStorage.removeItem("repo-email");
    } catch {}
  } else {
    try { await SecureStore.deleteItemAsync(STORAGE_KEY); } catch {}
  }
}
