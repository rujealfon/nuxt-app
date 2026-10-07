-- Runs once, when the Postgres data volume is first created. Existing volumes
-- get the test database from `pnpm db:test:create`, which `pnpm db:up` runs.
CREATE DATABASE nuxt_app_test OWNER nuxt_app_user;
