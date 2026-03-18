import { auth } from "@/auth";
import { NextRequest, NextResponse } from "next/server";

type RouteContext = {
  params: Promise<{ username: string }>;
};

type UserStatusRequestBody = {
  enabled?: unknown;
};

function extractEnabledValue(payload: unknown): boolean | null {
  if (typeof payload !== "object" || payload === null) {
    return null;
  }

  const root = payload as Record<string, unknown>;

  if (typeof root.enabled === "boolean") {
    return root.enabled;
  }

  if (typeof root.data === "object" && root.data !== null) {
    const data = root.data as Record<string, unknown>;
    if (typeof data.enabled === "boolean") {
      return data.enabled;
    }
  }

  return null;
}

function normalizeUsersApiPath(path: string): string {
  const withLeadingSlash = path.startsWith("/") ? path : `/${path}`;
  return withLeadingSlash.replace(/\/+$/, "");
}

export async function PATCH(request: NextRequest, context: RouteContext) {
  const session = await auth();

  if (!session?.accessToken || session.error) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }

  const { username } = await context.params;

  if (!username) {
    return NextResponse.json({ success: false, error: "Username is required" }, { status: 400 });
  }

  const usersApiBaseUrl = process.env.USERS_API_BASE_URL ?? "http://localhost:5454";
  const usersApiPath = normalizeUsersApiPath(process.env.USERS_API_PATH ?? "/users");
  const upstreamUrl = new URL(`${usersApiPath}/${encodeURIComponent(username)}/status`, usersApiBaseUrl);

  const body: UserStatusRequestBody = await request.json().catch(() => ({}));
  const expectedEnabled = body.enabled;

  if (typeof expectedEnabled !== "boolean") {
    return NextResponse.json(
      {
        success: false,
        error: "Request body must include enabled as boolean",
      },
      { status: 400 },
    );
  }

  const response = await fetch(upstreamUrl.toString(), {
    method: "PATCH",
    headers: {
      Authorization: `Bearer ${session.accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body ?? {}),
    cache: "no-store",
  });

  if (!response.ok) {
    const responseText = await response.text();

    return new NextResponse(responseText, {
      status: response.status,
      headers: {
        "Content-Type": response.headers.get("content-type") ?? "application/json",
      },
    });
  }

  const verifyUrl = new URL(`${usersApiPath}/${encodeURIComponent(username)}`, usersApiBaseUrl);
  const verifyResponse = await fetch(verifyUrl.toString(), {
    method: "GET",
    headers: {
      Authorization: `Bearer ${session.accessToken}`,
      "Content-Type": "application/json",
    },
    cache: "no-store",
  });

  if (!verifyResponse.ok) {
    return NextResponse.json(
      {
        success: false,
        error: "Status atualizado, mas nao foi possivel verificar o usuario",
      },
      { status: 502 },
    );
  }

  const verifyPayload: unknown = await verifyResponse.json().catch(() => null);
  const currentEnabled = extractEnabledValue(verifyPayload);

  if (typeof currentEnabled !== "boolean") {
    return NextResponse.json(
      {
        success: false,
        error: "Nao foi possivel ler o campo enabled na validacao",
      },
      { status: 502 },
    );
  }

  if (currentEnabled !== expectedEnabled) {
    return NextResponse.json(
      {
        success: false,
        error: "A validacao de status falhou",
        expectedEnabled,
        currentEnabled,
      },
      { status: 409 },
    );
  }

  return NextResponse.json({
    success: true,
    username,
    enabled: currentEnabled,
  });
}
