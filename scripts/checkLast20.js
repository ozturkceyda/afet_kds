/**
 * En son 20 depremi kontrol et
 */

require('dotenv').config();
const pool = require('../config/database');

async function checkLast20() {
  try {
    const [rows] = await pool.query(`
      SELECT 
        dc.id,
        dc.buyukluk,
        dc.tarih_saat,
        i.il_adi
      FROM deprem_canli dc
      INNER JOIN iller i ON dc.il_id = i.id
      ORDER BY dc.tarih_saat DESC
      LIMIT 20
    `);
    
    console.log('📊 En son 20 deprem:\n');
    rows.forEach((r, i) => {
      const tarih = new Date(r.tarih_saat).toLocaleString('tr-TR');
      console.log(`${i + 1}. ${r.il_adi} - ${r.buyukluk} büyüklüğünde - ${tarih}`);
    });
    
    // İl bazında grupla
    const ilCounts = {};
    rows.forEach(r => {
      ilCounts[r.il_adi] = (ilCounts[r.il_adi] || 0) + 1;
    });
    
    console.log('\n📋 İl bazında dağılım:');
    Object.entries(ilCounts).sort((a, b) => b[1] - a[1]).forEach(([il, count]) => {
      console.log(`  ${il}: ${count} deprem`);
    });
    
  } catch (error) {
    console.error('❌ Hata:', error.message);
  } finally {
    await pool.end();
  }
}

checkLast20();




















