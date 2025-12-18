// lib/api.ts
import axios from "axios";
import { Platform } from "react-native";
import { getToken, removeToken } from "./auth";
import { router } from "expo-router";
import Constants from "expo-constants";

// API Configuration
// To access from local network, replace 'localhost' with your machine's local IP address
// Find your IP: 
//   Windows: ipconfig (look for IPv4 Address)
//   Mac/Linux: ifconfig or ip addr (look for inet under your network interface)
// Example: "http://192.168.1.100:5000/api" or "http://10.0.0.5:5000/api"
const getApiBaseURL = () => {
  // Priority 1: Environment variable (set via EXPO_PUBLIC_API_URL)
  if (process.env.EXPO_PUBLIC_API_URL) {
    return process.env.EXPO_PUBLIC_API_URL;
  }
  
  // Priority 2: Config from app.json
  if (Constants.expoConfig?.extra?.apiUrl) {
    return Constants.expoConfig.extra.apiUrl;
  }
  
  // Priority 3: Default fallback
  // Change 'localhost' to your local IP address for network access
  // Example: "http://172.20.10.2:5000/api"
  return "http://192.168.254.115:5000/api";
};

const api = axios.create({ baseURL: getApiBaseURL() });

api.interceptors.request.use(async (config) => {
  const t = await getToken();
  if (t?.token) {
    config.headers = config.headers ?? {};
    (config.headers as any).Authorization = `Bearer ${t.token}`;
  }
  return config;
});

api.interceptors.response.use(
  (res) => res,
  async (err) => {
    const s = err?.response?.status;
    if (s === 401 || s === 403) {
      await removeToken();
      if (Platform.OS === "web") window.location.href = "/login";
      else router.replace("/login");
    }
    return Promise.reject(err);
  }
);

export default api;
