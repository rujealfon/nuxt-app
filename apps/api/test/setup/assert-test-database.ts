import { assertTestDatabaseUrl } from '../../server/database/test-database-url'

// The `api` and `api-dev` projects point DATABASE_URL at the test database
// (TEST_DATABASE_URL). Fail loudly if a stray environment or config change
// aims a test run at a development database instead.
assertTestDatabaseUrl(process.env.DATABASE_URL ?? '', 'DATABASE_URL')
