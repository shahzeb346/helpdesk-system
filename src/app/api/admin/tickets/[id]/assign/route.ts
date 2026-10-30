
import { NextResponse } from "next/server";
import mongoose from "mongoose";
import { z } from "zod";

import { getActiveUser } from "@/lib/permissions";
import { connectDB } from "@/lib/mongodb";
import Ticket from "@/models/Ticket";
import User from "@/models/User";
import ActivityLog from "@/models/ActivityLog";

export const runtime = "nodejs";

const assignSchema = z.object({
  agentId: z
    .string()
    .regex(/^[a-f\d]{24}$/i, "Please select a valid agent."),
});

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function PATCH(
  request: Request,
  { params }: RouteContext
) {
  try {
    // 1. Verify the logged-in user.
    const admin = await getActiveUser();

    if (!admin) {
      return NextResponse.json(
        { success: false, message: "Please log in first." },
        { status: 401 }
      );
    }

    // 2. Only administrators can assign tickets.
    if (admin.role !== "admin") {
      return NextResponse.json(
        {
          success: false,
          message: "Only administrators can assign tickets.",
        },
        { status: 403 }
      );
    }

    // 3. Validate the ticket ID.
    const { id } = await params;

    if (!mongoose.isValidObjectId(id)) {
      return NextResponse.json(
        { success: false, message: "Invalid ticket ID." },
        { status: 400 }
      );
    }

    // 4. Validate the selected agent ID.
    const body = await request.json();
    const parsed = assignSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        {
          success: false,
          message: "Please provide a valid agent ID.",
          errors: parsed.error.flatten().fieldErrors,
        },
        { status: 400 }
      );
    }

    await connectDB();

    // 5. Make sure the selected user is an active agent.
    const agent = await User.findOne({
      _id: parsed.data.agentId,
      role: "agent",
      active: true,
    }).select("_id name email role");

    if (!agent) {
      return NextResponse.json(
        {
          success: false,
          message: "The selected agent does not exist or is inactive.",
        },
        { status: 404 }
      );
    }

    // 6. Find the ticket.
    const ticket = await Ticket.findById(id);

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
          message: "Closed tickets cannot be reassigned.",
        },
        { status: 400 }
      );
    }

    const previousAgent = ticket.assignedAgent
      ? ticket.assignedAgent.toString()
      : null;

    const newAgent = agent._id.toString();

    // 7. Assign the ticket to the selected agent.
    ticket.assignedAgent = agent._id;
    await ticket.save();

    // 8. Record the assignment in the activity log.
    await ActivityLog.create({
      ticket: ticket._id,
      actor: admin._id,
      action: "reassigned",
      previousValue: previousAgent ?? "Unassigned",
      newValue: newAgent,
      details: `Ticket ${ticket.ticketNumber} assigned to ${agent.name}.`,
    });

    return NextResponse.json(
      {
        success: true,
        message: "Ticket assigned successfully.",
        ticket: {
          _id: ticket._id,
          ticketNumber: ticket.ticketNumber,
          assignedAgent: {
            _id: agent._id,
            name: agent.name,
            email: agent.email,
          },
        },
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Assign ticket error:", error);

    return NextResponse.json(
      {
        success: false,
        message: "Unable to assign the ticket.",
      },
      { status: 500 }
    );
  }
}
