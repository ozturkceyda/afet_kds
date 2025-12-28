const pool = require('../config/database');

async function removeDistrictsTable() {
    try {
        console.log('🗑️  İlçeler tablosu ve foreign key constraint\'leri kaldırılıyor...\n');

        // Önce tüm foreign key constraint'lerini kaldır
        const tablesWithDistrictFK = [
            'deprem_canli',
            'deprem_gecmis',
            'hava_durumu_verileri',
            'hava_durumu_canli',
            'risk_skorlari',
            'barinma_merkezleri',
            'orman_yanginlari'
        ];

        console.log('📋 Foreign key constraint\'leri kaldırılıyor...');
        for (const table of tablesWithDistrictFK) {
            try {
                // Foreign key constraint'lerini bul
                const [constraints] = await pool.query(`
                    SELECT CONSTRAINT_NAME 
                    FROM information_schema.KEY_COLUMN_USAGE 
                    WHERE TABLE_SCHEMA = DATABASE()
                    AND TABLE_NAME = ?
                    AND REFERENCED_TABLE_NAME = 'ilceler'
                `, [table]);

                for (const constraint of constraints) {
                    try {
                        await pool.query(`ALTER TABLE \`${table}\` DROP FOREIGN KEY \`${constraint.CONSTRAINT_NAME}\``);
                        console.log(`   ✅ ${table}: ${constraint.CONSTRAINT_NAME} kaldırıldı`);
                    } catch (error) {
                        if (!error.message.includes('Unknown key')) {
                            console.log(`   ⚠️  ${table}: ${constraint.CONSTRAINT_NAME} kaldırılamadı - ${error.message}`);
                        }
                    }
                }
            } catch (error) {
                console.log(`   ⚠️  ${table}: Kontrol edilemedi - ${error.message}`);
            }
        }

        // İlçeler tablosunu kaldır
        console.log('\n🗑️  İlçeler tablosu kaldırılıyor...');
        try {
            await pool.query('DROP TABLE IF EXISTS `ilceler`');
            console.log('   ✅ İlçeler tablosu kaldırıldı');
        } catch (error) {
            console.log(`   ⚠️  İlçeler tablosu kaldırılamadı: ${error.message}`);
        }

        // İlçeler tablosuna referans veren diğer constraint'leri kontrol et
        console.log('\n🔍 Kalan constraint\'ler kontrol ediliyor...');
        const [remainingConstraints] = await pool.query(`
            SELECT TABLE_NAME, CONSTRAINT_NAME 
            FROM information_schema.KEY_COLUMN_USAGE 
            WHERE TABLE_SCHEMA = DATABASE()
            AND REFERENCED_TABLE_NAME = 'ilceler'
        `);

        if (remainingConstraints.length > 0) {
            console.log('   ⚠️  Kalan constraint\'ler:');
            remainingConstraints.forEach(c => {
                console.log(`      - ${c.TABLE_NAME}.${c.CONSTRAINT_NAME}`);
            });
        } else {
            console.log('   ✅ Tüm ilçeler referansları temizlendi');
        }

        console.log('\n✅ İşlem tamamlandı!');
        console.log('\n💡 Not: ilce_id alanları tablolarda kaldı (NULL olarak kullanılabilir)');
        console.log('   Ancak artık ilceler tablosuna foreign key constraint\'i yok.');

    } catch (error) {
        console.error('\n❌ Hata:', error.message);
        throw error;
    } finally {
        await pool.end();
    }
}

if (require.main === module) {
    removeDistrictsTable();
}

module.exports = { removeDistrictsTable };


async function removeDistrictsTable() {
    try {
        console.log('🗑️  İlçeler tablosu ve foreign key constraint\'leri kaldırılıyor...\n');

        // Önce tüm foreign key constraint'lerini kaldır
        const tablesWithDistrictFK = [
            'deprem_canli',
            'deprem_gecmis',
            'hava_durumu_verileri',
            'hava_durumu_canli',
            'risk_skorlari',
            'barinma_merkezleri',
            'orman_yanginlari'
        ];

        console.log('📋 Foreign key constraint\'leri kaldırılıyor...');
        for (const table of tablesWithDistrictFK) {
            try {
                // Foreign key constraint'lerini bul
                const [constraints] = await pool.query(`
                    SELECT CONSTRAINT_NAME 
                    FROM information_schema.KEY_COLUMN_USAGE 
                    WHERE TABLE_SCHEMA = DATABASE()
                    AND TABLE_NAME = ?
                    AND REFERENCED_TABLE_NAME = 'ilceler'
                `, [table]);

                for (const constraint of constraints) {
                    try {
                        await pool.query(`ALTER TABLE \`${table}\` DROP FOREIGN KEY \`${constraint.CONSTRAINT_NAME}\``);
                        console.log(`   ✅ ${table}: ${constraint.CONSTRAINT_NAME} kaldırıldı`);
                    } catch (error) {
                        if (!error.message.includes('Unknown key')) {
                            console.log(`   ⚠️  ${table}: ${constraint.CONSTRAINT_NAME} kaldırılamadı - ${error.message}`);
                        }
                    }
                }
            } catch (error) {
                console.log(`   ⚠️  ${table}: Kontrol edilemedi - ${error.message}`);
            }
        }

        // İlçeler tablosunu kaldır
        console.log('\n🗑️  İlçeler tablosu kaldırılıyor...');
        try {
            await pool.query('DROP TABLE IF EXISTS `ilceler`');
            console.log('   ✅ İlçeler tablosu kaldırıldı');
        } catch (error) {
            console.log(`   ⚠️  İlçeler tablosu kaldırılamadı: ${error.message}`);
        }

        // İlçeler tablosuna referans veren diğer constraint'leri kontrol et
        console.log('\n🔍 Kalan constraint\'ler kontrol ediliyor...');
        const [remainingConstraints] = await pool.query(`
            SELECT TABLE_NAME, CONSTRAINT_NAME 
            FROM information_schema.KEY_COLUMN_USAGE 
            WHERE TABLE_SCHEMA = DATABASE()
            AND REFERENCED_TABLE_NAME = 'ilceler'
        `);

        if (remainingConstraints.length > 0) {
            console.log('   ⚠️  Kalan constraint\'ler:');
            remainingConstraints.forEach(c => {
                console.log(`      - ${c.TABLE_NAME}.${c.CONSTRAINT_NAME}`);
            });
        } else {
            console.log('   ✅ Tüm ilçeler referansları temizlendi');
        }

        console.log('\n✅ İşlem tamamlandı!');
        console.log('\n💡 Not: ilce_id alanları tablolarda kaldı (NULL olarak kullanılabilir)');
        console.log('   Ancak artık ilceler tablosuna foreign key constraint\'i yok.');

    } catch (error) {
        console.error('\n❌ Hata:', error.message);
        throw error;
    } finally {
        await pool.end();
    }
}

if (require.main === module) {
    removeDistrictsTable();
}

module.exports = { removeDistrictsTable };











