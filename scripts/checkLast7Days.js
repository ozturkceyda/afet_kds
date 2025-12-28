/**
 * Son 7 gün içindeki depremleri kontrol et
 */

require('dotenv').config();
const pool = require('../config/database');

async function checkLast7Days() {
  try {
    const [rows] = await pool.query(`
      SELECT 
        i.il_adi, 
        COUNT(*) as sayi, 
        MAX(dc.tarih_saat) as en_son,
        TIMESTAMPDIFF(HOUR, MAX(dc.tarih_saat), NOW()) as saat_once
      FROM deprem_canli dc 
      INNER JOIN iller i ON dc.il_id = i.id 
      WHERE dc.tarih_saat >= DATE_SUB(NOW(), INTERVAL 7 DAY)
      GROUP BY i.il_adi 
      ORDER BY en_son DESC
    `);
    
    console.log('📊 Son 7 gün içindeki depremler (il bazında):\n');
    if (rows.length === 0) {
      console.log('  ⚠️  Son 7 gün içinde deprem bulunamadı');
    } else {
      rows.forEach(r => {
        const tarih = new Date(r.en_son).toLocaleString('tr-TR');
        console.log(`  ${r.il_adi}: ${r.sayi} deprem (en son: ${tarih}, ${r.saat_once} saat önce)`);
      });
    }
    
    // Tüm zamanlar için kontrol
    const [allRows] = await pool.query(`
      SELECT 
        i.il_adi, 
        COUNT(*) as sayi, 
        MAX(dc.tarih_saat) as en_son
      FROM deprem_canli dc 
      INNER JOIN iller i ON dc.il_id = i.id 
      GROUP BY i.il_adi 
      ORDER BY en_son DESC
    `);
    
    console.log('\n📊 Tüm zamanlar (il bazında):\n');
    allRows.forEach(r => {
      const tarih = new Date(r.en_son).toLocaleString('tr-TR');
      console.log(`  ${r.il_adi}: ${r.sayi} deprem (en son: ${tarih})`);
    });
    
  } catch (error) {
    console.error('❌ Hata:', error.message);
  } finally {
    await pool.end();
  }
}

checkLast7Days();




















