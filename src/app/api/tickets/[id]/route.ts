
import { NextResponse } from "next/server";
import mongoose from "mongoose";
import { connectDB } from "@/lib/mongodb";
import { getActiveUser } from "@/lib/permissions";
import Ticket from "@/models/Ticket";
import Message from "@/models/Message";

export const runtime = "nodejs";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function GET(
  _request: Request,
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
          message: "This ticket page is for students and faculty.",
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

    await connectDB();

    // Only find a ticket created by the current user.
    const ticket = await Ticket.findOne({
      _id: id,
      createdBy: user._id,
    })
      .populate("category", "name description")
      .populate("assignedAgent", "name email")
      .lean();

    if (!ticket) {
      return NextResponse.json(
        { success: false, message: "Ticket not found." },
        { status: 404 }
      );
    }

    // Internal notes must never be shown to students or faculty.
    const messages = await Message.find({
      ticket: ticket._id,
      internal: false,
    })
      .populate("author", "name role")
      .sort({ createdAt: 1 })
      .lean();

    return NextResponse.json({
      success: true,
      ticket,
      messages,
    });
  } catch (error) {
    console.error("Get ticket details error:", error);

    return NextResponse.json(
      {
        success: false,
        message: "Unable to load ticket details.",
      },
      { status: 500 }
    );
  }
}
