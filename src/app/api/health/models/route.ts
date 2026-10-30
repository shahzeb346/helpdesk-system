
import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";

import User from "@/models/User";
import Category from "@/models/Category";
import Ticket from "@/models/Ticket";
import Message from "@/models/Message";
import ActivityLog from "@/models/ActivityLog";
import Counter from "@/models/Counter";

export async function GET() {
  try {
    await connectDB();

    const models = [
      User,
      Category,
      Ticket,
      Message,
      ActivityLog,
      Counter,
    ];

    return NextResponse.json({
      success: true,
      message: "All six Mongoose models registered",
      models: models.map((model) => model.modelName),
    });
  } catch (error) {
    console.error("Model registration test failed:", error);

    return NextResponse.json(
      {
        success: false,
        message: "Model registration test failed",
      },
      { status: 500 }
    );
  }
}
