import { createRouter } from '../trpc';
import { avRouter } from './av';
import { foundationRouter } from './foundation';

export const appRouter = createRouter({
  foundation: foundationRouter,
  av: avRouter
});

export type AppRouter = typeof appRouter;
