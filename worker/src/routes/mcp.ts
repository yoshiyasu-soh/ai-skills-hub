import { createMcpHandler } from "@modelcontextprotocol/server";
import { Hono } from "hono";
import { buildMcpServer } from "../mcp/tools";
import type { AuthUser, Env } from "../types";

const mcp = new Hono<{ Bindings: Env; Variables: { user: AuthUser } }>();

/**
 * MCP(Model Context Protocol)エンドポイント。
 * 認証は上位で mount されている authMiddleware(/api/*)にすべて委譲しており、
 * ここに到達した時点で c.get("user") は Cf-Access-Jwt-Assertion 検証済み。
 * リクエストごとにステートレスな McpServer を生成するだけなので、
 * セッション用の永続化(KV/Durable Objects)は不要。
 */
mcp.all("/", async (c) => {
  const user = c.get("user");
  const baseUrl = new URL(c.req.url).origin;
  const handler = createMcpHandler(() => buildMcpServer(c.env, user.email, baseUrl), { legacy: "stateless" });
  return handler.fetch(c.req.raw);
});

export default mcp;
