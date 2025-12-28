/**
 * Son 30 Günlük Deprem Analizi
 */

const pool = require('../config/database');

async function analyzeLast30Days() {
  try {
    const [rows] = await pool.query(`
      SELECT 
        i.il_adi, 
        COUNT(dg.id) as deprem_sayisi,
        AVG(dg.buyukluk) as ortalama_buyukluk,
        MAX(dg.buyukluk) as max_buyukluk,
        MIN(dg.buyukluk) as min_buyukluk,
        AVG(dg.derinlik) as ortalama_derinlik,
        COUNT(CASE WHEN dg.buyukluk >= 3.0 THEN 1 END) as buyuk_deprem_sayisi
      FROM iller i
      LEFT JOIN deprem_gecmis dg ON i.id = dg.il_id
        AND dg.tarih_saat >= DATE_SUB(NOW(), INTERVAL 30 DAY)
      WHERE i.bolge = 'Marmara'
      GROUP BY i.id, i.il_adi
      HAVING deprem_sayisi > 0
      ORDER BY deprem_sayisi DESC
    `);

    console.log('\n📊 Son 30 Günlük Deprem Analizi ve Çıkarımlar\n');
    console.log('═'.repeat(90));
    
    rows.forEach((row, index) => {
      const ilAdi = row.il_adi.padEnd(15);
      const sayi = row.deprem_sayisi.toString().padStart(3);
      const ort = parseFloat(row.ortalama_buyukluk).toFixed(2);
      const max = parseFloat(row.max_buyukluk).toFixed(2);
      const derinlik = parseFloat(row.ortalama_derinlik).toFixed(1);
      const buyuk = parseInt(row.buyuk_deprem_sayisi || 0);
      
      console.log(`${(index + 1).toString().padStart(2)}. ${ilAdi} - ${sayi} deprem | Ort: ${ort} | Max: ${max} | Derinlik: ${derinlik} km | 3.0+: ${buyuk}`);
    });
    
    console.log('═'.repeat(90));
    
    const total = rows.reduce((sum, r) => sum + parseInt(r.deprem_sayisi), 0);
    const avgMag = rows.reduce((sum, r) => sum + parseFloat(r.ortalama_buyukluk) * parseInt(r.deprem_sayisi), 0) / total;
    const totalBuyuk = rows.reduce((sum, r) => sum + parseInt(r.buyuk_deprem_sayisi || 0), 0);
    const enRiskli = rows[0];
    const enAzRiskli = rows[rows.length - 1];
    
    console.log(`\n📈 Genel İstatistikler:`);
    console.log(`   • Toplam Deprem: ${total}`);
    console.log(`   • Genel Ortalama Büyüklük: ${avgMag.toFixed(2)}`);
    console.log(`   • 3.0+ Büyüklüğünde Deprem: ${totalBuyuk} (${((totalBuyuk/total)*100).toFixed(1)}%)`);
    
    console.log(`\n🎯 Çıkarımlar ve Öneriler:\n`);
    
    // 1. En riskli il
    console.log(`1. EN RİSKLİ BÖLGE: ${enRiskli.il_adi}`);
    console.log(`   • Son 30 günde ${enRiskli.deprem_sayisi} deprem kaydedildi`);
    console.log(`   • Ortalama büyüklük: ${parseFloat(enRiskli.ortalama_buyukluk).toFixed(2)}`);
    console.log(`   • Maksimum büyüklük: ${parseFloat(enRiskli.max_buyukluk).toFixed(2)}`);
    console.log(`   • ÖNERİ: Bu bölgede sismik aktivite yüksek. Acil durum planları gözden geçirilmeli.`);
    
    // 2. Deprem yoğunluğu analizi
    const yuksekAktivite = rows.filter(r => parseInt(r.deprem_sayisi) >= 50);
    const ortaAktivite = rows.filter(r => parseInt(r.deprem_sayisi) >= 20 && parseInt(r.deprem_sayisi) < 50);
    const dusukAktivite = rows.filter(r => parseInt(r.deprem_sayisi) < 20);
    
    console.log(`\n2. AKTİVİTE SEVİYELERİ:`);
    console.log(`   • Yüksek Aktivite (50+ deprem): ${yuksekAktivite.length} il`);
    if (yuksekAktivite.length > 0) {
      console.log(`     - ${yuksekAktivite.map(r => r.il_adi).join(', ')}`);
      console.log(`     - ÖNERİ: Bu illerde sürekli izleme ve erken uyarı sistemleri aktif tutulmalı.`);
    }
    console.log(`   • Orta Aktivite (20-49 deprem): ${ortaAktivite.length} il`);
    if (ortaAktivite.length > 0) {
      console.log(`     - ${ortaAktivite.map(r => r.il_adi).join(', ')}`);
    }
    console.log(`   • Düşük Aktivite (<20 deprem): ${dusukAktivite.length} il`);
    if (dusukAktivite.length > 0) {
      console.log(`     - ${dusukAktivite.map(r => r.il_adi).join(', ')}`);
    }
    
    // 3. Büyük deprem analizi
    if (totalBuyuk > 0) {
      console.log(`\n3. BÜYÜK DEPREMLER (3.0+):`);
      const buyukDepremIller = rows.filter(r => parseInt(r.buyuk_deprem_sayisi || 0) > 0);
      buyukDepremIller.forEach(r => {
        console.log(`   • ${r.il_adi}: ${r.buyuk_deprem_sayisi} adet (Max: ${parseFloat(r.max_buyukluk).toFixed(2)})`);
      });
      console.log(`   • ÖNERİ: 3.0+ büyüklüğündeki depremler yapısal hasar riski taşır.`);
      console.log(`     Bu bölgelerde bina güvenliği denetimleri yapılmalı.`);
    }
    
    // 4. Derinlik analizi
    const sığDepremler = rows.filter(r => parseFloat(r.ortalama_derinlik) < 10);
    const derinDepremler = rows.filter(r => parseFloat(r.ortalama_derinlik) >= 10);
    
    console.log(`\n4. DEPREM DERİNLİĞİ ANALİZİ:`);
    console.log(`   • Sığ Depremler (<10 km): ${sığDepremler.length} il`);
    if (sığDepremler.length > 0) {
      console.log(`     - ${sığDepremler.map(r => `${r.il_adi} (${parseFloat(r.ortalama_derinlik).toFixed(1)} km)`).join(', ')}`);
      console.log(`     - ÖNERİ: Sığ depremler daha fazla hasar riski taşır.`);
    }
    console.log(`   • Derin Depremler (≥10 km): ${derinDepremler.length} il`);
    
    // 5. Günlük ortalama
    const gunlukOrtalama = (total / 30).toFixed(1);
    console.log(`\n5. GÜNLÜK AKTİVİTE:`);
    console.log(`   • Günlük Ortalama: ${gunlukOrtalama} deprem/gün`);
    if (parseFloat(gunlukOrtalama) > 10) {
      console.log(`   • ÖNERİ: Yüksek günlük aktivite. Sürekli izleme gereklidir.`);
    }
    
    // 6. Genel öneriler
    console.log(`\n6. GENEL ÖNERİLER:`);
    console.log(`   • Tüm Marmara bölgesi aktif fay hatları üzerinde.`);
    console.log(`   • Düzenli sismik izleme ve erken uyarı sistemleri kritik öneme sahip.`);
    console.log(`   • Halkın deprem bilinci ve hazırlık eğitimleri sürekli yapılmalı.`);
    console.log(`   • Bina güvenliği denetimleri özellikle yüksek aktivite gösteren`);
    console.log(`     bölgelerde (${yuksekAktivite.map(r => r.il_adi).join(', ')}) öncelikli olmalı.`);
    console.log(`   • Acil durum planları ve afet yönetimi protokolleri güncel tutulmalı.`);
    
    console.log(`\n✅ Analiz tamamlandı!\n`);
    
    await pool.end();
  } catch (error) {
    console.error('❌ Hata:', error.message);
    process.exit(1);
  }
}

if (require.main === module) {
  analyzeLast30Days();
}

module.exports = { analyzeLast30Days };

