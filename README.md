# vacation-agent

a vacation-planning starter built with [LangChain](https://docs.langchain.com/oss/python/langchain/overview) and LangGraph, deployed on LangSmith. it uses the [LangSmith LLM Gateway](https://docs.langchain.com/langsmith/llm-gateway) for model access and generates flight, hotel, and activity search links. it does not fetch live prices or availability or make bookings.

**live:** [away customer-facing demo](https://away-vacation-nate.fly.dev) · [LangSmith deployment](https://smith.langchain.com/o/a587d4ae-52ba-4317-9cd5-f707845a0bf6/host/deployments/7d107fd8-c4a0-4120-b813-d2261f5fdb7b)

## web app

the Next.js app in `web/` uses LangGraph's React `useStream` hook. the browser talks to a narrow same-origin server proxy; only that server holds the LangSmith key. the agent still runs on LangSmith, where its threads and traces live. no LangSmith login is required for travelers.

requires Node.js 24+. copy `web/.env.example` to `web/.env.local`, set your deployment URL and workspace key, and choose a demo password and a random session secret (for example, `openssl rand -hex 32`). these files are gitignored. alternatively, inject the values through your secret manager. local origin defaults to `http://localhost:3007`.

```sh
cd web
npm ci
npm run dev
```

```sh
npm run check
npm run build
node smoke.mjs
```

the smoke test requires `DEMO_PASSWORD` in its process environment (it does not load `.env.local`). it calls the real hosted agent, incurs model usage, and leaves test threads. set `TEST_URL=https://away-vacation-nate.fly.dev` to test the deployed frontend. it checks auth, origin rejection, thread isolation, input constraints, streamed tool use, saved state, and follow-up memory.

redeploy the web app from `web/` with `fly deploy --remote-only --ha=false`. the checked-in Fly configuration targets our hackathon app; change the app name, origin, and agent URL before deploying your own copy. it uses one shared-CPU 512 MB machine in Chicago, with idle stop enabled. Fly runtime secrets are `LANGSMITH_API_KEY`, `DEMO_PASSWORD`, and `SESSION_SECRET`; never prefix these with `NEXT_PUBLIC_`.

this is a protected team demo, not production identity management. each browser gets its own signed session and can access only threads it created. the shared password has no individual revocation; quotas are in-memory and reset on restart. before customer launch: real user accounts, durable per-user quotas, session/logout management, cross-device thread listings, retention policy, and monitoring. the temporary LangSmith service key expires after 30 days. the browser remembers only the current trip; starting a new one does not delete previous LangSmith threads.

## install

requires uv and Python 3.11.

```sh
uv sync --python 3.11
uv run python -m unittest discover -s tests
```

## use

provide `LANGSMITH_API_KEY` in your process environment using your secret manager. the key must have access to the workspace's configured gateway provider. do not commit credentials.

```sh
uv run langgraph dev --no-browser --port 2027
```

select the `vacation` graph in Studio. try: “plan a 2-day Lisbon food trip from Chicago for one traveler, $1500 USD excluding flights. include travel links.”

## deploy

with the workspace key available in the environment:

```sh
uv run langgraph deploy --deployment-id 7d107fd8-c4a0-4120-b813-d2261f5fdb7b --remote --no-input
```

this updates the existing deployment rather than creating another one. the hosted runtime supplies its LangSmith credential; local development requires your own workspace key.
