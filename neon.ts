import { defineConfig } from "@neon/config/v1";

export default defineConfig({
  auth: true,
  dataApi: true,
  preview: {
    realtime: false,
  },
  buckets: {
    "oppsift-private-files": { access: "private" },
  },
});
