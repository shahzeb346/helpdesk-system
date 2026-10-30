
"use client";

import { useEffect, useState, type FormEvent } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";

type CategoryInfo = {
  name: string;
  description?: string;
};

type AgentInfo = {
  name: string;
  email: string;
};

type TicketDetails = {
  _id: string;
  ticketNumber: string;
  title: string;
  description: string;
  priority: "Low" | "Medium" | "High" | "Urgent";
  status:
    | "Open"
    | "In Progress"
    | "Waiting on User"
    | "Resolved"
    | "Closed";
  category: CategoryInfo | null;
  assignedAgent: AgentInfo | null;
  createdAt: string;
  updatedAt: string;
  firstResponseDueAt?: string;
  resolutionDueAt?: string;
};

type MessageItem = {
  _id: string;
  body: string;
  internal: boolean;
  createdAt: string;
  author: {
    name: string;
    role?: string;
  } | null;
};

function formatDate(value?: string) {
  if (!value) return "Not available";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "Date unavailable";
  }

  return date.toLocaleString(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

function priorityStyle(priority: TicketDetails["priority"]) {
  const styles = {
    Low: "bg-slate-100 text-slate-700",
    Medium: "bg-blue-100 text-blue-700",
    High: "bg-orange-100 text-orange-700",
    Urgent: "bg-red-100 text-red-700",
  };

  return styles[priority];
}

function statusStyle(status: TicketDetails["status"]) {
  const styles = {
    Open: "bg-blue-100 text-blue-700",
    "In Progress": "bg-indigo-100 text-indigo-700",
    "Waiting on User": "bg-amber-100 text-amber-700",
    Resolved: "bg-green-100 text-green-700",
    Closed: "bg-slate-200 text-slate-700",
  };

  return styles[status];
}

export default function TicketDetailsPage() {
  const params = useParams<{ id: string }>();
  const ticketId = params.id;

  const [ticket, setTicket] = useState<TicketDetails | null>(null);
  const [messages, setMessages] = useState<MessageItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Reply form state
  const [reply, setReply] = useState("");
  const [sending, setSending] = useState(false);
  const [replyError, setReplyError] = useState("");
  const [replySuccess, setReplySuccess] = useState("");

  useEffect(() => {
    if (!ticketId) return;

    async function loadTicket() {
      try {
        setLoading(true);
        setError("");

        const response = await fetch(
          `/api/tickets/${encodeURIComponent(ticketId)}`,
          { cache: "no-store" }
        );

        const data = await response.json();

        if (!response.ok || !data.success) {
          throw new Error(
            data.message || "Unable to load ticket details."
          );
        }

        setTicket(data.ticket);
        setMessages(data.messages ?? []);
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

    void loadTicket();
  }, [ticketId]);

  async function handleReply(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const trimmedReply = reply.trim();

    if (!trimmedReply || sending || !ticket) return;

    if (trimmedReply.length > 5000) {
      setReplyError("Message cannot exceed 5,000 characters.");
      return;
    }

    try {
      setSending(true);
      setReplyError("");
      setReplySuccess("");

      const response = await fetch(
        `/api/tickets/${encodeURIComponent(ticket._id)}/messages`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            body: trimmedReply,
          }),
        }
      );

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(
          data.message || "Unable to send your reply."
        );
      }

      // Add the saved reply to the conversation.
      setMessages((current) => [...current, data.reply]);
      setReply("");
      setReplySuccess("Your reply has been sent.");
    } catch (err) {
      setReplyError(
        err instanceof Error
          ? err.message
          : "Something went wrong while sending your reply."
      );
    } finally {
      setSending(false);
    }
  }

  if (loading) {
    return (
      <main className="min-h-screen bg-slate-50 p-6">
        <div className="mx-auto max-w-4xl animate-pulse space-y-4">
          <div className="h-8 w-64 rounded bg-slate-200" />
          <div className="h-48 rounded-xl bg-white shadow-sm" />
          <div className="h-40 rounded-xl bg-white shadow-sm" />
        </div>
      </main>
    );
  }

  if (error || !ticket) {
    return (
      <main className="min-h-screen bg-slate-50 px-4 py-12">
        <div className="mx-auto max-w-2xl rounded-xl border border-red-200 bg-white p-6">
          <h1 className="text-xl font-bold text-slate-900">
            Unable to open ticket
          </h1>

          <p className="mt-2 text-sm text-red-600">
            {error || "Ticket not found."}
          </p>

          <Link
            href="/tickets"
            className="mt-5 inline-block rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700"
          >
            Back to my tickets
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-8 sm:px-6">
      <div className="mx-auto max-w-4xl">
        <Link
          href="/tickets"
          className="text-sm font-medium text-indigo-600 hover:text-indigo-800"
        >
          ← Back to my tickets
        </Link>

        <header className="mt-5 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="text-sm font-semibold text-indigo-600">
              {ticket.ticketNumber}
            </p>

            <h1 className="mt-1 text-2xl font-bold text-slate-900 sm:text-3xl">
              {ticket.title}
            </h1>

            <p className="mt-2 text-sm text-slate-500">
              Created {formatDate(ticket.createdAt)}
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <span
              className={`rounded-full px-3 py-1 text-xs font-semibold ${statusStyle(ticket.status)}`}
            >
              {ticket.status}
            </span>

            <span
              className={`rounded-full px-3 py-1 text-xs font-semibold ${priorityStyle(ticket.priority)}`}
            >
              {ticket.priority} priority
            </span>
          </div>
        </header>

        <section className="mt-6 rounded-xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
          <h2 className="text-lg font-semibold text-slate-900">
            Ticket information
          </h2>

          <div className="mt-5 grid gap-5 sm:grid-cols-2">
            <div>
              <p className="text-sm text-slate-500">Category</p>
              <p className="mt-1 font-medium text-slate-800">
                {ticket.category?.name || "Uncategorized"}
              </p>
            </div>

            <div>
              <p className="text-sm text-slate-500">Assigned agent</p>
              <p className="mt-1 font-medium text-slate-800">
                {ticket.assignedAgent?.name || "Not assigned yet"}
              </p>
            </div>

            <div>
              <p className="text-sm text-slate-500">
                First response deadline
              </p>
              <p className="mt-1 font-medium text-slate-800">
                {formatDate(ticket.firstResponseDueAt)}
              </p>
            </div>

            <div>
              <p className="text-sm text-slate-500">
                Resolution deadline
              </p>
              <p className="mt-1 font-medium text-slate-800">
                {formatDate(ticket.resolutionDueAt)}
              </p>
            </div>
          </div>

          <div className="mt-6 border-t border-slate-100 pt-5">
            <h3 className="font-semibold text-slate-900">
              Description
            </h3>

            <p className="mt-3 whitespace-pre-wrap break-words text-sm leading-7 text-slate-600">
              {ticket.description}
            </p>
          </div>
        </section>

        <section className="mt-6 rounded-xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-lg font-semibold text-slate-900">
              Conversation
            </h2>

            <span className="text-sm text-slate-500">
              {messages.length}{" "}
              {messages.length === 1 ? "message" : "messages"}
            </span>
          </div>

          {messages.length === 0 ? (
            <div className="mt-5 rounded-lg border border-dashed border-slate-300 p-6 text-center">
              <p className="font-medium text-slate-700">
                No replies yet
              </p>

              <p className="mt-1 text-sm text-slate-500">
                Messages from you and the support team will appear here.
              </p>
            </div>
          ) : (
            <div className="mt-5 space-y-4">
              {messages.map((message) => (
                <article
                  key={message._id}
                  className="rounded-lg border border-slate-200 bg-slate-50 p-4"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="font-semibold text-slate-800">
                      {message.author?.name || "Support team"}
                    </p>

                    <time className="text-xs text-slate-500">
                      {formatDate(message.createdAt)}
                    </time>
                  </div>

                  <p className="mt-3 whitespace-pre-wrap break-words text-sm leading-6 text-slate-700">
                    {message.body}
                  </p>
                </article>
              ))}
            </div>
          )}

          {ticket.status !== "Closed" ? (
            <form
              onSubmit={handleReply}
              className="mt-6 border-t border-slate-200 pt-5"
            >
              <label
                htmlFor="ticket-reply"
                className="mb-2 block text-sm font-semibold text-slate-700"
              >
                Write a reply
              </label>

              <textarea
                id="ticket-reply"
                value={reply}
                onChange={(event) => {
                  setReply(event.target.value);
                  setReplyError("");
                  setReplySuccess("");
                }}
                rows={4}
                maxLength={5000}
                required
                disabled={sending}
                placeholder="Describe your response..."
                className="w-full rounded-lg border border-slate-300 p-3 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 disabled:bg-slate-100"
              />

              <div className="mt-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <p className="text-xs text-slate-500">
                  {reply.length}/5000 characters
                </p>

                <button
                  type="submit"
                  disabled={sending || !reply.trim()}
                  className="rounded-lg bg-indigo-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {sending ? "Sending..." : "Send reply"}
                </button>
              </div>

              {replyError && (
                <p role="alert" className="mt-3 text-sm text-red-600">
                  {replyError}
                </p>
              )}

              {replySuccess && (
                <p role="status" className="mt-3 text-sm text-green-700">
                  {replySuccess}
                </p>
              )}
            </form>
          ) : (
            <p className="mt-5 rounded-lg bg-slate-100 p-3 text-sm text-slate-600">
              This ticket is closed. Replies are disabled.
            </p>
          )}
        </section>

        <p className="mt-4 text-right text-xs text-slate-500">
          Last updated: {formatDate(ticket.updatedAt)}
        </p>
      </div>
    </main>
  );
}
