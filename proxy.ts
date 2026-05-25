import { type NextRequest, NextResponse } from "next/server";

export function proxy(request: NextRequest) {
  const childMode = request.cookies.get("viada_child_mode")?.value === "1";
  const childGameMode = request.cookies.get("viada_child_game_mode")?.value;
  const pathname = request.nextUrl.pathname;

  if (childMode && pathname === "/play-teen" && childGameMode === "kids") {
    return NextResponse.redirect(new URL("/play", request.url));
  }

  if (childMode && pathname === "/play" && childGameMode === "teen") {
    return NextResponse.redirect(new URL("/play-teen", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon\\.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
