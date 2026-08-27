import { apiClient, setAccessToken } from "./axios.js";
import { User, ApiResponse } from "../types/index.js";

export interface LoginParams {
  email: string;
  password: string;
}

export interface RegisterParams {
  name: string;
  email: string;
  password: string;
}

export interface AuthResponseData {
  user: User;
  accessToken: string;
}

export const authApi = {
  login: async (params: LoginParams): Promise<AuthResponseData> => {
    const res = await apiClient.post<ApiResponse<AuthResponseData>>(
      "/api/v1/auth/login",
      params
    );
    if (res.data.data.accessToken) {
      setAccessToken(res.data.data.accessToken);
    }
    return res.data.data;
  },

  register: async (params: RegisterParams): Promise<AuthResponseData> => {
    const res = await apiClient.post<ApiResponse<AuthResponseData>>(
      "/api/v1/auth/register",
      params
    );
    if (res.data.data.accessToken) {
      setAccessToken(res.data.data.accessToken);
    }
    return res.data.data;
  },

  logout: async (): Promise<void> => {
    try {
      await apiClient.post("/api/v1/auth/logout");
    } finally {
      setAccessToken(null);
    }
  },

  getMe: async (): Promise<User> => {
    const res = await apiClient.get<ApiResponse<User>>("/api/v1/auth/me");
    return res.data.data;
  },

  refresh: async (): Promise<string> => {
    const res = await apiClient.post<ApiResponse<{ accessToken: string }>>(
      "/api/v1/auth/refresh"
    );
    setAccessToken(res.data.data.accessToken);
    return res.data.data.accessToken;
  },
};
