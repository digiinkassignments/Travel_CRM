import { createApp } from "./app";
import { env } from "./config/env";
// import "./jobs/subscription-lifecycle.job";
// import "./jobs/automation-engine.job";
// Both background jobs are commented out by default since they require a
// running Redis instance (see docker-compose.yml) — uncomment once Redis
// is available locally, otherwise BullMQ's connection retries will spam
// the console on every request.

const app = createApp();

app.listen(env.port, () => {
  console.log(`Digiink CRM backend listening on port ${env.port} (${env.nodeEnv})`);
});
