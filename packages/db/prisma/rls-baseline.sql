-- Phase 1 RLS baseline for tenant/company scoped tables
-- Requires app context to be set by API layer:
--   set_config('app.tenant_id', '<tenant-id>', true)
--   set_config('app.company_ids', '<company-id-1,company-id-2>', true)

create schema if not exists app_security;

create or replace function app_security.current_tenant_id()
returns text
language sql
stable
as $$
  select current_setting('app.tenant_id', true)
$$;

create or replace function app_security.current_company_ids()
returns text[]
language sql
stable
as $$
  select string_to_array(coalesce(current_setting('app.company_ids', true), ''), ',')
$$;

-- Example for company-scoped tables
alter table if exists "Company" enable row level security;
create policy if not exists company_tenant_select on "Company"
for select
using ("tenantId" = app_security.current_tenant_id());

create policy if not exists company_tenant_write on "Company"
for all
using ("tenantId" = app_security.current_tenant_id())
with check ("tenantId" = app_security.current_tenant_id());

-- Example for tenant+company scoped table
alter table if exists "Address" enable row level security;
create policy if not exists address_scope_select on "Address"
for select
using (
  "tenantId" = app_security.current_tenant_id()
  and "companyId" = any(app_security.current_company_ids())
);

create policy if not exists address_scope_write on "Address"
for all
using (
  "tenantId" = app_security.current_tenant_id()
  and "companyId" = any(app_security.current_company_ids())
)
with check (
  "tenantId" = app_security.current_tenant_id()
  and "companyId" = any(app_security.current_company_ids())
);

alter table if exists "AuditLog" enable row level security;
create policy if not exists audit_scope_select on "AuditLog"
for select
using (
  "tenantId" = app_security.current_tenant_id()
  and (
    "companyId" is null
    or "companyId" = any(app_security.current_company_ids())
  )
);

create policy if not exists audit_append_only on "AuditLog"
for insert
with check (
  "tenantId" = app_security.current_tenant_id()
  and (
    "companyId" is null
    or "companyId" = any(app_security.current_company_ids())
  )
);
