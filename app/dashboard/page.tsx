import { auth, signOut } from "@/auth";
import { redirect } from "next/navigation";

export default async function DashboardPage() {
  const session = await auth();

  if (!session?.user) {
    redirect("/login");
  }

  return (
    <main className="dashboard">
      <section className="dashboard-card">
        <header className="dashboard-header">
          <div>
            <h1>Dashboard</h1>
            <p>
              Sessao iniciada com <strong>{session.user.email}</strong>
            </p>
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
      </section>
    </main>
  );
}
