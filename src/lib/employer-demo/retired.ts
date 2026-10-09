import { NextResponse } from "next/server";
import { DEMO_ENTRY } from "./fixtures";

/** The answer every retired public demo endpoint gives: gone, and where the demo lives now. */
export function retiredDemoApi(): NextResponse {
  return NextResponse.json(
    { error: "The public demo has moved into the employer sandbox, which needs a signed-in employer account.", entry: DEMO_ENTRY },
    { status: 410, headers: { "Cache-Control": "no-store" } },
  );
}
