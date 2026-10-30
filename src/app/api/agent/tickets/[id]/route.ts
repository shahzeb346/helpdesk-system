
import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";

import { connectDB } from "@/lib/mongodb";
import { getActiveUser } from "@/lib/permissions";

import Ticket from "@/models/Ticket";
import Message from "@/models/Message";
import Category from "@/models/Category";
import User from "@/models/User";

interface RouteContext {
  params: Promise<{
    id: string;
  }>;
}

export async function GET(
  request: NextRequest,
  context: RouteContext
) {
  try {
    // 1. Check logged-in user
    const user = await getActiveUser();

    if (!user) {
      return NextResponse.json(
        { success: false, message: "Unauthorized." },
        { status: 401 }
      );
    }

    // 2. Only agents can access this API
    if (user.role !== "agent") {
      return NextResponse.json(
        { success: false, message: "Access denied." },
        { status: 403 }
      );
    }

    // 3. Get ticket ID from URL
    const { id } = await context.params;

    if (!mongoose.isValidObjectId(id)) {
      return NextResponse.json(
        { success: false, message: "Invalid ticket ID." },
        { status: 400 }
      );
    }

    await connectDB();

    // Ensure referenced schemas are registered
    void Category;
    void User;

    // 4. Find only tickets assigned to this agent
    const ticket = await Ticket.findOne({
      _id: id,
      assignedAgent: user._id,
    })
      .populate("category", "name")
      .populate("createdBy", "name email")
      .populate("assignedAgent", "name email")
      .lean();

    if (!ticket) {
      return NextResponse.json(
        {
          success: false,
          message: "Ticket not found or not assigned to you.",
        },
        { status: 404 }
      );
    }

    // 5. Get ticket messages
    const messages = await Message.find({
      ticket: ticket._id,
    })
      .populate("author", "name email role")
      .sort({ createdAt: 1 })
      .lean();

    return NextResponse.json({
      success: true,
      ticket,
      messages,
    });
  } catch (error) {
    console.error("Agent ticket detail error:", error);

    return NextResponse.json(
      {
        success: false,
        message: "Failed to load ticket details.",
      },
      { status: 500 }
    );
  }
}
