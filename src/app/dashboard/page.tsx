
import { redirect } from "next/navigation";
import { getActiveUser } from "@/lib/permissions";

export const dynamic = "force-dynamic";

export default async function DashboardRedirectPage() {
  const user = await getActiveUser();

  if (!user) {
    redirect("/login");
  }

  switch (user.role) {
    case "admin":
      redirect("/admin");
    case "agent":
      redirect("/agent");
    default:
      redirect("/user");
  }
}
