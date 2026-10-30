
import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import { getActiveUser } from "@/lib/permissions";
import Category from "@/models/Category";

export const runtime = "nodejs";

export async function GET() {
  try {
    const user = await getActiveUser();

    if (!user) {
      return NextResponse.json(
        { success: false, message: "Please log in first." },
        { status: 401 }
      );
    }

    await connectDB();

    const categories = await Category.find({})
      .sort({ name: 1 })
      .lean();

    return NextResponse.json({
      success: true,
      categories,
    });
  } catch (error) {
    console.error("Get categories error:", error);

    return NextResponse.json(
      { success: false, message: "Unable to load categories." },
      { status: 500 }
    );
  }
}
