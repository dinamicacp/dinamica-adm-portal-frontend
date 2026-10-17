const DEFAULT_API_BASE_URL = "http://localhost:9999";

function normalizeApiPath(path: string): string {
  const withLeadingSlash = path.startsWith("/") ? path : `/${path}`;
  return withLeadingSlash.replace(/\/+$/, "");
}

function buildApiUrl(resourcePath: string, suffix = ""): URL {
  const baseUrl = process.env.API_BASE_URL ?? DEFAULT_API_BASE_URL;
  const parsedBaseUrl = new URL(baseUrl);

  if (
    parsedBaseUrl.protocol === "http:" &&
    parsedBaseUrl.hostname !== "localhost" &&
    parsedBaseUrl.hostname !== "127.0.0.1"
  ) {
    throw new Error(
      "API_BASE_URL deve usar HTTPS em ambientes remotos para preservar o header Authorization.",
    );
  }

  return new URL(`${normalizeApiPath(resourcePath)}${suffix}`, parsedBaseUrl);
}

export function getUsersApiUrl(suffix = ""): URL {
  return buildApiUrl(process.env.USERS_API_PATH ?? "/users", suffix);
}

export function getAcademicCalendarApiUrl(suffix = ""): URL {
  return buildApiUrl(
    process.env.ACADEMIC_CALENDAR_API_PATH ?? "/academic-calendar",
    suffix,
  );
}
