interface ApiErrorBody {
  error: { code: string; message: string };
}

export async function apiFetch<T>(input: string, init?: RequestInit): Promise<T> {
  const res = await fetch(input, {
    ...init,
    headers:
      init?.body && !(init.body instanceof FormData)
        ? { "Content-Type": "application/json", ...init.headers }
        : init?.headers,
  });

  if (!res.ok) {
    let message = `Request gagal (${res.status})`;
    try {
      const body: ApiErrorBody = await res.json();
      message = body.error?.message ?? message;
    } catch {
      // response bukan JSON, pakai pesan default
    }
    throw new Error(message);
  }

  return res.json() as Promise<T>;
}
