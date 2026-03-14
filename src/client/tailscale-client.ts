import axios, { type AxiosInstance } from "axios";
import type { TailscaleConfig } from "./types.js";
import { extractError } from "../utils/errors.js";

const DEFAULT_API_URL = "https://api.tailscale.com";

export class TailscaleClient {
  private readonly http: AxiosInstance;
  private readonly config: TailscaleConfig;

  constructor(config: TailscaleConfig) {
    this.config = config;

    const baseURL = config.apiUrl ?? DEFAULT_API_URL;

    this.http = axios.create({
      baseURL: `${baseURL}/api/v2`,
      timeout: config.timeout ?? 30000,
      headers: {
        Authorization: `Bearer ${config.apiKey}`,
        "Content-Type": "application/json",
        Accept: "application/json",
      },
    });
  }

  get tailnet(): string {
    return this.config.tailnet;
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

  /** DELETE that returns void (204 No Content) */
  async deleteVoid(path: string): Promise<void> {
    try {
      await this.http.delete(path);
    } catch (error: unknown) {
      throw extractError(error, `DELETE ${path}`);
    }
  }

  /** POST that returns void (204 No Content) */
  async postVoid(path: string, data?: unknown): Promise<void> {
    try {
      await this.http.post(path, data ?? {});
    } catch (error: unknown) {
      throw extractError(error, `POST ${path}`);
    }
  }

  static fromEnv(): TailscaleClient {
    const apiKey = process.env["TAILSCALE_API_KEY"];
    if (!apiKey) {
      throw new Error("TAILSCALE_API_KEY environment variable is required");
    }

    const tailnet = process.env["TAILSCALE_TAILNET"];
    if (!tailnet) {
      throw new Error("TAILSCALE_TAILNET environment variable is required");
    }

    const apiUrl = process.env["TAILSCALE_API_URL"];
    const rawTimeout = parseInt(process.env["TAILSCALE_TIMEOUT"] ?? "30000", 10);
    const timeout = Number.isNaN(rawTimeout) ? 30000 : rawTimeout;

    return new TailscaleClient({ apiKey, tailnet, apiUrl, timeout });
  }
}
