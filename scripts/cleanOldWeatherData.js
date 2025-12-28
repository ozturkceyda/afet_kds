const pool = require('../config/database');

async function cleanOldWeatherData() {
  try {
    console.log('🧹 Eski hava durumu verileri temizleniyor...\n');
    
    // 22 Aralık'tan önceki ve 26 Aralık'tan sonraki verileri sil
    const [result] = await pool.query(
      `DELETE FROM hava_durumu_canli 
       WHERE tarih_saat < '2025-12-22 00:00:00' 
       OR tarih_saat > '2025-12-26 23:59:59'`
    );
    
    console.log(`✅ ${result.affectedRows} eski kayıt silindi`);
    
    // Kalan kayıt sayısını kontrol et
    const [count] = await pool.query(
      `SELECT COUNT(*) as sayi FROM hava_durumu_canli 
       WHERE tarih_saat >= '2025-12-22 00:00:00' 
       AND tarih_saat <= '2025-12-26 23:59:59'`
    );
    
    console.log(`📊 Kalan kayıt sayısı (22-26 Aralık): ${count[0].sayi}`);
    
    // İl bazında kayıt sayıları
    const [byProvince] = await pool.query(
      `SELECT i.il_adi, COUNT(*) as sayi 
       FROM hava_durumu_canli hd
       JOIN iller i ON hd.il_id = i.id
       WHERE hd.tarih_saat >= '2025-12-22 00:00:00' 
       AND hd.tarih_saat <= '2025-12-26 23:59:59'
       GROUP BY i.il_adi
       ORDER BY i.il_adi`
    );
    
    console.log('\n📋 İl Bazında Kayıt Sayıları:');
    byProvince.forEach(row => {
      console.log(`   ${row.il_adi.padEnd(15)} | ${row.sayi} kayıt`);
    });
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Hata:', error.message);
    process.exit(1);
  }
}

cleanOldWeatherData();


async function cleanOldWeatherData() {
  try {
    console.log('🧹 Eski hava durumu verileri temizleniyor...\n');
    
    // 22 Aralık'tan önceki ve 26 Aralık'tan sonraki verileri sil
    const [result] = await pool.query(
      `DELETE FROM hava_durumu_canli 
       WHERE tarih_saat < '2025-12-22 00:00:00' 
       OR tarih_saat > '2025-12-26 23:59:59'`
    );
    
    console.log(`✅ ${result.affectedRows} eski kayıt silindi`);
    
    // Kalan kayıt sayısını kontrol et
    const [count] = await pool.query(
      `SELECT COUNT(*) as sayi FROM hava_durumu_canli 
       WHERE tarih_saat >= '2025-12-22 00:00:00' 
       AND tarih_saat <= '2025-12-26 23:59:59'`
    );
    
    console.log(`📊 Kalan kayıt sayısı (22-26 Aralık): ${count[0].sayi}`);
    
    // İl bazında kayıt sayıları
    const [byProvince] = await pool.query(
      `SELECT i.il_adi, COUNT(*) as sayi 
       FROM hava_durumu_canli hd
       JOIN iller i ON hd.il_id = i.id
       WHERE hd.tarih_saat >= '2025-12-22 00:00:00' 
       AND hd.tarih_saat <= '2025-12-26 23:59:59'
       GROUP BY i.il_adi
       ORDER BY i.il_adi`
    );
    
    console.log('\n📋 İl Bazında Kayıt Sayıları:');
    byProvince.forEach(row => {
      console.log(`   ${row.il_adi.padEnd(15)} | ${row.sayi} kayıt`);
    });
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Hata:', error.message);
    process.exit(1);
  }
}

cleanOldWeatherData();











