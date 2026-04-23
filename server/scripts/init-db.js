
const fs = require('fs/promises');
const path = require('path');
const { Client } = require('pg');
const config = require('../config');

const ssl = (config.pgSsl || config.databaseUrl) ? { rejectUnauthorized: false } : false;

const getConnection = (database) =>
  config.databaseUrl
    ? { connectionString: config.databaseUrl, ssl }
    : {
        host: config.pgHost,
        port: config.pgPort,
        user: config.pgUser,
        password: config.pgPassword,
        database,
        ssl,
      };

const ensureDatabase = async () => {
  if (config.databaseUrl) {
    return;
  }

  const client = new Client(getConnection(config.pgMaintenanceDb));
  await client.connect();

  try {
    const exists = await client.query('SELECT 1 FROM pg_database WHERE datname = $1', [config.pgDatabase]);

    if (exists.rowCount === 0) {
      await client.query(`CREATE DATABASE "${config.pgDatabase}"`);
    }
  } finally {
    await client.end();
  }
};

const runSqlFile = async (client, fileName) => {
  const filePath = path.join(__dirname, '..', 'sql', fileName);
  const sql = await fs.readFile(filePath, 'utf8');
  await client.query(sql);
};

const main = async () => {
  if (!config.databaseUrl && (!config.pgPassword || config.pgPassword === 'your_password_here')) {
    throw new Error(
      'Database credentials are not configured. Set PGPASSWORD or DATABASE_URL before running db:init.'
    );
  }

  await ensureDatabase();

  const client = new Client(getConnection(config.pgDatabase));
  await client.connect();

  try {
    await runSqlFile(client, 'schema.sql');
    await runSqlFile(client, 'seed.sql');
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
