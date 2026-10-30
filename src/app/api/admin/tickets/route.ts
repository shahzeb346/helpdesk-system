
// import { NextResponse } from "next/server";
// import { getActiveUser } from "@/lib/permissions";
// import { connectDB } from "@/lib/mongodb";
// import Ticket from "@/models/Ticket";
// import User from "@/models/User";

// export const runtime = "nodejs";

// export async function GET() {
//   try {
//     const admin = await getActiveUser();

//     if (!admin) {
//       return NextResponse.json(
//         { success: false, message: "Please log in first." },
//         { status: 401 }
//       );
//     }

//     if (admin.role !== "admin") {
//       return NextResponse.json(
//         { success: false, message: "Only administrators can view all tickets." },
//         { status: 403 }
//       );
//     }

//     await connectDB();

//     const [tickets, agents] = await Promise.all([
//       Ticket.find()
//         .populate("category", "name")
//         .populate("createdBy", "name email")
//         .populate("assignedAgent", "name email")
//         .sort({ createdAt: -1 })
//         .lean(),

//       User.find({ role: "agent", active: true })
//         .select("_id name email")
//         .sort({ name: 1 })
//         .lean(),
//     ]);

//     return NextResponse.json({
//       success: true,
//       tickets,
//       agents,
//     });
//   } catch (error) {
//     console.error("Get admin tickets error:", error);

//     return NextResponse.json(
//       { success: false, message: "Unable to load tickets and agents." },
//       { status: 500 }
//     );
//   }
// }




import { NextResponse } from "next/server";

import { getActiveUser } from "@/lib/permissions";
import { connectDB } from "@/lib/mongodb";

import Ticket from "@/models/Ticket";
import Category from "@/models/Category";
import User from "@/models/User";

export const runtime = "nodejs";

// Ensure Mongoose registers the models used by populate().
void Category;
void User;

export async function GET() {
  try {
    const admin = await getActiveUser();

    if (!admin) {
      return NextResponse.json(
        { success: false, message: "Please log in first." },
        { status: 401 }
      );
    }

    if (admin.role !== "admin") {
      return NextResponse.json(
        {
          success: false,
          message: "Only administrators can view all tickets.",
        },
        { status: 403 }
      );
    }

    await connectDB();

    const [tickets, agents] = await Promise.all([
      Ticket.find()
        .populate("category", "name")
        .populate("createdBy", "name email")
        .populate("assignedAgent", "name email")
        .sort({ createdAt: -1 })
        .lean(),

      User.find({
        role: "agent",
        active: true,
      })
        .select("_id name email")
        .sort({ name: 1 })
        .lean(),
    ]);

    return NextResponse.json({
      success: true,
      tickets,
      agents,
    });
  } catch (error) {
    console.error("Get admin tickets error:", error);

    return NextResponse.json(
      {
        success: false,
        message: "Unable to load tickets and agents.",
      },
      { status: 500 }
    );
  }
}

