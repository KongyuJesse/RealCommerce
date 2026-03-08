const { config } = require('./config');
const createApp = require('./app');

const app = createApp();

if (require.main === module) {
  app.listen(config.app.port, () => {
    console.log(`RealCommerce API listening on port ${config.app.port}`);
  });
}

module.exports = app;
