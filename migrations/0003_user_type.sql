-- Entra ID の userType (Member / Guest) を保持し、ゲスト制限機能で使用する
ALTER TABLE users ADD COLUMN user_type TEXT;
