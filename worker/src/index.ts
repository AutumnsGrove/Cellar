// Cellar Cloudflare Worker
// TODO: Implement worker entry point

export interface Env {
  DB: D1Database;
  R2_BUCKET: R2Bucket;
  // Add other bindings as needed
}

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    // TODO: Implement request handling
    return new Response('Cellar API', { status: 200 });
  },

  async scheduled(event: ScheduledEvent, env: Env, ctx: ExecutionContext): Promise<void> {
    // TODO: Implement cron handlers
    // - Trash cleanup (daily 3 AM UTC)
    // - Export cleanup (daily 3 AM UTC)
  },
};
