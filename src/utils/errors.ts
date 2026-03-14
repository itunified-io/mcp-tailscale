import axios from "axios";

export class TailscaleApiError extends Error {
  readonly status: number | undefined;
  readonly endpoint: string;
  readonly details: string | undefined;

  constructor(
    message: string,
    endpoint: string,
    status?: number,
    details?: string,
  ) {
    super(message);
    this.name = "TailscaleApiError";
    this.endpoint = endpoint;
    this.status = status;
    this.details = details;
  }
}

export function extractError(
  error: unknown,
  endpoint: string,
): TailscaleApiError {
  if (error instanceof TailscaleApiError) {
    return error;
  }

  if (error instanceof Error && !axios.isAxiosError(error)) {
    return new TailscaleApiError(error.message, endpoint);
  }

  if (axios.isAxiosError(error)) {
    const response = error.response;

    if (response) {
      const data = response.data as { message?: string } | undefined;
      const message =
        typeof data?.message === "string"
          ? data.message
          : `Tailscale API error: ${response.status} ${response.statusText}`;

      return new TailscaleApiError(message, endpoint, response.status);
    }

    if (
      error.code === "ECONNREFUSED" ||
      error.code === "ENOTFOUND" ||
      error.code === "ETIMEDOUT"
    ) {
      return new TailscaleApiError(
        `Network error: ${error.code} — unable to reach Tailscale API`,
        endpoint,
      );
    }

    return new TailscaleApiError(
      error.message || "Unknown network error",
      endpoint,
    );
  }

  if (error instanceof Error) {
    return new TailscaleApiError(error.message, endpoint);
  }

  return new TailscaleApiError("Unknown error occurred", endpoint);
}
