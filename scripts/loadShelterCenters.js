/**
 * Barınma Merkezleri Yükleme Scripti
 * 
 * Marmara Bölgesi için barınma merkezleri verilerini yükler
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
 * Barınma Merkezleri Verileri
 * Gerçek veriler AFAD veya İl Afet ve Acil Durum Müdürlüklerinden alınmalıdır
 */
const shelterCentersData = {
  'İstanbul': {
    cadirkent: 500,
    prefabrik_yapi: 1000,
    gecici_iskan_merkezi: 15000
  },
  'Kocaeli': {
    cadirkent: 200,
    prefabrik_yapi: 400,
    gecici_iskan_merkezi: 8000
  },
  'Sakarya': {
    cadirkent: 150,
    prefabrik_yapi: 300,
    gecici_iskan_merkezi: 6000
  },
  'Yalova': {
    cadirkent: 50,
    prefabrik_yapi: 100,
    gecici_iskan_merkezi: 2000
  },
  'Tekirdağ': {
    cadirkent: 100,
    prefabrik_yapi: 200,
    gecici_iskan_merkezi: 4000
  },
  'Bursa': {
    cadirkent: 300,
    prefabrik_yapi: 600,
    gecici_iskan_merkezi: 12000
  },
  'Balıkesir': {
    cadirkent: 200,
    prefabrik_yapi: 400,
    gecici_iskan_merkezi: 8000
  },
  'Çanakkale': {
    cadirkent: 100,
    prefabrik_yapi: 200,
    gecici_iskan_merkezi: 4000
  },
  'Bilecik': {
    cadirkent: 50,
    prefabrik_yapi: 100,
    gecici_iskan_merkezi: 2000
  },
  'Edirne': {
    cadirkent: 80,
    prefabrik_yapi: 160,
    gecici_iskan_merkezi: 3000
  },
  'Kırklareli': {
    cadirkent: 60,
    prefabrik_yapi: 120,
    gecici_iskan_merkezi: 2500
  }
};

async function loadShelterCenters() {
  try {
    console.log('🏠 Barınma merkezleri yükleniyor...\n');
    
    // Önce tüm illeri al
    const [provinces] = await db.query('SELECT id, il_adi FROM iller ORDER BY il_adi');
    
    if (provinces.length === 0) {
      console.log('⚠️  Veritabanında il bulunamadı! Önce illeri yükleyin.');
      return;
    }
    
    let totalAdded = 0;
    let totalUpdated = 0;
    
    for (const province of provinces) {
      const shelterData = shelterCentersData[province.il_adi];
      
      if (!shelterData) {
        console.log(`⚠️  ${province.il_adi} için barınma merkezi verisi bulunamadı`);
        continue;
      }
      
      // Her merkez tipi için kayıt oluştur/güncelle
      const types = [
        { type: 'cadirkent', capacity: shelterData.cadirkent },
        { type: 'prefabrik_yapi', capacity: shelterData.prefabrik_yapi },
        { type: 'gecici_iskan_merkezi', capacity: shelterData.gecici_iskan_merkezi }
      ];
      
      for (const { type, capacity } of types) {
        // Mevcut kayıt var mı kontrol et
        const [existing] = await db.query(
          'SELECT id FROM barinma_merkezleri WHERE il_id = ? AND ilce_id IS NULL AND merkez_tipi = ?',
          [province.id, type]
        );
        
        if (existing.length === 0) {
          // Yeni ekle
          await db.query(
            `INSERT INTO barinma_merkezleri 
             (il_id, ilce_id, merkez_tipi, kapasite, dolu_kapasite, durum) 
             VALUES (?, NULL, ?, ?, 0, 'aktif')`,
            [province.id, type, capacity]
          );
          totalAdded++;
        } else {
          // Güncelle
          await db.query(
            `UPDATE barinma_merkezleri 
             SET kapasite = ? 
             WHERE il_id = ? AND ilce_id IS NULL AND merkez_tipi = ?`,
            [capacity, province.id, type]
          );
          totalUpdated++;
        }
      }
      
      console.log(`✅ ${province.il_adi} barınma merkezleri işlendi`);
    }
    
    console.log(`\n📈 Özet:`);
    console.log(`   ✅ Eklenen: ${totalAdded} kayıt`);
    console.log(`   🔄 Güncellenen: ${totalUpdated} kayıt`);
    
    // Toplam kapasite hesapla
    const [totals] = await db.query(
      `SELECT 
        merkez_tipi,
        SUM(kapasite) as toplam_kapasite
      FROM barinma_merkezleri 
      WHERE ilce_id IS NULL
      GROUP BY merkez_tipi`
    );
    
    console.log(`\n📊 Toplam Kapasiteler:`);
    totals.forEach(row => {
      const typeNames = {
        'cadirkent': 'Çadırkent',
        'prefabrik_yapi': 'Prefabrik Yapı',
        'gecici_iskan_merkezi': 'Geçici İskan Merkezi'
      };
      console.log(`   ${typeNames[row.merkez_tipi]}: ${row.toplam_kapasite.toLocaleString('tr-TR')}`);
    });
    
  } catch (error) {
    console.error('❌ Barınma merkezleri yüklenirken hata:', error.message);
    throw error;
  }
}

async function main() {
  try {
    console.log('🚀 Barınma Merkezleri Yükleme Scripti\n');
    await loadShelterCenters();
    await db.end();
    console.log('\n✅ Script tamamlandı!');
  } catch (error) {
    console.error('❌ Hata:', error);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}

module.exports = { loadShelterCenters };

