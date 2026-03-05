-- 0003_av_addresses_contacts_properties
-- Forward migration: AV address management baseline

create type "AddressType" as enum ('CUSTOMER', 'SUPPLIER', 'EMPLOYEE', 'LEAD', 'PARTNER', 'OTHER');

create table "Address" (
  "id" text primary key,
  "tenantId" text not null,
  "companyId" text not null,
  "addressNo" text not null,
  "type" "AddressType" not null,
  "firmName" text not null,
  "firstName" text,
  "lastName" text,
  "street" text not null,
  "houseNo" text,
  "zipCode" text not null,
  "city" text not null,
  "canton" text,
  "countryCode" text not null default 'CH',
  "email" text,
  "phone" text,
  "mobile" text,
  "website" text,
  "vatNo" text,
  "uidNo" text,
  "language" text not null default 'de-CH',
  "notes" text,
  "searchText" text,
  "searchVector" tsvector,
  "createdAt" timestamptz not null default now(),
  "updatedAt" timestamptz not null default now(),
  constraint "Address_company_fk"
    foreign key ("companyId") references "Company"("id")
    on delete cascade on update cascade,
  constraint "Address_tenant_fk"
    foreign key ("tenantId") references "Tenant"("id")
    on delete cascade on update cascade,
  constraint "Address_company_no_uk" unique ("companyId", "addressNo")
);

create index "Address_scope_name_idx" on "Address"("tenantId", "companyId", "firmName");
create index "Address_search_gin_idx" on "Address" using gin ("searchVector");

create table "ContactPerson" (
  "id" text primary key,
  "addressId" text not null,
  "firstName" text not null,
  "lastName" text not null,
  "email" text,
  "phone" text,
  "mobile" text,
  "role" text,
  "isPrimary" boolean not null default false,
  constraint "ContactPerson_address_fk"
    foreign key ("addressId") references "Address"("id")
    on delete cascade on update cascade
);

create index "ContactPerson_address_primary_idx" on "ContactPerson"("addressId", "isPrimary");

create table "AddressCategory" (
  "id" text primary key,
  "tenantId" text not null,
  "companyId" text not null,
  "key" text not null,
  "label" text not null,
  constraint "AddressCategory_company_fk"
    foreign key ("companyId") references "Company"("id")
    on delete cascade on update cascade,
  constraint "AddressCategory_tenant_fk"
    foreign key ("tenantId") references "Tenant"("id")
    on delete cascade on update cascade,
  constraint "AddressCategory_company_key_uk" unique ("companyId", "key")
);

create table "AddressCategoryMap" (
  "addressId" text not null,
  "categoryId" text not null,
  primary key ("addressId", "categoryId"),
  constraint "AddressCategoryMap_address_fk"
    foreign key ("addressId") references "Address"("id")
    on delete cascade on update cascade,
  constraint "AddressCategoryMap_category_fk"
    foreign key ("categoryId") references "AddressCategory"("id")
    on delete cascade on update cascade
);

create table "AddressPropertyDefinition" (
  "id" text primary key,
  "tenantId" text not null,
  "companyId" text not null,
  "key" text not null,
  "label" text not null,
  "valueType" text not null,
  constraint "AddressPropDef_company_fk"
    foreign key ("companyId") references "Company"("id")
    on delete cascade on update cascade,
  constraint "AddressPropDef_tenant_fk"
    foreign key ("tenantId") references "Tenant"("id")
    on delete cascade on update cascade,
  constraint "AddressPropDef_company_key_uk" unique ("companyId", "key")
);

create table "AddressPropertyValue" (
  "id" text primary key,
  "definitionId" text not null,
  "addressId" text not null,
  "valueText" text,
  "valueNumber" numeric(18,4),
  "valueDate" timestamptz,
  "valueBool" boolean,
  "valueJson" jsonb,
  constraint "AddressPropValue_def_fk"
    foreign key ("definitionId") references "AddressPropertyDefinition"("id")
    on delete cascade on update cascade,
  constraint "AddressPropValue_address_fk"
    foreign key ("addressId") references "Address"("id")
    on delete cascade on update cascade,
  constraint "AddressPropValue_unique" unique ("definitionId", "addressId")
);

create table "AddressBankAccount" (
  "id" text primary key,
  "addressId" text not null,
  "iban" text not null,
  "bic" text,
  "bankName" text,
  "isDefault" boolean not null default false,
  constraint "AddressBankAccount_address_fk"
    foreign key ("addressId") references "Address"("id")
    on delete cascade on update cascade
);

create index "AddressBankAccount_default_idx" on "AddressBankAccount"("addressId", "isDefault");

create table "PlzDirectory" (
  "id" text primary key,
  "zipCode" text not null,
  "city" text not null,
  "canton" text not null,
  "countryCode" text not null default 'CH',
  "bfsNo" text,
  constraint "PlzDirectory_zip_city_cc_uk" unique ("zipCode", "city", "countryCode")
);

create index "PlzDirectory_zip_city_idx" on "PlzDirectory"("zipCode", "city");

alter table "Address" enable row level security;
create policy "address_scope_select" on "Address"
for select
using (
  "tenantId" = app_security.current_tenant_id()
  and "companyId" = any(app_security.current_company_ids())
);

create policy "address_scope_write" on "Address"
for all
using (
  "tenantId" = app_security.current_tenant_id()
  and "companyId" = any(app_security.current_company_ids())
)
with check (
  "tenantId" = app_security.current_tenant_id()
  and "companyId" = any(app_security.current_company_ids())
);

alter table "ContactPerson" enable row level security;
create policy "contact_scope_select" on "ContactPerson"
for select
using (
  exists (
    select 1
    from "Address" a
    where a."id" = "ContactPerson"."addressId"
      and a."tenantId" = app_security.current_tenant_id()
      and a."companyId" = any(app_security.current_company_ids())
  )
);

create policy "contact_scope_write" on "ContactPerson"
for all
using (
  exists (
    select 1
    from "Address" a
    where a."id" = "ContactPerson"."addressId"
      and a."tenantId" = app_security.current_tenant_id()
      and a."companyId" = any(app_security.current_company_ids())
  )
)
with check (
  exists (
    select 1
    from "Address" a
    where a."id" = "ContactPerson"."addressId"
      and a."tenantId" = app_security.current_tenant_id()
      and a."companyId" = any(app_security.current_company_ids())
  )
);
