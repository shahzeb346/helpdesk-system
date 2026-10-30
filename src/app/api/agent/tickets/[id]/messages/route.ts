
import { NextResponse } from "next/server";
import mongoose from "mongoose";
import { z } from "zod";

import { connectDB } from "@/lib/mongodb";
import { getActiveUser } from "@/lib/permissions";

import Ticket from "@/models/Ticket";
import Message from "@/models/Message";
import ActivityLog from "@/models/ActivityLog";

export const runtime = "nodejs";

const messageSchema = z.object({
  body: z
    .string()
    .trim()
    .min(1, "Please enter a message.")
    .max(5000, "Message cannot exceed 5,000 characters."),
  internal: z.boolean().default(false),
});

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function POST(
  request: Request,
  { params }: RouteContext
) {
  try {
    // 1. Check logged-in user
    const user = await getActiveUser();

    if (!user) {
      return NextResponse.json(
        { success: false, message: "Please log in first." },
        { status: 401 }
      );
    }

    // 2. Only agents can send messages here
    if (user.role !== "agent") {
      return NextResponse.json(
        { success: false, message: "Access denied." },
        { status: 403 }
      );
    }

    // 3. Validate ticket ID
    const { id } = await params;

    if (!mongoose.isValidObjectId(id)) {
      return NextResponse.json(
        { success: false, message: "Invalid ticket ID." },
        { status: 400 }
      );
    }

    // 4. Validate message
    const requestBody = await request.json();
    const parsed = messageSchema.safeParse(requestBody);

    if (!parsed.success) {
      return NextResponse.json(
        {
          success: false,
          message: "Please enter a valid message.",
          errors: parsed.error.flatten().fieldErrors,
        },
        { status: 400 }
      );
    }

    await connectDB();

    // 5. Find ticket assigned to this agent
    const ticket = await Ticket.findOne({
      _id: id,
      assignedAgent: user._id,
    });

    if (!ticket) {
      return NextResponse.json(
        {
          success: false,
          message: "Ticket not found or not assigned to you.",
        },
        { status: 404 }
      );
    }

    if (ticket.status === "Closed") {
      return NextResponse.json(
        {
          success: false,
          message: "This ticket is closed and cannot receive messages.",
        },
        { status: 400 }
      );
    }

    const { body, internal } = parsed.data;

    // 6. Save message
    const message = await Message.create({
      ticket: ticket._id,
      author: user._id,
      body,
      attachments: [],
      internal,
    });

    // 7. Update first response time only for public replies
    if (!internal && !ticket.firstRespondedAt) {
      ticket.firstRespondedAt = new Date();
      await ticket.save();
    }

    // 8. Save activity log
    await ActivityLog.create({
      ticket: ticket._id,
      actor: user._id,
      action: internal ? "internal_note_added" : "reply_added",
      details: internal
        ? `An internal note was added to ticket ${ticket.ticketNumber}.`
        : `An agent reply was added to ticket ${ticket.ticketNumber}.`,
    });

    return NextResponse.json(
      {
        success: true,
        message: internal
          ? "Internal note added successfully."
          : "Reply sent successfully.",
        reply: {
          _id: message._id,
          body: message.body,
          internal: message.internal,
          createdAt: message.createdAt,
          author: {
            name: user.name,
            role: user.role,
          },
        },
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Agent message error:", error);

    return NextResponse.json(
      {
        success: false,
        message: "Unable to send message.",
      },
      { status: 500 }
    );
  }
}
