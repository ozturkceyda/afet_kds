const pool = require('../config/database');

async function createFireTable() {
    try {
        console.log('🔥 Orman Yangınları tablosu oluşturuluyor...\n');

        const createTableSQL = `
            CREATE TABLE IF NOT EXISTS \`orman_yanginlari\` (
              \`id\` int(11) NOT NULL AUTO_INCREMENT,
              \`il_id\` int(11) NOT NULL,
              \`ilce_id\` int(11) DEFAULT NULL,
              \`yangin_baslangic_tarihi\` datetime NOT NULL,
              \`yangin_bitis_tarihi\` datetime DEFAULT NULL,
              \`etkilenen_alan\` decimal(10,2) DEFAULT 0 COMMENT 'Hektar cinsinden',
              \`yangin_nedeni\` enum('insan','dogal','bilinmeyen') DEFAULT 'bilinmeyen',
              \`yangin_nedeni_detay\` varchar(255) DEFAULT NULL COMMENT 'İnsan kaynaklı ise detay (ihmal, kasıt, vb.)',
              \`yangin_seviyesi\` enum('kucuk','orta','buyuk','cok_buyuk') DEFAULT 'orta' COMMENT 'Küçük: <10ha, Orta: 10-100ha, Büyük: 100-1000ha, Çok Büyük: >1000ha',
              \`durum\` enum('aktif','kontrol_altinda','sonduruldu') DEFAULT 'aktif',
              \`enlem\` decimal(10,7) DEFAULT NULL,
              \`boylam\` decimal(10,7) DEFAULT NULL,
              \`lokasyon_adi\` varchar(255) DEFAULT NULL COMMENT 'Yangının çıktığı yer adı (mahalle, mevki, vb.)',
              \`kullanilan_ekip_sayisi\` int(11) DEFAULT 0,
              \`kullanilan_ucak_sayisi\` int(11) DEFAULT 0,
              \`kullanilan_helikopter_sayisi\` int(11) DEFAULT 0,
              \`kontrol_altina_alinma_suresi\` decimal(6,2) DEFAULT NULL COMMENT 'Saat cinsinden',
              \`hasar_bilgisi\` text DEFAULT NULL COMMENT 'Etkilenen yapılar, can kaybı, vb.',
              \`etkilenen_orman_turu\` varchar(100) DEFAULT NULL COMMENT 'Çam, meşe, vb.',
              \`kaynak\` varchar(100) DEFAULT NULL COMMENT 'Veri kaynağı (OGM, AFAD, vb.)',
              \`olusturma_tarihi\` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
              \`guncelleme_tarihi\` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
              PRIMARY KEY (\`id\`),
              KEY \`idx_il_id\` (\`il_id\`),
              KEY \`idx_ilce_id\` (\`ilce_id\`),
              KEY \`idx_yangin_baslangic_tarihi\` (\`yangin_baslangic_tarihi\`),
              KEY \`idx_yangin_bitis_tarihi\` (\`yangin_bitis_tarihi\`),
              KEY \`idx_durum\` (\`durum\`),
              KEY \`idx_yangin_seviyesi\` (\`yangin_seviyesi\`),
              KEY \`idx_etkilenen_alan\` (\`etkilenen_alan\`),
              CONSTRAINT \`fk_orman_yanginlari_iller\` FOREIGN KEY (\`il_id\`) REFERENCES \`iller\` (\`id\`) ON DELETE CASCADE ON UPDATE CASCADE,
              CONSTRAINT \`fk_orman_yanginlari_ilceler\` FOREIGN KEY (\`ilce_id\`) REFERENCES \`ilceler\` (\`id\`) ON DELETE SET NULL ON UPDATE CASCADE
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
        `;

        await pool.query(createTableSQL);
        console.log('✅ Orman yangınları tablosu başarıyla oluşturuldu!\n');

        // Tablo yapısını göster
        const [columns] = await pool.query('DESCRIBE orman_yanginlari');
        console.log('📋 Tablo Yapısı:');
        console.log('════════════════════════════════════════════════════════════════════════════════');
        console.log('Alan Adı                    | Tip              | Null | Key | Varsayılan');
        console.log('────────────────────────────────────────────────────────────────────────────────');
        columns.forEach(col => {
            const field = col.Field.padEnd(27);
            const type = col.Type.padEnd(16);
            const nullVal = col.Null.padEnd(4);
            const key = col.Key.padEnd(3);
            const defaultVal = col.Default || 'NULL';
            console.log(`${field} | ${type} | ${nullVal} | ${key} | ${defaultVal}`);
        });
        console.log('════════════════════════════════════════════════════════════════════════════════\n');

        console.log('📝 İçe Aktarma İçin CSV Formatı:');
        console.log('════════════════════════════════════════════════════════════════════════════════');
        console.log('il_id,ilce_id,yangin_baslangic_tarihi,yangin_bitis_tarihi,etkilenen_alan,yangin_nedeni,yangin_nedeni_detay,yangin_seviyesi,durum,enlem,boylam,lokasyon_adi,kullanilan_ekip_sayisi,kullanilan_ucak_sayisi,kullanilan_helikopter_sayisi,kontrol_altina_alinma_suresi,hasar_bilgisi,etkilenen_orman_turu,kaynak');
        console.log('════════════════════════════════════════════════════════════════════════════════\n');

        console.log('💡 Örnek Veri:');
        console.log('1,NULL,"2024-07-15 14:30:00","2024-07-16 18:00:00",125.50,insan,ihmal,buyuk,sonduruldu,41.0082,28.9784,"Beykoz Ormanı",150,5,3,27.5,"5 ev hasar gördü",Çam,OGM');
        console.log('\n✅ Tablo hazır! CSV dosyanızı MySQL\'e içe aktarabilirsiniz.');

    } catch (error) {
        console.error('❌ Hata:', error.message);
        throw error;
    } finally {
        await pool.end();
    }
}

if (require.main === module) {
    createFireTable();
}

module.exports = { createFireTable };


async function createFireTable() {
    try {
        console.log('🔥 Orman Yangınları tablosu oluşturuluyor...\n');

        const createTableSQL = `
            CREATE TABLE IF NOT EXISTS \`orman_yanginlari\` (
              \`id\` int(11) NOT NULL AUTO_INCREMENT,
              \`il_id\` int(11) NOT NULL,
              \`ilce_id\` int(11) DEFAULT NULL,
              \`yangin_baslangic_tarihi\` datetime NOT NULL,
              \`yangin_bitis_tarihi\` datetime DEFAULT NULL,
              \`etkilenen_alan\` decimal(10,2) DEFAULT 0 COMMENT 'Hektar cinsinden',
              \`yangin_nedeni\` enum('insan','dogal','bilinmeyen') DEFAULT 'bilinmeyen',
              \`yangin_nedeni_detay\` varchar(255) DEFAULT NULL COMMENT 'İnsan kaynaklı ise detay (ihmal, kasıt, vb.)',
              \`yangin_seviyesi\` enum('kucuk','orta','buyuk','cok_buyuk') DEFAULT 'orta' COMMENT 'Küçük: <10ha, Orta: 10-100ha, Büyük: 100-1000ha, Çok Büyük: >1000ha',
              \`durum\` enum('aktif','kontrol_altinda','sonduruldu') DEFAULT 'aktif',
              \`enlem\` decimal(10,7) DEFAULT NULL,
              \`boylam\` decimal(10,7) DEFAULT NULL,
              \`lokasyon_adi\` varchar(255) DEFAULT NULL COMMENT 'Yangının çıktığı yer adı (mahalle, mevki, vb.)',
              \`kullanilan_ekip_sayisi\` int(11) DEFAULT 0,
              \`kullanilan_ucak_sayisi\` int(11) DEFAULT 0,
              \`kullanilan_helikopter_sayisi\` int(11) DEFAULT 0,
              \`kontrol_altina_alinma_suresi\` decimal(6,2) DEFAULT NULL COMMENT 'Saat cinsinden',
              \`hasar_bilgisi\` text DEFAULT NULL COMMENT 'Etkilenen yapılar, can kaybı, vb.',
              \`etkilenen_orman_turu\` varchar(100) DEFAULT NULL COMMENT 'Çam, meşe, vb.',
              \`kaynak\` varchar(100) DEFAULT NULL COMMENT 'Veri kaynağı (OGM, AFAD, vb.)',
              \`olusturma_tarihi\` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
              \`guncelleme_tarihi\` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
              PRIMARY KEY (\`id\`),
              KEY \`idx_il_id\` (\`il_id\`),
              KEY \`idx_ilce_id\` (\`ilce_id\`),
              KEY \`idx_yangin_baslangic_tarihi\` (\`yangin_baslangic_tarihi\`),
              KEY \`idx_yangin_bitis_tarihi\` (\`yangin_bitis_tarihi\`),
              KEY \`idx_durum\` (\`durum\`),
              KEY \`idx_yangin_seviyesi\` (\`yangin_seviyesi\`),
              KEY \`idx_etkilenen_alan\` (\`etkilenen_alan\`),
              CONSTRAINT \`fk_orman_yanginlari_iller\` FOREIGN KEY (\`il_id\`) REFERENCES \`iller\` (\`id\`) ON DELETE CASCADE ON UPDATE CASCADE,
              CONSTRAINT \`fk_orman_yanginlari_ilceler\` FOREIGN KEY (\`ilce_id\`) REFERENCES \`ilceler\` (\`id\`) ON DELETE SET NULL ON UPDATE CASCADE
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
        `;

        await pool.query(createTableSQL);
        console.log('✅ Orman yangınları tablosu başarıyla oluşturuldu!\n');

        // Tablo yapısını göster
        const [columns] = await pool.query('DESCRIBE orman_yanginlari');
        console.log('📋 Tablo Yapısı:');
        console.log('════════════════════════════════════════════════════════════════════════════════');
        console.log('Alan Adı                    | Tip              | Null | Key | Varsayılan');
        console.log('────────────────────────────────────────────────────────────────────────────────');
        columns.forEach(col => {
            const field = col.Field.padEnd(27);
            const type = col.Type.padEnd(16);
            const nullVal = col.Null.padEnd(4);
            const key = col.Key.padEnd(3);
            const defaultVal = col.Default || 'NULL';
            console.log(`${field} | ${type} | ${nullVal} | ${key} | ${defaultVal}`);
        });
        console.log('════════════════════════════════════════════════════════════════════════════════\n');

        console.log('📝 İçe Aktarma İçin CSV Formatı:');
        console.log('════════════════════════════════════════════════════════════════════════════════');
        console.log('il_id,ilce_id,yangin_baslangic_tarihi,yangin_bitis_tarihi,etkilenen_alan,yangin_nedeni,yangin_nedeni_detay,yangin_seviyesi,durum,enlem,boylam,lokasyon_adi,kullanilan_ekip_sayisi,kullanilan_ucak_sayisi,kullanilan_helikopter_sayisi,kontrol_altina_alinma_suresi,hasar_bilgisi,etkilenen_orman_turu,kaynak');
        console.log('════════════════════════════════════════════════════════════════════════════════\n');

        console.log('💡 Örnek Veri:');
        console.log('1,NULL,"2024-07-15 14:30:00","2024-07-16 18:00:00",125.50,insan,ihmal,buyuk,sonduruldu,41.0082,28.9784,"Beykoz Ormanı",150,5,3,27.5,"5 ev hasar gördü",Çam,OGM');
        console.log('\n✅ Tablo hazır! CSV dosyanızı MySQL\'e içe aktarabilirsiniz.');

    } catch (error) {
        console.error('❌ Hata:', error.message);
        throw error;
    } finally {
        await pool.end();
    }
}

if (require.main === module) {
    createFireTable();
}

module.exports = { createFireTable };











