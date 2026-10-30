
import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { ZodError } from "zod";

import { connectDB } from "@/lib/mongodb";
import User from "@/models/User";
import { registerSchema } from "@/lib/validations/auth";

export async function POST(request: Request) {
  try {
    const body: unknown = await request.json();
    const parsed = registerSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        {
          error: "Invalid registration details",
          issues: parsed.error.flatten().fieldErrors,
        },
        { status: 400 }
      );
    }

    await connectDB();

    const existingUser = await User.findOne({
      email: parsed.data.email,
    });

    if (existingUser) {
      return NextResponse.json(
        { error: "Unable to register with this email address" },
        { status: 409 }
      );
    }

    const passwordHash = await bcrypt.hash(
      parsed.data.password,
      12
    );

    await User.create({
      name: parsed.data.name,
      email: parsed.data.email,
      passwordHash,
      role: "user",
      active: true,
    });

    return NextResponse.json(
      { message: "Registration successful. You can now sign in." },
      { status: 201 }
    );
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json(
        { error: "Invalid registration details" },
        { status: 400 }
      );
    }

    // Handle a concurrent registration for the same email.
    if (
      typeof error === "object" &&
      error !== null &&
      "code" in error &&
      error.code === 11000
    ) {
      return NextResponse.json(
        { error: "Unable to register with this email address" },
        { status: 409 }
      );
    }

    console.error("Registration failed:", error);

    return NextResponse.json(
      { error: "Registration failed. Please try again." },
      { status: 500 }
    );
  }
}
