const fs = require('fs/promises');
const path = require('path');
const { Client } = require('pg');
const { buildPgConfig, config } = require('../config');

function quoteIdentifier(value) {
  return `"${String(value).replace(/"/g, '""')}"`;
}

async function ensureDatabaseExists() {
  const maintenanceClient = new Client(
    buildPgConfig(config.database.maintenanceDatabase)
  );

  await maintenanceClient.connect();

  try {
    const existing = await maintenanceClient.query(
      'SELECT 1 FROM pg_database WHERE datname = $1',
      [config.database.database]
    );

    if (existing.rowCount === 0) {
      await maintenanceClient.query(
        `CREATE DATABASE ${quoteIdentifier(config.database.database)}`
      );
      console.log(`Created database ${config.database.database}`);
    } else {
      console.log(`Database ${config.database.database} already exists`);
    }
  } finally {
    await maintenanceClient.end();
  }
}

async function applySqlFiles() {
  const schemaPath = path.resolve(__dirname, '../sql/schema.sql');
  const seedPath = path.resolve(__dirname, '../sql/seed.sql');
  const [schemaSql, seedSql] = await Promise.all([
    fs.readFile(schemaPath, 'utf8'),
    fs.readFile(seedPath, 'utf8'),
  ]);

  const client = new Client(buildPgConfig());
  await client.connect();

  try {
    await client.query(schemaSql);
    await client.query(seedSql);
    console.log('Schema and seed data applied successfully');
  } finally {
    await client.end();
  }
}

async function main() {
  await ensureDatabaseExists();
  await applySqlFiles();
}

main().catch((error) => {
  console.error('Database initialization failed:', error);
  process.exitCode = 1;
});
