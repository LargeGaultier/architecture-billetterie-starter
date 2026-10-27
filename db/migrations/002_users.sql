-- L'initialisation et le marquage historique forment une opération atomique.
-- Au prochain démarrage, la table existe : les nouveaux auteurs sont préservés.
DO $migration$
BEGIN
  IF to_regclass(format('%I.users', current_schema())) IS NULL THEN
    UPDATE reservations SET customer_ref = 'legacy:' || customer_ref;
    CREATE TABLE users (
      id TEXT PRIMARY KEY,
      login TEXT NOT NULL UNIQUE,
      password_hash TEXT NOT NULL
    );
  END IF;
END
$migration$;
