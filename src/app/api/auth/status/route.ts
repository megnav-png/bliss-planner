import { NextResponse } from "next/server";
import { getManagedAuthStatus } from "@/lib/server/managedAuth";

export const runtime = "nodejs";

export async function GET() {
  return NextResponse.json(await getManagedAuthStatus());
}
