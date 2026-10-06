import functools
import threading
import unittest
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from unittest.mock import patch

from fastapi import FastAPI
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import Session
from sqlalchemy.pool import StaticPool

from backend.database import Base, get_db
from backend.models.models import Alert, AuditLog, Finding, User, Watchlist
from backend.routes import scan, findings
from backend.routes.auth import get_current_user
from backend.services import crawler_service


class QuietHandler(SimpleHTTPRequestHandler):
    def log_message(self, *args):
        pass


class ScanIntegrationTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        directory = Path(__file__).resolve().parents[1] / 'sample-data/mock_darkweb_site'
        cls.server = ThreadingHTTPServer(
            ('127.0.0.1', 0), functools.partial(QuietHandler, directory=str(directory))
        )
        cls.thread = threading.Thread(target=cls.server.serve_forever, daemon=True)
        cls.thread.start()
        cls.port = cls.server.server_port

    @classmethod
    def tearDownClass(cls):
        cls.server.shutdown()
        cls.server.server_close()
        cls.thread.join()

    def setUp(self):
        self.engine = create_engine(
            'sqlite://', poolclass=StaticPool, connect_args={'check_same_thread': False}
        )
        Base.metadata.create_all(self.engine)
        self.db = Session(self.engine)
        self.user = User(username='test', email='test@example.com', password_hash='unused', role='analyst')
        self.db.add(self.user)
        self.db.add_all([
            Watchlist(asset_type='Domain', asset_value='example.com', status='Active'),
            Watchlist(asset_type='Email', asset_value='admin@example.com', status='Active'),
        ])
        self.db.commit()
        app = FastAPI()
        app.include_router(scan.router)
        app.include_router(findings.router)
        app.dependency_overrides[get_db] = lambda: self.db
        app.dependency_overrides[get_current_user] = lambda: self.user
        self.client = TestClient(app)
        self.es = patch.object(scan, 'elasticsearch_available', return_value=False)
        self.es.start()

    def tearDown(self):
        self.es.stop()
        self.client.close()
        self.db.close()
        self.engine.dispose()

    def crawl(self, _url):
        with patch.object(crawler_service, 'ALLOWED_PORTS', {self.port}):
            return crawler_service.crawl_controlled_source(
                f'http://127.0.0.1:{self.port}/index.html'
            )

    def test_controlled_crawl_selected_asset_and_repeat(self):
        records = self.crawl(None)
        self.assertEqual(len(records), 3)
        for record in records:
            self.assertEqual(record['content_hash'], crawler_service.calculate_content_hash(record['content']))
            self.assertTrue(record['collected_at'])
        with patch.object(scan, 'crawl_controlled_source', side_effect=self.crawl):
            response = self.client.post('/scan/?scan_source=controlled&watchlist_id=1')
            self.assertEqual(response.status_code, 200, response.text)
            data = response.json()
            self.assertEqual(data['scan_type'], 'Controlled Crawler')
            self.assertEqual(data['total_records_scanned'], 3)
            self.assertEqual(data['assets_scanned'], 1)
            self.assertEqual(data['total_findings'], 1)
            second = self.client.post('/scan/?scan_source=controlled&watchlist_id=1').json()
        self.assertEqual(second['total_findings'], 0)
        self.assertEqual(second['duplicates_skipped'], 1)
        self.assertEqual(self.db.query(Finding).count(), 1)
        self.assertEqual(self.db.query(Alert).count(), 1)
        self.assertEqual(self.db.query(AuditLog).count(), 2)

    def test_synthetic_default_and_all_assets(self):
        response = self.client.post('/scan/')
        self.assertEqual(response.status_code, 200, response.text)
        self.assertEqual(response.json()['scan_source'], 'synthetic')
        self.assertEqual(response.json()['assets_scanned'], 2)
        self.assertGreater(response.json()['total_findings'], 0)

    def test_unavailable_source_creates_no_records(self):
        with patch.object(scan, 'crawl_controlled_source', return_value=[]):
            response = self.client.post('/scan/?scan_source=controlled')
        self.assertEqual(response.status_code, 503)
        self.assertEqual(self.db.query(Finding).count(), 0)
        self.assertEqual(self.db.query(AuditLog).count(), 0)

    def test_invalid_source_and_missing_watchlist(self):
        self.assertEqual(self.client.post('/scan/?scan_source=invalid').status_code, 422)
        self.assertEqual(self.client.post('/scan/?watchlist_id=999').status_code, 404)

    def test_viewer_cannot_scan(self):
        self.user.role = 'viewer'
        self.assertEqual(self.client.post('/scan/').status_code, 403)

    def test_provenance_survives_repeat_and_detects_changed_text(self):
        records = self.crawl(None)
        with patch.object(scan, 'crawl_controlled_source', return_value=records):
            self.client.post('/scan/?scan_source=controlled&watchlist_id=1')
        finding = self.db.query(Finding).one()
        original_hash = finding.content_hash
        original_time = finding.collected_at
        expected = next(record for record in records if 'example.com' in record['content'])
        self.assertEqual(original_hash, expected['content_hash'])
        self.assertEqual(original_time.isoformat(), expected['collected_at'].replace('+00:00', ''))
        for record in records:
            record['content'] += ' Changed page content.'
            record['collected_at'] = '2030-01-01T00:00:00+00:00'
        with patch.object(scan, 'crawl_controlled_source', return_value=records):
            self.client.post('/scan/?scan_source=controlled&watchlist_id=1')
        self.db.refresh(finding)
        self.assertEqual(finding.content_hash, original_hash)
        self.assertEqual(finding.collected_at, original_time)
        url = f'/findings/{finding.finding_id}/detail'
        self.assertEqual(self.client.get(url).json()['finding']['content_integrity'], 'verified')
        finding.content = 'Modified stored content'
        self.db.commit()
        self.assertEqual(self.client.get(url).json()['finding']['content_integrity'], 'mismatch')

    def test_legacy_finding_has_no_invented_provenance(self):
        self.client.post('/scan/?watchlist_id=1')
        finding = self.db.query(Finding).first()
        finding.content_hash = None
        finding.collected_at = None
        self.db.commit()
        data = self.client.get(f'/findings/{finding.finding_id}/detail').json()['finding']
        self.assertIsNone(data['content_hash'])
        self.assertIsNone(data['collected_at'])
        self.assertEqual(data['content_integrity'], 'unavailable')


if __name__ == '__main__':
    unittest.main()
