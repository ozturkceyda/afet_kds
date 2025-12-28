const pool = require('../config/database');

async function checkWeatherTable() {
    try {
        console.log('🔍 Hava durumu tabloları kontrol ediliyor...\n');
        
        // Tüm hava durumu tablolarını listele
        const [tables] = await pool.query(`
            SHOW TABLES LIKE 'hava_durumu%'
        `);
        
        console.log('📋 Bulunan Tablolar:');
        tables.forEach(table => {
            console.log(`   - ${Object.values(table)[0]}`);
        });
        
        if (tables.length === 0) {
            console.log('\n❌ Hava durumu tablosu bulunamadı!');
            console.log('💡 hava_durumu_canli tablosunu oluşturmanız gerekiyor.');
        } else {
            // Tablo yapısını göster
            const tableName = Object.values(tables[0])[0];
            console.log(`\n📊 ${tableName} Tablo Yapısı:`);
            const [columns] = await pool.query(`DESCRIBE ${tableName}`);
            columns.forEach(col => {
                console.log(`   ${col.Field.padEnd(20)} | ${col.Type}`);
            });
            
            // Kayıt sayısını göster
            const [count] = await pool.query(`SELECT COUNT(*) as count FROM ${tableName}`);
            console.log(`\n📈 Toplam Kayıt: ${count[0].count}`);
        }
        
    } catch (error) {
        console.error('❌ Hata:', error.message);
    } finally {
        await pool.end();
    }
}

if (require.main === module) {
    checkWeatherTable();
}

module.exports = { checkWeatherTable };


async function checkWeatherTable() {
    try {
        console.log('🔍 Hava durumu tabloları kontrol ediliyor...\n');
        
        // Tüm hava durumu tablolarını listele
        const [tables] = await pool.query(`
            SHOW TABLES LIKE 'hava_durumu%'
        `);
        
        console.log('📋 Bulunan Tablolar:');
        tables.forEach(table => {
            console.log(`   - ${Object.values(table)[0]}`);
        });
        
        if (tables.length === 0) {
            console.log('\n❌ Hava durumu tablosu bulunamadı!');
            console.log('💡 hava_durumu_canli tablosunu oluşturmanız gerekiyor.');
        } else {
            // Tablo yapısını göster
            const tableName = Object.values(tables[0])[0];
            console.log(`\n📊 ${tableName} Tablo Yapısı:`);
            const [columns] = await pool.query(`DESCRIBE ${tableName}`);
            columns.forEach(col => {
                console.log(`   ${col.Field.padEnd(20)} | ${col.Type}`);
            });
            
            // Kayıt sayısını göster
            const [count] = await pool.query(`SELECT COUNT(*) as count FROM ${tableName}`);
            console.log(`\n📈 Toplam Kayıt: ${count[0].count}`);
        }
        
    } catch (error) {
        console.error('❌ Hata:', error.message);
    } finally {
        await pool.end();
    }
}

if (require.main === module) {
    checkWeatherTable();
}

module.exports = { checkWeatherTable };











