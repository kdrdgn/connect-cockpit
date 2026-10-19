import { createClient } from '@cockpit/client';
import { createEngine, createInProcessFetch } from '@cockpit/mock';
import { QueryClient } from '@tanstack/react-query';

// The phone runs its own copy of the mock; there is no server to reach. State resets on restart.
// EXPO_PUBLIC_SEED pins which writes fail, so a demo recording can be repeated.
const pinned = Number(process.env.EXPO_PUBLIC_SEED);
export const seed = Number.isInteger(pinned) ? pinned : Math.floor(Math.random() * 2 ** 31);

export const engine = createEngine({ config: { seed } });
engine.start();

export const client = createClient({ fetch: createInProcessFetch(engine) });
export const queryClient = new QueryClient({ defaultOptions: { queries: { retry: 1 } } });
