
import { NextResponse } from "next/server";
import { getActiveUser } from "@/lib/permissions";
import { connectDB } from "@/lib/mongodb";
import Ticket from "@/models/Ticket";

export const runtime = "nodejs";

export async function GET() {
  try {
    // 1. Check whether the user is logged in and active.
    const user = await getActiveUser();

    if (!user) {
      return NextResponse.json(
        { success: false, message: "Please log in first." },
        { status: 401 }
      );
    }

    // 2. Only agents can access this API.
    if (user.role !== "agent") {
      return NextResponse.json(
        {
          success: false,
          message: "Only agents can access assigned tickets.",
        },
        { status: 403 }
      );
    }

    // 3. Connect to MongoDB.
    await connectDB();

    // 4. Retrieve only tickets assigned to this agent.
    const tickets = await Ticket.find({
      assignedAgent: user._id,
    })
      .populate("category", "name")
      .populate("createdBy", "name email")
      .sort({ createdAt: -1 })
      .lean();

    // 5. Return the tickets.
    return NextResponse.json(
      {
        success: true,
        count: tickets.length,
        tickets,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Get agent tickets error:", error);

    return NextResponse.json(
      {
        success: false,
        message: "Unable to load assigned tickets.",
      },
      { status: 500 }
    );
  }
}
