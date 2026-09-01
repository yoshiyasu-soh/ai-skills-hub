import { Hono } from "hono";
import type { AuthUser, Env } from "../types";

const me = new Hono<{ Bindings: Env; Variables: { user: AuthUser } }>();

me.get("/", (c) => c.json({ user: c.get("user") }));

export default me;
