import { initTRPC, TRPCError } from '@trpc/server';
import type { TrpcContext } from './context';

const t = initTRPC.context<TrpcContext>().create();

export const createRouter = t.router;
export const publicProcedure = t.procedure;

export const protectedProcedure = t.procedure.use(({ ctx, next }) => {
  if (!ctx.userId) {
    throw new TRPCError({ code: 'UNAUTHORIZED' });
  }

  return next();
});

export const companyProcedure = protectedProcedure.use(({ ctx, next }) => {
  if (!ctx.companyId || !ctx.tenantId) {
    throw new TRPCError({ code: 'FORBIDDEN', message: 'Company context is required.' });
  }

  return next({
    ctx: {
      ...ctx,
      companyId: ctx.companyId,
      tenantId: ctx.tenantId
    }
  });
});
