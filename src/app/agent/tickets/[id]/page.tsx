
"use client";

import { useCallback, useEffect, useState, FormEvent } from "react";
import { useParams, useRouter } from "next/navigation";

interface Ticket {
  _id: string;
  ticketNumber: string;
  title: string;
  description: string;
  priority: string;
  status: string;
  category?: {
    name: string;
  };
  createdBy?: {
    name: string;
    email: string;
  };
  createdAt: string;
}

interface Message {
  _id: string;
  body: string;
  internal: boolean;
  createdAt: string;
  author?: {
    name: string;
    email?: string;
    role: string;
  };
}

const ticketStatuses = [
  "Open",
  "In Progress",
  "Waiting on User",
  "Resolved",
  "Closed",
];

export default function AgentTicketDetailsPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const ticketId = params.id;

  const [ticket, setTicket] = useState<Ticket | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [body, setBody] = useState("");
  const [internal, setInternal] = useState(false);

  const [selectedStatus, setSelectedStatus] = useState("");
  const [updatingStatus, setUpdatingStatus] = useState(false);

  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const loadTicket = useCallback(async () => {
    try {
      setLoading(true);
      setError("");

      const response = await fetch(
        `/api/agent/tickets/${ticketId}`,
        { cache: "no-store" }
      );

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.message || "Unable to load ticket.");
      }

      setTicket(data.ticket);
      setMessages(data.messages ?? []);
      setSelectedStatus(data.ticket.status);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Something went wrong."
      );
    } finally {
      setLoading(false);
    }
  }, [ticketId]);

  useEffect(() => {
    if (ticketId) {
      loadTicket();
    }
  }, [ticketId, loadTicket]);

  // Update ticket status
  async function handleStatusUpdate() {
    if (!ticket || selectedStatus === ticket.status) {
      return;
    }

    try {
      setUpdatingStatus(true);
      setError("");
      setSuccess("");

      const response = await fetch(
        `/api/agent/tickets/${ticketId}/status`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            status: selectedStatus,
          }),
        }
      );

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.message || "Unable to update ticket status.");
      }

      setTicket((previous) =>
        previous
          ? { ...previous, status: selectedStatus }
          : previous
      );

      setSuccess(data.message || "Ticket status updated successfully.");
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Unable to update ticket status."
      );

      // Restore the currently saved status
      setSelectedStatus(ticket.status);
    } finally {
      setUpdatingStatus(false);
    }
  }

  // Send reply or internal note
  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();

    if (!body.trim()) {
      setError("Please enter a message.");
      return;
    }

    try {
      setSending(true);
      setError("");
      setSuccess("");

      const response = await fetch(
        `/api/agent/tickets/${ticketId}/messages`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            body: body.trim(),
            internal,
          }),
        }
      );

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.message || "Unable to send message.");
      }

      setBody("");
      setInternal(false);
      setSuccess(data.message || "Message sent successfully.");

      await loadTicket();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Unable to send message."
      );
    } finally {
      setSending(false);
    }
  }

  const priorityStyle = (priority: string) => {
    switch (priority) {
      case "Urgent":
        return "bg-red-100 text-red-700";
      case "High":
        return "bg-orange-100 text-orange-700";
      case "Medium":
        return "bg-yellow-100 text-yellow-700";
      default:
        return "bg-green-100 text-green-700";
    }
  };

  const statusStyle = (status: string) => {
    switch (status) {
      case "Open":
        return "bg-blue-100 text-blue-700";
      case "In Progress":
        return "bg-purple-100 text-purple-700";
      case "Waiting on User":
        return "bg-yellow-100 text-yellow-700";
      case "Resolved":
        return "bg-green-100 text-green-700";
      case "Closed":
        return "bg-gray-100 text-gray-700";
      default:
        return "bg-gray-100 text-gray-700";
    }
  };

  if (loading) {
    return (
      <main className="min-h-screen bg-slate-50 p-8">
        <div className="mx-auto max-w-5xl text-center text-slate-500">
          Loading ticket details...
        </div>
      </main>
    );
  }

  if (!ticket) {
    return (
      <main className="min-h-screen bg-slate-50 p-8">
        <div className="mx-auto max-w-5xl rounded-xl bg-white p-8 text-center shadow-sm">
          <h2 className="text-xl font-bold text-slate-900">
            Ticket not found
          </h2>

          <p className="mt-2 text-sm text-slate-500">
            {error || "This ticket may not be assigned to you."}
          </p>

          <button
            onClick={() => router.push("/agent")}
            className="mt-5 rounded-lg bg-indigo-600 px-5 py-2.5 text-white hover:bg-indigo-700"
          >
            Back to Dashboard
          </button>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-50 p-4 sm:p-6 lg:p-8">
      <div className="mx-auto max-w-5xl">

        {/* Header */}
        <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
          <div>
            <button
              onClick={() => router.push("/agent")}
              className="mb-3 text-sm font-semibold text-indigo-600 hover:text-indigo-800"
            >
              ← Back to Agent Dashboard
            </button>

            <h1 className="text-2xl font-bold text-slate-900">
              Ticket Details
            </h1>

            <p className="mt-1 text-sm text-slate-500">
              Manage ticket #{ticket.ticketNumber}
            </p>
          </div>

          <button
            onClick={loadTicket}
            className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-100"
          >
            ↻ Refresh
          </button>
        </div>

        {/* Notifications */}
        {error && (
          <div className="mb-5 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
            {error}
          </div>
        )}

        {success && (
          <div className="mb-5 rounded-lg border border-green-200 bg-green-50 p-3 text-sm text-green-700">
            {success}
          </div>
        )}

        {/* Ticket Information */}
        <section className="mb-6 rounded-xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
          <div className="mb-5 flex flex-wrap items-center gap-2">
            <span className="rounded-full bg-indigo-50 px-3 py-1 text-xs font-bold text-indigo-700">
              #{ticket.ticketNumber}
            </span>

            <span className={`rounded-full px-3 py-1 text-xs font-semibold ${priorityStyle(ticket.priority)}`}>
              {ticket.priority} Priority
            </span>

            <span className={`rounded-full px-3 py-1 text-xs font-semibold ${statusStyle(ticket.status)}`}>
              {ticket.status}
            </span>
          </div>

          <h2 className="text-xl font-bold text-slate-900">
            {ticket.title}
          </h2>

          <p className="mt-3 whitespace-pre-wrap text-sm leading-7 text-slate-600">
            {ticket.description}
          </p>

          <div className="mt-6 grid gap-4 border-t border-slate-100 pt-5 sm:grid-cols-2">
            <div>
              <p className="text-xs font-medium text-slate-400">
                REQUESTER
              </p>
              <p className="mt-1 font-semibold text-slate-800">
                {ticket.createdBy?.name ?? "Unknown"}
              </p>
              <p className="text-sm text-slate-500">
                {ticket.createdBy?.email ?? ""}
              </p>
            </div>

            <div>
              <p className="text-xs font-medium text-slate-400">
                CATEGORY
              </p>
              <p className="mt-1 font-semibold text-slate-800">
                {ticket.category?.name ?? "Not specified"}
              </p>
            </div>

            <div>
              <p className="text-xs font-medium text-slate-400">
                CREATED DATE
              </p>
              <p className="mt-1 text-sm text-slate-700">
                {new Date(ticket.createdAt).toLocaleString()}
              </p>
            </div>
          </div>
        </section>

        {/* Status Management */}
        <section className="mb-6 rounded-xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
          <h2 className="text-lg font-bold text-slate-900">
            Update Ticket Status
          </h2>

          <p className="mt-1 text-sm text-slate-500">
            Change the current status of this support ticket.
          </p>

          <div className="mt-5 flex flex-col gap-4 sm:flex-row sm:items-end">
            <div className="flex-1">
              <label
                htmlFor="ticketStatus"
                className="mb-2 block text-sm font-medium text-slate-700"
              >
                Select New Status
              </label>

              <select
                id="ticketStatus"
                value={selectedStatus}
                onChange={(e) => {
                  setSelectedStatus(e.target.value);
                  setError("");
                  setSuccess("");
                }}
                disabled={updatingStatus}
                className="w-full rounded-lg border border-slate-300 bg-white px-4 py-3 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
              >
                {ticketStatuses.map((status) => (
                  <option key={status} value={status}>
                    {status}
                  </option>
                ))}
              </select>
            </div>

            <button
              type="button"
              onClick={handleStatusUpdate}
              disabled={
                updatingStatus ||
                selectedStatus === ticket.status
              }
              className="rounded-lg bg-indigo-600 px-6 py-3 text-sm font-semibold text-white transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:bg-slate-300"
            >
              {updatingStatus ? "Updating..." : "Update Status"}
            </button>
          </div>

          <p className="mt-3 text-xs text-slate-400">
            Current status: {ticket.status}
          </p>
        </section>

        {/* Conversation */}
        <section className="mb-6 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-200 p-5">
            <h2 className="text-lg font-bold text-slate-900">
              Conversation
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              Messages and private internal notes.
            </p>
          </div>

          <div className="space-y-4 p-5">
            {messages.length === 0 ? (
              <p className="py-8 text-center text-sm text-slate-500">
                No messages yet. Start the conversation below.
              </p>
            ) : (
              messages.map((message) => (
                <div
                  key={message._id}
                  className={`rounded-xl border p-4 ${
                    message.internal
                      ? "border-amber-200 bg-amber-50"
                      : "border-slate-200 bg-slate-50"
                  }`}
                >
                  <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <span className="font-semibold text-slate-800">
                        {message.author?.name ?? "Unknown"}
                      </span>

                      <span className="ml-2 text-xs capitalize text-slate-500">
                        {message.author?.role ?? ""}
                      </span>
                    </div>

                    <span className="text-xs text-slate-400">
                      {new Date(message.createdAt).toLocaleString()}
                    </span>
                  </div>

                  {message.internal && (
                    <p className="mb-2 text-xs font-bold uppercase tracking-wide text-amber-700">
                      🔒 Private Internal Note
                    </p>
                  )}

                  <p className="whitespace-pre-wrap text-sm leading-7 text-slate-700">
                    {message.body}
                  </p>
                </div>
              ))
            )}
          </div>
        </section>

        {/* Reply Form */}
        {ticket.status === "Closed" ? (
          <div className="rounded-xl border border-slate-200 bg-white p-6 text-center shadow-sm">
            <h3 className="font-semibold text-slate-800">
              This ticket is closed
            </h3>
            <p className="mt-2 text-sm text-slate-500">
              You cannot send replies or internal notes to a closed ticket.
              You can change its status above if needed.
            </p>
          </div>
        ) : (
          <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
            <h2 className="text-lg font-bold text-slate-900">
              Send a Message
            </h2>

            <form onSubmit={handleSubmit} className="mt-4 space-y-4">
              <textarea
                value={body}
                onChange={(e) => setBody(e.target.value)}
                placeholder={
                  internal
                    ? "Write a private internal note..."
                    : "Write your reply to the student..."
                }
                rows={5}
                maxLength={5000}
                className="w-full rounded-lg border border-slate-200 p-4 text-sm outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
              />

              <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
                <label className="flex items-center gap-2 text-sm text-slate-600">
                  <input
                    type="checkbox"
                    checked={internal}
                    onChange={(e) => setInternal(e.target.checked)}
                    className="h-4 w-4 accent-amber-600"
                  />
                  Add as private internal note
                </label>

                <button
                  type="submit"
                  disabled={sending || !body.trim()}
                  className={`rounded-lg px-6 py-2.5 text-sm font-semibold text-white transition disabled:cursor-not-allowed disabled:bg-slate-300 ${
                    internal
                      ? "bg-amber-600 hover:bg-amber-700"
                      : "bg-indigo-600 hover:bg-indigo-700"
                  }`}
                >
                  {sending
                    ? "Sending..."
                    : internal
                      ? "Add Internal Note"
                      : "Send Reply"}
                </button>
              </div>

              <p className="text-xs text-slate-400">
                Internal notes are private and should not be used for messages intended for students.
              </p>
            </form>
          </section>
        )}
      </div>
    </main>
  );
}
