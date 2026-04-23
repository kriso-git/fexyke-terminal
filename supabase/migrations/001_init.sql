-- F3XYKEE TERMINAL — initial schema

-- Enable UUID extension
create extension if not exists "pgcrypto";

-- ─── Operators (users) ───────────────────────────────────────────
create table public.operators (
  id           text primary key default 'F3X-' || lpad(floor(random()*9999)::text, 3, '0'),
  auth_id      uuid references auth.users unique,
  callsign     text unique not null,
  level        int not null default 1 check (level between 1 and 4),
  role         text not null default 'operator' check (role in ('operator','admin','superadmin')),
  node         text not null default 'f3x-pri-01',
  joined_cycle int not null default 47,
  bio          text,
  created_at   timestamptz not null default now()
);

-- ─── Entries (posts) ─────────────────────────────────────────────
create table public.entries (
  id           text primary key,  -- e.g. LOG-2481
  title        text not null,
  kind         text not null check (kind in ('ÁTVITEL','RIASZTÁS','MEZŐNAPLÓ','MEMÓRIADIFF','ADÁS')),
  content      text not null default '',
  excerpt      text,
  operator_id  text references public.operators(id),
  cycle        int not null default 47,
  sigs         text[] not null default '{}',
  priority     boolean not null default false,
  alert        boolean not null default false,
  reads        int not null default 0,
  created_at   timestamptz not null default now()
);

-- ─── Threads ─────────────────────────────────────────────────────
create table public.threads (
  id         text primary key,  -- e.g. THR-0419
  title      text not null,
  created_at timestamptz not null default now()
);

-- ─── Thread <-> Entry mapping ─────────────────────────────────────
create table public.thread_entries (
  thread_id text references public.threads(id) on delete cascade,
  entry_id  text references public.entries(id) on delete cascade,
  primary key (thread_id, entry_id)
);

-- ─── Signals (comments/replies on entries) ───────────────────────
create table public.signals (
  id          uuid primary key default gen_random_uuid(),
  entry_id    text references public.entries(id) on delete cascade,
  operator_id text references public.operators(id),
  parent_id   uuid references public.signals(id),
  text        text not null,
  sigs        text[] not null default '{}',
  verified    boolean not null default false,
  created_at  timestamptz not null default now()
);

-- ─── Profile signals (wall posts on operator profiles) ───────────
create table public.profile_signals (
  id          uuid primary key default gen_random_uuid(),
  target_id   text references public.operators(id) on delete cascade,
  author_id   text references public.operators(id),
  text        text not null,
  verified    boolean not null default false,
  created_at  timestamptz not null default now()
);

-- ─── Indexes ─────────────────────────────────────────────────────
create index on public.entries (operator_id);
create index on public.entries (cycle);
create index on public.entries (created_at desc);
create index on public.signals (entry_id);
create index on public.signals (operator_id);
create index on public.profile_signals (target_id);

-- ─── RLS policies ────────────────────────────────────────────────
alter table public.operators      enable row level security;
alter table public.entries        enable row level security;
alter table public.threads        enable row level security;
alter table public.thread_entries enable row level security;
alter table public.signals        enable row level security;
alter table public.profile_signals enable row level security;

-- Public read
create policy "public read operators"       on public.operators       for select using (true);
create policy "public read entries"         on public.entries         for select using (true);
create policy "public read threads"         on public.threads         for select using (true);
create policy "public read thread_entries"  on public.thread_entries  for select using (true);
create policy "public read signals"         on public.signals         for select using (true);
create policy "public read profile_signals" on public.profile_signals for select using (true);

-- Authenticated write (own data)
create policy "operators can insert entries" on public.entries
  for insert with check (auth.uid() is not null);

create policy "operators can insert signals" on public.signals
  for insert with check (auth.uid() is not null);

create policy "operators can insert profile signals" on public.profile_signals
  for insert with check (auth.uid() is not null);

-- ─── Seed data ────────────────────────────────────────────────────
insert into public.operators (id, callsign, level, role, node, joined_cycle) values
  ('F3X-001', 'KURIER',   4, 'superadmin', 'f3x-pri-01', 1),
  ('F3X-014', 'NULLSET',  3, 'admin',      'f3x-pri-01', 12),
  ('F3X-022', 'HALO',     2, 'operator',   'f3x-pri-01', 18),
  ('F3X-031', 'MOTH',     2, 'operator',   'f3x-pri-01', 21),
  ('F3X-058', 'PARALLAX', 2, 'operator',   'f3x-pri-01', 28),
  ('F3X-061', 'VOID',     1, 'operator',   'f3x-mir-01', 30),
  ('F3X-072', 'CIPHER',   2, 'operator',   'f3x-pri-01', 32),
  ('F3X-088', 'RELAY',    1, 'operator',   'f3x-mir-02', 34),
  ('F3X-091', 'DRIFT',    1, 'operator',   'f3x-mir-01', 37),
  ('F3X-104', 'ECHO',     2, 'operator',   'f3x-pri-01', 41)
on conflict do nothing;

insert into public.entries (id, title, kind, content, excerpt, operator_id, cycle, sigs, priority, alert, reads) values
  ('LOG-2481',
   'Átvitel 04 · protokoll-sodródás a hideg szektorokban',
   'ÁTVITEL',
   'A hideg szektor 11 relé csomópontján 046-os ciklus óta egyre erősödő fáziscsúszás figyelhető meg. A mérőrács 04-B konfigurációja szerint a sodródás exponenciálisan növekszik, és már megsérti a hálózati integritási küszöböt.' || E'\n\n' || 'Az eltérés nem véletlen hibának tűnik: az aláírás-mintázat szándékos vagy legalábbis strukturált. Három különböző kulcs-fingerprint rotál, mindháromnak a 9f-prefix csonkolt verzióját használva.',
   'Bomlási minta észlelve a külső rácsban 11 relé csomóponton keresztül. Aláírás-eltérés rögzítve. Operátori beavatkozás javasolt a 048-as ciklus lezárása előtt.',
   'F3X-014', 47, ARRAY['//PROTOKOLL','//ŰR'], true, false, 142),
  ('LOG-2480',
   'Relé-14 offline · mezőnapló',
   'RIASZTÁS',
   'A hideg szektorban lévő 14-es relé csomópont kilépett a hálózatból 00:02:14-kor. Automatikus visszacsatolási kísérlet kudarcot vallott. Manuális újraindítás folyamatban.',
   'A hideg szektorban lévő 14-es relé csomópont kilépett a hálózatból. Automatikus visszacsatolási kísérlet kudarcot vallott.',
   'F3X-022', 47, ARRAY['//MEZŐ','//RELÉ'], false, true, 64),
  ('LOG-2479',
   'Memóriadiff · 046 → 047 ciklus',
   'MEMÓRIADIFF',
   'Rekord-delta: +12 bejegyzés, +4 jelzéslánc, +1 operátor. Három ütközés fel lett oldva: ENT-2431, ENT-2456, ENT-2470. Teljes diff manifest a mellékletben.',
   'Rekord-delta: +12 bejegyzés, +4 jelzéslánc, +1 operátor. Három ütközés fel lett oldva.',
   'F3X-014', 47, ARRAY['//MEMÓRIA'], false, false, 38),
  ('LOG-2478',
   'Kimenő küldemény · Nullset tanácsadás',
   'ADÁS',
   'Kézbesítve F3X-014 részére. Tartalom: relé-ellenőrzési protokoll újracsomagolva. Kód: 9f·0a·72·c4. Olvasási nyugtázás fogadva.',
   'Kézbesítve F3X-014 részére. Tartalom: relé-ellenőrzési protokoll újracsomagolva.',
   'F3X-001', 46, ARRAY['//OPS'], false, false, 27)
on conflict do nothing;

insert into public.threads (id, title) values
  ('THR-0419', 'Űr-protokoll töredékek'),
  ('THR-0418', 'Leszerelt relé naplók'),
  ('THR-0417', 'Parallax mezőnapló'),
  ('THR-0416', 'Memóriadiffek · 04')
on conflict do nothing;

insert into public.thread_entries (thread_id, entry_id) values
  ('THR-0419', 'LOG-2481'),
  ('THR-0419', 'LOG-2480'),
  ('THR-0418', 'LOG-2479')
on conflict do nothing;
