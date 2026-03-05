-- 0001_foundation_tenant_auth_audit
-- Forward migration: foundation tables for tenant/auth/rbac/audit

create extension if not exists "pgcrypto";

create type "CompanyStatus" as enum ('ACTIVE', 'INACTIVE', 'ARCHIVED');
create type "UserStatus" as enum ('INVITED', 'ACTIVE', 'LOCKED', 'DISABLED');

create table "Tenant" (
  "id" text primary key,
  "code" text not null unique,
  "name" text not null,
  "status" "CompanyStatus" not null default 'ACTIVE',
  "createdAt" timestamptz not null default now(),
  "updatedAt" timestamptz not null default now()
);

create table "User" (
  "id" text primary key,
  "tenantId" text not null,
  "email" text not null,
  "firstName" text not null,
  "lastName" text not null,
  "status" "UserStatus" not null default 'INVITED',
  "locale" text not null default 'de-CH',
  "passwordHash" text,
  "lastLoginAt" timestamptz,
  "createdAt" timestamptz not null default now(),
  "updatedAt" timestamptz not null default now(),
  constraint "User_tenant_fk"
    foreign key ("tenantId") references "Tenant"("id")
    on delete cascade on update cascade,
  constraint "User_tenant_email_uk" unique ("tenantId", "email")
);

create index "User_tenant_status_idx" on "User"("tenantId", "status");

create table "Role" (
  "id" text primary key,
  "tenantId" text not null,
  "code" text not null,
  "name" text not null,
  "isSystem" boolean not null default false,
  constraint "Role_tenant_fk"
    foreign key ("tenantId") references "Tenant"("id")
    on delete cascade on update cascade,
  constraint "Role_tenant_code_uk" unique ("tenantId", "code")
);

create table "Permission" (
  "id" text primary key,
  "tenantId" text not null,
  "code" text not null,
  "description" text,
  constraint "Permission_tenant_fk"
    foreign key ("tenantId") references "Tenant"("id")
    on delete cascade on update cascade,
  constraint "Permission_tenant_code_uk" unique ("tenantId", "code")
);

create table "RolePermission" (
  "roleId" text not null,
  "permissionId" text not null,
  primary key ("roleId", "permissionId"),
  constraint "RolePermission_role_fk"
    foreign key ("roleId") references "Role"("id")
    on delete cascade on update cascade,
  constraint "RolePermission_permission_fk"
    foreign key ("permissionId") references "Permission"("id")
    on delete cascade on update cascade
);

create table "UserRole" (
  "id" text primary key,
  "userId" text not null,
  "roleId" text not null,
  "companyId" text,
  constraint "UserRole_user_fk"
    foreign key ("userId") references "User"("id")
    on delete cascade on update cascade,
  constraint "UserRole_role_fk"
    foreign key ("roleId") references "Role"("id")
    on delete cascade on update cascade,
  constraint "UserRole_user_role_company_uk" unique ("userId", "roleId", "companyId")
);

create table "Session" (
  "id" text primary key,
  "userId" text not null,
  "tokenHash" text not null unique,
  "expiresAt" timestamptz not null,
  "createdAt" timestamptz not null default now(),
  constraint "Session_user_fk"
    foreign key ("userId") references "User"("id")
    on delete cascade on update cascade
);

create table "PasskeyCredential" (
  "id" text primary key,
  "userId" text not null,
  "credentialId" text not null unique,
  "publicKey" text not null,
  "counter" integer not null default 0,
  "transports" text,
  "createdAt" timestamptz not null default now(),
  "updatedAt" timestamptz not null default now(),
  constraint "Passkey_user_fk"
    foreign key ("userId") references "User"("id")
    on delete cascade on update cascade
);

create table "MfaFactor" (
  "id" text primary key,
  "userId" text not null,
  "type" text not null,
  "secretEncrypted" text,
  "verifiedAt" timestamptz,
  "createdAt" timestamptz not null default now(),
  constraint "Mfa_user_fk"
    foreign key ("userId") references "User"("id")
    on delete cascade on update cascade
);

create table "AuditLog" (
  "id" text primary key,
  "tenantId" text not null,
  "companyId" text,
  "actorUserId" text,
  "tableName" text not null,
  "recordId" text not null,
  "action" text not null,
  "oldValues" jsonb,
  "newValues" jsonb,
  "changedFields" text[] not null,
  "correlationId" text,
  "ipAddress" text,
  "userAgent" text,
  "createdAt" timestamptz not null default now(),
  constraint "AuditLog_tenant_fk"
    foreign key ("tenantId") references "Tenant"("id")
    on delete cascade on update cascade,
  constraint "AuditLog_actor_fk"
    foreign key ("actorUserId") references "User"("id")
    on delete set null on update cascade
);

create index "AuditLog_scope_idx" on "AuditLog"("tenantId", "companyId", "createdAt");
create index "AuditLog_record_idx" on "AuditLog"("tableName", "recordId", "createdAt");

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

alter table "Tenant" enable row level security;
create policy "tenant_scope_select" on "Tenant"
for select
using ("id" = app_security.current_tenant_id());

alter table "User" enable row level security;
create policy "user_scope_select" on "User"
for select
using ("tenantId" = app_security.current_tenant_id());

create policy "user_scope_write" on "User"
for all
using ("tenantId" = app_security.current_tenant_id())
with check ("tenantId" = app_security.current_tenant_id());

alter table "AuditLog" enable row level security;
create policy "audit_scope_select" on "AuditLog"
for select
using (
  "tenantId" = app_security.current_tenant_id()
  and (
    "companyId" is null
    or "companyId" = any(app_security.current_company_ids())
  )
);

create policy "audit_scope_insert" on "AuditLog"
for insert
with check (
  "tenantId" = app_security.current_tenant_id()
  and (
    "companyId" is null
    or "companyId" = any(app_security.current_company_ids())
  )
);
