export class SessionExpiredError extends Error {
  constructor() {
    super("Sessão expirada. Redirecionando para o login...");
    this.name = "SessionExpiredError";
  }
}

export async function fetchWithAuth(input: RequestInfo, init?: RequestInit): Promise<Response> {
  const response = await fetch(input, init);

  if (response.status === 401) {
    throw new SessionExpiredError();
  }

  return response;
}
