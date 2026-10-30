
import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";
import { z } from "zod";

import { connectDB } from "@/lib/mongodb";
import { getActiveUser } from "@/lib/permissions";

import Ticket from "@/models/Ticket";
import ActivityLog from "@/models/ActivityLog";

const statusSchema = z.object({
  status: z.enum([
    "Open",
    "In Progress",
    "Waiting on User",
    "Resolved",
    "Closed",
  ]),
});

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await connectDB();

    // Check authentication
    const user = await getActiveUser();

    if (!user) {
      return NextResponse.json(
        { success: false, message: "Unauthorized." },
        { status: 401 }
      );
    }

    // Only agents can update ticket status
    if (user.role !== "agent") {
      return NextResponse.json(
        { success: false, message: "Only agents can update ticket status." },
        { status: 403 }
      );
    }

    const { id } = await params;

    // Validate ticket ID
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json(
        { success: false, message: "Invalid ticket ID." },
        { status: 400 }
      );
    }

    // Validate request body
    const body = await request.json();
    const validation = statusSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        {
          success: false,
          message: "Invalid ticket status.",
          errors: validation.error.flatten(),
        },
        { status: 400 }
      );
    }

    // Find a ticket assigned to this agent
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

    const previousStatus = ticket.status;
    const newStatus = validation.data.status;

    // Avoid unnecessary updates
    if (previousStatus === newStatus) {
      return NextResponse.json({
        success: true,
        message: "Ticket already has this status.",
        ticket,
      });
    }

    // Update ticket status
    ticket.status = newStatus;
    await ticket.save();

    // Record activity
    await ActivityLog.create({
      ticket: ticket._id,
      actor: user._id,
      action: "status_changed",
      previousValue: previousStatus,
      newValue: newStatus,
      details: `Ticket status changed from ${previousStatus} to ${newStatus}.`,
    });

    return NextResponse.json({
      success: true,
      message: "Ticket status updated successfully.",
      ticket: {
        _id: ticket._id,
        ticketNumber: ticket.ticketNumber,
        status: ticket.status,
      },
    });
  } catch (error) {
    console.error("Agent status update error:", error);

    return NextResponse.json(
      {
        success: false,
        message: "Something went wrong while updating ticket status.",
      },
      { status: 500 }
    );
  }
}
