import { NextResponse } from "next/server";
import { clearManagedLogin } from "@/lib/server/managedAuth";

export const runtime = "nodejs";

export async function GET() {
  await clearManagedLogin();
  return NextResponse.redirect("/");
}
