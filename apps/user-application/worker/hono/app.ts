import { fetchRequestHandler } from "@trpc/server/adapters/fetch";
import { Hono } from "hono";
import { appRouter } from "@/worker/trpc/router";
import { createContext } from "@/worker/trpc/context";
import { getAuth } from "@repo/data-ops/auth";

export const App = new Hono<{ Bindings: ServiceBindings }>();

App.on(["POST", "GET"], "/api/auth/*", (c) => {
  const auth = getAuth({
    clientId: c.env.GOOGLE_CLIENT_ID,
    clientSecret: c.env.GOOGLE_CLIENT_SECRET,
  });
  return auth.handler(c.req.raw);
});

App.all("/trpc/*", async (c) => {
  return fetchRequestHandler({
    endpoint: "/trpc",
    req: c.req.raw,
    router: appRouter,
    createContext: () =>
      createContext({ req: c.req.raw, env: c.env, workerCtx: c.executionCtx }),
  });
});

App.get("/click-socket", async (c) => {
  const headers = new Headers(c.req.raw.headers);
  headers.set("X-Account-Id", "1234567890");

  const proxiedRequest = new Request(c.req.raw, { headers });
  return c.env.DATA_SERVICE.fetch(proxiedRequest);
});
