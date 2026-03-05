-- 0002_company_number_sequences_fiscal
-- Forward migration: company, numbering, fiscal calendar

create type "FiscalPeriodStatus" as enum ('OPEN', 'CLOSED');

create table "Company" (
  "id" text primary key,
  "tenantId" text not null,
  "code" text not null,
  "name" text not null,
  "currency" text not null default 'CHF',
  "vatNumber" text,
  "uidNumber" text,
  "status" "CompanyStatus" not null default 'ACTIVE',
  "createdAt" timestamptz not null default now(),
  "updatedAt" timestamptz not null default now(),
  constraint "Company_tenant_fk"
    foreign key ("tenantId") references "Tenant"("id")
    on delete cascade on update cascade,
  constraint "Company_tenant_code_uk" unique ("tenantId", "code")
);

create index "Company_tenant_status_idx" on "Company"("tenantId", "status");

alter table "UserRole"
  add constraint "UserRole_company_fk"
  foreign key ("companyId") references "Company"("id")
  on delete set null on update cascade;

create table "UserCompany" (
  "id" text primary key,
  "userId" text not null,
  "companyId" text not null,
  "isDefault" boolean not null default false,
  constraint "UserCompany_user_fk"
    foreign key ("userId") references "User"("id")
    on delete cascade on update cascade,
  constraint "UserCompany_company_fk"
    foreign key ("companyId") references "Company"("id")
    on delete cascade on update cascade,
  constraint "UserCompany_user_company_uk" unique ("userId", "companyId")
);

create table "NumberSequence" (
  "id" text primary key,
  "companyId" text not null,
  "key" text not null,
  "prefix" text not null,
  "year" integer not null,
  "lastNumber" integer not null default 0,
  "padding" integer not null default 6,
  constraint "NumberSequence_company_fk"
    foreign key ("companyId") references "Company"("id")
    on delete cascade on update cascade,
  constraint "NumberSequence_scope_uk" unique ("companyId", "key", "year")
);

create table "FiscalYear" (
  "id" text primary key,
  "companyId" text not null,
  "year" integer not null,
  "startDate" timestamptz not null,
  "endDate" timestamptz not null,
  "isClosed" boolean not null default false,
  constraint "FiscalYear_company_fk"
    foreign key ("companyId") references "Company"("id")
    on delete cascade on update cascade,
  constraint "FiscalYear_company_year_uk" unique ("companyId", "year")
);

create table "FiscalPeriod" (
  "id" text primary key,
  "fiscalYearId" text not null,
  "periodNo" integer not null,
  "startDate" timestamptz not null,
  "endDate" timestamptz not null,
  "status" "FiscalPeriodStatus" not null default 'OPEN',
  "lockedAt" timestamptz,
  constraint "FiscalPeriod_year_fk"
    foreign key ("fiscalYearId") references "FiscalYear"("id")
    on delete cascade on update cascade,
  constraint "FiscalPeriod_year_period_uk" unique ("fiscalYearId", "periodNo")
);

create schema if not exists app_guard;

create or replace function app_guard.prevent_fiscal_period_update_if_closed()
returns trigger
language plpgsql
as $$
begin
  if old.status = 'CLOSED' then
    raise exception 'Closed fiscal periods are immutable';
  end if;

  return new;
end;
$$;

create trigger "trg_fiscal_period_immutable"
before update or delete on "FiscalPeriod"
for each row execute function app_guard.prevent_fiscal_period_update_if_closed();

alter table "Company" enable row level security;
create policy "company_scope_select" on "Company"
for select
using ("tenantId" = app_security.current_tenant_id());

create policy "company_scope_write" on "Company"
for all
using ("tenantId" = app_security.current_tenant_id())
with check ("tenantId" = app_security.current_tenant_id());

alter table "UserCompany" enable row level security;
create policy "user_company_scope_select" on "UserCompany"
for select
using (
  "companyId" = any(app_security.current_company_ids())
);

create policy "user_company_scope_write" on "UserCompany"
for all
using (
  "companyId" = any(app_security.current_company_ids())
)
with check (
  "companyId" = any(app_security.current_company_ids())
);
