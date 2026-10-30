
"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

type Ticket = {
  _id: string;
  ticketNumber: string;
  title: string;
  priority: "Low" | "Medium" | "High" | "Urgent";
  status:
    | "Open"
    | "In Progress"
    | "Waiting on User"
    | "Resolved"
    | "Closed";
  createdAt: string;
  category?: {
    name: string;
  } | null;
  createdBy?: {
    name: string;
    email: string;
  } | null;
};

export default function AgentDashboardPage() {
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    async function loadTickets() {
      try {
        const response = await fetch("/api/agent/tickets");
        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.message || "Unable to load tickets.");
        }

        setTickets(data.tickets ?? []);
      } catch (err) {
        setError(
          err instanceof Error
            ? err.message
            : "Something went wrong."
        );
      } finally {
        setLoading(false);
      }
    }

    loadTickets();
  }, []);

  const openTickets = tickets.filter(
    (ticket) =>
      ticket.status === "Open" ||
      ticket.status === "In Progress" ||
      ticket.status === "Waiting on User"
  ).length;

  const resolvedTickets = tickets.filter(
    (ticket) => ticket.status === "Resolved"
  ).length;

  const urgentTickets = tickets.filter(
    (ticket) =>
      ticket.priority === "Urgent" &&
      ticket.status !== "Resolved" &&
      ticket.status !== "Closed"
  ).length;

  const stats = [
    {
      label: "Assigned Tickets",
      value: tickets.length,
      color: "bg-indigo-50 text-indigo-700",
    },
    {
      label: "Active Tickets",
      value: openTickets,
      color: "bg-blue-50 text-blue-700",
    },
    {
      label: "Resolved Tickets",
      value: resolvedTickets,
      color: "bg-emerald-50 text-emerald-700",
    },
    {
      label: "Urgent Tickets",
      value: urgentTickets,
      color: "bg-red-50 text-red-700",
    },
  ];

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-8 sm:px-6 lg:px-10">
      <div className="mx-auto max-w-7xl">
        <div className="mb-8">
          <p className="text-sm font-semibold uppercase tracking-wider text-indigo-600">
            Campus HelpDesk
          </p>

          <h1 className="mt-2 text-3xl font-bold text-slate-900">
            Agent Dashboard
          </h1>

          <p className="mt-2 text-slate-600">
            Manage your assigned tickets and support requests.
          </p>
        </div>

        <div className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {stats.map((stat) => (
            <div
              key={stat.label}
              className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
            >
              <p className="text-sm text-slate-500">{stat.label}</p>

              <p
                className={`mt-4 inline-flex min-w-12 items-center justify-center rounded-xl px-3 py-2 text-2xl font-bold ${stat.color}`}
              >
                {loading ? "—" : stat.value}
              </p>
            </div>
          ))}
        </div>

        <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-200 px-5 py-5 sm:px-6">
            <h2 className="text-lg font-bold text-slate-900">
              My Assigned Tickets
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              Tickets assigned to your agent account.
            </p>
          </div>

          {loading ? (
            <div className="p-8 text-center text-slate-500">
              Loading tickets...
            </div>
          ) : error ? (
            <div className="p-8 text-center">
              <p className="font-medium text-red-600">{error}</p>
              <p className="mt-2 text-sm text-slate-500">
                Check your login role and agent tickets API.
              </p>
            </div>
          ) : tickets.length === 0 ? (
            <div className="p-10 text-center">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-600">
                <span className="text-2xl">📋</span>
              </div>

              <h3 className="mt-4 font-semibold text-slate-900">
                No assigned tickets yet
              </h3>

              <p className="mt-2 text-sm text-slate-500">
                Tickets assigned to you will appear here.
              </p>
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {tickets.map((ticket) => (
                <article
                  key={ticket._id}
                  className="p-5 transition hover:bg-slate-50 sm:px-6"
                >
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                    <div className="min-w-0">
                      <p className="text-xs font-semibold text-indigo-600">
                        {ticket.ticketNumber}
                      </p>

                      <h3 className="mt-1 break-words font-semibold text-slate-900">
                        {ticket.title}
                      </h3>

                      <p className="mt-2 text-sm text-slate-500">
                        Student/faculty:{" "}
                        {ticket.createdBy?.name ?? "Unknown"}
                      </p>

                      <p className="mt-1 text-sm text-slate-500">
                        Category: {ticket.category?.name ?? "Uncategorized"}
                      </p>
                    </div>

                    <div className="flex flex-wrap gap-2">
                      <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-700">
                        {ticket.status}
                      </span>

                      <span
                        className={`rounded-full px-3 py-1 text-xs font-semibold ${
                          ticket.priority === "Urgent"
                            ? "bg-red-100 text-red-700"
                            : ticket.priority === "High"
                              ? "bg-orange-100 text-orange-700"
                              : ticket.priority === "Medium"
                                ? "bg-amber-100 text-amber-700"
                                : "bg-emerald-100 text-emerald-700"
                        }`}
                      >
                        {ticket.priority}
                      </span>
                    </div>
                  </div>

                  <div className="mt-4 flex flex-col gap-3 border-t border-slate-100 pt-4 sm:flex-row sm:items-center sm:justify-between">
                    <p className="text-xs text-slate-500">
                      Created:{" "}
                      {new Date(ticket.createdAt).toLocaleDateString()}
                    </p>

                    <Link
                      href={`/agent/tickets/${ticket._id}`}
                      className="inline-flex w-fit items-center rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-indigo-700"
                    >
                      Manage Ticket →
                    </Link>
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
