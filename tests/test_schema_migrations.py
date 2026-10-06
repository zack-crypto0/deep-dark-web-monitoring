import unittest

from sqlalchemy import create_engine, inspect, text

from backend.services.schema_migrations import ensure_finding_provenance


class MigrationTests(unittest.TestCase):
    def test_existing_rows_preserved_and_migration_repeatable(self):
        engine = create_engine('sqlite://')
        try:
            with engine.begin() as connection:
                connection.execute(text('CREATE TABLE findings (finding_id INTEGER PRIMARY KEY, content TEXT)'))
                connection.execute(text("INSERT INTO findings VALUES (1, 'Historical evidence')"))
            ensure_finding_provenance(engine)
            ensure_finding_provenance(engine)
            self.assertEqual(len(inspect(engine).get_columns('findings')), 4)
            with engine.connect() as connection:
                row = connection.execute(text('SELECT content, content_hash, collected_at FROM findings')).one()
            self.assertEqual(tuple(row), ('Historical evidence', None, None))
        finally:
            engine.dispose()
