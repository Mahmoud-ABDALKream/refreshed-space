import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

// GET: List all registered users (excluding sensitive data)
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const excludeUserId = searchParams.get("excludeUserId");

    const where = excludeUserId ? { NOT: { id: excludeUserId } } : {};

    const users = await db.user.findMany({
      where,
      select: {
        id: true,
        username: true,
        publicKey: true,
        createdAt: true,
      },
      orderBy: { username: "asc" },
    });

    return NextResponse.json({ users });
  } catch (error) {
    console.error("Get users error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
