
"use client";

import { signOut } from "next-auth/react";

export default function LogoutButton() {
  return (
    <button
      onClick={() => signOut({ callbackUrl: "/login" })}
      className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium hover:bg-slate-100"
    >
      Log out
    </button>
  );
}
