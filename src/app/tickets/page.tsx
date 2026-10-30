
"use client";

import { useCallback, useEffect, useState, type FormEvent } from "react";
import Link from "next/link";

type TicketStatus =
  | "Open"
  | "In Progress"
  | "Waiting on User"
  | "Resolved"
  | "Closed";

type TicketPriority = "Low" | "Medium" | "High" | "Urgent";

type TicketItem = {
  _id: string;
  ticketNumber: string;
  title: string;
  description: string;
  category: { _id: string; name: string } | null;
  priority: TicketPriority;
  status: TicketStatus;
  createdAt: string;
  updatedAt: string;
};

type TicketsResponse = {
  success: boolean;
  message?: string;
  tickets?: TicketItem[];
  pagination?: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
};

const statuses = [
  "All statuses",
  "Open",
  "In Progress",
  "Waiting on User",
  "Resolved",
  "Closed",
] as const;

function statusStyle(status: TicketStatus) {
  switch (status) {
    case "Open":
      return "bg-blue-50 text-blue-700";
    case "In Progress":
      return "bg-amber-50 text-amber-700";
    case "Waiting on User":
      return "bg-purple-50 text-purple-700";
    case "Resolved":
      return "bg-emerald-50 text-emerald-700";
    case "Closed":
      return "bg-slate-100 text-slate-600";
    default:
      return "bg-slate-100 text-slate-600";
  }
}

function priorityStyle(priority: TicketPriority) {
  switch (priority) {
    case "Urgent":
      return "text-red-700";
    case "High":
      return "text-orange-700";
    case "Medium":
      return "text-amber-700";
    case "Low":
      return "text-slate-600";
    default:
      return "text-slate-600";
  }
}

function formatDate(value: string) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "Date unavailable";
  }

  return new Intl.DateTimeFormat("en", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

export default function MyTicketsPage() {
  const [tickets, setTickets] = useState<TicketItem[]>([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);

  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("All statuses");

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const loadTickets = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const params = new URLSearchParams({
        page: String(page),
        limit: "10",
      });

      if (search) {
        params.set("search", search);
      }

      if (status !== "All statuses") {
        params.set("status", status);
      }

      const response = await fetch(`/api/tickets?${params.toString()}`, {
        cache: "no-store",
      });

      const data: TicketsResponse = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.message || "Unable to load your tickets.");
      }

      setTickets(data.tickets ?? []);
      setTotal(data.pagination?.total ?? 0);
      setTotalPages(Math.max(1, data.pagination?.totalPages ?? 1));
    } catch (err) {
      setTickets([]);
      setTotal(0);
      setTotalPages(1);
      setError(
        err instanceof Error
          ? err.message
          : "Something went wrong while loading tickets."
      );
    } finally {
      setLoading(false);
    }
  }, [page, search, status]);

  useEffect(() => {
    void loadTickets();
  }, [loadTickets]);

  function handleSearch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPage(1);
    setSearch(searchInput.trim());
  }

  function handleStatusChange(value: string) {
    setStatus(value);
    setPage(1);
  }

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-8 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-6xl">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm font-semibold text-indigo-600">
              Campus HelpDesk
            </p>
            <h1 className="mt-1 text-3xl font-bold tracking-tight text-slate-900">
              My Tickets
            </h1>
            <p className="mt-2 text-sm text-slate-600">
              Track your support requests and their current status.
            </p>
          </div>

          <Link
            href="/tickets/new"
            className="inline-flex items-center justify-center rounded-lg bg-indigo-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-indigo-700"
          >
            + Create Ticket
          </Link>
        </div>

        <section className="mt-8 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-end">
            <form onSubmit={handleSearch} className="flex-1">
              <label
                htmlFor="ticket-search"
                className="mb-2 block text-sm font-semibold text-slate-700"
              >
                Search tickets
              </label>

              <input
                id="ticket-search"
                type="search"
                value={searchInput}
                onChange={(event) => setSearchInput(event.target.value)}
                placeholder="Search ticket number or title..."
                className="w-full rounded-lg border border-slate-300 px-4 py-3 text-sm outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
              />
            </form>

            <div className="sm:w-56">
              <label
                htmlFor="ticket-status"
                className="mb-2 block text-sm font-semibold text-slate-700"
              >
                Filter by status
              </label>

              <select
                id="ticket-status"
                value={status}
                onChange={(event) => handleStatusChange(event.target.value)}
                className="w-full rounded-lg border border-slate-300 bg-white px-4 py-3 text-sm outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
              >
                {statuses.map((item) => (
                  <option key={item} value={item}>
                    {item}
                  </option>
                ))}
              </select>
            </div>

            <button
              type="button"
              onClick={() => {
                setSearchInput("");
                setSearch("");
                setStatus("All statuses");
                setPage(1);
              }}
              className="rounded-lg border border-slate-300 px-4 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
            >
              Clear filters
            </button>
          </div>

          <div className="mt-5 flex items-center justify-between border-t border-slate-100 pt-4">
            <p className="text-sm text-slate-500">
              {loading
                ? "Loading tickets..."
                : `${total} ${total === 1 ? "ticket" : "tickets"} found`}
            </p>

            <button
              type="button"
              onClick={() => void loadTickets()}
              disabled={loading}
              className="text-sm font-semibold text-indigo-600 hover:text-indigo-800 disabled:opacity-50"
            >
              Refresh
            </button>
          </div>
        </section>

        {error && (
          <div
            role="alert"
            className="mt-6 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700"
          >
            <p className="font-semibold">Could not load tickets</p>
            <p className="mt-1">{error}</p>
            <button
              type="button"
              onClick={() => void loadTickets()}
              className="mt-3 font-semibold underline"
            >
              Try again
            </button>
          </div>
        )}

        <section className="mt-6 space-y-4">
          {loading ? (
            Array.from({ length: 3 }).map((_, index) => (
              <div
                key={index}
                className="animate-pulse rounded-2xl border border-slate-200 bg-white p-6"
              >
                <div className="h-4 w-28 rounded bg-slate-200" />
                <div className="mt-4 h-5 w-2/3 rounded bg-slate-200" />
                <div className="mt-3 h-4 w-1/3 rounded bg-slate-100" />
              </div>
            ))
          ) : !error && tickets.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-300 bg-white px-6 py-14 text-center">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-indigo-50 text-2xl text-indigo-600">
                +
              </div>

              <h2 className="mt-4 text-lg font-bold text-slate-900">
                No tickets found
              </h2>

              <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-slate-500">
                You have no tickets matching these filters. Create a support
                ticket or try a different search.
              </p>

              <Link
                href="/tickets/new"
                className="mt-5 inline-flex rounded-lg bg-indigo-600 px-5 py-3 text-sm font-semibold text-white hover:bg-indigo-700"
              >
                Create your first ticket
              </Link>
            </div>
          ) : (
            tickets.map((ticket) => (
              <article
                key={ticket._id}
                className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:border-indigo-200 sm:p-6"
              >
                <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-sm font-bold text-indigo-600">
                        {ticket.ticketNumber}
                      </span>

                      <span
                        className={`rounded-full px-3 py-1 text-xs font-semibold ${statusStyle(ticket.status)}`}
                      >
                        {ticket.status}
                      </span>
                    </div>

                    <h2 className="mt-3 break-words text-lg font-bold text-slate-900">
                      {ticket.title}
                    </h2>

                    <p className="mt-2 line-clamp-2 whitespace-pre-line text-sm leading-6 text-slate-600">
                      {ticket.description}
                    </p>
                  </div>

                  <div className="flex shrink-0 flex-row gap-6 sm:flex-col sm:items-end sm:gap-3">
                    <div>
                      <p className="text-xs text-slate-500">Priority</p>
                      <p
                        className={`mt-1 text-sm font-semibold ${priorityStyle(ticket.priority)}`}
                      >
                        {ticket.priority}
                      </p>
                    </div>

                    <div className="sm:text-right">
                      <p className="text-xs text-slate-500">Category</p>
                      <p className="mt-1 text-sm font-medium text-slate-700">
                        {ticket.category?.name ?? "Uncategorized"}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="mt-5 flex flex-col gap-2 border-t border-slate-100 pt-4 text-xs text-slate-500 sm:flex-row sm:items-center sm:justify-between">
                  <p>Created: {formatDate(ticket.createdAt)}</p>
                  <p>Last updated: {formatDate(ticket.updatedAt)}</p>
                </div>
                <Link
                href={`/tickets/${ticket._id}`}
                className="inline-flex w-fit items-center rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-indigo-700"
              >
                View details →
              </Link>
              </article>
            ))
          )}
        </section>

        {!loading && !error && totalPages > 1 && (
          <nav
            aria-label="Ticket pagination"
            className="mt-6 flex flex-wrap items-center justify-between gap-4 rounded-xl border border-slate-200 bg-white p-4"
          >
            <p className="text-sm text-slate-600">
              Page {page} of {totalPages}
            </p>

            <div className="flex gap-2">
              <button
                type="button"
                disabled={page <= 1}
                onClick={() => setPage((current) => current - 1)}
                className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
              >
                Previous
              </button>

              <button
                type="button"
                disabled={page >= totalPages}
                onClick={() => setPage((current) => current + 1)}
                className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
              >
                Next
              </button>
            </div>
          </nav>
        )}
      </div>
    </main>
  );
}
