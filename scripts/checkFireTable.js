const pool = require('../config/database');

async function checkFireTable() {
    try {
        console.log('🔥 Orman Yangınları Tablosu Kontrol Ediliyor...\n');
        
        // Tablo var mı kontrol et
        const [tables] = await pool.query("SHOW TABLES LIKE 'orman_yanginlari'");
        if (tables.length === 0) {
            console.log('❌ orman_yanginlari tablosu bulunamadı!');
            await pool.end();
            return;
        }
        
        console.log('✅ orman_yanginlari tablosu bulundu!\n');
        
        // Tablo yapısını göster
        const [columns] = await pool.query('DESCRIBE orman_yanginlari');
        console.log('📋 Tablo Yapısı:');
        columns.forEach(col => {
            console.log(`   - ${col.Field} (${col.Type})`);
        });
        console.log();
        
        // Veri sayısı
        const [count] = await pool.query('SELECT COUNT(*) as toplam FROM orman_yanginlari');
        console.log(`📊 Toplam Kayıt: ${count[0].toplam}\n`);
        
        if (count[0].toplam > 0) {
            // Örnek veriler
            const [samples] = await pool.query('SELECT * FROM orman_yanginlari LIMIT 3');
            console.log('📝 Örnek Veriler:');
            samples.forEach((row, idx) => {
                console.log(`\n   Kayıt ${idx + 1}:`);
                console.log(`     İl ID: ${row.il_id}`);
                console.log(`     Başlangıç Tarihi: ${row.yangin_baslangic_tarihi}`);
                if (row.etkilenen_alan) console.log(`     Etkilenen Alan: ${row.etkilenen_alan} ha`);
                if (row.yangin_seviyesi) console.log(`     Yangın Seviyesi: ${row.yangin_seviyesi}`);
            });
            console.log();
            
            // İl bazında yangın sayıları
            const [ilStats] = await pool.query(`
                SELECT i.il_adi, COUNT(*) as yangin_sayisi 
                FROM orman_yanginlari oy
                JOIN iller i ON oy.il_id = i.id
                WHERE i.bolge = 'Marmara'
                GROUP BY i.id, i.il_adi
                ORDER BY yangin_sayisi DESC
            `);
            
            if (ilStats.length > 0) {
                console.log('🏛️  Marmara Bölgesi - İl Bazında Yangın Sayıları:');
                ilStats.forEach(stat => {
                    console.log(`     ${stat.il_adi}: ${stat.yangin_sayisi} yangın`);
                });
            }
        }
        
        await pool.end();
    } catch (error) {
        console.error('❌ Hata:', error.message);
        process.exit(1);
    }
}

checkFireTable();

