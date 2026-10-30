
import Link from "next/link";

export default function Home() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-950 px-6 py-16 text-white">
      <section className="w-full max-w-3xl text-center">
        <div className="mb-6 inline-flex rounded-full border border-indigo-400/30 bg-indigo-400/10 px-4 py-2 text-sm text-indigo-300">
          Helpdesk Management System
        </div>

        <h1 className="text-4xl font-bold tracking-tight sm:text-6xl">
          Support made
          <span className="block text-indigo-400">
            simple.
          </span>
        </h1>

        <p className="mx-auto mt-6 max-w-xl text-base leading-7 text-slate-300 sm:text-lg">
          Create support tickets, track progress, communicate
          with your support team, and resolve issues in one place.
        </p>

        <div className="mt-9 flex flex-col justify-center gap-4 sm:flex-row">
          <Link
            href="/login"
            className="rounded-lg bg-indigo-500 px-6 py-3 font-semibold transition hover:bg-indigo-400"
          >
            Sign in
          </Link>

          <Link
            href="/register"
            className="rounded-lg border border-slate-600 px-6 py-3 font-semibold transition hover:bg-slate-800"
          >
            Create account
          </Link>
        </div>

        <p className="mt-12 text-sm text-slate-500">
          Built with Next.js, TypeScript and Tailwind CSS
        </p>
      </section>
    </main>
  );
}
