-- Partner cabinet. Existing databases still have users.role limited to
-- client / nutritionist / admin. Drop every CHECK that mentions that column
-- and recreate it with the partner role. Safe to run more than once.

DO $$
DECLARE
  constraint_name text;
BEGIN
  FOR constraint_name IN
    SELECT con.conname
    FROM pg_constraint con
    JOIN pg_class rel ON rel.oid = con.conrelid
    JOIN pg_namespace nsp ON nsp.oid = rel.relnamespace
    WHERE nsp.nspname = 'public'
      AND rel.relname = 'users'
      AND con.contype = 'c'
      AND pg_get_constraintdef(con.oid) ILIKE '%role%'
  LOOP
    EXECUTE format('ALTER TABLE users DROP CONSTRAINT %I', constraint_name);
  END LOOP;
END $$;

ALTER TABLE users
  ADD CONSTRAINT users_role_check
  CHECK (role IN ('client', 'nutritionist', 'admin', 'partner'));
