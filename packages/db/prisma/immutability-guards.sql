-- Phase 1 immutable guards for closed fiscal periods and converted/locked documents.
-- Note: Document table is introduced in a later migration; function is created now for reuse.

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

-- Attach once FiscalPeriod table exists
-- create trigger trg_fiscal_period_immutable
-- before update or delete on "FiscalPeriod"
-- for each row execute function app_guard.prevent_fiscal_period_update_if_closed();

create or replace function app_guard.prevent_document_mutation_when_locked()
returns trigger
language plpgsql
as $$
begin
  if old."lockedAt" is not null or old."convertedAt" is not null then
    raise exception 'Locked or converted documents are immutable';
  end if;

  return new;
end;
$$;

-- Attach once Document table exists
-- create trigger trg_document_immutable
-- before update or delete on "Document"
-- for each row execute function app_guard.prevent_document_mutation_when_locked();
