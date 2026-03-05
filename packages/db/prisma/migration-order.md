# Prisma Migration Order (64-week plan aligned)

1. `0001_foundation_tenant_auth_audit`
2. `0002_company_number_sequences_fiscal`
3. `0003_av_addresses_contacts_properties`
4. `0004_as_articles_pricing_bom_inventory`
5. `0005_an_fixed_assets_depreciation`
6. `0006_ab_documents_positions_workflows`
7. `0007_np_npk_sia451`
8. `0008_pj_projects_time_material_margin`
9. `0009_lg_payroll_wage_types_elm`
10. `0010_db_debtors_qrbill_dunning`
11. `0011_kr_creditors_camt_pain`
12. `0012_fb_journal_vat_budget_close`
13. `0013_realtime_outbox_triggers`
14. `0014_pwa_sync_conflict_resolution`
15. `0015_plugin_api_public`
16. `0016_legacy_migration_staging`

## Guardrails
- Every migration must include rollback SQL notes.
- Any new financial table requires balancing checks and immutable posting semantics.
- Closed period constraints are introduced at `0012` and enforced in all subsequent migrations.
