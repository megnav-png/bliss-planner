import { NextResponse } from "next/server";
import { beginManagedLogin } from "@/lib/server/managedAuth";

export const runtime = "nodejs";

export async function GET() {
  const result = await beginManagedLogin();
  return NextResponse.redirect(result.redirectTo);
}
