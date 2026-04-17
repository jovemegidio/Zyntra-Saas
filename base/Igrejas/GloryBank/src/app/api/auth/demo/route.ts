import { NextRequest, NextResponse } from "next/server";
import { createDemoSession } from "@/lib/auth";
import { DEMO_MODE } from "@/lib/demo";

export async function GET(request: NextRequest) {
  if (!DEMO_MODE) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  await createDemoSession();
  return NextResponse.redirect(new URL("/dashboard", request.url));
}
