import { cookies } from "next/headers";
import { NextResponse } from "next/server";

export async function GET() {
  const token = (await cookies()).get("access_token")?.value;

  if (!token) {
    return NextResponse.json({ error: "No token" }, { status: 401 });
  }

  return NextResponse.json({
    socketUrl: `${process.env.NEXT_PUBLIC_SOCKET_URL}/socket?token=${token}`,
  });
}
