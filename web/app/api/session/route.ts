import {
  allow,
  body,
  equal,
  sameOrigin,
  session,
  startSession,
} from "../../../lib/server";
import { z } from "zod";

export async function GET() {
  return Response.json({ authenticated: Boolean(await session()) });
}

export async function POST(request: Request) {
  if (!sameOrigin(request))
    return Response.json({ error: "Invalid origin" }, { status: 403 });
  if (!process.env.DEMO_PASSWORD)
    return Response.json(
      { error: "Demo access is not configured" },
      { status: 503 },
    );
  const ip = request.headers.get("fly-client-ip") ?? "local";
  if (!allow(`login:${ip}`, 20, 15 * 60_000))
    return Response.json(
      { error: "Too many attempts. Try again in 15 minutes." },
      { status: 429 },
    );
  try {
    const data = z
      .object({ password: z.string().max(256) })
      .parse(await body(request));
    if (!equal(data.password, process.env.DEMO_PASSWORD))
      return Response.json(
        { error: "That password didn’t match. Try again." },
        { status: 401 },
      );
    await startSession();
    return Response.json({ authenticated: true });
  } catch {
    return Response.json(
      { error: "Enter the demo password." },
      { status: 400 },
    );
  }
}
