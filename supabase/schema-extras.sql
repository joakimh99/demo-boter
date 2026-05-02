-- Kör i Supabase SQL Editor (i valfri ordning efter dina tabeller finns).

-- Rekommenderas: kronologisk ordning för "Senaste böter"
alter table fines add column if not exists created_at timestamptz default now();

-- Row Level Security: anon-nyckeln i webbläsaren får bara det policies tillåter.
alter table players enable row level security;
alter table fine_types enable row level security;
alter table fines enable row level security;

-- Öppen åtkomst för alla med anon-nyckel (bra för intern demo).
-- Byt ut mot t.ex. auth.uid() när ni har inloggning.
drop policy if exists "players_anon_all" on players;
drop policy if exists "fine_types_anon_all" on fine_types;
drop policy if exists "fines_anon_all" on fines;

create policy "players_anon_all" on players for all using (true) with check (true);
create policy "fine_types_anon_all" on fine_types for all using (true) with check (true);
create policy "fines_anon_all" on fines for all using (true) with check (true);
