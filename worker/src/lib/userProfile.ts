import { fetchGraphProfile, type GraphProfile } from "./graph";
import type { Env, UserProfileRow } from "../types";

const STALE_MS = 24 * 60 * 60 * 1000; // 24時間

export interface UserProfileDTO {
  email: string;
  displayName: string;
  givenName: string | null;
  surname: string | null;
  jobTitle: string | null;
  companyName: string | null;
  department: string | null;
  employeeType: string | null;
  userType: string | null;
  profileSyncedAt: string | null;
}

export function toUserProfileDTO(row: UserProfileRow): UserProfileDTO {
  return {
    email: row.email,
    displayName: row.display_name,
    givenName: row.given_name,
    surname: row.surname,
    jobTitle: row.job_title,
    companyName: row.company_name,
    department: row.department,
    employeeType: row.employee_type,
    userType: row.user_type,
    profileSyncedAt: row.profile_synced_at,
  };
}

export const USER_PROFILE_COLUMNS =
  "email, display_name, given_name, surname, job_title, company_name, department, employee_type, user_type, profile_synced_at";

export async function fetchUserProfileRow(db: D1Database, email: string): Promise<UserProfileRow | null> {
  return db
    .prepare(`SELECT ${USER_PROFILE_COLUMNS} FROM users WHERE email = ?`)
    .bind(email)
    .first<UserProfileRow>();
}

/**
 * D1のdatetime('now')は "YYYY-MM-DD HH:MM:SS" (UTC, スペース区切り)で保存されるため、
 * Dateで解釈できる形式に変換してから比較する。
 */
export function isProfileStale(syncedAt: string | null): boolean {
  if (!syncedAt) return true;
  const parsed = new Date(`${syncedAt.replace(" ", "T")}Z`).getTime();
  if (Number.isNaN(parsed)) return true;
  return Date.now() - parsed > STALE_MS;
}

/**
 * Microsoft Graph からプロフィールを取得し、取得できた項目のみD1へ反映する。
 * Graph未設定・権限未同意・対象ユーザーが見つからない場合は何もせず null を返す
 * (既存のフォールバック表示や前回の同期結果を維持する)。
 * 呼び出し元(authMiddleware)が userType を即座に判定できるよう、取得した GraphProfile を返す。
 */
export async function syncUserProfile(env: Env, email: string): Promise<GraphProfile | null> {
  const profile = await fetchGraphProfile(env, email);
  if (!profile) return null;

  await env.DB.prepare(
    `UPDATE users SET
       display_name = COALESCE(?, display_name),
       given_name = ?,
       surname = ?,
       job_title = ?,
       company_name = ?,
       department = ?,
       employee_type = ?,
       user_type = ?,
       profile_synced_at = datetime('now')
     WHERE email = ?`,
  )
    .bind(
      profile.displayName,
      profile.givenName,
      profile.surname,
      profile.jobTitle,
      profile.companyName,
      profile.department,
      profile.employeeType,
      profile.userType,
      email,
    )
    .run();

  return profile;
}
