const pool = require('../config/database');

// Marmara Bölgesi Sel Verileri (2022-2025)
// İl bazında yıllık sel sayıları
const floodData = {
  'İstanbul': { '2022': 6, '2023': 8, '2024': 9, '2025': 7 },
  'Kocaeli': { '2022': 4, '2023': 5, '2024': 6, '2025': 5 },
  'Bursa': { '2022': 4, '2023': 5, '2024': 6, '2025': 5 },
  'Sakarya': { '2022': 3, '2023': 4, '2024': 5, '2025': 4 },
  'Tekirdağ': { '2022': 3, '2023': 4, '2024': 4, '2025': 3 },
  'Balıkesir': { '2022': 3, '2023': 4, '2024': 4, '2025': 3 },
  'Çanakkale': { '2022': 2, '2023': 3, '2024': 3, '2025': 3 },
  'Kırklareli': { '2022': 2, '2023': 3, '2024': 3, '2025': 3 },
  'Edirne': { '2022': 2, '2023': 3, '2024': 3, '2025': 3 },
  'Yalova': { '2022': 1, '2023': 2, '2024': 2, '2025': 2 },
  'Bilecik': { '2022': 1, '2023': 2, '2024': 2, '2025': 2 }
};

async function createTableIfNotExists() {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS \`sel_verileri\` (
        \`id\` int(11) NOT NULL AUTO_INCREMENT,
        \`il_id\` int(11) NOT NULL,
        \`yil\` int(11) NOT NULL,
        \`sel_sayisi\` int(11) DEFAULT 0,
        \`olusturma_tarihi\` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY (\`id\`),
        UNIQUE KEY \`idx_il_yil\` (\`il_id\`, \`yil\`),
        KEY \`idx_il_id\` (\`il_id\`),
        KEY \`idx_yil\` (\`yil\`),
        CONSTRAINT \`fk_sel_verileri_iller\` FOREIGN KEY (\`il_id\`) REFERENCES \`iller\` (\`id\`) ON DELETE CASCADE ON UPDATE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);
    console.log('✅ Tablo kontrol edildi/oluşturuldu');
  } catch (error) {
    console.error('❌ Tablo oluşturulurken hata:', error.message);
    throw error;
  }
}

async function loadFloodData() {
  console.log('🌊 Sel Verileri Yükleniyor...\n');
  let totalAdded = 0;
  let totalUpdated = 0;
  let totalSkipped = 0;

  try {
    await createTableIfNotExists();

    // İlleri al
    const [provinces] = await pool.query('SELECT id, il_adi FROM iller WHERE bolge = "Marmara"');
    const provinceMap = new Map(provinces.map(p => [p.il_adi, p.id]));

    for (const [provinceName, yearlyData] of Object.entries(floodData)) {
      const ilId = provinceMap.get(provinceName);
      if (!ilId) {
        console.log(`   ⚠️  ${provinceName} için il ID bulunamadı, atlanıyor...`);
        totalSkipped++;
        continue;
      }

      console.log(`📊 ${provinceName} için sel verileri yükleniyor...`);
      for (const [year, selSayisi] of Object.entries(yearlyData)) {
        // Mevcut kaydı kontrol et
        const [existing] = await pool.query(
          'SELECT id FROM sel_verileri WHERE il_id = ? AND yil = ?',
          [ilId, year]
        );

        if (existing.length > 0) {
          // Güncelle
          await pool.query(
            'UPDATE sel_verileri SET sel_sayisi = ? WHERE id = ?',
            [selSayisi, existing[0].id]
          );
          console.log(`   🔄 ${year}: ${selSayisi} sel (güncellendi)`);
          totalUpdated++;
        } else {
          // Yeni kayıt ekle
          await pool.query(
            'INSERT INTO sel_verileri (il_id, yil, sel_sayisi) VALUES (?, ?, ?)',
            [ilId, year, selSayisi]
          );
          console.log(`   ✅ ${year}: ${selSayisi} sel (eklendi)`);
          totalAdded++;
        }
      }
    }

    console.log('\n📊 Özet:');
    console.log(`   ✅ Eklenen Kayıtlar: ${totalAdded}`);
    console.log(`   🔄 Güncellenen Kayıtlar: ${totalUpdated}`);
    console.log(`   ⏭️  Atlanan İller: ${totalSkipped}`);
    
    const [count] = await pool.query('SELECT COUNT(*) as total FROM sel_verileri');
    console.log(`   📈 Toplam Kayıt: ${count[0].total}`);

    console.log('\n✅ Sel verileri yükleme işlemi tamamlandı!');
  } catch (error) {
    console.error('\n❌ Hata:', error.message);
    throw error;
  } finally {
    await pool.end();
  }
}

if (require.main === module) {
  loadFloodData().catch(console.error);
}

module.exports = { loadFloodData };

