/**
 * DL・コピー・お気に入り登録を「この項目の更新を追いたい」という意思表示とみなし、
 * item_watches に (誰が, どの項目を, どのバージョンまで確認済みか) を記録する。
 * 投稿者本人の操作は対象外(自分の投稿の更新に自分で気づく必要はないため)。
 *
 * markSeen=true(DL・コピー): 実際に最新の中身を受け取った操作なので、既読バージョンを
 *   現在のバージョンまで進める(=保留中の「更新あり」があれば解消する)。
 * markSeen=false(お気に入り登録): 「この項目を追いたい」という意思表示ではあるが、
 *   中身を確認したわけではないため、既に保留中の更新があればそのまま残す。
 *   (まだ購読していない場合のみ、現在のバージョンを既読の初期値として登録する)
 */
export async function markItemWatched(
  db: D1Database,
  userEmail: string,
  authorEmail: string,
  itemId: string,
  version: string,
  opts: { markSeen: boolean },
): Promise<void> {
  if (userEmail === authorEmail) return;

  const updateClause = opts.markSeen
    ? "last_seen_version = excluded.last_seen_version, updated_at = datetime('now')"
    : "updated_at = datetime('now')";

  await db
    .prepare(
      `INSERT INTO item_watches (user_email, item_id, last_seen_version, updated_at)
       VALUES (?, ?, ?, datetime('now'))
       ON CONFLICT (user_email, item_id) DO UPDATE SET ${updateClause}`,
    )
    .bind(userEmail, itemId, version)
    .run();
}

/**
 * 項目の詳細を閲覧した時点で、その人にとっての既読バージョンを最新に進める。
 * (購読していない、またはバージョンが上がっていない場合は何も起きない)
 */
export async function markItemSeen(
  db: D1Database,
  userEmail: string,
  itemId: string,
  currentVersion: string,
): Promise<void> {
  await db
    .prepare(
      `UPDATE item_watches SET last_seen_version = ?, updated_at = datetime('now')
       WHERE user_email = ? AND item_id = ? AND last_seen_version != ?`,
    )
    .bind(currentVersion, userEmail, itemId, currentVersion)
    .run();
}
