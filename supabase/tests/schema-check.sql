-- Checks the public schema against the ER diagram (CALM_BD.drawio), with admins and
-- app accounts moved to Supabase Auth (odd/tasks/acceso-supabase.md).
-- Read only: it queries the catalogs, so it runs on the read-only Supabase MCP.
-- Each row is one broken expectation; no rows means the schema matches.

with
expected_tables (table_name) as (
  values
    ('admins'), ('clients'), ('services'), ('appointments'),
    ('appointment_services'), ('orders'), ('weekly_schedule'), ('blocked_dates')
),

expected_columns (table_name, column_name, data_type, is_nullable) as (
  values
    ('admins', 'id', 'uuid', 'NO'),
    ('clients', 'id', 'bigint', 'NO'),
    ('clients', 'name', 'text', 'NO'),
    ('clients', 'phone', 'text', 'YES'),
    ('clients', 'nip_hash', 'text', 'YES'),
    ('clients', 'user_id', 'uuid', 'YES'),
    ('services', 'id', 'bigint', 'NO'),
    ('services', 'name', 'text', 'NO'),
    ('services', 'category', 'text', 'NO'),
    ('services', 'base_price_mxn', 'integer', 'YES'),
    ('services', 'estimated_days', 'integer', 'NO'),
    ('services', 'is_active', 'boolean', 'NO'),
    ('appointments', 'id', 'bigint', 'NO'),
    ('appointments', 'client_id', 'bigint', 'NO'),
    ('appointments', 'ticket', 'text', 'NO'),
    ('appointments', 'scheduled_date', 'date', 'NO'),
    ('appointments', 'scheduled_time', 'time without time zone', 'NO'),
    ('appointments', 'preliminary_total_mxn', 'integer', 'NO'),
    ('appointment_services', 'appointment_id', 'bigint', 'NO'),
    ('appointment_services', 'service_id', 'bigint', 'NO'),
    ('orders', 'id', 'bigint', 'NO'),
    ('orders', 'client_id', 'bigint', 'NO'),
    ('orders', 'appointment_id', 'bigint', 'YES'),
    ('orders', 'ticket', 'text', 'NO'),
    ('orders', 'work', 'text', 'NO'),
    ('orders', 'final_price_mxn', 'integer', 'NO'),
    ('orders', 'delivery_date', 'date', 'NO'),
    ('orders', 'status', 'text', 'NO'),
    ('weekly_schedule', 'weekday', 'text', 'NO'),
    ('weekly_schedule', 'opens_at', 'time without time zone', 'YES'),
    ('weekly_schedule', 'closes_at', 'time without time zone', 'YES'),
    ('weekly_schedule', 'updated_by', 'uuid', 'NO'),
    ('blocked_dates', 'blocked_date', 'date', 'NO'),
    ('blocked_dates', 'blocked_by', 'uuid', 'NO')
),

-- The database numbers these rows itself. Admins take their id from Supabase Auth.
expected_identities (table_name, column_name) as (
  values
    ('clients', 'id'), ('services', 'id'), ('appointments', 'id'), ('orders', 'id')
),

-- Columns listed alphabetically, as `actual_keys` lists them.
expected_keys (kind, table_name, columns) as (
  values
    ('primary key', 'admins', 'id'),
    ('primary key', 'clients', 'id'),
    ('primary key', 'services', 'id'),
    ('primary key', 'appointments', 'id'),
    ('primary key', 'appointment_services', 'appointment_id,service_id'),
    ('primary key', 'orders', 'id'),
    ('primary key', 'weekly_schedule', 'weekday'),
    ('primary key', 'blocked_dates', 'blocked_date'),
    ('unique', 'clients', 'phone'),
    ('unique', 'clients', 'user_id'),
    ('unique', 'services', 'name'),
    ('unique', 'appointments', 'scheduled_date,scheduled_time'),
    ('unique', 'orders', 'appointment_id'),
    ('unique while active', 'orders', 'ticket')
),

expected_foreign_keys (table_name, column_name, referenced_table) as (
  values
    ('admins', 'id', 'auth.users'),
    ('clients', 'user_id', 'auth.users'),
    ('appointments', 'client_id', 'public.clients'),
    ('appointment_services', 'appointment_id', 'public.appointments'),
    ('appointment_services', 'service_id', 'public.services'),
    ('orders', 'client_id', 'public.clients'),
    ('orders', 'appointment_id', 'public.appointments'),
    ('weekly_schedule', 'updated_by', 'public.admins'),
    ('blocked_dates', 'blocked_by', 'public.admins')
),

-- Columns whose values a CHECK constraint limits.
expected_checks (table_name, column_name) as (
  values
    ('clients', 'name'),
    ('clients', 'phone'),
    ('clients', 'nip_hash'),
    ('clients', 'user_id'),
    ('services', 'name'),
    ('services', 'category'),
    ('services', 'base_price_mxn'),
    ('services', 'estimated_days'),
    ('appointments', 'ticket'),
    ('appointments', 'scheduled_time'),
    ('appointments', 'preliminary_total_mxn'),
    ('orders', 'ticket'),
    ('orders', 'work'),
    ('orders', 'final_price_mxn'),
    ('orders', 'status'),
    ('weekly_schedule', 'weekday'),
    ('weekly_schedule', 'opens_at'),
    ('weekly_schedule', 'closes_at')
),

public_tables as (
  select class.oid, class.relname as table_name, class.relrowsecurity as has_row_security
  from pg_class as class
  join pg_namespace as namespace on namespace.oid = class.relnamespace
  where namespace.nspname = 'public' and class.relkind = 'r'
),

actual_keys as (
  select
    case
      when index.indisprimary then 'primary key'
      when index.indpred is null then 'unique'
      when pg_get_expr(index.indpred, index.indrelid) like '%status%' then 'unique while active'
      else 'unique with another condition'
    end as kind,
    tables.table_name,
    (
      select string_agg(attribute.attname, ',' order by attribute.attname)
      from unnest(index.indkey::int2[]) as key (attnum)
      join pg_attribute as attribute
        on attribute.attrelid = index.indrelid and attribute.attnum = key.attnum
    ) as columns
  from pg_index as index
  join public_tables as tables on tables.oid = index.indrelid
  where index.indisunique
),

-- The referenced table is schema-qualified: admins and app accounts point into auth.
actual_foreign_keys as (
  select
    source.table_name,
    attribute.attname as column_name,
    format('%s.%s', target_namespace.nspname, target.relname) as referenced_table
  from pg_constraint as constraint_
  join public_tables as source on source.oid = constraint_.conrelid
  join pg_class as target on target.oid = constraint_.confrelid
  join pg_namespace as target_namespace on target_namespace.oid = target.relnamespace
  join pg_attribute as attribute
    on attribute.attrelid = constraint_.conrelid and attribute.attnum = constraint_.conkey[1]
  where constraint_.contype = 'f'
),

actual_checks as (
  select tables.table_name, attribute.attname as column_name
  from pg_constraint as constraint_
  join public_tables as tables on tables.oid = constraint_.conrelid
  cross join unnest(constraint_.conkey) as key (attnum)
  join pg_attribute as attribute
    on attribute.attrelid = constraint_.conrelid and attribute.attnum = key.attnum
  where constraint_.contype = 'c'
)

select 'missing table' as problem, expected.table_name as detail
from expected_tables as expected
where not exists (select 1 from public_tables as tables where tables.table_name = expected.table_name)

union all
-- The Data API exposes the public schema, so every table needs row level security.
select 'row level security off', tables.table_name
from public_tables as tables
where not tables.has_row_security

union all
select 'missing or wrong column',
  format('%s.%s %s, nullable %s', expected.table_name, expected.column_name, expected.data_type, expected.is_nullable)
from expected_columns as expected
where not exists (
  select 1
  from information_schema.columns as columns
  where columns.table_schema = 'public'
    and columns.table_name = expected.table_name
    and columns.column_name = expected.column_name
    and columns.data_type = expected.data_type
    and columns.is_nullable = expected.is_nullable
)

union all
select 'column the diagram does not have', format('%s.%s', columns.table_name, columns.column_name)
from information_schema.columns as columns
where columns.table_schema = 'public'
  and columns.table_name in (select table_name from expected_tables)
  and not exists (
    select 1
    from expected_columns as expected
    where expected.table_name = columns.table_name and expected.column_name = columns.column_name
  )

union all
select 'not an identity column', format('%s.%s', expected.table_name, expected.column_name)
from expected_identities as expected
where not exists (
  select 1
  from information_schema.columns as columns
  where columns.table_schema = 'public'
    and columns.table_name = expected.table_name
    and columns.column_name = expected.column_name
    and columns.is_identity = 'YES'
)

union all
select 'missing ' || expected.kind, format('%s (%s)', expected.table_name, expected.columns)
from expected_keys as expected
where not exists (
  select 1
  from actual_keys as actual
  where actual.kind = expected.kind
    and actual.table_name = expected.table_name
    and actual.columns = expected.columns
)

union all
select 'missing foreign key',
  format('%s.%s -> %s', expected.table_name, expected.column_name, expected.referenced_table)
from expected_foreign_keys as expected
where not exists (
  select 1
  from actual_foreign_keys as actual
  where actual.table_name = expected.table_name
    and actual.column_name = expected.column_name
    and actual.referenced_table = expected.referenced_table
)

union all
-- Postgres does not index foreign keys on its own; joins and deletes need one.
select 'unindexed foreign key', format('%s.%s', expected.table_name, expected.column_name)
from expected_foreign_keys as expected
join public_tables as tables on tables.table_name = expected.table_name
where not exists (
  select 1
  from pg_index as index
  join pg_attribute as attribute
    on attribute.attrelid = index.indrelid and attribute.attnum = index.indkey[0]
  where index.indrelid = tables.oid and attribute.attname = expected.column_name
)

union all
select 'missing check', format('%s.%s', expected.table_name, expected.column_name)
from expected_checks as expected
where not exists (
  select 1
  from actual_checks as actual
  where actual.table_name = expected.table_name and actual.column_name = expected.column_name
)

order by problem, detail;
