const { applySchemaUpgrades } = require('../services/schema-upgrades');

const main = async () => {
  await applySchemaUpgrades();
  // eslint-disable-next-line no-console
  console.log('Schema upgrades applied successfully.');
};

main().catch((error) => {
  // eslint-disable-next-line no-console
  console.error('Schema upgrades failed.');
  // eslint-disable-next-line no-console
  console.error(error);
  process.exit(1);
});
