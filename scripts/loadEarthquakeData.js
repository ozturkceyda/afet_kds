/**
 * Deprem Verileri Yükleme Scripti
 * 
 * Bu script deprem verilerini veritabanına yükler
 * Verileri AFAD veya Kandilli Rasathanesi'nden alın
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

/**
 * Canlı Deprem Verileri
 * 
 * Format: [{ il_adi, ilce_adi, buyukluk, derinlik, tarih_saat, enlem, boylam, kaynak }, ...]
 * 
 * NOT: Bu verileri AFAD veya Kandilli Rasathanesi'nden alın
 * Kaynaklar:
 * - AFAD: https://www.afad.gov.tr/
 * - Kandilli: http://www.koeri.boun.edu.tr/
 */
const canliDepremVerileri = [
  // Canlı deprem verilerinizi buraya ekleyin
  // Örnek format:
  /*
  {
    il_adi: 'İstanbul',
    ilce_adi: null, // veya 'Kadıköy'
    buyukluk: 4.2,
    derinlik: 5.5,
    tarih_saat: '2024-01-15 14:30:00',
    enlem: 41.0082,
    boylam: 28.9784,
    kaynak: 'AFAD'
  }
  */
];

/**
 * Geçmiş Deprem Verileri
 * 
 * Format: [{ il_adi, ilce_adi, buyukluk, derinlik, tarih_saat, enlem, boylam, hasar_bilgisi, kaynak }, ...]
 */
const gecmisDepremVerileri = [
  // Geçmiş deprem verilerinizi buraya ekleyin
  // Örnek format:
  /*
  {
    il_adi: 'İstanbul',
    ilce_adi: null,
    buyukluk: 5.8,
    derinlik: 10.5,
    tarih_saat: '2023-06-10 12:30:00',
    enlem: 41.0082,
    boylam: 28.9784,
    hasar_bilgisi: 'Hafif hasar',
    kaynak: 'AFAD'
  }
  */
];

/**
 * Canlı deprem verilerini yükle
 */
async function loadCanliDepremler() {
  try {
    console.log('📊 Canlı deprem verileri yükleniyor...\n');
    
    if (canliDepremVerileri.length === 0) {
      console.log('⚠️  Canlı deprem verisi bulunamadı');
      return;
    }
    
    // Önce tüm illeri al
    const [provinces] = await db.query('SELECT id, il_adi FROM iller');
    const provinceMap = {};
    provinces.forEach(p => {
      provinceMap[p.il_adi] = p.id;
    });
    
    // İlçeleri al (opsiyonel)
    const [districts] = await db.query('SELECT id, il_id, ilce_adi FROM ilceler');
    const districtMap = {};
    districts.forEach(d => {
      const key = `${d.il_id}_${d.ilce_adi}`;
      districtMap[key] = d.id;
    });
    
    let totalAdded = 0;
    
    for (const deprem of canliDepremVerileri) {
      const ilId = provinceMap[deprem.il_adi];
      
      if (!ilId) {
        console.log(`⚠️  ${deprem.il_adi} il bulunamadı`);
        continue;
      }
      
      let ilceId = null;
      if (deprem.ilce_adi) {
        const key = `${ilId}_${deprem.ilce_adi}`;
        ilceId = districtMap[key] || null;
      }
      
      await db.query(
        `INSERT INTO deprem_canli 
         (il_id, ilce_id, buyukluk, derinlik, tarih_saat, enlem, boylam, kaynak) 
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          ilId,
          ilceId,
          deprem.buyukluk,
          deprem.derinlik || null,
          deprem.tarih_saat,
          deprem.enlem,
          deprem.boylam,
          deprem.kaynak || 'AFAD'
        ]
      );
      totalAdded++;
    }
    
    console.log(`✅ ${totalAdded} canlı deprem verisi eklendi\n`);
    
  } catch (error) {
    console.error('❌ Canlı deprem verileri yüklenirken hata:', error.message);
    throw error;
  }
}

/**
 * Geçmiş deprem verilerini yükle
 */
async function loadGecmisDepremler() {
  try {
    console.log('📊 Geçmiş deprem verileri yükleniyor...\n');
    
    if (gecmisDepremVerileri.length === 0) {
      console.log('⚠️  Geçmiş deprem verisi bulunamadı');
      return;
    }
    
    // Önce tüm illeri al
    const [provinces] = await db.query('SELECT id, il_adi FROM iller');
    const provinceMap = {};
    provinces.forEach(p => {
      provinceMap[p.il_adi] = p.id;
    });
    
    // İlçeleri al (opsiyonel)
    const [districts] = await db.query('SELECT id, il_id, ilce_adi FROM ilceler');
    const districtMap = {};
    districts.forEach(d => {
      const key = `${d.il_id}_${d.ilce_adi}`;
      districtMap[key] = d.id;
    });
    
    let totalAdded = 0;
    
    for (const deprem of gecmisDepremVerileri) {
      const ilId = provinceMap[deprem.il_adi];
      
      if (!ilId) {
        console.log(`⚠️  ${deprem.il_adi} il bulunamadı`);
        continue;
      }
      
      let ilceId = null;
      if (deprem.ilce_adi) {
        const key = `${ilId}_${deprem.ilce_adi}`;
        ilceId = districtMap[key] || null;
      }
      
      await db.query(
        `INSERT INTO deprem_gecmis 
         (il_id, ilce_id, buyukluk, derinlik, tarih_saat, enlem, boylam, hasar_bilgisi, kaynak) 
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          ilId,
          ilceId,
          deprem.buyukluk,
          deprem.derinlik || null,
          deprem.tarih_saat,
          deprem.enlem,
          deprem.boylam,
          deprem.hasar_bilgisi || null,
          deprem.kaynak || 'AFAD'
        ]
      );
      totalAdded++;
    }
    
    console.log(`✅ ${totalAdded} geçmiş deprem verisi eklendi\n`);
    
  } catch (error) {
    console.error('❌ Geçmiş deprem verileri yüklenirken hata:', error.message);
    throw error;
  }
}

/**
 * Ana fonksiyon
 */
async function main() {
  try {
    console.log('🚀 Deprem Verileri Yükleme Scripti\n');
    console.log('⚠️  ÖNEMLİ: canliDepremVerileri ve gecmisDepremVerileri objelerine gerçek verileri ekleyin!');
    console.log('📚 Veri Kaynakları:');
    console.log('   - AFAD: https://www.afad.gov.tr/');
    console.log('   - Kandilli Rasathanesi: http://www.koeri.boun.edu.tr/\n');
    
    await loadCanliDepremler();
    await loadGecmisDepremler();
    
    await db.end();
    console.log('✅ Script tamamlandı!');
  } catch (error) {
    console.error('❌ Hata:', error);
    process.exit(1);
  }
}

// Script çalıştırma
if (require.main === module) {
  main();
}

module.exports = { loadCanliDepremler, loadGecmisDepremler };




















