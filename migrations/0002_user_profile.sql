-- Microsoft Graph から取得した Entra ID のユーザープロフィールを保持するための列を追加
ALTER TABLE users ADD COLUMN given_name TEXT;
ALTER TABLE users ADD COLUMN surname TEXT;
ALTER TABLE users ADD COLUMN job_title TEXT;
ALTER TABLE users ADD COLUMN company_name TEXT;
ALTER TABLE users ADD COLUMN department TEXT;
ALTER TABLE users ADD COLUMN employee_type TEXT;
ALTER TABLE users ADD COLUMN profile_synced_at TEXT;
