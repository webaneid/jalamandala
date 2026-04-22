import { createAuthClient } from 'better-auth/react';

// baseURL sengaja tidak di-set — Better Auth pakai window.location.origin secara otomatis.
// Ini penting karena app berjalan di subdomain (app.localhost:6250) bukan di localhost:6250 langsung.
export const authClient: ReturnType<typeof createAuthClient> = createAuthClient();
