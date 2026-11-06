let csrfToken = "";

export async function request(
  method: string,
  path: string,
  body?: unknown,
  retried = false,
) {
  const write = method !== "GET" && method !== "HEAD";
  const headers: Record<string, string> = {
    Accept: "application/json",
  };

  if (body !== undefined) {
    headers["Content-Type"] = "application/json";
  }

  if (write) {
    headers["x-csrf-token"] = await loadCsrfToken();
  }

  let response: Response;

  try {
    response = await fetch(`/api${path}`, {
      method,
      headers,
      credentials: "include",
      cache: "no-store",
      body: body === undefined ? undefined : JSON.stringify(body),
    });
  } catch {
    throw Object.assign(new Error("Request failed"), { statusCode: 0 });
  }

  let payload;

  try {
    payload = await response.json();
  } catch {
    throw Object.assign(new Error("Request failed"), {
      statusCode: response.status,
    });
  }

  if (payload.success) {
    if (payload.pagination) {
      return { data: payload.data, pagination: payload.pagination };
    }

    return payload.data;
  }

  if (write && !retried && response.status === 403) {
    csrfToken = "";
    return request(method, path, body, true);
  }

  throw Object.assign(new Error(payload.message), {
    statusCode: payload.statusCode,
  });
}

async function loadCsrfToken() {
  if (csrfToken) return csrfToken;

  const data = await request("GET", "/auth/csrf");
  csrfToken = data.csrfToken;
  return csrfToken;
}
