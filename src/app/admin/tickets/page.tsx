
"use client";

import { useCallback, useEffect, useState } from "react";

type Agent = {
  _id: string;
  name: string;
  email: string;
};

type Ticket = {
  _id: string;
  ticketNumber: string;
  title: string;
  priority: string;
  status: string;
  createdAt: string;
  category?: { name: string } | null;
  createdBy?: { name: string; email: string } | null;
  assignedAgent?: Agent | null;
};

export default function AdminTicketsPage() {
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [agents, setAgents] = useState<Agent[]>([]);
  const [selectedAgents, setSelectedAgents] = useState<
    Record<string, string>
  >({});
  const [loading, setLoading] = useState(true);
  const [assigningId, setAssigningId] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      setError("");

      const response = await fetch("/api/admin/tickets");
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Unable to load tickets.");
      }

      setTickets(data.tickets ?? []);
      setAgents(data.agents ?? []);

      const selections: Record<string, string> = {};

      for (const ticket of data.tickets ?? []) {
        selections[ticket._id] = ticket.assignedAgent?._id ?? "";
      }

      setSelectedAgents(selections);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Something went wrong."
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  async function handleAssign(ticketId: string) {
    const agentId = selectedAgents[ticketId];

    if (!agentId) {
      setError("Please select an agent first.");
      return;
    }

    try {
      setAssigningId(ticketId);
      setError("");
      setSuccess("");

      const response = await fetch(
        `/api/admin/tickets/${ticketId}/assign`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ agentId }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Unable to assign ticket.");
      }

      setSuccess(`${data.message} (${data.ticket.ticketNumber})`);
      await loadData();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Assignment failed."
      );
    } finally {
      setAssigningId("");
    }
  }

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-8 sm:px-6 lg:px-10">
      <div className="mx-auto max-w-7xl">
        <div className="mb-8">
          <p className="text-sm font-semibold uppercase tracking-wider text-indigo-600">
            Campus HelpDesk / Administration
          </p>

          <h1 className="mt-2 text-3xl font-bold text-slate-900">
            Manage Ticket Assignments
          </h1>

          <p className="mt-2 text-slate-600">
            Assign student and faculty support tickets to active agents.
          </p>
        </div>

        <div className="mb-6 grid gap-4 sm:grid-cols-3">
          <div className="rounded-2xl border border-slate-200 bg-white p-5">
            <p className="text-sm text-slate-500">Total Tickets</p>
            <p className="mt-2 text-3xl font-bold text-slate-900">
              {loading ? "—" : tickets.length}
            </p>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-5">
            <p className="text-sm text-slate-500">Available Agents</p>
            <p className="mt-2 text-3xl font-bold text-indigo-600">
              {loading ? "—" : agents.length}
            </p>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-5">
            <p className="text-sm text-slate-500">Unassigned Tickets</p>
            <p className="mt-2 text-3xl font-bold text-orange-600">
              {loading
                ? "—"
                : tickets.filter((ticket) => !ticket.assignedAgent).length}
            </p>
          </div>
        </div>

        {error && (
          <div className="mb-5 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
            {error}
          </div>
        )}

        {success && (
          <div className="mb-5 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-700">
            {success}
          </div>
        )}

        <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="flex flex-col gap-3 border-b border-slate-200 px-5 py-5 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-lg font-bold text-slate-900">
                All Support Tickets
              </h2>
              <p className="mt-1 text-sm text-slate-500">
                Choose an active agent for each ticket.
              </p>
            </div>

            <button
              onClick={loadData}
              disabled={loading}
              className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
            >
              Refresh
            </button>
          </div>

          {loading ? (
            <div className="p-10 text-center text-slate-500">
              Loading tickets...
            </div>
          ) : tickets.length === 0 ? (
            <div className="p-10 text-center text-slate-500">
              No tickets have been created yet.
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {tickets.map((ticket) => (
                <article key={ticket._id} className="p-5 sm:p-6">
                  <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                    <div className="min-w-0">
                      <p className="text-xs font-semibold text-indigo-600">
                        {ticket.ticketNumber}
                      </p>

                      <h3 className="mt-1 break-words font-semibold text-slate-900">
                        {ticket.title}
                      </h3>

                      <p className="mt-2 text-sm text-slate-500">
                        Submitted by: {ticket.createdBy?.name ?? "Unknown"}
                      </p>

                      <p className="mt-1 text-sm text-slate-500">
                        Category: {ticket.category?.name ?? "Uncategorized"}
                      </p>

                      <p className="mt-1 text-sm text-slate-500">
                        Priority: {ticket.priority} · Status: {ticket.status}
                      </p>

                      <p className="mt-1 text-xs text-slate-400">
                        Created:{" "}
                        {new Date(ticket.createdAt).toLocaleDateString()}
                      </p>
                    </div>

                    <div className="w-full rounded-xl bg-slate-50 p-4 lg:max-w-sm">
                      <label
                        htmlFor={`agent-${ticket._id}`}
                        className="mb-2 block text-sm font-semibold text-slate-700"
                      >
                        Assign to agent
                      </label>

                      <select
                        id={`agent-${ticket._id}`}
                        value={selectedAgents[ticket._id] ?? ""}
                        onChange={(event) =>
                          setSelectedAgents((previous) => ({
                            ...previous,
                            [ticket._id]: event.target.value,
                          }))
                        }
                        disabled={ticket.status === "Closed"}
                        className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 disabled:bg-slate-100"
                      >
                        <option value="">Select an agent</option>

                        {agents.map((agent) => (
                          <option key={agent._id} value={agent._id}>
                            {agent.name} ({agent.email})
                          </option>
                        ))}
                      </select>

                      <button
                        onClick={() => handleAssign(ticket._id)}
                        disabled={
                          !selectedAgents[ticket._id] ||
                          assigningId === ticket._id ||
                          ticket.status === "Closed"
                        }
                        className="mt-3 w-full rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        {assigningId === ticket._id
                          ? "Assigning..."
                          : "Assign Ticket"}
                      </button>

                      {ticket.assignedAgent && (
                        <p className="mt-3 text-xs text-emerald-700">
                          Currently assigned to:{" "}
                          {ticket.assignedAgent.name}
                        </p>
                      )}

                      {ticket.status === "Closed" && (
                        <p className="mt-2 text-xs text-slate-500">
                          Closed tickets cannot be reassigned.
                        </p>
                      )}
                    </div>
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
