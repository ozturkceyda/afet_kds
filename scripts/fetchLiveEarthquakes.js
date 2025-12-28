/**
 * Canlı Deprem Verilerini Çekme Scripti
 * 
 * Bu script AFAD veya Kandilli Rasathanesi'nden canlı deprem verilerini çeker
 * ve deprem_canli tablosuna kaydeder.
 * 
 * Kullanım:
 *   node scripts/fetchLiveEarthquakes.js
 * 
 * Otomatik çalıştırma için:
 *   - Windows: Task Scheduler
 *   - Linux/Mac: cron job
 *   - Her 5 dakikada bir çalıştırılabilir
 */

const pool = require('../config/database');
const https = require('https');
const http = require('http');

// Marmara bölgesi illeri (il_id mapping için)
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
      // Koordinat bazlı eşleştirme için
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
 * Kandilli verisini parse et
 * Format: Tarih, Saat, Enlem, Boylam, Derinlik, MD, ML, Mw, Yer
 * Örnek: 2025.12.17 02:23:44  39.2130   28.1757        8.4      -.-  1.3  -.-   YAYLACIK-SINDIRGI (BALIKESIR)
 */
function parseKandilliData(htmlData) {
  const earthquakes = [];
  
  // HTML içinden tablo verilerini çıkar
  const tableStart = htmlData.indexOf('<pre>');
  const tableEnd = htmlData.indexOf('</pre>');
  
  if (tableStart === -1 || tableEnd === -1) {
    return earthquakes;
  }
  
  const tableData = htmlData.substring(tableStart + 5, tableEnd);
  const dataLines = tableData.split('\n').filter(line => {
    // Boş satırları ve başlık satırlarını filtrele
    const trimmed = line.trim();
    return trimmed.length > 0 && 
           !trimmed.includes('Tarih') && 
           !trimmed.includes('---') &&
           !trimmed.includes('Büyüklük') &&
           trimmed.match(/^\d{4}\.\d{2}\.\d{2}/); // Tarih formatı ile başlayan satırlar
  });
  
  for (const line of dataLines) {
    try {
      // Kandilli lst6.asp formatı: 
      // 2025.12.17 02:23:44  39.2130   28.1757        8.4      -.-  1.3  -.-   YAYLACIK-SINDIRGI (BALIKESIR)
      const trimmed = line.trim();
      
      // Tarih ve saat
      const dateTimeMatch = trimmed.match(/^(\d{4}\.\d{2}\.\d{2})\s+(\d{2}:\d{2}:\d{2})/);
      if (!dateTimeMatch) continue;
      
      const dateStr = dateTimeMatch[1]; // 2025.12.17
      const timeStr = dateTimeMatch[2]; // 02:23:44
      
      // Kalan kısmı al
      const remaining = trimmed.substring(dateTimeMatch[0].length).trim();
      const parts = remaining.split(/\s+/);
      
      if (parts.length < 6) continue;
      
      const latitude = parseFloat(parts[0]);
      const longitude = parseFloat(parts[1]);
      const depth = parseFloat(parts[2]);
      
      // MD, ML, Mw değerlerini bul (-.- olabilir)
      // Format: enlem boylam derinlik MD ML Mw Yer
      // parts[0] = enlem, parts[1] = boylam, parts[2] = derinlik
      // parts[3] = MD, parts[4] = ML, parts[5] = Mw
      // parts[6+] = Yer bilgisi
      
      if (isNaN(latitude) || isNaN(longitude) || isNaN(depth)) {
        continue; // Geçersiz koordinat veya derinlik
      }
      
      // ML değerini bul (parts[4] konumunda)
      let ml = null;
      if (parts.length > 4 && parts[4] !== '-.-') {
        ml = parseFloat(parts[4]);
        if (isNaN(ml) || ml <= 0 || ml >= 10) {
          ml = null;
        }
      }
      
      // ML yoksa MD'yi dene (parts[3])
      if (!ml && parts.length > 3 && parts[3] !== '-.-') {
        const md = parseFloat(parts[3]);
        if (!isNaN(md) && md > 0 && md < 10) {
          ml = md;
        }
      }
      
      // ML yoksa Mw'yi dene (parts[5])
      if (!ml && parts.length > 5 && parts[5] !== '-.-') {
        const mw = parseFloat(parts[5]);
        if (!isNaN(mw) && mw > 0 && mw < 10) {
          ml = mw;
        }
      }
      
      if (!ml || isNaN(ml)) continue; // Büyüklük yoksa atla
      
      // Yer bilgisi: parts[6]'dan itibaren (MD, ML, Mw'den sonra)
      // Format: "KATRANDAGI-EMET (KUTAHYA) İlksel" veya benzeri
      const locationParts = parts.slice(6);
      const location = locationParts.join(' ').trim();
      
      // "İlksel" gibi gereksiz kelimeleri temizle
      const cleanedLocation = location.replace(/\s*İlksel\s*/gi, '').trim();
      
      // Tarih formatını düzelt
      // Kandilli Türkiye saati (UTC+3) kullanıyor, MySQL'e direkt Türkiye saati olarak kaydet
      const [year, month, day] = dateStr.split('.');
      const [hour, minute, second] = timeStr.split(':');
      
      // Tarih formatını düzelt - Kandilli'nin verdiği tarihi kullan
      // NOT: Kandilli bazen gelecek yıl gösterebilir (sistem saati sorunu), 
      // ama genellikle doğru tarih verir, bu yüzden direkt kullanıyoruz
      const parsedYear = parseInt(year);
      const parsedMonth = parseInt(month);
      const parsedDay = parseInt(day);
      
      // MySQL datetime formatı: YYYY-MM-DD HH:MM:SS (Türkiye saati olarak)
      const dateTimeStr = `${parsedYear}-${String(parsedMonth).padStart(2, '0')}-${String(parsedDay).padStart(2, '0')} ${hour.padStart(2, '0')}:${minute.padStart(2, '0')}:${second.padStart(2, '0')}`;
      
      // Önce location string'inden il adını çıkar
      let ilAdi = extractProvinceFromLocation(cleanedLocation);
      
      // Eğer location string'inde il adı yoksa, koordinat bazlı eşleştirme yap
      if (!ilAdi) {
        ilAdi = findProvinceByCoordinates(latitude, longitude);
      }
      
      // SADECE Marmara bölgesi illerinden biri ise kaydet
      // NOT: Koordinat kontrolü kaldırıldı - Sındırgı gibi ilçeler Ege'de olabilir ama il Marmara'da
      if (ilAdi && marmaraIlleri.hasOwnProperty(ilAdi)) {
        // İl ID'si yüklenmiş mi kontrol et
        const ilId = marmaraIlleri[ilAdi];
        
        // Eğer il ID null ise, veritabanından yükle
        if (ilId === null) {
          // Bu durumda koordinat bazlı eşleştirme yapılmış olabilir, atla
          continue;
        }
        
        // Koordinat kontrolü kaldırıldı - Sadece il adı kontrolü yeterli
        // Çünkü bazı ilçeler (ör: Sındırgı) Ege bölgesinde olabilir ama il (Balıkesir) Marmara'da
        earthquakes.push({
          il_id: ilId,
          ilce_id: null, // İlçe bilgisi yoksa null
          buyukluk: ml,
          derinlik: depth,
          tarih_saat: dateTimeStr, // MySQL datetime formatı (Türkiye saati)
          enlem: latitude,
          boylam: longitude,
          kaynak: 'Kandilli'
        });
      }
    } catch (error) {
      // Parse hatası, satırı atla
      continue;
    }
  }
  
  return earthquakes;
}

/**
 * Marmara bölgesi koordinat kontrolü
 * NOT: Bu fonksiyon artık kullanılmıyor - 11 Marmara ilinden gelen tüm depremler kabul ediliyor
 * (Sındırgı gibi Ege'de kalan ilçeler de dahil)
 */
function isMarmaraRegion(lat, lon) {
  // Marmara bölgesi sıkı koordinat sınırları
  // Enlem: 39.5 - 41.7 (Kuzey-Güney)
  // Boylam: 26.0 - 31.0 (Doğu-Batı)
  // NOT: Bu kontrol kaldırıldı - sadece il adı kontrolü yapılıyor
  return true; // Her zaman true döndür (kullanılmıyor)
}

/**
 * Türkçe karakterleri normalize et (karşılaştırma için)
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
 * Format: "YAYLACIK-SINDIRGI (BALIKESIR)" veya "İSTANBUL-KADIKÖY"
 * SADECE Marmara bölgesi illerini döndürür
 */
function extractProvinceFromLocation(location) {
  if (!location) return null;
  
  const locationUpper = location.toUpperCase();
  const locationNormalized = normalizeTurkish(location);
  
  // Parantez içindeki il adını bul: "(BALIKESIR)" veya "(CANAKKALE)"
  const parenMatch = locationUpper.match(/\(([^)]+)\)/);
  if (parenMatch) {
    const ilInParen = parenMatch[1].trim();
    const ilInParenNormalized = normalizeTurkish(ilInParen);
    
    // SADECE Marmara illerini kontrol et
    for (const il of Object.keys(marmaraIlleri)) {
      const ilUpper = il.toUpperCase();
      const ilNormalized = normalizeTurkish(il);
      
      // Normalize edilmiş karşılaştırma (Türkçe karakter sorununu çözer)
      if (ilInParenNormalized === ilNormalized || 
          ilInParenNormalized.includes(ilNormalized) ||
          ilNormalized.includes(ilInParenNormalized)) {
        return il; // Marmara il listesinde olduğu için direkt döndür
      }
    }
  }
  
  // Parantez yoksa direkt il adını ara (sadece Marmara illeri)
  for (const il of Object.keys(marmaraIlleri)) {
    const ilNormalized = normalizeTurkish(il);
    // Normalize edilmiş karşılaştırma
    if (locationNormalized.includes(ilNormalized)) {
      return il;
    }
  }
  
  return null;
}

/**
 * Koordinat bazlı il eşleştirmesi
 * Depremin koordinatına en yakın Marmara ilini bulur
 * NOT: Koordinat kontrolü kaldırıldı - Sadece en yakın Marmara ilini bulur
 */
function findProvinceByCoordinates(lat, lon) {
  if (!lat || !lon || provinceCoords.length === 0) {
    return null;
  }
  
  // Koordinat kontrolü KALDIRILDI - Sadece en yakın Marmara ilini bul
  let closestProvince = null;
  let minDistance = Infinity;
  
  for (const province of provinceCoords) {
    // Haversine formülü ile mesafe hesapla (basitleştirilmiş)
    const distance = Math.sqrt(
      Math.pow(lat - province.enlem, 2) + 
      Math.pow(lon - province.boylam, 2)
    );
    
    // Maksimum mesafe: ~2 derece (yaklaşık 200 km) - daha geniş aralık
    if (distance < 2.0 && distance < minDistance) {
      minDistance = distance;
      closestProvince = province;
    }
  }
  
  return closestProvince ? closestProvince.il_adi : null;
}

/**
 * AFAD'dan deprem verilerini çek
 * Kaynak: https://deprem.afad.gov.tr/last-earthquakes.html
 * HTML tablo formatından veri çekiliyor
 */
async function fetchFromAFAD() {
  return new Promise((resolve, reject) => {
    const url = 'https://deprem.afad.gov.tr/last-earthquakes.html';
    
    https.get(url, (res) => {
      let data = '';
      
      // HTTP status code kontrolü
      if (res.statusCode !== 200) {
        res.on('data', () => {}); // Drain response
        res.on('end', () => {
          reject(new Error(`HTTP ${res.statusCode}: AFAD sayfasına erişilemedi`));
        });
        return;
      }
      
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        try {
          const earthquakes = parseAFADHTML(data);
          resolve(earthquakes);
        } catch (error) {
          reject(new Error(`AFAD verisi parse edilirken hata: ${error.message}`));
        }
      });
    }).on('error', (error) => {
      reject(new Error(`Network hatası: ${error.message}`));
    });
  });
}

/**
 * AFAD HTML tablo verisini parse et
 * Format: HTML tablo - Tarih(TS) | Enlem | Boylam | Derinlik(Km) | Tip | Büyüklük | Yer
 * Örnek: 2025-12-18 18:18:22 | 39.17083 | 28.27556 | 5.49 | ML | 1.3 | Sındırgı (Balıkesir)
 */
function parseAFADHTML(htmlData) {
  const earthquakes = [];
  
  try {
    // HTML tablo içindeki <tr> satırlarını bul
    // Tablo formatı: <table> içinde <tr> satırları var
    const tableMatch = htmlData.match(/<table[^>]*>([\s\S]*?)<\/table>/i);
    if (!tableMatch) {
      console.log('⚠️  AFAD sayfasında tablo bulunamadı');
      return earthquakes;
    }
    
    const tableContent = tableMatch[1];
    // <tr> satırlarını bul (başlık satırını atla)
    const rowMatches = tableContent.matchAll(/<tr[^>]*>([\s\S]*?)<\/tr>/gi);
    
    let isFirstRow = true;
    for (const rowMatch of rowMatches) {
      const rowContent = rowMatch[1];
      
      // Başlık satırını atla
      if (isFirstRow) {
        isFirstRow = false;
        continue;
      }
      
      // <td> hücrelerini bul
      const cellMatches = rowContent.matchAll(/<td[^>]*>([\s\S]*?)<\/td>/gi);
      const cells = [];
      for (const cellMatch of cellMatches) {
        // HTML etiketlerini temizle
        const cellText = cellMatch[1]
          .replace(/<[^>]+>/g, '') // HTML etiketlerini kaldır
          .replace(/&nbsp;/g, ' ')
          .trim();
        cells.push(cellText);
      }
      
      // Hücre sayısı kontrolü (en az 7 hücre olmalı: Tarih, Enlem, Boylam, Derinlik, Tip, Büyüklük, Yer)
      if (cells.length < 7) {
        continue;
      }
      
      try {
        // Hücreleri parse et
        const tarihStr = cells[0]; // "2025-12-18 18:18:22"
        const enlem = parseFloat(cells[1]); // "39.17083"
        const boylam = parseFloat(cells[2]); // "28.27556"
        const derinlik = parseFloat(cells[3]); // "5.49"
        const tip = cells[4]; // "ML" (kullanılmayacak)
        const buyukluk = parseFloat(cells[5]); // "1.3"
        const yer = cells[6]; // "Sındırgı (Balıkesir)"
        
        // Geçerlik kontrolü
        if (isNaN(enlem) || isNaN(boylam) || isNaN(derinlik) || isNaN(buyukluk)) {
          continue;
        }
        
        // Tarih formatını düzelt: "2025-12-18 18:18:22" -> MySQL datetime formatı
        let dateTimeStr = '';
        if (tarihStr) {
          // Tarih formatı: "2025-12-18 18:18:22" (zaten MySQL formatında)
          dateTimeStr = tarihStr.trim();
        } else {
          // Tarih yoksa şimdiki zamanı kullan
          const now = new Date();
          dateTimeStr = now.toISOString().slice(0, 19).replace('T', ' ');
        }
        
        // Location string'inden il adını çıkar
        let ilAdi = extractProvinceFromLocation(yer);
        
        // Eğer location string'inde il adı yoksa, koordinat bazlı eşleştirme yap
        if (!ilAdi) {
          ilAdi = findProvinceByCoordinates(enlem, boylam);
        }
        
        // SADECE Marmara bölgesi illerinden biri ise kaydet
        if (ilAdi && marmaraIlleri.hasOwnProperty(ilAdi)) {
          const ilId = marmaraIlleri[ilAdi];
          
          if (ilId === null) {
            continue;
          }
          
          earthquakes.push({
            il_id: ilId,
            ilce_id: null,
            buyukluk: buyukluk,
            derinlik: derinlik,
            tarih_saat: dateTimeStr,
            enlem: enlem,
            boylam: boylam,
            kaynak: 'AFAD'
          });
        }
      } catch (error) {
        // Parse hatası, satırı atla
        continue;
      }
    }
  } catch (error) {
    console.error('AFAD HTML parse hatası:', error.message);
  }
  
  return earthquakes;
}

/**
 * Veritabanına deprem verilerini kaydet
 */
async function saveEarthquakes(earthquakes) {
  if (earthquakes.length === 0) {
    console.log('⚠️  Kaydedilecek deprem verisi yok');
    return;
  }
  
  let saved = 0;
  let skipped = 0;
  let errors = 0;
  
  for (const eq of earthquakes) {
    try {
      // Duplicate kontrolü: Aynı tarih-saat, büyüklük ve konumda deprem var mı?
      // Daha esnek kontrol: Tarih-saat tam eşleşmeli, koordinatlar yakın olmalı
      const [existing] = await pool.query(
        `SELECT id FROM deprem_canli 
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
        `INSERT INTO deprem_canli 
         (il_id, ilce_id, buyukluk, derinlik, tarih_saat, enlem, boylam, kaynak) 
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [eq.il_id, eq.ilce_id, eq.buyukluk, eq.derinlik, eq.tarih_saat, eq.enlem, eq.boylam, eq.kaynak]
      );
      
      saved++;
      console.log(`✅ Deprem kaydedildi: ${eq.buyukluk} büyüklüğünde - ${new Date(eq.tarih_saat).toLocaleString('tr-TR')}`);
    } catch (error) {
      errors++;
      console.error(`❌ Deprem kaydedilirken hata: ${error.message}`);
    }
  }
  
  console.log(`\n📊 Özet:`);
  console.log(`   ✅ Kaydedilen: ${saved}`);
  console.log(`   ⏭️  Atlanan (duplicate): ${skipped}`);
  console.log(`   ❌ Hatalar: ${errors}`);
}

/**
 * Ana fonksiyon
 */
async function main() {
  console.log('🚀 Canlı Deprem Verileri Çekme Scripti\n');
  
  try {
    // İl ID'lerini yükle
    await loadProvinceIds();
    
    // AFAD'dan veri çek
    console.log('\n📡 AFAD\'dan veri çekiliyor...');
    let afadData = [];
    try {
      afadData = await fetchFromAFAD();
      console.log(`   ✅ ${afadData.length} deprem verisi bulundu`);
    } catch (error) {
      console.log(`   ⚠️  AFAD'dan veri çekilemedi: ${error.message}`);
      console.log(`   📡 Kandilli Rasathanesi'nden veri çekiliyor...`);
    }
    
    // Kandilli'den veri çek
    let kandilliData = [];
    try {
      kandilliData = await fetchFromKandilli();
      console.log(`   ✅ ${kandilliData.length} deprem verisi bulundu`);
    } catch (error) {
      console.log(`   ⚠️  Kandilli'den veri çekilemedi: ${error.message}`);
    }
    
    // Debug: İl bazında dağılım
    const allData = [...afadData, ...kandilliData];
    if (allData.length > 0) {
      const ilCounts = {};
      const ilLatest = {};
      allData.forEach(eq => {
        const ilId = eq.il_id;
        ilCounts[ilId] = (ilCounts[ilId] || 0) + 1;
        if (!ilLatest[ilId] || new Date(eq.tarih_saat) > new Date(ilLatest[ilId].tarih_saat)) {
          ilLatest[ilId] = eq;
        }
      });
      
      console.log(`\n📋 İl bazında dağılım:`);
      for (const [ilId, count] of Object.entries(ilCounts)) {
        const [ilRow] = await pool.query('SELECT il_adi FROM iller WHERE id = ?', [ilId]);
        const ilAdi = ilRow.length > 0 ? ilRow[0].il_adi : 'Bilinmiyor';
        const latest = ilLatest[ilId];
        const tarih = latest ? new Date(latest.tarih_saat).toLocaleString('tr-TR') : '-';
        const kaynak = latest?.kaynak || 'Bilinmiyor';
        console.log(`   ${ilAdi}: ${count} deprem (en son: ${tarih}, ${latest?.buyukluk} büyüklüğünde, ${kaynak})`);
      }
    }
    
    // Tüm verileri birleştir (AFAD öncelikli, duplicate kontrolü yapılacak)
    const allEarthquakes = [...afadData, ...kandilliData];
    
    if (allEarthquakes.length > 0) {
      console.log(`\n💾 Veritabanına kaydediliyor...`);
      await saveEarthquakes(allEarthquakes);
    } else {
      console.log('\n⚠️  Kaydedilecek deprem verisi bulunamadı');
    }
    
    console.log('\n✅ Script tamamlandı');
  } catch (error) {
    console.error('\n❌ Hata:', error.message);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

// Script çalıştırma
if (require.main === module) {
  main();
}

module.exports = { fetchFromKandilli, fetchFromAFAD, saveEarthquakes };

