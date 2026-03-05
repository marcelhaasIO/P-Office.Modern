# 0003 av_addresses_contacts_properties

## Scope
- Address master for Swiss workflows
- Contact persons, categories, custom properties, bank accounts
- PLZ directory and search vector index

## Rollback Notes
1. Drop join/value tables first: `AddressCategoryMap`, `AddressPropertyValue`, `AddressBankAccount`, `ContactPerson`.
2. Drop definition tables: `AddressCategory`, `AddressPropertyDefinition`, `PlzDirectory`.
3. Drop `Address` last.
4. Remove RLS policies on these tables before dropping if active.
