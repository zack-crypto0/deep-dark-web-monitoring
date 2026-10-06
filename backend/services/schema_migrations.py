from sqlalchemy import inspect, text


def ensure_finding_provenance(engine):
    """Add nullable provenance columns without inventing historical evidence."""
    with engine.begin() as connection:
        columns = {column['name'] for column in inspect(connection).get_columns('findings')}
        definitions = {
            'content_hash': 'VARCHAR(64)',
            'collected_at': 'TIMESTAMP WITH TIME ZONE',
        }
        for name, definition in definitions.items():
            if name not in columns:
                connection.execute(text(f'ALTER TABLE findings ADD COLUMN {name} {definition}'))


if __name__ == '__main__':
    from backend.database import engine

    ensure_finding_provenance(engine)
    print('Finding provenance schema is ready.')
