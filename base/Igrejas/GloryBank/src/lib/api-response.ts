export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  errors?: Record<string, string[]>;
}

export function successResponse<T>(data: T, status = 200): Response {
  return Response.json({ success: true, data }, { status });
}

export function errorResponse(
  error: string,
  status = 400,
  errors?: Record<string, string[]>
): Response {
  return Response.json({ success: false, error, errors }, { status });
}

export function rateLimitResponse(resetAt: number): Response {
  return Response.json(
    { success: false, error: "Muitas tentativas. Tente novamente mais tarde." },
    {
      status: 429,
      headers: {
        "Retry-After": String(Math.ceil((resetAt - Date.now()) / 1000)),
      },
    }
  );
}
