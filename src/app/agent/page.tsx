import { redirect } from "next/navigation";
import { hasRole } from "@/lib/permissions";
import LogoutButton from "@/components/logout-button";

export const dynamic = "force-dynamic";

export default async function AgentDashboard() {
  const user = await hasRole("agent");

  if (!user) redirect("/dashboard");

  return (
    <main className="p-8">
      <div className="mb-6 flex justify-end">
        <LogoutButton />
    </div>
      <h1 className="text-3xl font-bold">IT Support Workspace</h1>
      <p className="mt-2 text-slate-600">
        Welcome, {user.name}. Your assigned tickets will appear here.
      </p>
    </main>
  );
}