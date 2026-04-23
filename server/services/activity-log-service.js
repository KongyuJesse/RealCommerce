const { query } = require('../db');
const { asNumber } = require('../utils/validation');
const { normalizeText } = require('../utils/format');

const recordAdminActivity = async ({
  client = { query },
  actorUserId = null,
  actorRole = '',
  action,
  entityType,
  entityId = null,
  summary,
  metadata = {},
}) => {
  const normalizedAction = normalizeText(action);
  const normalizedEntityType = normalizeText(entityType);
  const normalizedSummary = normalizeText(summary);

  if (!normalizedAction || !normalizedEntityType || !normalizedSummary) {
    return null;
  }

  const result = await client.query(
    `
      INSERT INTO admin_activity_logs (
        actor_user_id,
        actor_role,
        action,
        entity_type,
        entity_id,
        summary,
        metadata
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7::jsonb)
      RETURNING id, actor_user_id, actor_role, action, entity_type, entity_id, summary, metadata, created_at
    `,
    [
      actorUserId ? Number(actorUserId) : null,
      normalizeText(actorRole) || null,
      normalizedAction,
      normalizedEntityType,
      entityId === null || entityId === undefined ? null : String(entityId),
      normalizedSummary,
      JSON.stringify(metadata || {}),
    ]
  );

  return result.rows[0] || null;
};

const listAdminActivity = async ({ limit = 20, action = '', entityType = '' } = {}) => {
  const safeLimit = Math.min(100, Math.max(1, asNumber(limit, 20)));
  const normalizedAction = normalizeText(action);
  const normalizedEntityType = normalizeText(entityType);

  const result = await query(
    `
      SELECT
        aal.id,
        aal.actor_user_id,
        aal.actor_role,
        aal.action,
        aal.entity_type,
        aal.entity_id,
        aal.summary,
        aal.metadata,
        aal.created_at,
        u.full_name AS actor_name,
        u.email AS actor_email
      FROM admin_activity_logs aal
      LEFT JOIN users u ON u.id = aal.actor_user_id
      WHERE ($1 = '' OR aal.action = $1)
        AND ($2 = '' OR aal.entity_type = $2)
      ORDER BY aal.created_at DESC, aal.id DESC
      LIMIT $3
    `,
    [normalizedAction, normalizedEntityType, safeLimit]
  );

  return result.rows;
};

module.exports = {
  listAdminActivity,
  recordAdminActivity,
};
