import json
from pathlib import Path
import re
import unittest


ROOT = Path(__file__).resolve().parents[2]


class SqlDeliveryTest(unittest.TestCase):
    def setUp(self):
        self.sql = (ROOT / 'init.sql').read_text(encoding='utf-8')

    def test_installer_contains_every_runtime_table(self):
        runtime = (ROOT / 'website/src/main/resources/schema.sql').read_text(encoding='utf-8')
        runtime_tables = set(re.findall(r'CREATE TABLE IF NOT EXISTS `?(\w+)', runtime))
        installer_tables = set(re.findall(r'CREATE TABLE IF NOT EXISTS `?(\w+)', self.sql))
        self.assertEqual(installer_tables, runtime_tables)
        self.assertTrue((ROOT / 'database/create-database.sql').is_file())

    def test_seed_import_is_guarded_and_has_no_account_or_customer_data(self):
        self.assertIn('@xgsz_initialize', self.sql)
        self.assertIn('initial-content-v1', self.sql)
        self.assertIn('cms-catalog-v1', self.sql)
        self.assertNotRegex(self.sql, r'(?i)\b(?:DROP|TRUNCATE|DELETE)\b')
        self.assertNotRegex(self.sql, r'(?i)INSERT INTO\s+`?(?:Admins|site_admin|User|Orders|site_inquiry|user_location)`?\s*\(')
        inserts = re.findall(r'INSERT INTO.*?;', self.sql, flags=re.S)
        self.assertTrue(inserts)
        self.assertTrue(all('WHERE @xgsz_initialize' in statement for statement in inserts))

    def test_json_payloads_include_pages_products_services_and_company_contacts(self):
        documents = [json.loads(bytes.fromhex(encoded).decode('utf-8')) for encoded in re.findall(r"CONVERT\(X'([0-9a-f]+)' USING utf8mb4\)", self.sql)]
        self.assertTrue(any(document.get('name') == 'GPU 服务器整机' for document in documents))
        self.assertTrue(any(document.get('name') == '模型推理优化' for document in documents))
        self.assertEqual(sum('heroTitle' in document for document in documents), 6)
        self.assertNotIn("'mini'", self.sql)
        self.assertTrue(any(document.get('name') == '芯光智数' for document in documents))
        self.assertFalse(any('芯光数智' in json.dumps(document, ensure_ascii=False) for document in documents))
        settings = next(document for document in documents if 'wecomQr' in document)
        self.assertEqual(settings['phone'], '18458055296')
        self.assertEqual(settings['email'], '')
        self.assertEqual(settings['wecomQr'], '')

    def test_company_name_upgrade_is_available_for_existing_databases(self):
        upgrade = (ROOT / 'database/upgrades/20261110-brand-name.sql').read_text(encoding='utf-8')
        self.assertIn('company-name-20261110', upgrade)
        self.assertIn('芯光数智', upgrade)
        self.assertIn('芯光智数', upgrade)
        self.assertIn('UPDATE site_page', upgrade)
        self.assertNotRegex(upgrade, r'(?i)\b(?:DROP|TRUNCATE|DELETE)\b')


if __name__ == '__main__':
    unittest.main()
