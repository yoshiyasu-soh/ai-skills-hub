import type { Context } from "hono";
import { Hono } from "hono";
import { fetchItemRow, parseTagIds, toItemDTOs } from "../lib/items";
import { slugify } from "../lib/slug";
import type { AuthUser, Env, ItemRow, SortOption } from "../types";

type AppContext = Context<{ Bindings: Env; Variables: { user: AuthUser } }>;

const items = new Hono<{ Bindings: Env; Variables: { user: AuthUser } }>();

const MAX_ZIP_SIZE = 25 * 1024 * 1024; // 25MB

type Fields = Record<string, unknown>;

async function readBody(c: AppContext): Promise<{ fields: Fields; file?: File }> {
  const contentType = c.req.header("content-type") ?? "";
  if (contentType.includes("multipart/form-data")) {
    const body = await c.req.parseBody({ all: true });
    const file = body["file"] instanceof File && body["file"].size > 0 ? (body["file"] as File) : undefined;
    return { fields: body as Fields, file };
  }
  const json = (await c.req.json().catch(() => ({}))) as Fields;
  return { fields: json };
}

function str(fields: Fields, key: string, fallback = ""): string {
  const v = fields[key];
  if (v === undefined || v === null) return fallback;
  return String(v).trim();
}

async function applyTags(db: D1Database, itemId: string, tagIds: number[], replace: boolean) {
  if (replace) {
    await db.prepare("DELETE FROM item_tags WHERE item_id = ?").bind(itemId).run();
  }
  if (tagIds.length === 0) return;

  const placeholders = tagIds.map(() => "?").join(",");
  const validTags = await db
    .prepare(`SELECT id FROM tags WHERE id IN (${placeholders})`)
    .bind(...tagIds)
    .all<{ id: number }>();
  const validIds = (validTags.results ?? []).map((t) => t.id);
  if (validIds.length === 0) return;

  const stmts = validIds.map((tagId) =>
    db.prepare("INSERT OR IGNORE INTO item_tags (item_id, tag_id) VALUES (?, ?)").bind(itemId, tagId),
  );
  await db.batch(stmts);
}

// ---- 一覧: type / タグ(AND) / 文字列検索 / ソート / ページング ----
items.get("/", async (c) => {
  const user = c.get("user");
  const typeParam = c.req.query("type");
  const q = c.req.query("q")?.trim();
  const tagsParam = c.req.query("tags");
  const sort = (c.req.query("sort") as SortOption) || "newest";
  const page = Math.max(1, Number(c.req.query("page") ?? "1") || 1);
  const pageSize = Math.min(50, Math.max(1, Number(c.req.query("pageSize") ?? "20") || 20));

  const conditions: string[] = [];
  const params: unknown[] = [];

  if (typeParam === "skill" || typeParam === "prompt") {
    conditions.push("i.type = ?");
    params.push(typeParam);
  }

  if (q) {
    const like = `%${q.toLowerCase()}%`;
    conditions.push("(LOWER(i.title) LIKE ? OR LOWER(i.summary) LIKE ? OR LOWER(i.description) LIKE ?)");
    params.push(like, like, like);
  }

  const tagIds = (tagsParam ?? "")
    .split(",")
    .map((v) => Number(v.trim()))
    .filter((v) => Number.isFinite(v) && v > 0);

  if (tagIds.length > 0) {
    const placeholders = tagIds.map(() => "?").join(",");
    conditions.push(
      `i.id IN (SELECT item_id FROM item_tags WHERE tag_id IN (${placeholders}) GROUP BY item_id HAVING COUNT(DISTINCT tag_id) = ?)`,
    );
    params.push(...tagIds, tagIds.length);
  }

  const where = conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";
  const orderBy =
    sort === "popular"
      ? "i.usage_count DESC"
      : sort === "favorites"
        ? "i.favorite_count DESC"
        : sort === "name"
          ? "i.title COLLATE NOCASE ASC"
          : "i.created_at DESC";

  const countRow = await c.env.DB.prepare(`SELECT COUNT(*) as cnt FROM items i ${where}`)
    .bind(...params)
    .first<{ cnt: number }>();
  const total = countRow?.cnt ?? 0;

  const offset = (page - 1) * pageSize;
  const { results } = await c.env.DB.prepare(
    `SELECT i.*, u.display_name as author_display_name
     FROM items i JOIN users u ON u.email = i.author_email
     ${where}
     ORDER BY ${orderBy}
     LIMIT ? OFFSET ?`,
  )
    .bind(...params, pageSize, offset)
    .all<ItemRow & { author_display_name: string }>();

  const dtos = await toItemDTOs(c.env.DB, results ?? [], user.email);
  return c.json({ items: dtos, total, page, pageSize });
});

// ---- 新規投稿(スキル: multipart+zip / プロンプト: JSON) ----
items.post("/", async (c) => {
  const user = c.get("user");
  const { fields, file } = await readBody(c);

  const type = str(fields, "type");
  const title = str(fields, "title");
  const summary = str(fields, "summary");
  const description = str(fields, "description");
  const version = str(fields, "version", "1.0.0") || "1.0.0";
  const bodyText = str(fields, "body");
  const tagIds = parseTagIds(fields["tagIds"]);

  if (type !== "skill" && type !== "prompt") return c.json({ error: "type must be 'skill' or 'prompt'" }, 400);
  if (!title) return c.json({ error: "title is required" }, 400);
  if (title.length > 200) return c.json({ error: "title is too long (max 200 chars)" }, 400);
  if (type === "prompt" && !bodyText) return c.json({ error: "body (prompt text) is required" }, 400);
  if (type === "skill" && !file) return c.json({ error: "file (.zip) is required" }, 400);

  const id = crypto.randomUUID();
  const slug = slugify(title);

  let r2Key: string | null = null;
  let fileName: string | null = null;
  let fileSize: number | null = null;

  if (type === "skill" && file) {
    if (!file.name.toLowerCase().endsWith(".zip")) return c.json({ error: "file must be a .zip archive" }, 400);
    if (file.size > MAX_ZIP_SIZE) return c.json({ error: `file too large (max ${MAX_ZIP_SIZE / 1024 / 1024}MB)` }, 400);

    r2Key = `skills/${id}/${file.name}`;
    fileName = file.name;
    fileSize = file.size;
    await c.env.ASSETS_BUCKET.put(r2Key, await file.arrayBuffer(), {
      httpMetadata: { contentType: "application/zip" },
    });
  }

  await c.env.DB.prepare(
    `INSERT INTO items (id, type, slug, title, summary, description, body, r2_key, file_name, file_size, version, author_email)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
  )
    .bind(id, type, slug, title, summary, description, bodyText, r2Key, fileName, fileSize, version, user.email)
    .run();

  await applyTags(c.env.DB, id, tagIds, false);

  const row = await fetchItemRow(c.env.DB, id);
  if (!row) return c.json({ error: "internal_error" }, 500);
  const [dto] = await toItemDTOs(c.env.DB, [row], user.email);
  return c.json({ item: dto }, 201);
});

// ---- 詳細 ----
items.get("/:id", async (c) => {
  const user = c.get("user");
  const row = await fetchItemRow(c.env.DB, c.req.param("id"));
  if (!row) return c.json({ error: "not_found" }, 404);
  const [dto] = await toItemDTOs(c.env.DB, [row], user.email);
  return c.json({ item: dto });
});

// ---- 更新(投稿者のみ) ----
items.put("/:id", async (c) => {
  const user = c.get("user");
  const id = c.req.param("id");
  const existing = await fetchItemRow(c.env.DB, id);
  if (!existing) return c.json({ error: "not_found" }, 404);
  if (existing.author_email !== user.email) return c.json({ error: "forbidden" }, 403);

  const { fields, file } = await readBody(c);

  const title = fields["title"] !== undefined ? str(fields, "title") : existing.title;
  const summary = fields["summary"] !== undefined ? str(fields, "summary") : existing.summary;
  const description = fields["description"] !== undefined ? str(fields, "description") : existing.description;
  const version = fields["version"] !== undefined ? str(fields, "version") || existing.version : existing.version;
  const bodyText = fields["body"] !== undefined ? str(fields, "body") : existing.body;
  const tagIds = fields["tagIds"] !== undefined ? parseTagIds(fields["tagIds"]) : undefined;

  if (!title) return c.json({ error: "title is required" }, 400);
  if (existing.type === "prompt" && !bodyText) return c.json({ error: "body is required for prompt" }, 400);

  let r2Key = existing.r2_key;
  let fileName = existing.file_name;
  let fileSize = existing.file_size;

  if (existing.type === "skill" && file) {
    if (!file.name.toLowerCase().endsWith(".zip")) return c.json({ error: "file must be a .zip archive" }, 400);
    if (file.size > MAX_ZIP_SIZE) return c.json({ error: `file too large (max ${MAX_ZIP_SIZE / 1024 / 1024}MB)` }, 400);

    const newKey = `skills/${id}/${file.name}`;
    await c.env.ASSETS_BUCKET.put(newKey, await file.arrayBuffer(), {
      httpMetadata: { contentType: "application/zip" },
    });
    if (existing.r2_key && existing.r2_key !== newKey) {
      await c.env.ASSETS_BUCKET.delete(existing.r2_key);
    }
    r2Key = newKey;
    fileName = file.name;
    fileSize = file.size;
  }

  await c.env.DB.prepare(
    `UPDATE items SET title=?, summary=?, description=?, body=?, version=?, r2_key=?, file_name=?, file_size=?, updated_at=datetime('now')
     WHERE id=?`,
  )
    .bind(title, summary, description, bodyText, version, r2Key, fileName, fileSize, id)
    .run();

  if (tagIds !== undefined) {
    await applyTags(c.env.DB, id, tagIds, true);
  }

  const row = await fetchItemRow(c.env.DB, id);
  if (!row) return c.json({ error: "internal_error" }, 500);
  const [dto] = await toItemDTOs(c.env.DB, [row], user.email);
  return c.json({ item: dto });
});

// ---- 削除(投稿者のみ) ----
items.delete("/:id", async (c) => {
  const user = c.get("user");
  const id = c.req.param("id");
  const existing = await fetchItemRow(c.env.DB, id);
  if (!existing) return c.json({ error: "not_found" }, 404);
  if (existing.author_email !== user.email) return c.json({ error: "forbidden" }, 403);

  if (existing.r2_key) {
    await c.env.ASSETS_BUCKET.delete(existing.r2_key);
  }

  await c.env.DB.batch([
    c.env.DB.prepare("DELETE FROM item_tags WHERE item_id = ?").bind(id),
    c.env.DB.prepare("DELETE FROM favorites WHERE item_id = ?").bind(id),
    c.env.DB.prepare("DELETE FROM usage_events WHERE item_id = ?").bind(id),
    c.env.DB.prepare("DELETE FROM items WHERE id = ?").bind(id),
  ]);

  return c.json({ ok: true });
});

// ---- スキルのZIPダウンロード(DL数カウント) ----
items.get("/:id/download", async (c) => {
  const user = c.get("user");
  const id = c.req.param("id");
  const item = await fetchItemRow(c.env.DB, id);
  if (!item) return c.json({ error: "not_found" }, 404);
  if (item.type !== "skill" || !item.r2_key) return c.json({ error: "this item has no downloadable file" }, 400);

  const obj = await c.env.ASSETS_BUCKET.get(item.r2_key);
  if (!obj) return c.json({ error: "file not found in storage" }, 404);

  await c.env.DB.batch([
    c.env.DB.prepare("INSERT INTO usage_events (item_id, user_email, kind) VALUES (?, ?, 'download')").bind(id, user.email),
    c.env.DB.prepare("UPDATE items SET usage_count = usage_count + 1 WHERE id = ?").bind(id),
  ]);

  const fileName = item.file_name ?? "skill.zip";
  return new Response(obj.body, {
    headers: {
      "Content-Type": "application/zip",
      "Content-Disposition": `attachment; filename="${encodeURIComponent(fileName)}"`,
      "Content-Length": String(obj.size),
    },
  });
});

// ---- プロンプトのコピー操作を記録(コピー数カウント) ----
items.post("/:id/copy", async (c) => {
  const user = c.get("user");
  const id = c.req.param("id");
  const item = await c.env.DB.prepare("SELECT id, usage_count FROM items WHERE id = ?")
    .bind(id)
    .first<{ id: string; usage_count: number }>();
  if (!item) return c.json({ error: "not_found" }, 404);

  await c.env.DB.batch([
    c.env.DB.prepare("INSERT INTO usage_events (item_id, user_email, kind) VALUES (?, ?, 'copy')").bind(id, user.email),
    c.env.DB.prepare("UPDATE items SET usage_count = usage_count + 1 WHERE id = ?").bind(id),
  ]);

  return c.json({ usageCount: item.usage_count + 1 });
});

// ---- お気に入り登録/解除 ----
items.post("/:id/favorite", async (c) => {
  const user = c.get("user");
  const id = c.req.param("id");
  const exists = await c.env.DB.prepare("SELECT id FROM items WHERE id = ?").bind(id).first();
  if (!exists) return c.json({ error: "not_found" }, 404);

  const result = await c.env.DB.prepare(
    "INSERT OR IGNORE INTO favorites (user_email, item_id) VALUES (?, ?)",
  )
    .bind(user.email, id)
    .run();

  if (result.meta.changes > 0) {
    await c.env.DB.prepare("UPDATE items SET favorite_count = favorite_count + 1 WHERE id = ?").bind(id).run();
  }

  const row = await c.env.DB.prepare("SELECT favorite_count FROM items WHERE id = ?").bind(id).first<{ favorite_count: number }>();
  return c.json({ favorited: true, favoriteCount: row?.favorite_count ?? 0 });
});

items.delete("/:id/favorite", async (c) => {
  const user = c.get("user");
  const id = c.req.param("id");

  const result = await c.env.DB.prepare(
    "DELETE FROM favorites WHERE user_email = ? AND item_id = ?",
  )
    .bind(user.email, id)
    .run();

  if (result.meta.changes > 0) {
    await c.env.DB.prepare("UPDATE items SET favorite_count = MAX(favorite_count - 1, 0) WHERE id = ?").bind(id).run();
  }

  const row = await c.env.DB.prepare("SELECT favorite_count FROM items WHERE id = ?").bind(id).first<{ favorite_count: number }>();
  return c.json({ favorited: false, favoriteCount: row?.favorite_count ?? 0 });
});

export default items;
