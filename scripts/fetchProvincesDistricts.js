/**
 * İller ve İlçeler Verisi Çekme Scripti
 * 
 * ⚠️ ÖNEMLİ: Bu script SADECE YAPISAL ÖRNEKTİR!
 * Gerçek verileri TÜİK, İçişleri Bakanlığı veya resmi kaynaklardan almalısınız.
 * 
 * Kullanım:
 * 1. districtsData objesine GERÇEK verileri ekleyin
 * 2. Koordinatları Google Maps'ten veya resmi kaynaklardan alın
 * 3. Nüfus verilerini TÜİK'ten alın
 * 4. Script'i çalıştırın
 */

const mysql = require('mysql2/promise');
require('dotenv').config();
const https = require('https');
const http = require('http');

const db = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 3306,
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'kds_afet_yönetimi'
});

/**
 * Marmara Bölgesi İlleri
 * ⚠️ Bu veriler örnek yapıdır - Gerçek verileri TÜİK'ten alın!
 * Kaynak: https://www.tuik.gov.tr/
 */
const marmaraProvinces = [
  { il_adi: 'İstanbul', bolge: 'Marmara', enlem: 41.0082, boylam: 28.9784, nufus: 15840900 },
  { il_adi: 'Bursa', bolge: 'Marmara', enlem: 40.1826, boylam: 29.0665, nufus: 3161822 },
  { il_adi: 'Kocaeli', bolge: 'Marmara', enlem: 40.8533, boylam: 29.8815, nufus: 2069991 },
  { il_adi: 'Sakarya', bolge: 'Marmara', enlem: 40.7569, boylam: 30.3786, nufus: 1080889 },
  { il_adi: 'Balıkesir', bolge: 'Marmara', enlem: 39.6484, boylam: 27.8826, nufus: 1305778 },
  { il_adi: 'Çanakkale', bolge: 'Marmara', enlem: 40.1553, boylam: 26.4142, nufus: 557863 },
  { il_adi: 'Tekirdağ', bolge: 'Marmara', enlem: 40.9833, boylam: 27.5167, nufus: 1156190 },
  { il_adi: 'Yalova', bolge: 'Marmara', enlem: 40.6550, boylam: 29.2769, nufus: 291001 },
  { il_adi: 'Bilecik', bolge: 'Marmara', enlem: 40.1425, boylam: 29.9793, nufus: 228334 },
  { il_adi: 'Edirne', bolge: 'Marmara', enlem: 41.6772, boylam: 26.5556, nufus: 412115 },
  { il_adi: 'Kırklareli', bolge: 'Marmara', enlem: 41.7333, boylam: 27.2167, nufus: 366306 }
];

/**
 * İlçeler verisi
 * ⚠️ ÖNEMLİ: Bu sadece ÖRNEK yapıdır!
 * 
 * Gerçek verileri şu kaynaklardan alın:
 * 1. Wikipedia: https://tr.wikipedia.org/wiki/[İl_Adı]
 * 2. TÜİK: https://www.tuik.gov.tr/
 * 3. İçişleri Bakanlığı: https://www.icisleri.gov.tr/
 * 
 * Koordinatlar: Google Maps'ten veya resmi kaynaklardan
 * Nüfus: TÜİK ADNKS verilerinden
 */
const districtsData = {
  // İstanbul ilçeleri (örnek - tümünü ekleyin)
  'İstanbul': [
    { ilce_adi: 'Kadıköy', enlem: 40.9819, boylam: 29.0244, nufus: 482571 },
    { ilce_adi: 'Beşiktaş', enlem: 41.0431, boylam: 29.0094, nufus: 191513 },
    { ilce_adi: 'Şişli', enlem: 41.0602, boylam: 28.9874, nufus: 274420 },
    { ilce_adi: 'Beyoğlu', enlem: 41.0369, boylam: 28.9850, nufus: 245064 },
    { ilce_adi: 'Üsküdar', enlem: 41.0214, boylam: 29.0097, nufus: 524452 },
    { ilce_adi: 'Bakırköy', enlem: 40.9833, boylam: 28.8500, nufus: 222668 },
    { ilce_adi: 'Maltepe', enlem: 40.9333, boylam: 29.1500, nufus: 515021 },
    { ilce_adi: 'Kartal', enlem: 40.9000, boylam: 29.1833, nufus: 474514 },
    { ilce_adi: 'Pendik', enlem: 40.8833, boylam: 29.2333, nufus: 750000 },
    { ilce_adi: 'Ümraniye', enlem: 41.0167, boylam: 29.1167, nufus: 710000 }
    // ... diğer ilçeleri ekleyin
  ],
  'Bursa': [
    { ilce_adi: 'Osmangazi', enlem: 40.1885, boylam: 29.0610, nufus: 882000 },
    { ilce_adi: 'Nilüfer', enlem: 40.2397, boylam: 29.0200, nufus: 456000 },
    { ilce_adi: 'Yıldırım', enlem: 40.1956, boylam: 29.0722, nufus: 650000 },
    { ilce_adi: 'Mudanya', enlem: 40.3667, boylam: 28.8833, nufus: 105000 },
    { ilce_adi: 'Gemlik', enlem: 40.4333, boylam: 29.1500, nufus: 120000 }
    // ... diğer ilçeleri ekleyin
  ],
  'Kocaeli': [
    { ilce_adi: 'İzmit', enlem: 40.7656, boylam: 29.9406, nufus: 376000 },
    { ilce_adi: 'Gebze', enlem: 40.8028, boylam: 29.4306, nufus: 371000 },
    { ilce_adi: 'Darıca', enlem: 40.7667, boylam: 29.3833, nufus: 200000 },
    { ilce_adi: 'Körfez', enlem: 40.7833, boylam: 29.7333, nufus: 160000 },
    { ilce_adi: 'Gölcük', enlem: 40.7167, boylam: 29.8167, nufus: 180000 }
    // ... diğer ilçeleri ekleyin
  ]
  // Diğer iller için de ekleyin...
};

/**
 * İlleri veritabanına yükle
 */
async function loadProvinces() {
  try {
    console.log('📊 İller yükleniyor...');
    
    for (const province of marmaraProvinces) {
      // Önce var mı kontrol et
      const [existing] = await db.query(
        'SELECT id FROM iller WHERE il_adi = ?',
        [province.il_adi]
      );

      if (existing.length === 0) {
        await db.query(
          'INSERT INTO iller (il_adi, bolge, enlem, boylam, nufus) VALUES (?, ?, ?, ?, ?)',
          [province.il_adi, province.bolge, province.enlem, province.boylam, province.nufus]
        );
        console.log(`✅ ${province.il_adi} eklendi`);
      } else {
        console.log(`⏭️  ${province.il_adi} zaten mevcut`);
      }
    }
    
    console.log('✅ İller yükleme tamamlandı\n');
  } catch (error) {
    console.error('❌ İller yüklenirken hata:', error.message);
  }
}

/**
 * İlçeleri veritabanına yükle
 */
async function loadDistricts() {
  try {
    console.log('📊 İlçeler yükleniyor...');
    
    // Önce tüm illeri al
    const [provinces] = await db.query('SELECT id, il_adi FROM iller');
    
    for (const province of provinces) {
      const districts = districtsData[province.il_adi];
      
      if (!districts) {
        console.log(`⚠️  ${province.il_adi} için ilçe verisi bulunamadı`);
        continue;
      }
      
      for (const district of districts) {
        // Önce var mı kontrol et
        const [existing] = await db.query(
          'SELECT id FROM ilceler WHERE il_id = ? AND ilce_adi = ?',
          [province.id, district.ilce_adi]
        );

        if (existing.length === 0) {
          await db.query(
            'INSERT INTO ilceler (il_id, ilce_adi, enlem, boylam, nufus) VALUES (?, ?, ?, ?, ?)',
            [province.id, district.ilce_adi, district.enlem, district.boylam, district.nufus]
          );
          console.log(`  ✅ ${province.il_adi} - ${district.ilce_adi} eklendi`);
        } else {
          console.log(`  ⏭️  ${province.il_adi} - ${district.ilce_adi} zaten mevcut`);
        }
      }
    }
    
    console.log('✅ İlçeler yükleme tamamlandı\n');
  } catch (error) {
    console.error('❌ İlçeler yüklenirken hata:', error.message);
  }
}

/**
 * Ana fonksiyon
 */
async function main() {
  console.log('🚀 İller ve İlçeler Yükleme Scripti\n');
  console.log('⚠️  ÖNEMLİ: Bu script SADECE YAPISAL ÖRNEKTİR!');
  console.log('📝 Gerçek verileri şu kaynaklardan almalısınız:');
  console.log('   - TÜİK: https://www.tuik.gov.tr/');
  console.log('   - İçişleri Bakanlığı: https://www.icisleri.gov.tr/');
  console.log('   - Wikipedia: https://tr.wikipedia.org/');
  console.log('   - Google Maps (koordinatlar için)\n');
  console.log('📋 Adımlar:');
  console.log('   1. districtsData objesine GERÇEK ilçe verilerini ekleyin');
  console.log('   2. Koordinatları Google Maps\'ten alın');
  console.log('   3. Nüfus verilerini TÜİK\'ten alın');
  console.log('   4. Script\'i çalıştırın\n');
  
  await loadProvinces();
  await loadDistricts();
  
  await db.end();
  console.log('✅ Script tamamlandı');
}

// Script çalıştırma
if (require.main === module) {
  main().catch(console.error);
}

module.exports = { loadProvinces, loadDistricts };

