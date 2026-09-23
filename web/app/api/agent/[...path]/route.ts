import { z } from "zod";
import {
  allow,
  apiUrl,
  body,
  client,
  sameOrigin,
  session,
} from "../../../../lib/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const runInput = z.object({
  input: z.object({
    messages: z
      .array(
        z.object({
          type: z.literal("human").optional(),
          role: z.literal("user").optional(),
          content: z.string().trim().min(1).max(6000),
          id: z.string().uuid().optional(),
        }),
      )
      .length(1),
  }),
});

async function handle(
  request: Request,
  context: { params: Promise<{ path: string[] }> },
) {
  const owner = await session();
  if (!owner)
    return Response.json({ error: "Sign in to continue." }, { status: 401 });
  if (request.method !== "GET" && !sameOrigin(request))
    return Response.json({ error: "Invalid origin" }, { status: 403 });
  const { path } = await context.params;
  const route = path.join("/");
  const sdk = client();
  try {
    if (request.method === "POST" && route === "threads") {
      if (!allow(`threads:${owner}`, 20))
        return Response.json(
          { error: "Trip limit reached. Try again later." },
          { status: 429 },
        );
      return Response.json(
        await sdk.threads.create({ metadata: { away_owner: owner } }),
      );
    }
    const threadId = path[1];
    if (path[0] !== "threads" || !z.uuid().safeParse(threadId).success)
      return new Response(null, { status: 404 });
    const allowed =
      (request.method === "GET" &&
        (path.length === 2 || (path.length === 3 && path[2] === "state"))) ||
      (request.method === "POST" &&
        path.length === 4 &&
        path[2] === "runs" &&
        path[3] === "stream");
    if (!allowed) return new Response(null, { status: 404 });
    const thread = await sdk.threads.get(threadId);
    if (thread.metadata?.away_owner !== owner)
      return new Response(null, { status: 404 });
    let payload: string | undefined;
    if (request.method === "POST") {
      if (!allow(`runs:${owner}`, 40) || !allow("global-runs", 200))
        return Response.json(
          { error: "Demo message limit reached. Try again in an hour." },
          { status: 429 },
        );
      const parsed = runInput.parse(await body(request));
      payload = JSON.stringify({
        assistant_id: "vacation",
        input: {
          messages: parsed.input.messages.map((m) => ({
            type: "human",
            content: m.content,
            id: m.id,
          })),
        },
        stream_mode: ["messages-tuple", "values"],
        multitask_strategy: "reject",
        config: { recursion_limit: 12 },
      });
    }
    const upstream = await fetch(`${apiUrl}/${route}`, {
      method: request.method,
      headers: {
        "x-api-key": process.env.LANGSMITH_API_KEY ?? "",
        "content-type": "application/json",
      },
      body: payload,
      signal: request.signal,
      cache: "no-store",
    });
    if (!upstream.ok)
      return Response.json(
        {
          error:
            upstream.status === 409
              ? "A reply is already running. Wait for it to finish."
              : "The planner could not complete this request. Try again.",
        },
        { status: upstream.status === 409 ? 409 : 502 },
      );
    return new Response(upstream.body, {
      headers: {
        "Content-Type":
          upstream.headers.get("content-type") ?? "application/json",
        "Cache-Control": "no-store",
        "X-Accel-Buffering": "no",
      },
    });
  } catch (error) {
    if (
      error instanceof z.ZodError ||
      error instanceof SyntaxError ||
      (error instanceof Error && error.message === "Request too large")
    )
      return Response.json(
        { error: "Send one message of up to 6,000 characters." },
        { status: 400 },
      );
    return Response.json(
      { error: "The planner is unavailable. Try again shortly." },
      { status: 502 },
    );
  }
}

export const GET = handle;
export const POST = handle;
