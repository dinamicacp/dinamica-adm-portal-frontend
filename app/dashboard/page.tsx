import { auth, signOut } from "@/auth";
import Link from "next/link";
import { redirect } from "next/navigation";

const USERS_PAGE_SIZE = 20;

type DashboardPageProps = {
  searchParams: Promise<{ page?: string }>;
};

type StudentUser = {
  id: string;
  firstName: string;
  lastName: string;
  displayName: string;
  username: string;
  email: string;
  enabled: boolean;
};

type UsersApiResponse = {
  success: boolean;
  data: StudentUser[];
  count: number;
};

function parsePageParam(page?: string): number {
  const parsed = Number(page);

  if (!Number.isInteger(parsed) || parsed < 1) {
    return 1;
  }

  return parsed;
}

function readStringField(record: Record<string, unknown>, ...keys: string[]): string {
  for (const key of keys) {
    const value = record[key];

    if (typeof value === "string" && value.trim().length > 0) {
      return value.trim();
    }

    if (Array.isArray(value)) {
      const first = value[0];

      if (typeof first === "string" && first.trim().length > 0) {
        return first.trim();
      }
    }
  }

  return "";
}

function normalizeStudentUser(item: unknown): StudentUser {
  const record = typeof item === "object" && item !== null ? (item as Record<string, unknown>) : {};

  const firstName = readStringField(record, "firstName");
  const lastName = readStringField(record, "lastName");
  const fallbackDisplayName = `${firstName} ${lastName}`.trim();
  const displayName = readStringField(record, "displayName") || fallbackDisplayName;
  const username = readStringField(record, "username");
  const email = readStringField(record, "email");
  const id = readStringField(record, "id") || username || email || displayName;

  const enabledRaw = record.enabled ?? true;
  const enabled =
    typeof enabledRaw === "boolean"
      ? enabledRaw
      : ["true", "1", "yes", "sim"].includes(String(enabledRaw).toLowerCase());

  return {
    id,
    firstName,
    lastName,
    displayName,
    username,
    email,
    enabled,
  };
}

function belongsToStudentsOu(item: unknown, targetOu: string): boolean {
  const record = typeof item === "object" && item !== null ? (item as Record<string, unknown>) : {};
  const normalizedOu = targetOu.trim().toLowerCase();

  if (!normalizedOu) {
    return true;
  }

  const id = readStringField(record, "id").toLowerCase();
  
  if (id.includes(`ou=${normalizedOu}`)) {
    return true;
  }
  
  // If the API already returns a simplified shape without OU metadata,
  // keep the record and rely on the server-side query parameter filter.
  return id.length === 0;
}

async function fetchStudentUsers(accessToken: string): Promise<StudentUser[]> {
  const usersApiBaseUrl = process.env.USERS_API_BASE_URL ?? "http://localhost:9999";
  const usersApiPath = process.env.USERS_API_PATH ?? "/users";
  const targetOu = process.env.USERS_API_TARGET_OU ?? "Alunos";
  const usersUrlObject = new URL(usersApiPath, usersApiBaseUrl);
  usersUrlObject.searchParams.set("ou", targetOu);
  const usersUrl = usersUrlObject.toString();

  const response = await fetch(usersUrl, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error(`Erro ao consultar usuarios (${response.status})`);
  }

  const payload: unknown = await response.json();

  if (typeof payload !== "object" || payload === null) {
    throw new Error("Resposta invalida da API de usuarios");
  }

  const body = payload as Partial<UsersApiResponse>;

  if (!body.success || !Array.isArray(body.data)) {
    throw new Error("A API de usuarios retornou um formato inesperado");
  }

  return body.data
    .filter((item) => belongsToStudentsOu(item, targetOu))
    .map((item) => normalizeStudentUser(item));
}

export default async function DashboardPage({ searchParams }: DashboardPageProps) {
  const session = await auth();

  if (!session?.user || !session.accessToken || session.error) {
    redirect("/login");
  }

  const params = await searchParams;
  const requestedPage = parsePageParam(params.page);

  let users: StudentUser[] = [];
  let usersApiError: string | null = null;

  try {
    users = await fetchStudentUsers(session.accessToken);
  } catch {
    usersApiError = "Nao foi possivel carregar os usuarios no momento.";
  }

  const totalUsers = users.length;
  const totalPages = Math.max(1, Math.ceil(totalUsers / USERS_PAGE_SIZE));
  const currentPage = Math.min(requestedPage, totalPages);
  const startIndex = (currentPage - 1) * USERS_PAGE_SIZE;
  const endIndex = startIndex + USERS_PAGE_SIZE;
  const usersFromCurrentPage = users.slice(startIndex, endIndex);

  const buildPageHref = (page: number) => (page === 1 ? "/dashboard" : `/dashboard?page=${page}`);

  return (
    <main className="dashboard">
      <section className="dashboard-card">
        <header className="dashboard-header">
          <div>
            <h1>Dashboard</h1>
            <p>
              Sessao iniciada com <strong>{session.user.email}</strong>
            </p>
            <p className="dashboard-meta">{totalUsers} usuarios encontrados no diretorio</p>
          </div>

          <form
            action={async () => {
              "use server";
              await signOut({ redirectTo: "/login" });
            }}
          >
            <button className="auth-button" type="submit">
              Sair
            </button>
          </form>
        </header>

        {usersApiError ? <p className="dashboard-error">{usersApiError}</p> : null}

        {!usersApiError ? (
          <>
            <div className="dashboard-table-wrapper">
              <table className="dashboard-table">
                <thead>
                  <tr>
                    <th>Nome</th>
                    <th>Sobrenome</th>
                    <th>Login</th>
                    <th>Status</th>
                    <th>Email</th>
                  </tr>
                </thead>
                <tbody>
                  {usersFromCurrentPage.length > 0 ? (
                    usersFromCurrentPage.map((user, index) => {
                      console.log("Renderizando usuario:", user);
                      const keyBase = user.id || user.username || user.email || "user";

                      return (
                      <tr key={`${keyBase}-${startIndex + index}`}>
                        <td>{user.firstName || user.displayName || "-"}</td>
                        <td>{user.lastName || "-"}</td>
                        <td>{user.username || "-"}</td>
                        <td>
                          <span className={user.enabled ? "status-pill enabled" : "status-pill disabled"}>
                            {user.enabled ? "Ativo" : "Inativo"}
                          </span>
                        </td>
                        <td className="dn-cell">{user.email || "-"}</td>
                      </tr>
                      );
                    })
                  ) : (
                    <tr>
                      <td colSpan={5} className="dashboard-empty-state">
                        Nenhum usuario retornado pela API.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            <div className="dashboard-pagination">
              {currentPage > 1 ? (
                <Link href={buildPageHref(currentPage - 1)} className="pagination-link">
                  Anterior
                </Link>
              ) : (
                <span className="pagination-link disabled">Anterior</span>
              )}

              <span className="pagination-info">
                Pagina {currentPage} de {totalPages}
              </span>

              {currentPage < totalPages ? (
                <Link href={buildPageHref(currentPage + 1)} className="pagination-link">
                  Proxima
                </Link>
              ) : (
                <span className="pagination-link disabled">Proxima</span>
              )}
            </div>
          </>
        ) : null}
      </section>
    </main>
  );
}
