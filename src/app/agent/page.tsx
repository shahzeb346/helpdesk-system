
import { redirect } from "next/navigation";
import { hasRole } from "@/lib/permissions";
import LogoutButton from "@/components/logout-button";
import AgentTicketsDashboard from "@/components/agent-tickets-dashboard";

export const dynamic = "force-dynamic";

export default async function AgentDashboard() {
  const user = await hasRole("agent");

  if (!user) redirect("/dashboard");

  return (
    <main className="min-h-screen bg-slate-50 p-6 md:p-8">
      <div className="mx-auto max-w-7xl">
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-slate-900">
              IT Support Workspace
            </h1>
            <p className="mt-2 text-slate-600">
              Welcome, {user.name}. Manage your assigned support tickets here.
            </p>
          </div>
          <LogoutButton />
        </div>

        <AgentTicketsDashboard />
      </div>
    </main>
  );
}
