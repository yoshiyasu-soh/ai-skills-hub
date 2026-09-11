import { Hono } from "hono";
import { fetchUserProfileRow, toUserProfileDTO } from "../lib/userProfile";
import type { AuthUser, Env } from "../types";

const me = new Hono<{ Bindings: Env; Variables: { user: AuthUser } }>();

me.get("/", async (c) => {
  const email = c.get("user").email;
  const row = await fetchUserProfileRow(c.env.DB, email);
  if (!row) return c.json({ error: "not_found" }, 404);
  return c.json({ user: toUserProfileDTO(row) });
});

export default me;
