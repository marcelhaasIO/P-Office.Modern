# 0002 company_number_sequences_fiscal

## Scope
- Company master linked to tenant
- Document numbering sequences
- Fiscal year/period model with lock semantics

## Rollback Notes
1. Remove period-level triggers/policies if introduced later.
2. Drop in order: `FiscalPeriod`, `FiscalYear`, `NumberSequence`, `Company`.
3. Ensure no downstream FK remains (e.g., Address, Account, VatCode).
