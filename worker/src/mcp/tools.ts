import { McpServer } from "@modelcontextprotocol/server";
import { z } from "zod";
import { fetchItemRow, searchItems, toItemDTOs } from "../lib/items";
import type { Env } from "../types";

const SORT_VALUES = ["newest", "updated", "popular", "favorites", "name"] as const;

/**
 * MCP経由で公開する参照系ツール一式を登録する。
 * 書き込み系(投稿・編集・お気に入り・DL/コピーのカウント等)は現時点では未対応。
 * 認証は呼び出し元のHonoルート(/api配下は authMiddleware で保護済み)にすべて委譲しており、
 * ここでは検証済みの viewerEmail を受け取って利用するだけで、MCP自体は追加のトークン検証を行わない。
 */
export function buildMcpServer(env: Env, viewerEmail: string, baseUrl: string): McpServer {
  const server = new McpServer({ name: "ai-skills-hub", version: "1.0.0" });

  server.registerTool(
    "search_items",
    {
      title: "スキル・プロンプトを検索",
      description:
        "AI Skills Hub に投稿されているスキル(SKILL.md/ZIP)・プロンプトをキーワード/種別/タグで検索する。",
      inputSchema: z.object({
        query: z.string().optional().describe("タイトル・概要・詳細説明を対象とした部分一致検索キーワード"),
        type: z.enum(["skill", "prompt"]).optional().describe("種別で絞り込む(未指定なら両方)"),
        tags: z.array(z.string()).optional().describe("タグ名で絞り込む(すべて一致するAND条件、例: ['デザイン'])"),
        sort: z.enum(SORT_VALUES).optional().describe("並び順(既定: newest=新着順)"),
        page: z.number().int().min(1).optional().describe("ページ番号(既定: 1)"),
        pageSize: z.number().int().min(1).max(50).optional().describe("1ページあたりの件数(既定: 20, 最大: 50)"),
      }),
    },
    async ({ query, type, tags, sort, page, pageSize }) => {
      let tagIds: number[] = [];
      if (tags && tags.length > 0) {
        const names = tags.map((t) => t.trim().toLowerCase()).filter(Boolean);
        if (names.length > 0) {
          const placeholders = names.map(() => "?").join(",");
          const { results } = await env.DB.prepare(`SELECT id FROM tags WHERE name IN (${placeholders})`)
            .bind(...names)
            .all<{ id: number }>();
          tagIds = (results ?? []).map((r) => r.id);
          // 指定したタグ名が1つも見つからない場合は、意図的な絞り込みとしてヒットなしを返す
          if (tagIds.length === 0) {
            return {
              content: [{ type: "text", text: JSON.stringify({ items: [], total: 0, page: page ?? 1, pageSize: pageSize ?? 20 }) }],
            };
          }
        }
      }

      const result = await searchItems(env.DB, { type, q: query, tagIds, sort, page, pageSize }, viewerEmail);
      const items = result.items.map((item) => ({
        id: item.id,
        type: item.type,
        title: item.title,
        summary: item.summary,
        version: item.version,
        authorName: item.authorName,
        usageCount: item.usageCount,
        favoriteCount: item.favoriteCount,
        tags: item.tags.map((t) => t.label),
        updatedAt: item.updatedAt,
        url: `${baseUrl}/items/${item.id}`,
      }));
      return {
        content: [
          { type: "text", text: JSON.stringify({ items, total: result.total, page: result.page, pageSize: result.pageSize }, null, 2) },
        ],
      };
    },
  );

  server.registerTool(
    "get_item",
    {
      title: "スキル・プロンプトの詳細を取得",
      description:
        "指定したIDのスキル/プロンプトの詳細(概要・詳細説明・プロンプト本文または使い方メモ・タグ・作者等)を取得する。",
      inputSchema: z.object({
        id: z.string().describe("アイテムID(search_itemsの結果に含まれるid)"),
      }),
    },
    async ({ id }) => {
      const row = await fetchItemRow(env.DB, id);
      if (!row) {
        return { content: [{ type: "text", text: `アイテムが見つかりません(id=${id})` }], isError: true };
      }
      const [item] = await toItemDTOs(env.DB, [row], viewerEmail);

      const body: Record<string, unknown> = {
        id: item.id,
        type: item.type,
        title: item.title,
        summary: item.summary,
        description: item.description,
        version: item.version,
        authorName: item.authorName,
        authorEmail: item.authorEmail,
        usageCount: item.usageCount,
        favoriteCount: item.favoriteCount,
        tags: item.tags.map((t) => t.label),
        createdAt: item.createdAt,
        updatedAt: item.updatedAt,
        url: `${baseUrl}/items/${item.id}`,
      };
      if (item.type === "prompt") {
        body.promptBody = item.body;
      } else {
        body.usageNote = item.body || null;
        body.fileName = item.fileName;
        body.hasDownloadableSource = Boolean(item.fileName && item.fileName.toLowerCase().endsWith(".md"));
        body.note = body.hasDownloadableSource
          ? "SKILL.mdの内容は get_skill_source ツールで取得できます。"
          : "ZIP形式のためMCP経由では内容を取得できません。ダウンロードはWebサイトから行ってください。";
      }

      return { content: [{ type: "text", text: JSON.stringify(body, null, 2) }] };
    },
  );

  server.registerTool(
    "list_tags",
    {
      title: "タグ一覧を取得",
      description: "search_itemsの絞り込みに使えるタグの一覧(名前・利用件数)を取得する。",
      inputSchema: z.object({}),
    },
    async () => {
      const { results } = await env.DB.prepare(
        `SELECT t.name, t.label, t.is_default, COUNT(it.item_id) as item_count
         FROM tags t
         LEFT JOIN item_tags it ON it.tag_id = t.id
         GROUP BY t.id
         ORDER BY t.is_default DESC, t.label ASC`,
      ).all<{ name: string; label: string; is_default: number; item_count: number }>();

      const tags = (results ?? []).map((t) => ({
        name: t.name,
        label: t.label,
        isDefault: Boolean(t.is_default),
        itemCount: t.item_count,
      }));
      return { content: [{ type: "text", text: JSON.stringify({ tags }, null, 2) }] };
    },
  );

  server.registerTool(
    "get_skill_source",
    {
      title: "SKILL.mdのソースを取得",
      description:
        "SKILL.md単体形式で投稿されたスキルの本文をテキストで取得する。ZIP形式のスキルやプロンプトには使用できない。",
      inputSchema: z.object({
        id: z.string().describe("アイテムID"),
      }),
    },
    async ({ id }) => {
      const row = await fetchItemRow(env.DB, id);
      if (!row) {
        return { content: [{ type: "text", text: `アイテムが見つかりません(id=${id})` }], isError: true };
      }
      if (row.type !== "skill" || !row.r2_key || !row.file_name?.toLowerCase().endsWith(".md")) {
        return {
          content: [{ type: "text", text: "このアイテムはSKILL.md単体形式ではないため、取得できません。" }],
          isError: true,
        };
      }
      const obj = await env.ASSETS_BUCKET.get(row.r2_key);
      if (!obj) {
        return { content: [{ type: "text", text: "ファイルがストレージに見つかりません。" }], isError: true };
      }
      const text = await obj.text();
      return { content: [{ type: "text", text }] };
    },
  );

  return server;
}
