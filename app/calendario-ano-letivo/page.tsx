import { auth } from "@/auth";
import DashboardShell from "../dashboard/dashboard-shell";
import { redirect } from "next/navigation";
import SchoolYearCalendar from "./school-year-calendar";

export default async function SchoolYearCalendarPage() {
  const session = await auth();

  if (!session?.user || !session.accessToken || session.error) {
    redirect("/login");
  }

  return (
    <DashboardShell>
      <main className="dashboard portal-page">
        <SchoolYearCalendar />
      </main>
    </DashboardShell>
  );
}
