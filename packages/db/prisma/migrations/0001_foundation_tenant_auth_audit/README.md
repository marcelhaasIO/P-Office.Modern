# 0001 foundation_tenant_auth_audit

## Scope
- Tenant/User/Auth core
- RBAC (role/permission mapping)
- AuditLog + helper security functions

## Rollback Notes
1. Drop policies first (if added downstream).
2. Drop child tables in order: `RolePermission`, `UserRole`, `Session`, `PasskeyCredential`, `MfaFactor`, `UserCompany`.
3. Drop parent tables: `Permission`, `Role`, `User`, `Tenant`, `AuditLog`.
4. Drop helper schemas/functions `app_security.*` only if unused by later migrations.
