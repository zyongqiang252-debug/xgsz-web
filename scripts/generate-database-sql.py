import argparse
import json
from pathlib import Path
import re


ROOT = Path(__file__).resolve().parents[1]
RESOURCES = ROOT / 'website/src/main/resources'


def literal(value):
    if value is None:
        return 'NULL'
    if isinstance(value, bool):
        return '1' if value else '0'
    if isinstance(value, int):
        return str(value)
    if isinstance(value, (dict, list)):
        encoded = json.dumps(value, ensure_ascii=False, separators=(',', ':')).encode('utf-8').hex()
        return f"CONVERT(X'{encoded}' USING utf8mb4)"
    if any(character in str(value) for character in ('\\', '\n', '\r')):
        return f"CONVERT(X'{str(value).encode('utf-8').hex()}' USING utf8mb4)"
    return "'" + str(value).replace("'", "''") + "'"


def generate():
    schema = (RESOURCES / 'schema.sql').read_text(encoding='utf-8')
    tables = re.findall(r'CREATE TABLE IF NOT EXISTS `?(\w+)', schema)
    schema = schema.replace(');', ') ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;')
    content = json.loads((RESOURCES / 'seed-content.json').read_text(encoding='utf-8'))
    cms = json.loads((RESOURCES / 'seed-cms.json').read_text(encoding='utf-8'))
    statements = ['SET NAMES utf8mb4 COLLATE utf8mb4_unicode_ci;', schema.rstrip(), 'START TRANSACTION;']
    guard = ' AND\n '.join(f'NOT EXISTS (SELECT 1 FROM `{table}`)' for table in tables)
    statements.append(f'SET @xgsz_initialize =\n {guard};')

    def insert(table, values):
        columns = ', '.join(f'`{column}`' for column in values)
        selected = ', '.join(literal(value) for value in values.values())
        statements.append(f'INSERT INTO `{table}` ({columns})\n SELECT {selected} WHERE @xgsz_initialize;')

    categories = {}
    for record_id, category in enumerate(cms['catalog']['categories'], start=1):
        categories[category['key']] = record_id
        insert('ProductCategories', {'id': record_id, 'name': category['name'], 'description': category['description'], 'isEnabled': category['enabled']})
        insert('site_catalog_meta', {'kind': 'categories', 'record_id': record_id, 'payload': {'key': category['key']}, 'version': 1})

    for record_id, business in enumerate(cms['catalog']['businesses'], start=1):
        insert('Businesses', {'id': record_id, **business})
        insert('site_catalog_meta', {'kind': 'businesses', 'record_id': record_id, 'payload': {}, 'version': 1})

    for kind in ('products', 'services'):
        for record_id, original in enumerate(content[kind], start=1):
            payload = {key: value for key, value in original.items() if key != 'id'}
            payload['published'] = True
            if kind == 'products':
                insert('Products', {'id': record_id, 'name': original['name'], 'description': original['desc'], 'categoryId': categories[original['category']], 'coverImage': '', 'detailImages': '[]', 'brand': '', 'isAvailable': True})
            insert('site_content', {'id': original['id'], 'kind': kind, 'product_id': record_id if kind == 'products' else None, 'payload': payload, 'version': 1})

    settings = {key: content.get('settings', {}).get(key, '') for key in ('phone', 'email', 'address', 'wecomName', 'wecomUrl', 'wecomQr')}
    insert('site_content', {'id': 'site-settings', 'kind': 'settings', 'payload': settings, 'version': 1})
    insert('BasicInformation', {'id': 1, 'phone': settings['phone'], 'email': settings['email'], 'address': settings['address'], 'weChatImage': '', 'icp': '', 'publicSecurity': '', 'copyright': '', 'isEnable': True})
    insert('site_catalog_meta', {'kind': 'basicInformation', 'record_id': 1, 'payload': {}, 'version': 1})

    for page_id, page in cms['pages'].items():
        insert('site_page', {'id': page_id, 'payload': page, 'version': 1})
    for marker in ('cms-admin-migrated-v1', 'cms-catalog-v1', 'initial-content-v1', 'company-offerings-20261109', 'company-name-20261110'):
        insert('site_metadata', {'name': marker, 'content_value': 'complete'})
    statements.append('COMMIT;')
    return '\n\n'.join(statements) + '\n'


def generate_upgrade():
    cms = json.loads((RESOURCES / 'seed-cms.json').read_text(encoding='utf-8'))['pages']
    content = json.loads((RESOURCES / 'seed-content.json').read_text(encoding='utf-8'))
    phone = literal(content['settings']['phone'])
    capabilities = literal(cms['home']['capabilities'])
    note = literal(cms['home']['heroNote'])
    footer = literal(cms['global']['footerNote'])
    statements = ['SET NAMES utf8mb4 COLLATE utf8mb4_unicode_ci;', 'START TRANSACTION;', "SET @xgsz_upgrade = NOT EXISTS (SELECT 1 FROM site_metadata WHERE name='company-offerings-20261109');"]
    statements.append(f"UPDATE site_page SET payload=JSON_SET(payload, '$.capabilities', CAST({capabilities} AS JSON), '$.heroNote', {note}),version=version+1 WHERE id='home' AND @xgsz_upgrade;")
    statements.append(f"UPDATE site_page SET payload=JSON_SET(payload, '$.footerNote', {footer}),version=version+1 WHERE id='global' AND @xgsz_upgrade;")
    for page_id in ('products', 'about'):
        defaults = literal(cms[page_id])
        statements.append(f"UPDATE site_page SET payload=JSON_MERGE_PATCH(CAST({defaults} AS JSON),payload),version=version+1 WHERE id='{page_id}' AND @xgsz_upgrade;")
    settings = literal(content['settings'])
    statements.append(f"INSERT INTO site_content(id,kind,payload,version) SELECT 'site-settings','settings',{settings},1 WHERE @xgsz_upgrade AND NOT EXISTS (SELECT 1 FROM site_content WHERE id='site-settings');")
    statements.append(f"UPDATE site_content SET payload=JSON_SET(payload,'$.phone',{phone}),version=version+1,updated_at=CURRENT_TIMESTAMP(6) WHERE id='site-settings' AND @xgsz_upgrade;")
    statements.append(f"UPDATE BasicInformation SET phone={phone} WHERE isDeleted=0 AND id=(SELECT identifier FROM (SELECT MIN(id) AS identifier FROM BasicInformation WHERE isDeleted=0) AS selected) AND @xgsz_upgrade;")
    statements.append("UPDATE site_catalog_meta SET version=version+1 WHERE kind='basicInformation' AND record_id=(SELECT MIN(id) FROM BasicInformation WHERE isDeleted=0) AND @xgsz_upgrade;")
    statements.append("INSERT INTO site_metadata(name,content_value) SELECT 'company-offerings-20261109','complete' WHERE @xgsz_upgrade;")
    statements.append('COMMIT;')
    return '\n\n'.join(statements) + '\n'


def generate_milestones_upgrade():
    about = json.loads((RESOURCES / 'seed-cms.json').read_text(encoding='utf-8'))['pages']['about']
    meta = literal({key: about[key] for key in ('milestonesTitle', 'milestonesDesc')})
    milestones = literal(about['milestones'])
    statements = [
        'SET NAMES utf8mb4 COLLATE utf8mb4_unicode_ci;',
        'START TRANSACTION;',
        "SET @xgsz_about_milestones = NOT EXISTS (SELECT 1 FROM site_metadata WHERE name='about-milestones-20261110');",
        f"UPDATE site_page SET payload=JSON_SET(JSON_MERGE_PATCH(CAST({meta} AS JSON),payload),'$.milestones',CAST({milestones} AS JSON)),version=version+1 WHERE id='about' AND @xgsz_about_milestones AND (JSON_EXTRACT(payload,'$.milestones') IS NULL OR JSON_LENGTH(JSON_EXTRACT(payload,'$.milestones'))=0);",
        "INSERT INTO site_metadata(name,content_value) SELECT 'about-milestones-20261110','complete' WHERE @xgsz_about_milestones;",
        'COMMIT;'
    ]
    return '\n\n'.join(statements) + '\n'


def generate_brand_upgrade():
    cms = json.loads((RESOURCES / 'seed-cms.json').read_text(encoding='utf-8'))['pages']
    old_name = literal('芯光数智')
    new_name = literal(cms['global']['name'])
    statements = [
        'SET NAMES utf8mb4 COLLATE utf8mb4_unicode_ci;',
        'START TRANSACTION;',
        "SET @xgsz_brand_rename = NOT EXISTS (SELECT 1 FROM site_metadata WHERE name='company-name-20261110');",
        f'SET @xgsz_old_name = {old_name};',
        f'SET @xgsz_new_name = {new_name};',
        "UPDATE site_page SET payload=REPLACE(payload,@xgsz_old_name,@xgsz_new_name),version=version+1 WHERE @xgsz_brand_rename AND payload LIKE CONCAT('%',@xgsz_old_name,'%');",
        "UPDATE site_content SET payload=REPLACE(payload,@xgsz_old_name,@xgsz_new_name),version=version+1,updated_at=CURRENT_TIMESTAMP(6) WHERE @xgsz_brand_rename AND payload LIKE CONCAT('%',@xgsz_old_name,'%');",
        "UPDATE site_catalog_meta SET payload=REPLACE(payload,@xgsz_old_name,@xgsz_new_name),version=version+1 WHERE @xgsz_brand_rename AND payload LIKE CONCAT('%',@xgsz_old_name,'%');",
        "UPDATE Products SET name=REPLACE(name,@xgsz_old_name,@xgsz_new_name),description=REPLACE(description,@xgsz_old_name,@xgsz_new_name),brand=REPLACE(brand,@xgsz_old_name,@xgsz_new_name),updateTime=CURRENT_TIMESTAMP WHERE @xgsz_brand_rename AND (name LIKE CONCAT('%',@xgsz_old_name,'%') OR description LIKE CONCAT('%',@xgsz_old_name,'%') OR brand LIKE CONCAT('%',@xgsz_old_name,'%'));",
        "UPDATE ProductCategories SET name=REPLACE(name,@xgsz_old_name,@xgsz_new_name),description=REPLACE(description,@xgsz_old_name,@xgsz_new_name),updateTime=CURRENT_TIMESTAMP WHERE @xgsz_brand_rename AND (name LIKE CONCAT('%',@xgsz_old_name,'%') OR description LIKE CONCAT('%',@xgsz_old_name,'%'));",
        "UPDATE Brands SET name=REPLACE(name,@xgsz_old_name,@xgsz_new_name),description=REPLACE(description,@xgsz_old_name,@xgsz_new_name),updateTime=CURRENT_TIMESTAMP WHERE @xgsz_brand_rename AND (name LIKE CONCAT('%',@xgsz_old_name,'%') OR description LIKE CONCAT('%',@xgsz_old_name,'%'));",
        "UPDATE BrandAuthorizationCertificates SET name=REPLACE(name,@xgsz_old_name,@xgsz_new_name),description=REPLACE(description,@xgsz_old_name,@xgsz_new_name),updateTime=CURRENT_TIMESTAMP WHERE @xgsz_brand_rename AND (name LIKE CONCAT('%',@xgsz_old_name,'%') OR description LIKE CONCAT('%',@xgsz_old_name,'%'));",
        "UPDATE Carousels SET title=REPLACE(title,@xgsz_old_name,@xgsz_new_name),updateTime=CURRENT_TIMESTAMP WHERE @xgsz_brand_rename AND title LIKE CONCAT('%',@xgsz_old_name,'%');",
        "UPDATE About SET description=REPLACE(description,@xgsz_old_name,@xgsz_new_name),updateTime=CURRENT_TIMESTAMP WHERE @xgsz_brand_rename AND description LIKE CONCAT('%',@xgsz_old_name,'%');",
        "UPDATE Businesses SET name=REPLACE(name,@xgsz_old_name,@xgsz_new_name),description=REPLACE(description,@xgsz_old_name,@xgsz_new_name),contactInfo=REPLACE(contactInfo,@xgsz_old_name,@xgsz_new_name),updateTime=CURRENT_TIMESTAMP WHERE @xgsz_brand_rename AND (name LIKE CONCAT('%',@xgsz_old_name,'%') OR description LIKE CONCAT('%',@xgsz_old_name,'%') OR contactInfo LIKE CONCAT('%',@xgsz_old_name,'%'));",
        "UPDATE BasicInformation SET homeTitle=REPLACE(homeTitle,@xgsz_old_name,@xgsz_new_name),homeDescription=REPLACE(homeDescription,@xgsz_old_name,@xgsz_new_name),copyright=REPLACE(copyright,@xgsz_old_name,@xgsz_new_name) WHERE @xgsz_brand_rename AND (homeTitle LIKE CONCAT('%',@xgsz_old_name,'%') OR homeDescription LIKE CONCAT('%',@xgsz_old_name,'%') OR copyright LIKE CONCAT('%',@xgsz_old_name,'%'));",
        "INSERT INTO site_metadata(name,content_value) SELECT 'company-name-20261110','complete' WHERE @xgsz_brand_rename;",
        'COMMIT;'
    ]
    return '\n\n'.join(statements) + '\n'


def main():
    parser = argparse.ArgumentParser(description='Generate the MySQL installer from the runtime schema and public seed content.')
    parser.add_argument('--check', action='store_true', help='Fail if init.sql does not match its source files.')
    arguments = parser.parse_args()
    outputs = {
        ROOT / 'init.sql': generate(),
        ROOT / 'database/upgrades/20261109-business-directory.sql': generate_upgrade(),
        ROOT / 'database/upgrades/20261110-about-milestones.sql': generate_milestones_upgrade(),
        ROOT / 'database/upgrades/20261110-brand-name.sql': generate_brand_upgrade()
    }
    for destination, generated in outputs.items():
        if arguments.check:
            if not destination.exists() or destination.read_text(encoding='utf-8') != generated:
                parser.exit(1, f'{destination.name} is stale; run python scripts/generate-database-sql.py\n')
        else:
            destination.parent.mkdir(parents=True, exist_ok=True)
            destination.write_text(generated, encoding='utf-8', newline='\n')
    print('PASS: SQL files match the runtime schema and initial content.' if arguments.check else 'Generated installation and upgrade SQL.')


if __name__ == '__main__':
    main()
