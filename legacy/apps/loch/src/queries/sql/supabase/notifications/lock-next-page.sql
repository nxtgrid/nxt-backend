-- Lock a batch of pending notifications for processing
-- Sets the lock_session to claim ownership and prevent concurrent processing
-- Uses a subquery with LIMIT to batch the updates

UPDATE notifications
SET lock_session = $1
WHERE notifications.id IN (
  SELECT notifications.id
  FROM notifications
  WHERE
    notifications.notification_status = $2
    AND lock_session IS NULL
  LIMIT $3
);

