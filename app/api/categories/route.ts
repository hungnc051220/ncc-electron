import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getApiBaseUrl } from "@/lib/env";

export async function GET(request: NextRequest) {
  try {
    // Get accessToken from httpOnly cookie
    const cookieStore = await cookies();
    const accessToken = cookieStore.get("access_token")?.value;

    if (!accessToken) {
      return NextResponse.json(
        { error: "Unauthorized - No access token" },
        { status: 401 }
      );
    }

    // Get query parameters
    const searchParams = request.nextUrl.searchParams;
    const current = searchParams.get("current") || "1";
    const pageSize = searchParams.get("pageSize") || "10";

    // Build API URL with query parameters
    const apiUrl = new URL(
      `${getApiBaseUrl()}/api/pos/v1/films/categories`,
      request.url
    );
    apiUrl.searchParams.set("current", current);
    apiUrl.searchParams.set("pageSize", pageSize);

    // Forward request to the backend API
    const response = await fetch(apiUrl.toString(), {
      method: "GET",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      return NextResponse.json(
        { error: `API request failed: ${errorText}` },
        { status: response.status }
      );
    }

    const result = await response.json();
    return NextResponse.json(result);
  } catch (error) {
    console.error("Categories API error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
