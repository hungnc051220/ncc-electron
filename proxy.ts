import { NextResponse, NextRequest } from "next/server";
import { cookies } from "next/headers";

const protectedRoutes = ["/"];
const publicRoutes = ["/sign-in"];

export async function proxy(req: NextRequest) {
  const path = req.nextUrl.pathname;
  const isProtectedRoute = protectedRoutes.includes(path);
  const isPublicRoute = publicRoutes.includes(path);

  const accessToken = (await cookies()).get("access_token")?.value;
  if (isProtectedRoute && !accessToken) {
    return NextResponse.redirect(new URL("/sign-in", req.url));
  }

  if (isPublicRoute && accessToken) {
    return NextResponse.redirect(new URL("/", req.nextUrl));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|.*\\.png$).*)"],
};
