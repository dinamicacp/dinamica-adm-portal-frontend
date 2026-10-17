import { auth } from "@/auth";
import DashboardShell from "./dashboard-shell";
import { redirect } from "next/navigation";

export default async function DashboardPage() {
  const session = await auth();

  if (!session?.user || !session.accessToken || session.error) {
    redirect("/login");
  }

  return (
    <DashboardShell>
      <main className="dashboard">
        <section className="dashboard-card dashboard-welcome-card">
          <p className="dashboard-eyebrow">Portal ADM</p>
          <h1>Bem-vindo ao dashboard</h1>
          <p className="dashboard-welcome-description">
            Selecione uma opção no menu lateral para acessar as funcionalidades disponíveis.
          </p>
        </section>
      </main>
    </DashboardShell>
  );
}
