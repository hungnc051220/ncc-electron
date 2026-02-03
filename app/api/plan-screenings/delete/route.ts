import { getApiBaseUrl } from "@/lib/env";
import axios from "axios";
import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const cookieStore = await cookies();
    const accessToken = cookieStore.get("access_token")?.value;

    if (!accessToken) {
      return NextResponse.json(
        { error: "Unauthorized - No access token" },
        { status: 401 },
      );
    }

    const results = await Promise.all(
      body?.map((id: number) =>
        axios.delete(`${getApiBaseUrl()}/api/pos/plan-screenings/${id}`, {
          headers: { Authorization: `Bearer ${accessToken}` },
        }),
      ),
    );

    const successIds = results
      .map((r, i) => (r.status === "fulfilled" ? body[i] : null))
      .filter(Boolean);

    const failedIds = results
      .map((r, i) => (r.status === "rejected" ? body[i] : null))
      .filter(Boolean);

    return NextResponse.json({
      successIds,
      failedIds,
    });
  } catch (error) {
    console.error("Delete plan screening error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
