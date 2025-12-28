/**
 * Canlı deprem verilerini kontrol et
 */

require('dotenv').config();
const pool = require('../config/database');

async function checkLiveEarthquakes() {
  try {
    const [rows] = await pool.query(`
      SELECT 
        dc.tarih_saat, 
        dc.buyukluk, 
        i.il_adi, 
        TIMESTAMPDIFF(HOUR, dc.tarih_saat, NOW()) as saat_once,
        TIMESTAMPDIFF(MINUTE, dc.tarih_saat, NOW()) as dakika_once
      FROM deprem_canli dc 
      INNER JOIN iller i ON dc.il_id = i.id 
      ORDER BY dc.tarih_saat DESC 
      LIMIT 20
    `);
    
    console.log('📊 En son 20 canlı deprem:\n');
    rows.forEach((r, i) => {
      const tarih = new Date(r.tarih_saat).toLocaleString('tr-TR');
      const zaman = r.dakika_once < 60 
        ? `${r.dakika_once} dakika önce`
        : `${r.saat_once} saat önce`;
      console.log(`${i + 1}. ${tarih} (${zaman})`);
      console.log(`   ${r.il_adi} - ${r.buyukluk} büyüklüğünde\n`);
    });
    
    // İl bazında en son depremler
    console.log('\n📋 İl bazında en son depremler:\n');
    const [ilRows] = await pool.query(`
      SELECT 
        i.il_adi,
        MAX(dc.tarih_saat) as en_son_deprem,
        TIMESTAMPDIFF(HOUR, MAX(dc.tarih_saat), NOW()) as saat_once
      FROM deprem_canli dc
      INNER JOIN iller i ON dc.il_id = i.id
      GROUP BY i.il_adi
      ORDER BY en_son_deprem DESC
    `);
    
    ilRows.forEach(r => {
      const tarih = new Date(r.en_son_deprem).toLocaleString('tr-TR');
      console.log(`  ${r.il_adi}: ${tarih} (${r.saat_once} saat önce)`);
    });
    
  } catch (error) {
    console.error('❌ Hata:', error.message);
  } finally {
    await pool.end();
  }
}

checkLiveEarthquakes();
