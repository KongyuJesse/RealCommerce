const { Pool } = require('pg');
const { buildPgConfig } = require('./config');

const pool = new Pool(buildPgConfig());

pool.on('error', (error) => {
  console.error('Unexpected PostgreSQL error:', error);
});

async function query(text, params) {
  return pool.query(text, params);
}

async function withClient(callback) {
  const client = await pool.connect();

  try {
    return await callback(client);
  } finally {
    client.release();
  }
}

module.exports = {
  pool,
  query,
  withClient,
};
