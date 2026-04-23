const { Client } = require('pg');
const config = require('../config');
const {
  bootstrapFreshDatabase,
  ensureDatabaseExists,
  getConnection,
} = require('../services/database-bootstrap-service');

const main = async () => {
  if (!config.databaseUrl && (!config.pgPassword || config.pgPassword === 'your_password_here')) {
    throw new Error(
      'Database credentials are not configured. Set PGPASSWORD or DATABASE_URL before running db:init.'
    );
  }

  await ensureDatabaseExists();

  const client = new Client(getConnection(config.pgDatabase));
  await client.connect();

  try {
    await bootstrapFreshDatabase(client, { includeSeedData: true });
    // eslint-disable-next-line no-console
    console.log('Database initialized successfully.');
  } finally {
    await client.end();
  }
};

main().catch((error) => {
  // eslint-disable-next-line no-console
  console.error('Database initialization failed.');
  // eslint-disable-next-line no-console
  console.error(error);
  process.exit(1);
});
