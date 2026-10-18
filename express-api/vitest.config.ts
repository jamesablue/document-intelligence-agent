import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['src/**/*.test.ts'],
    // Dummy values so modules that read env vars at import time (s3.ts, passport.ts) can load,
    // and so an unmocked AWS call fails on bad credentials instead of using a real profile.
    env: {
      AWS_REGION: 'us-east-1',
      AWS_ACCESS_KEY_ID: 'test',
      AWS_SECRET_ACCESS_KEY: 'test',
      S3_BUCKET_NAME: 'test-bucket',
      DATABASE_URL: 'postgresql://test:test@127.0.0.1:1/test',
      JWT_SECRET: 'test-secret',
      GOOGLE_CLIENT_ID: 'test-client-id',
      GOOGLE_CLIENT_SECRET: 'test-client-secret',
    },
  },
});
