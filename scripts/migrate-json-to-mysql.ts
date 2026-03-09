import { QuickDB } from 'dreamvast.quick.db';
// @ts-ignore
import { MySQLDriver } from 'dreamvast.quick.db/MySQLDriver';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const mysqlConfig = {
  host: 'db-dtx-03.apollopanel.com',
  user: 'u212344_7gTqhiVch4',
  password: 'lvlArAo+39TNw.SLQvyZU@kV',
  database: 's212344_premium',
  port: 3306
};

const jsonPath = path.resolve(__dirname, '../cylane.database.json');

async function migrate() {
  console.log('Starting migration...');
  console.log(`Reading JSON from: ${jsonPath}`);
  
  if (!fs.existsSync(jsonPath)) {
    console.error('JSON database file not found!');
    process.exit(1);
  }

  const rawData = fs.readFileSync(jsonPath, 'utf-8');
  let jsonData;
  try {
      jsonData = JSON.parse(rawData);
  } catch (e) {
      console.error('Failed to parse JSON file:', e);
      process.exit(1);
  }

  console.log('Connecting to MySQL...');
  const driver = new MySQLDriver(mysqlConfig);
  await driver.connect();

  for (const tableName of Object.keys(jsonData)) {
    console.log(`Migrating table: ${tableName}`);
    const tableData = jsonData[tableName];
    
    // QuickDB instance for this table
    const db = new QuickDB({ driver, table: tableName });
    
    // Ensure table exists
    await driver.prepare(tableName);

    if (Array.isArray(tableData)) {
      console.log(`Found ${tableData.length} records in ${tableName}`);
      for (const record of tableData) {
        if (record.id) {
            // Using set directly
            await db.set(record.id, record.value);
        }
      }
    } else {
        console.log(`Skipping ${tableName} - not an array structure`);
    }
    console.log(`Table ${tableName} migrated.`);
  }

  console.log('Migration complete!');
  process.exit(0);
}

migrate().catch(console.error);
