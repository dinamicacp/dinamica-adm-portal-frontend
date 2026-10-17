import { auth } from "@/auth";
import { getAcademicCalendarApiUrl } from "@/lib/api-url";
import { NextRequest, NextResponse } from "next/server";

const CALENDAR_EVENT_TYPES = ["HOLIDAY", "HOLIDAY_BRIDGE", "RECESS"] as const;

type CalendarEventType = (typeof CALENDAR_EVENT_TYPES)[number];

type SaveCalendarBody = {
  dates?: unknown;
  type?: unknown;
  description?: unknown;
};

type DeleteCalendarBody = {
  dates?: unknown;
};

function readDates(value: unknown): string[] | null {
  if (
    !Array.isArray(value) ||
    value.length === 0 ||
    value.some((date) => typeof date !== "string")
  ) {
    return null;
  }

  return [...new Set(value.map((date) => date.trim()))];
}

async function proxyResponse(response: Response): Promise<NextResponse> {
  const responseText = await response.text();

  return new NextResponse(responseText, {
    status: response.status,
    headers: {
      "Content-Type": response.headers.get("content-type") ?? "application/json",
    },
  });
}

async function getAccessToken(): Promise<string | null> {
  const session = await auth();
  return session?.accessToken && !session.error ? session.accessToken : null;
}

export async function GET(request: NextRequest) {
  const accessToken = await getAccessToken();

  if (!accessToken) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }

  const year = request.nextUrl.searchParams.get("year");

  if (!year || !/^\d{4}$/.test(year)) {
    return NextResponse.json(
      { success: false, error: "O parâmetro year é obrigatório e deve ter quatro dígitos" },
      { status: 400 },
    );
  }

  const upstreamUrl = getAcademicCalendarApiUrl();
  upstreamUrl.searchParams.set("year", year);

  const response = await fetch(upstreamUrl, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    cache: "no-store",
  });

  return proxyResponse(response);
}

export async function PUT(request: NextRequest) {
  const accessToken = await getAccessToken();

  if (!accessToken) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }

  const body: SaveCalendarBody = await request.json().catch(() => ({}));
  const dates = readDates(body.dates);
  const type = body.type;

  if (!dates) {
    return NextResponse.json(
      { success: false, error: "Informe ao menos uma data válida" },
      { status: 400 },
    );
  }

  if (
    typeof type !== "string" ||
    !CALENDAR_EVENT_TYPES.includes(type as CalendarEventType)
  ) {
    return NextResponse.json(
      { success: false, error: "Tipo de evento inválido" },
      { status: 400 },
    );
  }

  const description =
    typeof body.description === "string" ? body.description.trim() || null : null;
  const response = await fetch(getAcademicCalendarApiUrl("/batch"), {
    method: "PUT",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ dates, type, description }),
    cache: "no-store",
  });

  return proxyResponse(response);
}

export async function DELETE(request: NextRequest) {
  const accessToken = await getAccessToken();

  if (!accessToken) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }

  const body: DeleteCalendarBody = await request.json().catch(() => ({}));
  const dates = readDates(body.dates);

  if (!dates) {
    return NextResponse.json(
      { success: false, error: "Informe ao menos uma data válida" },
      { status: 400 },
    );
  }

  const response = await fetch(getAcademicCalendarApiUrl("/batch"), {
    method: "DELETE",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ dates }),
    cache: "no-store",
  });

  return proxyResponse(response);
}
