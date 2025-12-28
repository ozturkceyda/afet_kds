const pool = require('../config/database');

async function updateUsersTable() {
    console.log('🔧 kullanicilar tablosu güncelleniyor...\n');
    
    try {
        // Önce tabloyu kontrol et
        const [tables] = await pool.query(`
            SELECT TABLE_NAME 
            FROM information_schema.TABLES 
            WHERE TABLE_SCHEMA = DATABASE() 
            AND TABLE_NAME = 'kullanicilar'
        `);
        
        if (tables.length === 0) {
            console.log('❌ kullanicilar tablosu bulunamadı!');
            console.log('💡 Tabloyu oluşturuyorum...\n');
            
            // Tabloyu oluştur
            await pool.query(`
                CREATE TABLE IF NOT EXISTS \`kullanicilar\` (
                  \`id\` int(11) NOT NULL AUTO_INCREMENT,
                  \`kullanici_adi\` varchar(100) NOT NULL UNIQUE,
                  \`email\` varchar(255) NOT NULL UNIQUE,
                  \`sifre\` varchar(255) NOT NULL,
                  \`ad_soyad\` varchar(200) DEFAULT NULL,
                  \`rol\` enum('admin','kullanici') DEFAULT 'kullanici',
                  \`aktif\` tinyint(1) DEFAULT 1,
                  \`olusturma_tarihi\` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
                  \`son_giris_tarihi\` timestamp NULL DEFAULT NULL,
                  PRIMARY KEY (\`id\`),
                  KEY \`idx_kullanici_adi\` (\`kullanici_adi\`),
                  KEY \`idx_email\` (\`email\`)
                ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
            `);
            console.log('✅ kullanicilar tablosu oluşturuldu!\n');
        } else {
            console.log('✅ kullanicilar tablosu mevcut.\n');
            
            // Sütunları kontrol et ve eksik olanları ekle
            const [columns] = await pool.query(`
                SELECT COLUMN_NAME 
                FROM information_schema.COLUMNS 
                WHERE TABLE_SCHEMA = DATABASE() 
                AND TABLE_NAME = 'kullanicilar'
            `);
            
            const columnNames = columns.map(c => c.COLUMN_NAME);
            
            // aktif sütunu yoksa ekle
            if (!columnNames.includes('aktif')) {
                console.log('➕ aktif sütunu ekleniyor...');
                await pool.query(`
                    ALTER TABLE \`kullanicilar\` 
                    ADD COLUMN \`aktif\` tinyint(1) DEFAULT 1 AFTER \`rol\`
                `);
                console.log('✅ aktif sütunu eklendi!\n');
            }
            
            // olusturma_tarihi sütunu yoksa ekle
            if (!columnNames.includes('olusturma_tarihi')) {
                console.log('➕ olusturma_tarihi sütunu ekleniyor...');
                await pool.query(`
                    ALTER TABLE \`kullanicilar\` 
                    ADD COLUMN \`olusturma_tarihi\` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP
                `);
                console.log('✅ olusturma_tarihi sütunu eklendi!\n');
            }
            
            // son_giris_tarihi sütunu yoksa ekle
            if (!columnNames.includes('son_giris_tarihi')) {
                console.log('➕ son_giris_tarihi sütunu ekleniyor...');
                await pool.query(`
                    ALTER TABLE \`kullanicilar\` 
                    ADD COLUMN \`son_giris_tarihi\` timestamp NULL DEFAULT NULL
                `);
                console.log('✅ son_giris_tarihi sütunu eklendi!\n');
            }
            
            // Mevcut kullanıcıların aktif değerini 1 yap
            await pool.query(`
                UPDATE \`kullanicilar\` 
                SET \`aktif\` = 1 
                WHERE \`aktif\` IS NULL
            `);
        }
        
        // Tablo yapısını göster
        const [tableInfo] = await pool.query('DESCRIBE kullanicilar');
        console.log('📋 Tablo Yapısı:');
        console.log('═══════════════════════════════════════════════════════════════');
        tableInfo.forEach(col => {
            console.log(`   ${col.Field.padEnd(20)} | ${col.Type.padEnd(20)} | ${col.Null} | ${col.Key} | ${col.Default || 'NULL'}`);
        });
        console.log('═══════════════════════════════════════════════════════════════\n');
        
        console.log('✅ Tablo güncellemesi tamamlandı!\n');
        
    } catch (error) {
        console.error('❌ Tablo güncellenirken hata:', error.message);
        throw error;
    } finally {
        await pool.end();
    }
}

if (require.main === module) {
    updateUsersTable();
}

module.exports = { updateUsersTable };


async function updateUsersTable() {
    console.log('🔧 kullanicilar tablosu güncelleniyor...\n');
    
    try {
        // Önce tabloyu kontrol et
        const [tables] = await pool.query(`
            SELECT TABLE_NAME 
            FROM information_schema.TABLES 
            WHERE TABLE_SCHEMA = DATABASE() 
            AND TABLE_NAME = 'kullanicilar'
        `);
        
        if (tables.length === 0) {
            console.log('❌ kullanicilar tablosu bulunamadı!');
            console.log('💡 Tabloyu oluşturuyorum...\n');
            
            // Tabloyu oluştur
            await pool.query(`
                CREATE TABLE IF NOT EXISTS \`kullanicilar\` (
                  \`id\` int(11) NOT NULL AUTO_INCREMENT,
                  \`kullanici_adi\` varchar(100) NOT NULL UNIQUE,
                  \`email\` varchar(255) NOT NULL UNIQUE,
                  \`sifre\` varchar(255) NOT NULL,
                  \`ad_soyad\` varchar(200) DEFAULT NULL,
                  \`rol\` enum('admin','kullanici') DEFAULT 'kullanici',
                  \`aktif\` tinyint(1) DEFAULT 1,
                  \`olusturma_tarihi\` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
                  \`son_giris_tarihi\` timestamp NULL DEFAULT NULL,
                  PRIMARY KEY (\`id\`),
                  KEY \`idx_kullanici_adi\` (\`kullanici_adi\`),
                  KEY \`idx_email\` (\`email\`)
                ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
            `);
            console.log('✅ kullanicilar tablosu oluşturuldu!\n');
        } else {
            console.log('✅ kullanicilar tablosu mevcut.\n');
            
            // Sütunları kontrol et ve eksik olanları ekle
            const [columns] = await pool.query(`
                SELECT COLUMN_NAME 
                FROM information_schema.COLUMNS 
                WHERE TABLE_SCHEMA = DATABASE() 
                AND TABLE_NAME = 'kullanicilar'
            `);
            
            const columnNames = columns.map(c => c.COLUMN_NAME);
            
            // aktif sütunu yoksa ekle
            if (!columnNames.includes('aktif')) {
                console.log('➕ aktif sütunu ekleniyor...');
                await pool.query(`
                    ALTER TABLE \`kullanicilar\` 
                    ADD COLUMN \`aktif\` tinyint(1) DEFAULT 1 AFTER \`rol\`
                `);
                console.log('✅ aktif sütunu eklendi!\n');
            }
            
            // olusturma_tarihi sütunu yoksa ekle
            if (!columnNames.includes('olusturma_tarihi')) {
                console.log('➕ olusturma_tarihi sütunu ekleniyor...');
                await pool.query(`
                    ALTER TABLE \`kullanicilar\` 
                    ADD COLUMN \`olusturma_tarihi\` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP
                `);
                console.log('✅ olusturma_tarihi sütunu eklendi!\n');
            }
            
            // son_giris_tarihi sütunu yoksa ekle
            if (!columnNames.includes('son_giris_tarihi')) {
                console.log('➕ son_giris_tarihi sütunu ekleniyor...');
                await pool.query(`
                    ALTER TABLE \`kullanicilar\` 
                    ADD COLUMN \`son_giris_tarihi\` timestamp NULL DEFAULT NULL
                `);
                console.log('✅ son_giris_tarihi sütunu eklendi!\n');
            }
            
            // Mevcut kullanıcıların aktif değerini 1 yap
            await pool.query(`
                UPDATE \`kullanicilar\` 
                SET \`aktif\` = 1 
                WHERE \`aktif\` IS NULL
            `);
        }
        
        // Tablo yapısını göster
        const [tableInfo] = await pool.query('DESCRIBE kullanicilar');
        console.log('📋 Tablo Yapısı:');
        console.log('═══════════════════════════════════════════════════════════════');
        tableInfo.forEach(col => {
            console.log(`   ${col.Field.padEnd(20)} | ${col.Type.padEnd(20)} | ${col.Null} | ${col.Key} | ${col.Default || 'NULL'}`);
        });
        console.log('═══════════════════════════════════════════════════════════════\n');
        
        console.log('✅ Tablo güncellemesi tamamlandı!\n');
        
    } catch (error) {
        console.error('❌ Tablo güncellenirken hata:', error.message);
        throw error;
    } finally {
        await pool.end();
    }
}

if (require.main === module) {
    updateUsersTable();
}

module.exports = { updateUsersTable };

