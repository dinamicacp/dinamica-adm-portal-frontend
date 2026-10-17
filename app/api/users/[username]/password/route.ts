import { auth } from "@/auth";
import { getUsersApiUrl } from "@/lib/api-url";
import { NextRequest, NextResponse } from "next/server";

type RouteContext = {
  params: Promise<{ username: string }>;
};

type PasswordRequestBody = {
  password?: unknown;
};

export async function PATCH(request: NextRequest, context: RouteContext) {
  const session = await auth();

  if (!session?.accessToken || session.error) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }

  const { username } = await context.params;

  if (!username) {
    return NextResponse.json({ success: false, error: "Username is required" }, { status: 400 });
  }

  const body: PasswordRequestBody = await request.json().catch(() => ({}));
  const password = typeof body.password === "string" ? body.password.trim() : "";

  if (password.length < 3) {
    return NextResponse.json(
      {
        success: false,
        error: "A senha deve ter pelo menos 3 caracteres",
      },
      { status: 400 },
    );
  }

  const upstreamUrl = getUsersApiUrl(`/${encodeURIComponent(username)}/password`);

  const response = await fetch(upstreamUrl.toString(), {
    method: "PATCH",
    headers: {
      Authorization: `Bearer ${session.accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ password }),
    cache: "no-store",
  });

  const responseText = await response.text();

  return new NextResponse(responseText, {
    status: response.status,
    headers: {
      "Content-Type": response.headers.get("content-type") ?? "application/json",
    },
  });
}
