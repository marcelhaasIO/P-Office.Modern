export type TrpcContext = {
  tenantId: string;
  companyId: string;
  userId: string;
  roles: string[];
};

export async function createContext(): Promise<TrpcContext> {
  return {
    tenantId: 'muster-tenant',
    companyId: 'muster-company',
    userId: 'muster-admin',
    roles: ['owner']
  };
}
