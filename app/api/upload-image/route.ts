import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getApiBaseUrl } from "@/lib/env";

export async function POST(request: NextRequest) {
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

    // Get form data from request
    const formData = await request.formData();
    const file = formData.get("file") as File;

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    // Create new FormData for the API call
    const uploadFormData = new FormData();
    uploadFormData.append("file", file);

    // Forward request to the actual upload API
    const uploadResponse = await fetch(
      `${getApiBaseUrl()}/api/pos/v1/attachments/admin/upload`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
        body: uploadFormData,
      }
    );

    if (!uploadResponse.ok) {
      const errorText = await uploadResponse.text();
      return NextResponse.json(
        { error: `Upload failed: ${errorText}` },
        { status: uploadResponse.status }
      );
    }

    const result = await uploadResponse.text();
    return NextResponse.json({
      imageUrl: result,
    });
  } catch (error) {
    console.error("Upload error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
