import { createAppleDeletionHandler } from './handler.ts';

declare const Deno: { env: { get(name: string): string | undefined }; serve(handler: (request: Request) => Promise<Response>): void };
const env = (name: string) => Deno.env.get(name) ?? '';
Deno.serve(createAppleDeletionHandler({
  enabled: env('APPLE_ACCOUNT_DELETION_ENABLED') === '1',
  supabaseUrl: env('SUPABASE_URL'), isolatedProjectRef: env('APPLE_ISOLATED_PROJECT_REF'),
  anonKey: env('SUPABASE_ANON_KEY'), serviceKey: env('SUPABASE_SERVICE_ROLE_KEY'),
  teamId: env('APPLE_TEAM_ID'), keyId: env('APPLE_KEY_ID'), privateKey: env('APPLE_PRIVATE_KEY'),
}));
