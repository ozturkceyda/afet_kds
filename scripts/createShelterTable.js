/**
 * Barınma Merkezleri Tablosu Oluşturma Scripti
 */

const mysql = require('mysql2/promise');
require('dotenv').config();

const db = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 3306,
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'kds_afet_yönetimi'
});

async function createTable() {
  try {
    console.log('📊 Barınma merkezleri tablosu oluşturuluyor...\n');
    
    await db.query(`
      CREATE TABLE IF NOT EXISTS \`barinma_merkezleri\` (
        \`id\` int(11) NOT NULL AUTO_INCREMENT,
        \`il_id\` int(11) NOT NULL,
        \`ilce_id\` int(11) DEFAULT NULL,
        \`merkez_tipi\` enum('cadirkent','prefabrik_yapi','gecici_iskan_merkezi') NOT NULL,
        \`kapasite\` int(11) NOT NULL DEFAULT 0,
        \`dolu_kapasite\` int(11) DEFAULT 0,
        \`durum\` enum('aktif','pasif','bakim') DEFAULT 'aktif',
        \`adres\` text DEFAULT NULL,
        \`enlem\` decimal(10,7) DEFAULT NULL,
        \`boylam\` decimal(10,7) DEFAULT NULL,
        \`guncelleme_tarihi\` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        PRIMARY KEY (\`id\`),
        KEY \`idx_il_id\` (\`il_id\`),
        KEY \`idx_ilce_id\` (\`ilce_id\`),
        KEY \`idx_merkez_tipi\` (\`merkez_tipi\`),
        CONSTRAINT \`fk_barinma_merkezleri_iller\` FOREIGN KEY (\`il_id\`) REFERENCES \`iller\` (\`id\`) ON DELETE CASCADE ON UPDATE CASCADE,
        CONSTRAINT \`fk_barinma_merkezleri_ilceler\` FOREIGN KEY (\`ilce_id\`) REFERENCES \`ilceler\` (\`id\`) ON DELETE SET NULL ON UPDATE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
    
    console.log('✅ Barınma merkezleri tablosu oluşturuldu!');
    
    await db.end();
  } catch (error) {
    console.error('❌ Hata:', error.message);
    process.exit(1);
  }
}

if (require.main === module) {
  createTable();
}

module.exports = { createTable };

