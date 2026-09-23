"use client";

import { useEffect, useRef, useState } from "react";
import { useStream } from "@langchain/langgraph-sdk/react";
import type { Message } from "@langchain/langgraph-sdk";
import Markdown from "react-markdown";
import remarkGfm from "remark-gfm";

const ideas = [
  {
    title: "A long weekend in Lisbon",
    detail: "Good food, steep streets, no rush.",
    prompt:
      "Plan a 3-day Lisbon trip for two people from Chicago in May. Budget $2500 USD excluding flights. We love food and walking. Include travel links and label estimates.",
  },
  {
    title: "Somewhere we haven’t been",
    detail: "Three ideas to get you unstuck.",
    prompt:
      "Suggest three destinations for a 5-day trip for two adults from Chicago in May, $4000 USD total including flights. We like food, nature, and easy walks. Compare tradeoffs and label estimates.",
  },
  {
    title: "A slower kind of holiday",
    detail: "Less scheduling. More breathing room.",
    prompt:
      "Plan a relaxed 4-day trip to coastal Maine for two adults from Boston in September, $2000 USD excluding transport to Maine. One main activity a day, good seafood, and time by the water. Include travel links.",
  },
];

function Brand() {
  return (
    <a className="brand" href="/" aria-label="away home">
      away
      <span className="brand-mark" aria-hidden="true">
        ↗
      </span>
    </a>
  );
}

export default function Page() {
  const [ready, setReady] = useState(false);
  const [authenticated, setAuthenticated] = useState(false);
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    fetch("/api/session")
      .then((r) => r.json())
      .then((data) => {
        setAuthenticated(data.authenticated === true);
        setReady(true);
      })
      .catch(() => {
        setError("Couldn’t connect. Refresh to try again.");
        setReady(true);
      });
  }, []);
  if (!ready)
    return (
      <main className="gate">
        <Brand />
        <p>Opening your travel notebook…</p>
      </main>
    );
  if (!authenticated)
    return (
      <main className="gate">
        <Brand />
        <div className="gate-copy">
          <p className="quiet">a little less planning</p>
          <h1>
            Your next trip
            <br />
            starts here.
          </h1>
          <p>
            A place for half-formed ideas, good itineraries,
            <br className="desktop" /> and “what if we went somewhere?”
          </p>
        </div>
        <form
          className="login"
          onSubmit={async (event) => {
            event.preventDefault();
            setBusy(true);
            setError("");
            try {
              const r = await fetch("/api/session", {
                method: "POST",
                headers: { "content-type": "application/json" },
                body: JSON.stringify({ password }),
              });
              const data = await r.json();
              if (!r.ok) {
                setError(data.error ?? "Couldn’t sign in.");
                return;
              }
              setPassword("");
              setAuthenticated(true);
            } catch {
              setError("Couldn’t connect. Try again.");
            } finally {
              setBusy(false);
            }
          }}
        >
          <label htmlFor="password">Team demo password</label>
          <div className="login-row">
            <input
              id="password"
              type="password"
              autoComplete="current-password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
            <button disabled={busy}>{busy ? "Opening…" : "Come on in"}</button>
          </div>
          {error && (
            <p role="alert" className="error">
              {error}
            </p>
          )}
          <p className="fine">
            Private hackathon demo. No LangSmith account needed.
          </p>
        </form>
        <div className="gate-stamp" aria-hidden="true">
          take the
          <br />
          scenic route
        </div>
      </main>
    );
  return <Planner />;
}

function Planner() {
  const [threadId, setThreadId] = useState<string | null>(() =>
    localStorage.getItem("away-thread"),
  );
  const [draft, setDraft] = useState("");
  const [sendError, setSendError] = useState("");
  const [submitted, setSubmitted] = useState("");
  const bottom = useRef<HTMLDivElement>(null);
  const stream = useStream<{ messages: Message[] }>({
    apiUrl: `${window.location.origin}/api/agent`,
    assistantId: "vacation",
    threadId,
    onThreadId: (id) => {
      setThreadId(id);
      localStorage.setItem("away-thread", id);
    },
    fetchStateHistory: false,
  });
  const messages = stream.messages.filter(
    (m) => m.type === "human" || m.type === "ai",
  );
  const hasMessages = messages.length > 0 || Boolean(submitted);
  useEffect(() => {
    if (stream.isLoading) bottom.current?.scrollIntoView({ block: "end" });
  }, [stream.messages, stream.isLoading]);
  async function send(text: string) {
    if (!text.trim() || stream.isLoading) return;
    setDraft("");
    setSendError("");
    setSubmitted(text);
    try {
      await stream.submit({
        messages: [
          { type: "human", content: text.trim(), id: crypto.randomUUID() },
        ],
      });
    } catch {
      setDraft(text);
      setSendError(
        "The message didn’t finish. Try again, or start a new trip.",
      );
    } finally {
      setSubmitted("");
    }
  }
  function newTrip() {
    setThreadId(null);
    localStorage.removeItem("away-thread");
    setDraft("");
    setSubmitted("");
    setSendError("");
  }
  return (
    <div className="app">
      <aside className="sidebar">
        <Brand />
        <p className="tagline">
          a little less planning.
          <br />a little more going.
        </p>
        <button
          className="new-trip"
          onClick={newTrip}
          disabled={stream.isLoading}
        >
          <span>＋</span> New trip
        </button>
        <div className="notebook">
          <span className="sun" aria-hidden="true">
            ☀
          </span>
          <h2>
            Room for
            <br />a detour.
          </h2>
          <p>
            Start with a place, a feeling, or just a few days off. We’ll work
            out the rest together.
          </p>
        </div>
        <div className="side-footer">
          <span className="status-dot" /> Hackathon edition
          <p>
            Plans, not reservations.
            <br />
            Always check before you book.
          </p>
        </div>
      </aside>
      <main className="workspace">
        <header className="topbar">
          <span>
            {hasMessages
              ? "Your trip notebook"
              : "A blank page. A world of possibilities."}
          </span>
          <span className="private">Private demo</span>
        </header>
        <section
          className={`conversation ${hasMessages ? "has-messages" : ""}`}
          aria-label="Trip conversation"
        >
          {!hasMessages && (
            <div className="welcome">
              <p className="quiet">let’s get out of here</p>
              <h1>
                Where would you
                <br />
                rather be?
              </h1>
              <p className="intro">
                Tell me what a good trip looks like.
                <br />
                We’ll turn it into a plan you can actually use.
              </p>
              <div className="ideas">
                {ideas.map((idea, i) => (
                  <button
                    key={idea.title}
                    onClick={() => setDraft(idea.prompt)}
                  >
                    <span className={`idea-art art-${i}`} aria-hidden="true">
                      {["◒", "✳", "≈"][i]}
                    </span>
                    <strong>{idea.title}</strong>
                    <span>{idea.detail}</span>
                  </button>
                ))}
              </div>
            </div>
          )}
          {messages.map((message, index) => {
            const text =
              typeof message.content === "string"
                ? message.content
                : message.content
                    .map((block) =>
                      block.type === "text" && typeof block.text === "string"
                        ? block.text
                        : "",
                    )
                    .join("");
            if (!text) return null;
            return (
              <article
                key={message.id ?? index}
                className={`message ${message.type}`}
              >
                <div className="speaker">
                  {message.type === "human" ? "You" : "away"}
                </div>
                <div className="prose">
                  <Markdown
                    remarkPlugins={[remarkGfm]}
                    components={{
                      a: ({ children, href }) => (
                        <a
                          href={href}
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          {children}
                        </a>
                      ),
                    }}
                  >
                    {text}
                  </Markdown>
                </div>
              </article>
            );
          })}
          {submitted &&
            !messages.some(
              (m) => m.type === "human" && m.content === submitted,
            ) && (
              <article className="message human">
                <div className="speaker">You</div>
                <div className="prose">{submitted}</div>
              </article>
            )}
          {stream.isLoading && (
            <div className="thinking" role="status">
              <span className="status-dot" />
              {stream.messages.some((m) => m.type === "tool")
                ? "Putting your plan together…"
                : "Thinking through your trip…"}
            </div>
          )}
          {(stream.error || sendError) && (
            <div role="alert" className="error">
              {sendError ||
                "The planner couldn’t finish this request. Try again or start a new trip."}
            </div>
          )}
          <div ref={bottom} />
        </section>
        <footer className="composer-wrap">
          <form
            className="composer"
            onSubmit={(e) => {
              e.preventDefault();
              void send(draft);
            }}
          >
            <label className="sr-only" htmlFor="message">
              Tell us about your trip
            </label>
            <textarea
              id="message"
              placeholder={
                hasMessages
                  ? "Less driving? More beach? Change the plan…"
                  : "A week in Italy, two people, good food, no rental car…"
              }
              value={draft}
              maxLength={6000}
              rows={2}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => {
                if (
                  e.key === "Enter" &&
                  !e.shiftKey &&
                  !e.nativeEvent.isComposing
                ) {
                  e.preventDefault();
                  void send(draft);
                }
              }}
            />
            <button
              aria-label="Send message"
              disabled={stream.isLoading || !draft.trim()}
            >
              {stream.isLoading ? "…" : "↑"}
            </button>
          </form>
          <p className="fine">
            Rough estimates, not live prices. Travel links open searches, not
            bookings.
          </p>
        </footer>
      </main>
    </div>
  );
}
