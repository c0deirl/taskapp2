// backend/src/migrate_normalize_settings.js
// Idempotent startup migration: convert non-JSON settings.value rows into JSON strings.
// Usage: require('./migrate_normalize_settings')(db);

module.exports = function normalizeSettings(db) {
  try {
    // ensure settings table exists
    const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='settings'").all();
    if (!tables.length) {
      console.log('migrate: settings table not present, skipping normalization');
      return;
    }

    const rows = db.prepare("SELECT key, value FROM settings").all();
    if (!rows || rows.length === 0) {
      console.log('migrate: no settings rows found');
      return;
    }

    const update = db.prepare(
      "INSERT INTO settings(key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value"
    );

    const tx = db.transaction((items) => {
      for (const { key, value } of items) {
        if (value == null) {
          // store explicit JSON null
          update.run(key, JSON.stringify(null));
          continue;
        }
        const s = String(value).trim();
        // Heuristic: if it already looks like JSON (starts with " { [ or digit/-, treat as JSON)
        const first = s[0];
        const maybeJsonStart = first === '"' || first === '{' || first === '[' || /[-0-9tfn]/i.test(first);
        if (maybeJsonStart) {
          // try parse to confirm
          try {
            JSON.parse(s);
            // valid JSON, leave as-is
            continue;
          } catch (e) {
            // fallthrough to normalize
          }
        }
        // Not valid JSON: store JSON-stringified original string
        update.run(key, JSON.stringify(value));
      }
    });

    tx(rows);
    console.log(`migrate: normalized ${rows.length} settings entries`);
  } catch (err) {
    console.error('migrate: normalizeSettings failed', err && err.stack ? err.stack : err);
    throw err;
  }
};
