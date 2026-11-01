import { NextResponse } from "next/server";
import { auth } from "@/app/lib/auth";

export default auth((req) => {
  const { pathname, searchParams } = req.nextUrl;

  if (!(pathname === "/app" || pathname.startsWith("/app/"))) {
    return NextResponse.next();
  }

  if (!req.auth) {
    const url = req.nextUrl.clone();
    url.pathname = "/";
    if (!url.searchParams.get("callbackUrl")) {
      const qs = searchParams.toString();
      url.searchParams.set("callbackUrl", pathname + (qs ? `?${qs}` : ""));
    }
    return NextResponse.redirect(url);
  }

  if (req.auth.tokenError) {
    const url = req.nextUrl.clone();
    url.pathname = "/";
    if (!url.searchParams.get("callbackUrl")) {
      const qs = searchParams.toString();
      url.searchParams.set("callbackUrl", pathname + (qs ? `?${qs}` : ""));
    }
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
});

export const config = {
  matcher: ["/app/:path*"],
};
