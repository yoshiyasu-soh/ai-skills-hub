import { Hono } from "hono";
import { authMiddleware } from "./auth";
import favoritesRoute from "./routes/favorites";
import itemsRoute from "./routes/items";
import meRoute from "./routes/me";
import rankingRoute from "./routes/ranking";
import tagsRoute from "./routes/tags";
import type { AuthUser, Env } from "./types";

const app = new Hono<{ Bindings: Env; Variables: { user: AuthUser } }>();

// /api/* 以外は wrangler.jsonc の assets.not_found_handling (SPA fallback) が
// 直接処理するため、この Worker では /api/* のみをハンドリングする。
app.use("/api/*", authMiddleware);

app.route("/api/items", itemsRoute);
app.route("/api/tags", tagsRoute);
app.route("/api/favorites", favoritesRoute);
app.route("/api/ranking", rankingRoute);
app.route("/api/me", meRoute);

app.onError((err, c) => {
  console.error(err);
  const message = err instanceof Error ? err.message : "unexpected error";
  return c.json({ error: "internal_error", message }, 500);
});

export default app;
