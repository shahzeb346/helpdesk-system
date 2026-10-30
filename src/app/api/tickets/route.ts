
import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import { getActiveUser } from "@/lib/permissions";
import { createTicketSchema } from "@/lib/validations/ticket";
import Category from "@/models/Category";
import Ticket from "@/models/Ticket";
import ActivityLog from "@/models/ActivityLog";

export const runtime = "nodejs";

const SLA_HOURS = {
  Urgent: { response: 1, resolution: 8 },
  High: { response: 4, resolution: 24 },
  Medium: { response: 8, resolution: 72 },
  Low: { response: 24, resolution: 120 },
};

const ALLOWED_STATUSES = [
  "Open",
  "In Progress",
  "Waiting on User",
  "Resolved",
  "Closed",
];

// GET: Fetch the logged-in user's tickets.
export async function GET(request: Request) {
  try {
    const user = await getActiveUser();

    if (!user) {
      return NextResponse.json(
        { success: false, message: "Please log in first." },
        { status: 401 }
      );
    }

    // This endpoint currently lists student/faculty tickets only.
    if (user.role !== "user") {
      return NextResponse.json(
        {
          success: false,
          message: "This page is for student and faculty tickets.",
        },
        { status: 403 }
      );
    }

    await connectDB();

    const { searchParams } = new URL(request.url);

    const page = Math.max(
      1,
      Number.parseInt(searchParams.get("page") || "1", 10) || 1
    );

    const limit = Math.min(
      20,
      Math.max(
        1,
        Number.parseInt(searchParams.get("limit") || "10", 10) || 10
      )
    );

    const search = (searchParams.get("search") || "").trim();
    const status = searchParams.get("status") || "";

    // Only return tickets created by the logged-in user.
    const filter: Record<string, unknown> = {
      createdBy: user._id,
    };

    if (ALLOWED_STATUSES.includes(status)) {
      filter.status = status;
    }

    if (search) {
      // Escape special regex characters entered by the user.
      const safeSearch = search.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

      filter.$or = [
        {
          ticketNumber: {
            $regex: safeSearch,
            $options: "i",
          },
        },
        {
          title: {
            $regex: safeSearch,
            $options: "i",
          },
        },
      ];
    }

    const [tickets, total] = await Promise.all([
      Ticket.find(filter)
        .populate("category", "name")
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean(),

      Ticket.countDocuments(filter),
    ]);

    return NextResponse.json({
      success: true,
      tickets,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error("Get tickets error:", error);

    return NextResponse.json(
      {
        success: false,
        message: "Unable to load your tickets.",
      },
      { status: 500 }
    );
  }
}

// POST: Create a new ticket.
export async function POST(request: Request) {
  try {
    // 1. Check authentication.
    const user = await getActiveUser();

    if (!user) {
      return NextResponse.json(
        { success: false, message: "Please log in first." },
        { status: 401 }
      );
    }

    // Agents and admins cannot create tickets through this endpoint.
    if (user.role !== "user") {
      return NextResponse.json(
        {
          success: false,
          message: "Only students and faculty can create tickets here.",
        },
        { status: 403 }
      );
    }

    // 2. Validate submitted data.
    const body = await request.json();
    const parsed = createTicketSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        {
          success: false,
          message: "Please correct the submitted information.",
          errors: parsed.error.flatten().fieldErrors,
        },
        { status: 400 }
      );
    }

    await connectDB();

    const {
      title,
      description,
      category,
      priority,
      attachments,
    } = parsed.data;

    // 3. Confirm the category exists.
    const existingCategory = await Category.findById(category);

    if (!existingCategory) {
      return NextResponse.json(
        { success: false, message: "Selected category not found." },
        { status: 400 }
      );
    }

    // 4. Calculate SLA deadlines.
    const now = new Date();
    const sla = SLA_HOURS[priority];

    const firstResponseDueAt = new Date(
      now.getTime() + sla.response * 60 * 60 * 1000
    );

    const resolutionDueAt = new Date(
      now.getTime() + sla.resolution * 60 * 60 * 1000
    );

    // 5. Create the ticket with its attachments.
    const ticket = await Ticket.create({
      title,
      description,
      category: existingCategory._id,
      priority,
      status: "Open",
      createdBy: user._id,
      assignedAgent: null,
      attachments,
      firstResponseDueAt,
      resolutionDueAt,
      firstResponseBreached: false,
      resolutionBreached: false,
    });

    // 6. Record ticket creation.
    await ActivityLog.create({
      ticket: ticket._id,
      actor: user._id,
      action: "ticket_created",
      details: `Ticket ${ticket.ticketNumber} was created.`,
    });

    return NextResponse.json(
      {
        success: true,
        message: "Your support ticket has been created.",
        ticket,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Create ticket error:", error);

    return NextResponse.json(
      {
        success: false,
        message: "Unable to create ticket.",
      },
      { status: 500 }
    );
  }
}
