/**
 * Balıkesir depremlerini kontrol et
 */

require('dotenv').config();
const pool = require('../config/database');

async function checkBalikesir() {
  try {
    const [rows] = await pool.query(`
      SELECT 
        dc.tarih_saat, 
        dc.buyukluk, 
        dc.enlem,
        dc.boylam,
        i.il_adi 
      FROM deprem_canli dc 
      INNER JOIN iller i ON dc.il_id = i.id 
      WHERE i.il_adi = 'Balıkesir' 
      ORDER BY dc.tarih_saat DESC 
      LIMIT 10
    `);
    
    console.log('📊 En son 10 Balıkesir depremi:\n');
    if (rows.length === 0) {
      console.log('  ⚠️  Balıkesir depremi bulunamadı');
    } else {
      rows.forEach((r, i) => {
        const tarih = new Date(r.tarih_saat).toLocaleString('tr-TR');
        console.log(`${i + 1}. ${tarih} - ${r.buyukluk} büyüklüğünde - (${r.enlem}, ${r.boylam})`);
      });
    }
    
    // Tüm illerden en son depremler
    const [allRows] = await pool.query(`
      SELECT 
        i.il_adi,
        MAX(dc.tarih_saat) as en_son,
        COUNT(*) as toplam
      FROM deprem_canli dc
      INNER JOIN iller i ON dc.il_id = i.id
      GROUP BY i.il_adi
      ORDER BY en_son DESC
    `);
    
    console.log('\n📋 Tüm illerden en son depremler:\n');
    allRows.forEach(r => {
      const tarih = new Date(r.en_son).toLocaleString('tr-TR');
      console.log(`  ${r.il_adi}: ${r.toplam} deprem (en son: ${tarih})`);
    });
    
  } catch (error) {
    console.error('❌ Hata:', error.message);
  } finally {
    await pool.end();
  }
}

checkBalikesir();




















