import { queryAll, queryOne } from '../db/pool.js';

export function listCategories(includeInactive = false) {
  return queryAll(
    `SELECT category_id, name, icon, description, is_active
       FROM categories
      WHERE ($1::boolean OR is_active)
      ORDER BY name`,
    [includeInactive],
  );
}

export function listLocations(includeInactive = false) {
  return queryAll(
    `SELECT location_id, name, building, floor_label, description, is_active
       FROM locations
      WHERE ($1::boolean OR is_active)
      ORDER BY building, name`,
    [includeInactive],
  );
}

export function createCategory(input: { name: string; icon?: string; description?: string }) {
  return queryOne(
    `INSERT INTO categories (name, icon, description)
     VALUES ($1, COALESCE($2, 'package'), $3)
     RETURNING category_id, name, icon, description, is_active`,
    [input.name, input.icon ?? null, input.description ?? null],
  );
}

export function updateCategory(
  categoryId: number,
  input: { name?: string; icon?: string; description?: string; isActive?: boolean },
) {
  return queryOne(
    `UPDATE categories
        SET name        = COALESCE($2, name),
            icon        = COALESCE($3, icon),
            description = COALESCE($4, description),
            is_active   = COALESCE($5, is_active)
      WHERE category_id = $1
      RETURNING category_id, name, icon, description, is_active`,
    [categoryId, input.name ?? null, input.icon ?? null, input.description ?? null, input.isActive ?? null],
  );
}

export function createLocation(input: {
  name: string; building: string; floorLabel?: string; description?: string;
}) {
  return queryOne(
    `INSERT INTO locations (name, building, floor_label, description)
     VALUES ($1, $2, $3, $4)
     RETURNING location_id, name, building, floor_label, description, is_active`,
    [input.name, input.building, input.floorLabel ?? null, input.description ?? null],
  );
}

export function updateLocation(
  locationId: number,
  input: { name?: string; building?: string; floorLabel?: string; description?: string; isActive?: boolean },
) {
  return queryOne(
    `UPDATE locations
        SET name        = COALESCE($2, name),
            building    = COALESCE($3, building),
            floor_label = COALESCE($4, floor_label),
            description = COALESCE($5, description),
            is_active   = COALESCE($6, is_active)
      WHERE location_id = $1
      RETURNING location_id, name, building, floor_label, description, is_active`,
    [
      locationId, input.name ?? null, input.building ?? null,
      input.floorLabel ?? null, input.description ?? null, input.isActive ?? null,
    ],
  );
}

/* --- notifications -------------------------------------------------------- */

export function listNotifications(userId: number, limit = 30) {
  return queryAll(
    `SELECT notification_id, title, body, notification_type,
            related_entity_type, related_entity_id, is_read, created_at
       FROM notifications
      WHERE user_id = $1
      ORDER BY is_read ASC, created_at DESC
      LIMIT $2`,
    [userId, limit],
  );
}

export function markNotificationRead(userId: number, notificationId: number) {
  return queryOne(
    `UPDATE notifications SET is_read = TRUE
      WHERE notification_id = $1 AND user_id = $2
      RETURNING notification_id, is_read`,
    [notificationId, userId],
  );
}

export function markAllNotificationsRead(userId: number) {
  return queryAll(
    `UPDATE notifications SET is_read = TRUE
      WHERE user_id = $1 AND is_read = FALSE
      RETURNING notification_id`,
    [userId],
  );
}
