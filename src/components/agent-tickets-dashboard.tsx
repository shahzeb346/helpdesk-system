
"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";

interface AgentTicket {
  _id: string;
  ticketNumber: string;
  title: string;
  description?: string;
  category?: {
    name: string;
  };
  priority: string;
  status: string;
  createdBy?: {
    name: string;
    email?: string;
  };
  createdAt?: string;
}

export default function AgentTicketsDashboard() {
  const [tickets, setTickets] = useState<AgentTicket[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const fetchTickets = useCallback(async () => {
    try {
      setLoading(true);
      setError("");

      const response = await fetch("/api/agent/tickets", {
        cache: "no-store",
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.message || "Failed to load tickets.");
      }

      setTickets(data.tickets || []);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Something went wrong."
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchTickets();
  }, [fetchTickets]);

  const openTickets = tickets.filter(
    (ticket) => ticket.status === "Open"
  ).length;

  const inProgressTickets = tickets.filter(
    (ticket) => ticket.status === "In Progress"
  ).length;

  const resolvedTickets = tickets.filter(
    (ticket) =>
      ticket.status === "Resolved" || ticket.status === "Closed"
  ).length;

  const getStatusStyle = (status: string) => {
    switch (status) {
      case "Open":
        return "bg-blue-100 text-blue-700";
      case "In Progress":
        return "bg-amber-100 text-amber-700";
      case "Waiting on User":
        return "bg-purple-100 text-purple-700";
      case "Resolved":
        return "bg-green-100 text-green-700";
      case "Closed":
        return "bg-slate-200 text-slate-700";
      default:
        return "bg-slate-100 text-slate-700";
    }
  };

  const getPriorityStyle = (priority: string) => {
    switch (priority) {
      case "Urgent":
        return "text-red-600";
      case "High":
        return "text-orange-600";
      case "Medium":
        return "text-amber-600";
      case "Low":
        return "text-green-600";
      default:
        return "text-slate-600";
    }
  };

  if (loading) {
    return (
      <div className="rounded-xl bg-white p-10 text-center shadow-sm">
        <p className="text-slate-600">Loading your assigned tickets...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-xl border border-red-200 bg-red-50 p-6">
        <p className="font-medium text-red-700">{error}</p>
        <button
          onClick={fetchTickets}
          className="mt-4 rounded-lg bg-red-600 px-4 py-2 text-white hover:bg-red-700"
        >
          Try Again
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Statistics */}
      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard title="Total Assigned" value={tickets.length} />
        <StatCard title="Open Tickets" value={openTickets} />
        <StatCard title="In Progress" value={inProgressTickets} />
        <StatCard title="Resolved / Closed" value={resolvedTickets} />
      </div>

      {/* Tickets */}
      <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 p-5">
          <div>
            <h2 className="text-xl font-bold text-slate-900">
              My Assigned Tickets
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              Tickets assigned to your support account
            </p>
          </div>

          <button
            onClick={fetchTickets}
            className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
          >
            Refresh
          </button>
        </div>

        {tickets.length === 0 ? (
          <div className="p-12 text-center">
            <h3 className="text-lg font-semibold text-slate-800">
              No assigned tickets
            </h3>
            <p className="mt-2 text-sm text-slate-500">
              New tickets assigned to you will appear here.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[850px] text-left text-sm">
              <thead className="bg-slate-50 text-xs uppercase text-slate-500">
                <tr>
                  <th className="px-5 py-4">Ticket</th>
                  <th className="px-5 py-4">Title</th>
                  <th className="px-5 py-4">Category</th>
                  <th className="px-5 py-4">Student / Faculty</th>
                  <th className="px-5 py-4">Priority</th>
                  <th className="px-5 py-4">Status</th>
                  <th className="px-5 py-4">Action</th>
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-100">
                {tickets.map((ticket) => (
                  <tr key={ticket._id} className="hover:bg-slate-50">
                    <td className="whitespace-nowrap px-5 py-4 font-semibold text-indigo-600">
                      {ticket.ticketNumber}
                    </td>

                    <td className="max-w-[220px] px-5 py-4 font-medium text-slate-800">
                      {ticket.title}
                    </td>

                    <td className="px-5 py-4 text-slate-600">
                      {ticket.category?.name || "N/A"}
                    </td>

                    <td className="px-5 py-4 text-slate-600">
                      {ticket.createdBy?.name || "N/A"}
                    </td>

                    <td className={`px-5 py-4 font-semibold ${getPriorityStyle(ticket.priority)}`}>
                      {ticket.priority}
                    </td>

                    <td className="px-5 py-4">
                      <span
                        className={`whitespace-nowrap rounded-full px-3 py-1 text-xs font-semibold ${getStatusStyle(ticket.status)}`}
                      >
                        {ticket.status}
                      </span>
                    </td>

                    <td className="px-5 py-4">
                      <Link
                        href={`/agent/tickets/${ticket._id}`}
                        className="whitespace-nowrap rounded-lg bg-indigo-600 px-4 py-2 font-medium text-white hover:bg-indigo-700"
                      >
                        Manage Ticket
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}

function StatCard({
  title,
  value,
}: {
  title: string;
  value: number;
}) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
      <p className="text-sm font-medium text-slate-500">{title}</p>
      <p className="mt-3 text-3xl font-bold text-slate-900">{value}</p>
    </div>
  );
}
