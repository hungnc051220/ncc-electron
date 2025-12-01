import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { getSocketUrl } from "@/lib/env";

export async function GET() {
  const token = (await cookies()).get("access_token")?.value;

  if (!token) {
    return NextResponse.json({ error: "No token" }, { status: 401 });
  }

  return NextResponse.json({
    socketUrl: `${getSocketUrl()}/socket?token=${token}`,
  });
}
