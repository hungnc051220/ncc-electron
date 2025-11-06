import { NextResponse, NextRequest } from "next/server";
import { cookies } from "next/headers";
import { decodeToken } from "./lib/utils";
import { onRefreshToken } from "./data/loaders-server";

const protectedRoutes = ["/", "/users", "/machine-serials"];
const publicRoutes = ["/sign-in"];

export async function proxy(req: NextRequest) {
  const path = req.nextUrl.pathname;
  const isProtectedRoute = protectedRoutes.includes(path);
  const isPublicRoute = publicRoutes.includes(path);

  const accessToken = (await cookies()).get("access_token")?.value;
  const refreshToken = (await cookies()).get("refresh_token")?.value;

  let isValid = true;
  if (accessToken) {
    const payload = decodeToken(accessToken);
    if (!payload) {
      isValid = false;
    } else {
      const exp = payload.exp * 1000;
      if (Date.now() >= exp) {
        isValid = false;
      }
    }
  } else {
    isValid = false;
  }

  if (!isValid && refreshToken) {
    const res = await onRefreshToken(refreshToken);
    if (!res.ok) {
      const response = NextResponse.redirect(new URL("/sign-in", req.url));
      response.cookies.delete("access_token");
      response.cookies.delete("refresh_token");
      return response;
    } else {
      const data = await res.json();
      const response = NextResponse.next();
      response.cookies.set("access_token", data.access_token, {
        httpOnly: true,
        secure: true,
        maxAge: data.expires_in,
        sameSite: "lax",
      });
      response.cookies.set("refresh_token", data.refresh_token, {
        httpOnly: true,
        secure: true,
        maxAge: data.refresh_expires_in,
        sameSite: "lax",
      });
      return response;
    }
  }

  if (isProtectedRoute && !isValid) {
    return NextResponse.redirect(new URL("/sign-in", req.url));
  }

  if (isPublicRoute && isValid) {
    return NextResponse.redirect(new URL("/", req.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|.*\\.png$).*)"],
};
