/**
 * AFAD Son 30 Günlük Deprem Verilerini Çekme Scripti
 * 
 * Bu script Kandilli Rasathanesi'nden son 30 günlük Marmara bölgesi depremlerini çeker
 * ve deprem_gecmis tablosuna kaydeder.
 * 
 * Kullanım:
 *   node scripts/fetchAFADLast30Days.js
 */

const pool = require('../config/database');
const http = require('http');

// Marmara bölgesi illeri
const marmaraIlleri = {
  'İstanbul': null,
  'Bursa': null,
  'Kocaeli': null,
  'Sakarya': null,
  'Balıkesir': null,
  'Çanakkale': null,
  'Tekirdağ': null,
  'Yalova': null,
  'Bilecik': null,
  'Edirne': null,
  'Kırklareli': null
};

// İl ID'lerini ve koordinatlarını yükle
let provinceCoords = [];

async function loadProvinceIds() {
  try {
    const [rows] = await pool.query('SELECT id, il_adi, enlem, boylam FROM iller WHERE bolge = "Marmara"');
    rows.forEach(row => {
      if (marmaraIlleri.hasOwnProperty(row.il_adi)) {
        marmaraIlleri[row.il_adi] = row.id;
      }
      provinceCoords.push({
        id: row.id,
        il_adi: row.il_adi,
        enlem: parseFloat(row.enlem),
        boylam: parseFloat(row.boylam)
      });
    });
    console.log('✅ İl ID\'leri ve koordinatları yüklendi');
  } catch (error) {
    console.error('❌ İl ID\'leri yüklenirken hata:', error.message);
  }
}

/**
 * Kandilli Rasathanesi'nden deprem verilerini çek
 * Kaynak: http://www.koeri.boun.edu.tr/scripts/lst6.asp
 */
async function fetchFromKandilli() {
  return new Promise((resolve, reject) => {
    const url = 'http://www.koeri.boun.edu.tr/scripts/lst6.asp';
    
    http.get(url, (res) => {
      let data = '';
      
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        try {
          const earthquakes = parseKandilliData(data);
          resolve(earthquakes);
        } catch (error) {
          reject(error);
        }
      });
    }).on('error', (error) => {
      reject(error);
    });
  });
}

/**
 * Kandilli verisini parse et ve son 30 günlük verileri filtrele
 */
function parseKandilliData(htmlData) {
  const earthquakes = [];
  const now = new Date();
  const thirtyDaysAgo = new Date(now.getTime() - (30 * 24 * 60 * 60 * 1000));
  
  const tableStart = htmlData.indexOf('<pre>');
  const tableEnd = htmlData.indexOf('</pre>');
  
  if (tableStart === -1 || tableEnd === -1) {
    return earthquakes;
  }
  
  const tableData = htmlData.substring(tableStart + 5, tableEnd);
  const dataLines = tableData.split('\n').filter(line => {
    const trimmed = line.trim();
    return trimmed.length > 0 && 
           !trimmed.includes('Tarih') && 
           !trimmed.includes('---') &&
           !trimmed.includes('Büyüklük') &&
           trimmed.match(/^\d{4}\.\d{2}\.\d{2}/);
  });
  
  for (const line of dataLines) {
    try {
      const trimmed = line.trim();
      
      const dateTimeMatch = trimmed.match(/^(\d{4}\.\d{2}\.\d{2})\s+(\d{2}:\d{2}:\d{2})/);
      if (!dateTimeMatch) continue;
      
      const dateStr = dateTimeMatch[1];
      const timeStr = dateTimeMatch[2];
      
      // Tarih kontrolü - Son 30 gün içinde mi?
      const [year, month, day] = dateStr.split('.');
      const eventDate = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
      
      if (eventDate < thirtyDaysAgo || isNaN(eventDate.getTime())) {
        continue; // Son 30 gün dışında, atla
      }
      
      const remaining = trimmed.substring(dateTimeMatch[0].length).trim();
      const parts = remaining.split(/\s+/);
      
      if (parts.length < 6) continue;
      
      const latitude = parseFloat(parts[0]);
      const longitude = parseFloat(parts[1]);
      const depth = parseFloat(parts[2]);
      
      if (isNaN(latitude) || isNaN(longitude) || isNaN(depth)) {
        continue;
      }
      
      let ml = null;
      if (parts.length > 4 && parts[4] !== '-.-') {
        ml = parseFloat(parts[4]);
        if (isNaN(ml) || ml <= 0 || ml >= 10) {
          ml = null;
        }
      }
      
      if (!ml && parts.length > 3 && parts[3] !== '-.-') {
        const md = parseFloat(parts[3]);
        if (!isNaN(md) && md > 0 && md < 10) {
          ml = md;
        }
      }
      
      if (!ml && parts.length > 5 && parts[5] !== '-.-') {
        const mw = parseFloat(parts[5]);
        if (!isNaN(mw) && mw > 0 && mw < 10) {
          ml = mw;
        }
      }
      
      if (!ml || isNaN(ml)) continue;
      
      const locationParts = parts.slice(6);
      const location = locationParts.join(' ').trim();
      const cleanedLocation = location.replace(/\s*İlksel\s*/gi, '').trim();
      
      const [y, m, d] = dateStr.split('.');
      const [hour, minute, second] = timeStr.split(':');
      
      const parsedYear = parseInt(y);
      const parsedMonth = parseInt(m);
      const parsedDay = parseInt(d);
      
      const dateTimeStr = `${parsedYear}-${String(parsedMonth).padStart(2, '0')}-${String(parsedDay).padStart(2, '0')} ${hour.padStart(2, '0')}:${minute.padStart(2, '0')}:${second.padStart(2, '0')}`;
      
      let ilAdi = extractProvinceFromLocation(cleanedLocation);
      
      if (!ilAdi) {
        ilAdi = findProvinceByCoordinates(latitude, longitude);
      }
      
      if (ilAdi && marmaraIlleri.hasOwnProperty(ilAdi)) {
        const ilId = marmaraIlleri[ilAdi];
        
        if (ilId === null) {
          continue;
        }
        
        earthquakes.push({
          il_id: ilId,
          ilce_id: null,
          buyukluk: ml,
          derinlik: depth,
          tarih_saat: dateTimeStr,
          enlem: latitude,
          boylam: longitude,
          kaynak: 'Kandilli'
        });
      }
    } catch (error) {
      continue;
    }
  }
  
  return earthquakes;
}

/**
 * Türkçe karakterleri normalize et
 */
function normalizeTurkish(text) {
  return text
    .toUpperCase()
    .replace(/Ç/g, 'C')
    .replace(/Ğ/g, 'G')
    .replace(/İ/g, 'I')
    .replace(/Ö/g, 'O')
    .replace(/Ş/g, 'S')
    .replace(/Ü/g, 'U');
}

/**
 * Location string'inden il adını çıkar
 */
function extractProvinceFromLocation(location) {
  if (!location) return null;
  
  const locationUpper = location.toUpperCase();
  const locationNormalized = normalizeTurkish(location);
  
  const parenMatch = locationUpper.match(/\(([^)]+)\)/);
  if (parenMatch) {
    const ilInParen = parenMatch[1].trim();
    const ilInParenNormalized = normalizeTurkish(ilInParen);
    
    for (const il of Object.keys(marmaraIlleri)) {
      const ilNormalized = normalizeTurkish(il);
      
      if (ilInParenNormalized === ilNormalized || 
          ilInParenNormalized.includes(ilNormalized) ||
          ilNormalized.includes(ilInParenNormalized)) {
        return il;
      }
    }
  }
  
  for (const il of Object.keys(marmaraIlleri)) {
    const ilNormalized = normalizeTurkish(il);
    if (locationNormalized.includes(ilNormalized)) {
      return il;
    }
  }
  
  return null;
}

/**
 * Koordinat bazlı il eşleştirmesi
 */
function findProvinceByCoordinates(lat, lon) {
  if (!lat || !lon || provinceCoords.length === 0) {
    return null;
  }
  
  let closestProvince = null;
  let minDistance = Infinity;
  
  for (const province of provinceCoords) {
    const distance = Math.sqrt(
      Math.pow(lat - province.enlem, 2) + 
      Math.pow(lon - province.boylam, 2)
    );
    
    if (distance < 2.0 && distance < minDistance) {
      minDistance = distance;
      closestProvince = province;
    }
  }
  
  return closestProvince ? closestProvince.il_adi : null;
}

/**
 * Deprem geçmişi tablosunu temizle
 */
async function clearEarthquakeHistory() {
  try {
    const [result] = await pool.query('DELETE FROM deprem_gecmis');
    console.log(`✅ Deprem geçmişi temizlendi (${result.affectedRows} kayıt silindi)`);
  } catch (error) {
    console.error('❌ Deprem geçmişi temizlenirken hata:', error.message);
    throw error;
  }
}

/**
 * Veritabanına deprem verilerini kaydet
 */
async function saveEarthquakes(earthquakes) {
  if (earthquakes.length === 0) {
    console.log('⚠️  Kaydedilecek deprem verisi yok');
    return { saved: 0, skipped: 0, errors: 0 };
  }
  
  let saved = 0;
  let skipped = 0;
  let errors = 0;
  
  for (const eq of earthquakes) {
    try {
      // Duplicate kontrolü
      const [existing] = await pool.query(
        `SELECT id FROM deprem_gecmis 
         WHERE tarih_saat = ? 
         AND il_id = ?
         AND ABS(buyukluk - ?) < 0.15 
         AND ABS(enlem - ?) < 0.02 
         AND ABS(boylam - ?) < 0.02`,
        [eq.tarih_saat, eq.il_id, eq.buyukluk, eq.enlem, eq.boylam]
      );
      
      if (existing.length > 0) {
        skipped++;
        continue;
      }
      
      // Yeni deprem kaydı ekle
      await pool.query(
        `INSERT INTO deprem_gecmis 
         (il_id, ilce_id, buyukluk, derinlik, tarih_saat, enlem, boylam, kaynak) 
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [eq.il_id, eq.ilce_id, eq.buyukluk, eq.derinlik, eq.tarih_saat, eq.enlem, eq.boylam, eq.kaynak]
      );
      
      saved++;
    } catch (error) {
      errors++;
      console.error(`❌ Deprem kaydedilirken hata: ${error.message}`);
    }
  }
  
  console.log(`\n📊 Kayıt Özeti:`);
  console.log(`   ✅ Kaydedilen: ${saved}`);
  console.log(`   ⏭️  Atlanan (duplicate): ${skipped}`);
  console.log(`   ❌ Hatalar: ${errors}`);
  
  return { saved, skipped, errors };
}

/**
 * İl bazında deprem sayılarını sırala ve göster
 */
async function showProvinceStatistics(earthquakes) {
  if (earthquakes.length === 0) {
    console.log('\n⚠️  İstatistik gösterilecek deprem verisi yok');
    return [];
  }
  
  // İl bazında sayıları hesapla
  const ilCounts = {};
  const ilMagnitudes = {};
  
  for (const eq of earthquakes) {
    const ilId = eq.il_id;
    ilCounts[ilId] = (ilCounts[ilId] || 0) + 1;
    
    if (!ilMagnitudes[ilId]) {
      ilMagnitudes[ilId] = [];
    }
    ilMagnitudes[ilId].push(eq.buyukluk);
  }
  
  // İl adlarını al
  const ilNames = {};
  for (const ilId of Object.keys(ilCounts)) {
    const [rows] = await pool.query('SELECT il_adi FROM iller WHERE id = ?', [ilId]);
    if (rows.length > 0) {
      ilNames[ilId] = rows[0].il_adi;
    }
  }
  
  // Sırala (en çok deprem olan il en üstte)
  const sorted = Object.entries(ilCounts)
    .sort((a, b) => b[1] - a[1])
    .map(([ilId, count]) => ({
      ilId: parseInt(ilId),
      ilAdi: ilNames[ilId] || 'Bilinmiyor',
      count: count,
      avgMagnitude: ilMagnitudes[ilId] 
        ? (ilMagnitudes[ilId].reduce((sum, m) => sum + m, 0) / ilMagnitudes[ilId].length).toFixed(2)
        : '0.00',
      maxMagnitude: ilMagnitudes[ilId] 
        ? Math.max(...ilMagnitudes[ilId]).toFixed(2)
        : '0.00'
    }));
  
  console.log('\n📊 İl Bazında Deprem İstatistikleri (Son 30 Gün):');
  console.log('═'.repeat(80));
  console.log(`${'Sıra'.padEnd(6)}${'İl'.padEnd(20)}${'Deprem Sayısı'.padEnd(15)}${'Ort. Büyüklük'.padEnd(15)}${'Max Büyüklük'}`);
  console.log('─'.repeat(80));
  
  sorted.forEach((item, index) => {
    console.log(
      `${String(index + 1).padEnd(6)}${item.ilAdi.padEnd(20)}${String(item.count).padEnd(15)}${item.avgMagnitude.padEnd(15)}${item.maxMagnitude}`
    );
  });
  
  console.log('═'.repeat(80));
  console.log(`Toplam: ${earthquakes.length} deprem`);
  
  return sorted;
}

/**
 * Ana fonksiyon
 */
async function main() {
  console.log('🚀 AFAD Son 30 Günlük Deprem Verileri Çekme Scripti\n');
  console.log('📡 Kaynak: Kandilli Rasathanesi (http://www.koeri.boun.edu.tr/)\n');
  
  try {
    // İl ID'lerini yükle
    await loadProvinceIds();
    
    // Deprem geçmişi tablosunu temizle
    console.log('🗑️  Deprem geçmişi temizleniyor...');
    await clearEarthquakeHistory();
    
    // Kandilli'den son 30 günlük verileri çek
    console.log('\n📡 Kandilli Rasathanesi\'nden son 30 günlük veriler çekiliyor...');
    const earthquakes = await fetchFromKandilli();
    console.log(`   ✅ ${earthquakes.length} deprem verisi bulundu (Marmara bölgesi, son 30 gün)`);
    
    if (earthquakes.length > 0) {
      // İstatistikleri göster
      await showProvinceStatistics(earthquakes);
      
      // Veritabanına kaydet
      console.log(`\n💾 Veritabanına kaydediliyor...`);
      await saveEarthquakes(earthquakes);
    } else {
      console.log('\n⚠️  Kaydedilecek deprem verisi bulunamadı');
    }
    
    console.log('\n✅ Script tamamlandı');
  } catch (error) {
    console.error('\n❌ Hata:', error.message);
    console.error(error.stack);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

// Script çalıştırma
if (require.main === module) {
  main();
}

module.exports = { fetchFromKandilli, clearEarthquakeHistory, showProvinceStatistics };
