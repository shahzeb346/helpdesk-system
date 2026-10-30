
import { auth } from "@/lib/auth";
import { connectDB } from "@/lib/mongodb";
import User from "@/models/User";
import type { UserRole } from "@/models/User";

export async function getActiveUser() {
  const session = await auth();

  if (!session?.user?.id) {
    return null;
  }

  await connectDB();

  // Read the current account and role from MongoDB.
  return User.findOne({
    _id: session.user.id,
    active: true,
  }).select("_id name email role active");
}

export async function hasRole(...roles: UserRole[]) {
  const user = await getActiveUser();

  if (!user || !roles.includes(user.role)) {
    return null;
  }

  return user;
}
