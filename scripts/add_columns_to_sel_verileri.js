const pool = require('../config/database');

async function columnExists(tableName, columnName) {
    try {
        const [rows] = await pool.query(`
            SELECT COUNT(*) as count
            FROM INFORMATION_SCHEMA.COLUMNS
            WHERE TABLE_SCHEMA = DATABASE()
            AND TABLE_NAME = ?
            AND COLUMN_NAME = ?
        `, [tableName, columnName]);
        return rows[0].count > 0;
    } catch (error) {
        return false;
    }
}

async function addColumnsToSelVerileri() {
    try {
        console.log('🔧 sel_verileri tablosuna kolonlar ekleniyor...\n');

        // Önerilen bütçe kolonu
        const butceExists = await columnExists('sel_verileri', 'onerilen_butce');
        if (!butceExists) {
            await pool.query(`
                ALTER TABLE \`sel_verileri\`
                ADD COLUMN \`onerilen_butce\` decimal(10,2) DEFAULT NULL COMMENT 'Milyon TL - İl bazında önerilen bütçe'
            `);
            console.log('✅ onerilen_butce kolonu eklendi');
        } else {
            console.log('ℹ️  onerilen_butce kolonu zaten mevcut');
        }

        // Altyapı iyileştirme öncelik kolonları
        const columns = [
            { name: 'dere_islahi_oncelik', comment: '0-5 arası öncelik seviyesi' },
            { name: 'yagmur_suyu_kanali_oncelik', comment: '0-5 arası öncelik seviyesi' },
            { name: 'baraj_regulator_oncelik', comment: '0-5 arası öncelik seviyesi' },
            { name: 'sel_onleme_duvari_oncelik', comment: '0-5 arası öncelik seviyesi' },
            { name: 'acil_mudahale_ekipmani_oncelik', comment: '0-5 arası öncelik seviyesi' }
        ];

        for (const col of columns) {
            const exists = await columnExists('sel_verileri', col.name);
            if (!exists) {
                await pool.query(`
                    ALTER TABLE \`sel_verileri\`
                    ADD COLUMN \`${col.name}\` int(11) DEFAULT NULL COMMENT '${col.comment}'
                `);
                console.log(`✅ ${col.name} kolonu eklendi`);
            } else {
                console.log(`ℹ️  ${col.name} kolonu zaten mevcut`);
            }
        }

        // Güncelleme tarihi kolonu
        const guncellemeExists = await columnExists('sel_verileri', 'guncelleme_tarihi');
        if (!guncellemeExists) {
            await pool.query(`
                ALTER TABLE \`sel_verileri\`
                ADD COLUMN \`guncelleme_tarihi\` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
            `);
            console.log('✅ guncelleme_tarihi kolonu eklendi');
        } else {
            console.log('ℹ️  guncelleme_tarihi kolonu zaten mevcut');
        }

        console.log('\n✅ Tüm kolonlar başarıyla eklendi!');
    } catch (error) {
        console.error('❌ Hata:', error.message);
        throw error;
    } finally {
        await pool.end();
    }
}

if (require.main === module) {
    addColumnsToSelVerileri().catch(console.error);
}

module.exports = { addColumnsToSelVerileri };

