const config = require('../config');
const { query, withTransaction } = require('../db');
const { logger } = require('../utils/logger');

const SERVICE_NAME = 'exchange_rates';
const ADVISORY_LOCK_ID = 840214;

let schedulerHandle = null;
let nextRunAt = null;
let lastSyncSnapshot = null;

const normalizeRates = (rates = {}) =>
  Object.entries(rates).reduce((accumulator, [currencyCode, rate]) => {
    const numericRate = Number(rate);
    if (Number.isFinite(numericRate) && numericRate > 0) {
      accumulator[String(currencyCode).toUpperCase()] = Number(numericRate.toFixed(6));
    }
    return accumulator;
  }, {});

const getSyncConfiguration = () => ({
  enabled: config.exchangeRateSyncEnabled,
  provider: config.exchangeRateProvider,
  intervalMs: config.exchangeRateSyncIntervalMs,
  timeoutMs: config.exchangeRateSyncTimeoutMs,
  baseUrl: config.exchangeRateProviderBaseUrl,
});

const fetchFrankfurterRates = async ({ baseCurrencyCode, targetCurrencyCodes }) => {
  const requestUrl = new URL('/latest', config.exchangeRateProviderBaseUrl);
  requestUrl.searchParams.set('base', baseCurrencyCode);
  requestUrl.searchParams.set('symbols', targetCurrencyCodes.join(','));

  const response = await fetch(requestUrl, {
    headers: {
      accept: 'application/json',
      'user-agent': `${config.appName}/1.0`,
    },
    signal: AbortSignal.timeout(config.exchangeRateSyncTimeoutMs),
  });

  if (!response.ok) {
    throw new Error(`Exchange rate provider responded with ${response.status}.`);
  }

  const payload = await response.json();
  const rates = normalizeRates(payload?.rates || {});

  if (!payload || typeof payload !== 'object' || Object.keys(rates).length === 0) {
    throw new Error('Exchange rate provider returned no usable rates.');
  }

  return {
    provider: 'frankfurter',
    providerDate: payload.date || null,
    baseCurrencyCode: String(payload.base || baseCurrencyCode).toUpperCase(),
    effectiveAt: new Date().toISOString(),
    rates,
    rawPayload: payload,
  };
};

const fetchProviderRates = async ({ baseCurrencyCode, targetCurrencyCodes }) => {
  if (config.exchangeRateProvider === 'frankfurter') {
    return fetchFrankfurterRates({ baseCurrencyCode, targetCurrencyCodes });
  }

  throw new Error(`Unsupported exchange-rate provider "${config.exchangeRateProvider}".`);
};

const recordSyncRun = async (client, { trigger, status, startedAt, completedAt, summary, details }) =>
  client.query(
    `
      INSERT INTO external_service_syncs (
        service_name,
        provider,
        trigger,
        status,
        summary,
        details,
        started_at,
        completed_at
      )
      VALUES ($1, $2, $3, $4, $5, $6::jsonb, $7, $8)
    `,
    [
      SERVICE_NAME,
      config.exchangeRateProvider,
      trigger,
      status,
      summary,
      JSON.stringify(details || {}),
      startedAt,
      completedAt,
    ]
  );

const acquireSchedulerLock = async () => {
  const lock = await query('SELECT pg_try_advisory_lock($1) AS acquired', [ADVISORY_LOCK_ID]);
  return Boolean(lock.rows[0]?.acquired);
};

const releaseSchedulerLock = async () => {
  await query('SELECT pg_advisory_unlock($1)', [ADVISORY_LOCK_ID]);
};

const syncExchangeRates = async ({ trigger = 'manual', force = false } = {}) => {
  const syncConfig = getSyncConfiguration();
  const startedAt = new Date();

  if (!syncConfig.enabled && !force) {
    const skipped = {
      status: 'disabled',
      trigger,
      startedAt: startedAt.toISOString(),
      completedAt: startedAt.toISOString(),
      summary: 'Exchange-rate sync is disabled by configuration.',
    };
    lastSyncSnapshot = skipped;
    return skipped;
  }

  const acquiredLock = await acquireSchedulerLock();
  if (!acquiredLock) {
    const skipped = {
      status: 'skipped',
      trigger,
      startedAt: startedAt.toISOString(),
      completedAt: new Date().toISOString(),
      summary: 'Another application instance is already syncing exchange rates.',
    };
    lastSyncSnapshot = skipped;
    return skipped;
  }

  try {
    const currencies = await query(
      `
        SELECT code, is_base
        FROM currencies
        ORDER BY is_base DESC, code ASC
      `
    );

    const baseCurrencyCode = currencies.rows.find((currency) => currency.is_base)?.code || 'USD';
    const targetCurrencyCodes = currencies.rows
      .map((currency) => String(currency.code).toUpperCase())
      .filter((currencyCode) => currencyCode !== baseCurrencyCode);

    if (targetCurrencyCodes.length === 0) {
      const completedAt = new Date();
      const summary = 'No non-base currencies are configured, so no sync was performed.';
      await withTransaction(async (client) =>
        recordSyncRun(client, {
          trigger,
          status: 'SKIPPED',
          startedAt,
          completedAt,
          summary,
          details: {
            baseCurrencyCode,
            targetCurrencyCodes,
          },
        })
      );

      const snapshot = {
        status: 'skipped',
        trigger,
        startedAt: startedAt.toISOString(),
        completedAt: completedAt.toISOString(),
        summary,
      };
      lastSyncSnapshot = snapshot;
      return snapshot;
    }

    const providerPayload = await fetchProviderRates({
      baseCurrencyCode,
      targetCurrencyCodes,
    });

    await withTransaction(async (client) => {
      for (const [targetCurrencyCode, rate] of Object.entries(providerPayload.rates)) {
        await client.query(
          `
            INSERT INTO exchange_rates (base_currency_code, target_currency_code, rate, effective_at)
            VALUES ($1, $2, $3, $4)
          `,
          [providerPayload.baseCurrencyCode, targetCurrencyCode, rate, providerPayload.effectiveAt]
        );
      }

      await recordSyncRun(client, {
        trigger,
        status: 'SUCCESS',
        startedAt,
        completedAt: new Date(),
        summary: `Synchronized ${Object.keys(providerPayload.rates).length} currency pairs from ${providerPayload.provider}.`,
        details: {
          baseCurrencyCode: providerPayload.baseCurrencyCode,
          pairCount: Object.keys(providerPayload.rates).length,
          providerDate: providerPayload.providerDate,
          effectiveAt: providerPayload.effectiveAt,
          rates: providerPayload.rates,
        },
      });
    });

    const snapshot = {
      status: 'success',
      trigger,
      startedAt: startedAt.toISOString(),
      completedAt: new Date().toISOString(),
      summary: `Synchronized ${Object.keys(providerPayload.rates).length} currency pairs.`,
      baseCurrencyCode: providerPayload.baseCurrencyCode,
      pairCount: Object.keys(providerPayload.rates).length,
      providerDate: providerPayload.providerDate,
      effectiveAt: providerPayload.effectiveAt,
    };
    lastSyncSnapshot = snapshot;
    logger.info('Exchange rates synchronized', snapshot);
    return snapshot;
  } catch (error) {
    const completedAt = new Date();
    const failureDetails = {
      message: error.message,
    };

    try {
      await withTransaction(async (client) =>
        recordSyncRun(client, {
          trigger,
          status: 'FAILED',
          startedAt,
          completedAt,
          summary: error.message,
          details: failureDetails,
        })
      );
    } catch (auditError) {
      logger.error('Failed to record exchange-rate sync failure', {
        error: auditError,
        originalError: error,
      });
    }

    lastSyncSnapshot = {
      status: 'failed',
      trigger,
      startedAt: startedAt.toISOString(),
      completedAt: completedAt.toISOString(),
      summary: error.message,
    };
    logger.error('Exchange-rate sync failed', { error, trigger });
    throw error;
  } finally {
    await releaseSchedulerLock();
  }
};

const getExchangeRateSyncStatus = async () => {
  const [latestRates, syncHistory] = await Promise.all([
    query(
      `
        SELECT
          COUNT(*)::integer AS pair_count,
          MAX(effective_at) AS latest_effective_at
        FROM latest_exchange_rates
      `
    ),
    query(
      `
        SELECT
          id,
          service_name,
          provider,
          trigger,
          status,
          summary,
          details,
          started_at,
          completed_at
        FROM external_service_syncs
        WHERE service_name = $1
        ORDER BY started_at DESC, id DESC
        LIMIT 10
      `,
      [SERVICE_NAME]
    ),
  ]);

  return {
    ...getSyncConfiguration(),
    nextRunAt,
    latestEffectiveAt: latestRates.rows[0]?.latest_effective_at || null,
    pairCount: Number(latestRates.rows[0]?.pair_count || 0),
    lastRun: syncHistory.rows[0] || lastSyncSnapshot,
    recentRuns: syncHistory.rows,
  };
};

const stopExchangeRateSyncScheduler = () => {
  if (schedulerHandle) {
    clearInterval(schedulerHandle);
    schedulerHandle = null;
    nextRunAt = null;
  }
};

const startExchangeRateSyncScheduler = () => {
  stopExchangeRateSyncScheduler();

  if (!config.exchangeRateSyncEnabled) {
    logger.info('Exchange-rate scheduler is disabled');
    return;
  }

  const runScheduledSync = async (trigger) => {
    nextRunAt = new Date(Date.now() + config.exchangeRateSyncIntervalMs).toISOString();
    try {
      await syncExchangeRates({ trigger });
    } catch (_error) {
      // Logging already happens inside syncExchangeRates.
    }
  };

  nextRunAt = new Date(Date.now() + config.exchangeRateSyncIntervalMs).toISOString();
  schedulerHandle = setInterval(() => {
    runScheduledSync('scheduled').catch(() => {});
  }, config.exchangeRateSyncIntervalMs);

  if (typeof schedulerHandle.unref === 'function') {
    schedulerHandle.unref();
  }

  setTimeout(() => {
    runScheduledSync('startup').catch(() => {});
  }, Math.min(5000, config.exchangeRateSyncIntervalMs));

  logger.info('Exchange-rate scheduler started', {
    provider: config.exchangeRateProvider,
    intervalMs: config.exchangeRateSyncIntervalMs,
  });
};

module.exports = {
  getExchangeRateSyncStatus,
  startExchangeRateSyncScheduler,
  stopExchangeRateSyncScheduler,
  syncExchangeRates,
};
