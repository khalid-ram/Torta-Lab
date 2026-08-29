-- Torta Lab auth no longer uses email anywhere: buyers are identified only
-- by username and phone. Drop the now-unused email column and its unique
-- index. The original 0001 migration is left untouched for history.
drop index if exists public.profiles_email_unique;
alter table public.profiles drop column if exists email;
