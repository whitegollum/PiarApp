-- Add user preference columns for Settings page
ALTER TABLE usuarios ADD COLUMN notifications_enabled BOOLEAN DEFAULT 1;
ALTER TABLE usuarios ADD COLUMN email_digest TEXT DEFAULT 'weekly';
ALTER TABLE usuarios ADD COLUMN dark_mode BOOLEAN DEFAULT 0;
ALTER TABLE usuarios ADD COLUMN language TEXT DEFAULT 'es';
