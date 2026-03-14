import axios, { type AxiosInstance } from "axios";
import type { OAuthConfig, OAuthTokenResponse } from "./types.js";
import { extractError } from "../utils/errors.js";

const DEFAULT_API_URL = "https://api.tailscale.com";
const TOKEN_REFRESH_BUFFER_MS = 60_000; // Refresh 60s before expiry

export class TailscaleOAuthClient {
  private readonly http: AxiosInstance;
  private readonly config: OAuthConfig;
  private accessToken: string | null = null;
  private tokenExpiresAt: number = 0;

  constructor(config: OAuthConfig) {
    this.config = config;

    const baseURL = config.apiUrl ?? DEFAULT_API_URL;

    this.http = axios.create({
      baseURL: `${baseURL}/api/v2`,
      timeout: config.timeout ?? 30000,
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
    });

    // Intercept requests to inject fresh token
    this.http.interceptors.request.use(async (reqConfig) => {
      const token = await this.getToken();
      reqConfig.headers.Authorization = `Bearer ${token}`;
      return reqConfig;
    });
  }

  get tailnet(): string {
    return this.config.tailnet;
  }

  private async getToken(): Promise<string> {
    if (this.accessToken && Date.now() < this.tokenExpiresAt - TOKEN_REFRESH_BUFFER_MS) {
      return this.accessToken;
    }
    return this.refreshToken();
  }

  private async refreshToken(): Promise<string> {
    const baseURL = this.config.apiUrl ?? DEFAULT_API_URL;

    const params = new URLSearchParams({
      grant_type: "client_credentials",
      client_id: this.config.clientId,
      client_secret: this.config.clientSecret,
    });

    try {
      const response = await axios.post<OAuthTokenResponse>(
        `${baseURL}/api/v2/oauth/token`,
        params.toString(),
        {
          headers: { "Content-Type": "application/x-www-form-urlencoded" },
          timeout: this.config.timeout ?? 30000,
        },
      );

      this.accessToken = response.data.access_token;
      this.tokenExpiresAt = Date.now() + response.data.expires_in * 1000;
      return this.accessToken;
    } catch (error: unknown) {
      throw extractError(error, "POST /oauth/token");
    }
  }

  async get<T>(path: string, params?: Record<string, unknown>): Promise<T> {
    try {
      const response = await this.http.get<T>(path, { params });
      return response.data;
    } catch (error: unknown) {
      throw extractError(error, `GET ${path}`);
    }
  }

  async post<T>(path: string, data?: unknown): Promise<T> {
    try {
      const response = await this.http.post<T>(path, data ?? {});
      return response.data;
    } catch (error: unknown) {
      throw extractError(error, `POST ${path}`);
    }
  }

  async put<T>(path: string, data?: unknown): Promise<T> {
    try {
      const response = await this.http.put<T>(path, data ?? {});
      return response.data;
    } catch (error: unknown) {
      throw extractError(error, `PUT ${path}`);
    }
  }

  async patch<T>(path: string, data?: unknown): Promise<T> {
    try {
      const response = await this.http.patch<T>(path, data ?? {});
      return response.data;
    } catch (error: unknown) {
      throw extractError(error, `PATCH ${path}`);
    }
  }

  async delete<T>(path: string): Promise<T> {
    try {
      const response = await this.http.delete<T>(path);
      return response.data;
    } catch (error: unknown) {
      throw extractError(error, `DELETE ${path}`);
    }
  }

  async deleteVoid(path: string): Promise<void> {
    try {
      await this.http.delete(path);
    } catch (error: unknown) {
      throw extractError(error, `DELETE ${path}`);
    }
  }

  async postVoid(path: string, data?: unknown): Promise<void> {
    try {
      await this.http.post(path, data ?? {});
    } catch (error: unknown) {
      throw extractError(error, `POST ${path}`);
    }
  }
}
