create table if not exists trip_sections (
  trip_id text not null,
  section_key text not null,
  json text not null,
  version integer not null default 1,
  updated_at text not null,
  updated_by text not null,
  primary key (trip_id, section_key)
);

create table if not exists notes (
  id text primary key,
  trip_id text not null,
  target_id text not null,
  body text not null,
  created_at text not null,
  updated_at text not null,
  updated_by text not null
);

create index if not exists notes_trip_target_idx on notes (trip_id, target_id);

create table if not exists favorites (
  trip_id text not null,
  target_id text not null,
  created_at text not null,
  updated_at text not null,
  updated_by text not null,
  primary key (trip_id, target_id)
);

create table if not exists checklist_items (
  id text primary key,
  trip_id text not null,
  text text not null,
  status text not null,
  done integer not null default 0,
  sort_order integer not null default 0,
  created_at text not null,
  updated_at text not null,
  updated_by text not null
);

create index if not exists checklist_items_trip_order_idx on checklist_items (trip_id, sort_order);
