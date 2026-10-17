import { auth } from "@/auth";
import { getUsersApiUrl } from "@/lib/api-url";
import { NextRequest, NextResponse } from "next/server";

type CreateUserRequestBody = {
  username?: unknown;
  firstName?: unknown;
  lastName?: unknown;
  password?: unknown;
  organizationalUnit?: unknown;
};

export async function POST(request: NextRequest) {
  const session = await auth();

  if (!session?.accessToken || session.error) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }

  const body: CreateUserRequestBody = await request.json().catch(() => ({}));

  const username = typeof body.username === "string" ? body.username.trim() : "";
  const firstName = typeof body.firstName === "string" ? body.firstName.trim() : "";
  const lastName = typeof body.lastName === "string" ? body.lastName.trim() : "";
  const password = typeof body.password === "string" ? body.password.trim() : "";
  const organizationalUnit = typeof body.organizationalUnit === "string" ? body.organizationalUnit.trim() : "";

  // Validations
  if (!username) {
    return NextResponse.json({ success: false, error: "Nome de usuário é obrigatório" }, { status: 400 });
  }

  if (!firstName) {
    return NextResponse.json({ success: false, error: "Nome é obrigatório" }, { status: 400 });
  }

  if (!lastName) {
    return NextResponse.json({ success: false, error: "Sobrenome é obrigatório" }, { status: 400 });
  }

  if (password.length < 3) {
    return NextResponse.json(
      { success: false, error: "A senha deve ter pelo menos 3 caracteres" },
      { status: 400 },
    );
  }

  if (!organizationalUnit) {
    return NextResponse.json(
      { success: false, error: "Unidade organizacional é obrigatória" },
      { status: 400 },
    );
  }

  const upstreamUrl = getUsersApiUrl();

  const response = await fetch(upstreamUrl.toString(), {
    method: "POST",
    headers: {
      Authorization: `Bearer ${session.accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      username,
      firstName,
      lastName,
      password,
      organizationalUnit,
    }),
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
