import { NextRequest, NextResponse } from "next/server";
import { completeManagedLogin } from "@/lib/server/managedAuth";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  const result = await completeManagedLogin(request);
  return NextResponse.redirect(result.redirectTo);
}
