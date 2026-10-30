
import { NextResponse } from "next/server";
import mongoose from "mongoose";
import { z } from "zod";

import { connectDB } from "@/lib/mongodb";
import { getActiveUser } from "@/lib/permissions";
import Ticket from "@/models/Ticket";
import Message from "@/models/Message";
import ActivityLog from "@/models/ActivityLog";

export const runtime = "nodejs";

const replySchema = z.object({
  body: z
    .string()
    .trim()
    .min(1, "Please enter a message.")
    .max(5000, "Message cannot exceed 5,000 characters."),
});

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function POST(
  request: Request,
  { params }: RouteContext
) {
  try {
    const user = await getActiveUser();

    if (!user) {
      return NextResponse.json(
        { success: false, message: "Please log in first." },
        { status: 401 }
      );
    }

    if (user.role !== "user") {
      return NextResponse.json(
        {
          success: false,
          message: "Only students and faculty can reply here.",
        },
        { status: 403 }
      );
    }

    const { id } = await params;

    if (!mongoose.isValidObjectId(id)) {
      return NextResponse.json(
        { success: false, message: "Invalid ticket ID." },
        { status: 400 }
      );
    }

    const body = await request.json();
    const parsed = replySchema.safeParse(body);

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

    const ticket = await Ticket.findOne({
      _id: id,
      createdBy: user._id,
    });

    if (!ticket) {
      return NextResponse.json(
        { success: false, message: "Ticket not found." },
        { status: 404 }
      );
    }

    if (ticket.status === "Closed") {
      return NextResponse.json(
        {
          success: false,
          message: "This ticket is closed and cannot receive replies.",
        },
        { status: 400 }
      );
    }

    const message = await Message.create({
      ticket: ticket._id,
      author: user._id,
      body: parsed.data.body,
      attachments: [],
      internal: false,
    });

    await ActivityLog.create({
      ticket: ticket._id,
      actor: user._id,
      action: "reply_added",
      details: `A reply was added to ticket ${ticket.ticketNumber}.`,
    });

    return NextResponse.json(
      {
        success: true,
        message: "Your reply has been sent.",
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
    console.error("Create ticket reply error:", error);

    return NextResponse.json(
      { success: false, message: "Unable to send your reply." },
      { status: 500 }
    );
  }
}
