# [away](https://away-vacation-nate.fly.dev)

a vacation planner built for a hackathon with [LangChain](https://docs.langchain.com/oss/python/langchain/overview), LangGraph, and LangSmith. suggests itineraries, estimates budgets, and generates travel search links. Next.js frontend on Fly.io; agent, threads, and traces on LangSmith.

## run

requires Node.js 24+, Python 3.11, and uv.

### web

```sh
cd web
cp .env.example .env.local
npm ci
npm run dev
```

fill in `.env.local` with your deployment URL, LangSmith key, demo password, and session secret. open [localhost:3007](http://localhost:3007).

### agent

from the repo root, with `LANGSMITH_API_KEY` in your environment:

```sh
uv sync --python 3.11
uv run langgraph dev --no-browser --port 2027
```

select `vacation` in Studio.

## test

```sh
uv run python -m unittest discover -s tests
cd web
npm run check
npm run build
node smoke.mjs
```

the smoke test needs `DEMO_PASSWORD` in your environment and a running web app. it makes real model calls. set `TEST_URL` to test a remote instance.

## deploy

```sh
# agent, from the repo root
uv run langgraph deploy --deployment-id YOUR_DEPLOYMENT_ID --remote --no-input

# web
cd web
fly deploy --remote-only --ha=false
```

`web/fly.toml` targets our hackathon app. update it for your own deployment and set Fly secrets: `LANGSMITH_API_KEY`, `DEMO_PASSWORD`, `SESSION_SECRET`.

demo access uses a shared password and per-browser sessions. rate limits reset on server restart. travel prices are estimates.
