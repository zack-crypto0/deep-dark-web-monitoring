# Progress — 23 September 2026

Continued the controlled crawler integration from the Develop Monitoring System conversation.

- `POST /scan/` defaults to the existing synthetic dataset.
- `POST /scan/?scan_source=controlled` collects the local mock site at `http://127.0.0.1:8081/index.html` and uses the existing matching, risk scoring, finding, alert, audit and indexing pipeline.
- Both modes accept `watchlist_id`; omission scans all active assets.
- Dashboard now offers Synthetic Dataset and Controlled Crawler and displays the source and record count after a scan.
- An empty crawler result returns HTTP 503 with startup guidance.
- Existing duplicate prevention is still based on source + watchlist.

## Validation

`venv/Scripts/python.exe -m unittest discover -s tests -v`: 5 tests passed.
Tests use an in-memory SQLite database, a real local HTTP mock source on an ephemeral port, and mocked Elasticsearch availability. They cover selected-asset crawling, repeated scan duplicates, synthetic default/all assets, unavailable source, invalid parameters, missing watchlist and viewer permissions.

`npm.cmd run build` in frontend passed (bundle-size warning).
`npx.cmd oxlint src/pages/Dashboard.jsx` passed.
FastAPI TestClient required installing `httpx2==2.13.1` in the existing venv.

Live Elasticsearch and browser interaction have not been verified. Live Tor collection is not implemented.

## Provenance update

- Findings now persist SHA-256 of the exact UTF-8 extracted text plus collection time. Controlled mode preserves the crawler timestamp; synthetic mode records ingestion time.
- Finding Detail shows the stored hash, evidence collection time and a comparison of the current stored text to the recorded hash. Source first-recorded time is labeled separately.
- Existing findings retain null provenance; no historical collection timestamps or hashes were fabricated. Duplicate scans preserve the original finding evidence, including when a source page changes. Capturing later versions remains future work.
- The hash checks stored-text consistency, not source authenticity or original HTML integrity.
- Added a repeatable, additive schema migration, also run during backend startup. Executed successfully against the project's PostgreSQL database on 23 September 2026.
- Eight tests passed, including legacy migration preservation, repeat scans, hash mismatch detection and existing scan regression tests. Frontend production build passed with the existing bundle-size warning.
- Restart the backend to load the new code. New findings contain provenance; existing duplicates remain unchanged. Elasticsearch startup remains blocked by Windows Application Control as diagnosed previously.

## Run locally

From the project root, in separate terminals:

```powershell
.\venv\Scripts\python.exe -m http.server 8081 --bind 127.0.0.1 --directory sample-data\mock_darkweb_site
```

```powershell
.\venv\Scripts\python.exe -m uvicorn backend.main:app --reload
```

```powershell
cd frontend
npm.cmd run dev
```

With PostgreSQL running, log in as an admin or analyst, ensure an active Domain watchlist for example.com, select Controlled Crawler and that asset, and run a scan. A fresh database should yield 3 scanned pages and 1 finding. Repeating it should yield 0 new findings and 1 skipped duplicate. Existing matching findings can make the first run a duplicate too. Elasticsearch indexing depends on the configured live service.
