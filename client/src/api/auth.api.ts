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
      "/auth/login",
      params
    );
    if (res.data.data.accessToken) {
      setAccessToken(res.data.data.accessToken);
    }
    const data = res.data.data;
    if (data.user && !data.user._id && data.user.id) {
      data.user._id = data.user.id;
    }
    return data;
  },

  register: async (params: RegisterParams): Promise<AuthResponseData> => {
    const res = await apiClient.post<ApiResponse<AuthResponseData>>(
      "/auth/register",
      params
    );
    if (res.data.data.accessToken) {
      setAccessToken(res.data.data.accessToken);
    }
    const data = res.data.data;
    if (data.user && !data.user._id && data.user.id) {
      data.user._id = data.user.id;
    }
    return data;
  },

  logout: async (): Promise<void> => {
    try {
      await apiClient.post("/auth/logout");
    } finally {
      setAccessToken(null);
    }
  },

  getMe: async (): Promise<User> => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const res = await apiClient.get<ApiResponse<any>>("/auth/me");
    const user = res.data.data?.user || res.data.data;
    if (user && !user._id && user.id) {
      user._id = user.id;
    }
    return user;
  },

  refresh: async (): Promise<string> => {
    const res = await apiClient.post<ApiResponse<{ accessToken: string }>>(
      "/auth/refresh"
    );
    setAccessToken(res.data.data.accessToken);
    return res.data.data.accessToken;
  },
};
