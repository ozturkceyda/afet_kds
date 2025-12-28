/**
 * Excel'den Deprem Verileri Yükleme Scripti
 * 
 * Bu script Excel dosyalarından deprem verilerini okuyup veritabanına yükler
 * Marmara bölgesi illerini otomatik filtreler
 */

const mysql = require('mysql2/promise');
const XLSX = require('xlsx');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

const db = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 3306,
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'kds_afet_yönetimi'
});

// Marmara bölgesi illeri
const marmaraIlleri = [
  'İstanbul', 'Bursa', 'Kocaeli', 'Sakarya', 'Balıkesir',
  'Çanakkale', 'Tekirdağ', 'Yalova', 'Bilecik', 'Edirne', 'Kırklareli'
];

/**
 * Location string'inden il adını çıkar
 * Örnek: "Gölcük-Kocaeli" -> "Kocaeli"
 *        "Çanakkale" -> "Çanakkale"
 *        "Şarköy-Tekirdağ" -> "Tekirdağ"
 */
function extractIlFromLocation(location) {
  if (!location) return null;
  
  // Marmara illerini kontrol et
  for (const il of marmaraIlleri) {
    if (location.includes(il)) {
      return il;
    }
  }
  
  // Eğer direkt il adıysa
  const normalizedLocation = location.trim();
  if (marmaraIlleri.includes(normalizedLocation)) {
    return normalizedLocation;
  }
  
  return null;
}

/**
 * Location string'inden ilçe adını çıkar
 * Örnek: "Gölcük-Kocaeli" -> "Gölcük"
 */
function extractIlceFromLocation(location) {
  if (!location) return null;
  
  // Tire (-) ile ayrılmışsa ilk kısım ilçe olabilir
  const parts = location.split('-');
  if (parts.length > 1) {
    const firstPart = parts[0].trim();
    // Eğer ilk kısım bir il değilse, ilçe olabilir
    if (!marmaraIlleri.includes(firstPart)) {
      return firstPart;
    }
  }
  
  return null;
}

/**
 * Excel dosyasını oku ve parse et
 */
function readExcelFile(filePath) {
  try {
    console.log(`📂 Excel dosyası okunuyor: ${filePath}\n`);
    
    const workbook = XLSX.readFile(filePath);
    const sheetNames = workbook.SheetNames;
    
    console.log(`📊 Bulunan sayfalar: ${sheetNames.join(', ')}\n`);
    
    const allData = [];
    
    // Her sayfayı oku
    for (const sheetName of sheetNames) {
      console.log(`📄 Sayfa okunuyor: ${sheetName}`);
      
      const worksheet = workbook.Sheets[sheetName];
      const jsonData = XLSX.utils.sheet_to_json(worksheet);
      
      console.log(`   ${jsonData.length} satır bulundu`);
      
      // Sütun isimlerini normalize et - Excel'deki sütun isimlerini direkt kullan
      const normalizedData = jsonData.map(row => {
        const normalized = {};
        
        // Location sütunundan il ve ilçe adını çıkar
        if (row.Location) {
          const location = String(row.Location).trim();
          const ilAdi = extractIlFromLocation(location);
          if (ilAdi) {
            normalized.il_adi = ilAdi;
          }
          const ilceAdi = extractIlceFromLocation(location);
          if (ilceAdi) {
            normalized.ilce_adi = ilceAdi;
          }
        }
        
        // Büyüklük - Magnitude sütunu
        if (row.Magnitude !== null && row.Magnitude !== undefined && row.Magnitude !== '') {
          normalized.buyukluk = typeof row.Magnitude === 'number' ? row.Magnitude : parseFloat(row.Magnitude);
        }
        
        // Derinlik - Depth sütunu
        if (row.Depth !== null && row.Depth !== undefined && row.Depth !== '') {
          normalized.derinlik = typeof row.Depth === 'number' ? row.Depth : parseFloat(row.Depth);
        }
        
        // Tarih - Date sütunu
        if (row.Date) {
          normalized.tarih_saat = row.Date;
        }
        
        // Enlem - Latitude sütunu
        if (row.Latitude !== null && row.Latitude !== undefined && row.Latitude !== '') {
          normalized.enlem = typeof row.Latitude === 'number' ? row.Latitude : parseFloat(row.Latitude);
        }
        
        // Boylam - Longitude sütunu
        if (row.Longitude !== null && row.Longitude !== undefined && row.Longitude !== '') {
          normalized.boylam = typeof row.Longitude === 'number' ? row.Longitude : parseFloat(row.Longitude);
        }
        
        return normalized;
      });
      
      allData.push(...normalizedData);
    }
    
    console.log(`\n✅ Toplam ${allData.length} satır okundu\n`);
    
    // Marmara bölgesi için filtrele
    const marmaraData = allData.filter(row => {
      if (!row.il_adi) return false;
      
      // İl adını normalize et ve kontrol et
      const ilAdi = String(row.il_adi).trim();
      return marmaraIlleri.some(il => {
        return ilAdi.includes(il) || il.includes(ilAdi) || ilAdi === il;
      });
    });
    
    // İl adlarını normalize et
    const normalizedMarmaraData = marmaraData.map(row => {
      const ilAdi = String(row.il_adi).trim();
      const normalizedIl = marmaraIlleri.find(il => 
        ilAdi.includes(il) || il.includes(ilAdi) || ilAdi === il
      );
      
      if (normalizedIl) {
        row.il_adi = normalizedIl;
      }
      
      return row;
    });
    
    console.log(`📍 Marmara bölgesi için ${normalizedMarmaraData.length} deprem verisi bulundu\n`);
    
    return normalizedMarmaraData;
    
  } catch (error) {
    console.error('❌ Excel dosyası okunurken hata:', error.message);
    throw error;
  }
}

/**
 * Tarih formatını düzelt
 */
function normalizeDate(dateValue) {
  if (!dateValue) return null;
  
  // Excel tarih numarasıysa dönüştür
  if (typeof dateValue === 'number') {
    const excelEpoch = new Date(1899, 11, 30);
    const date = new Date(excelEpoch.getTime() + dateValue * 86400000);
    return date.toISOString().slice(0, 19).replace('T', ' ');
  }
  
  // String ise formatı düzelt
  if (typeof dateValue === 'string') {
    // DD/MM/YYYY HH:MM:SS formatını YYYY-MM-DD HH:MM:SS'e çevir
    // Örnek: "11/08/1903 06:29:50" -> "1903-08-11 06:29:50"
    const ddmmyyyyMatch = dateValue.match(/(\d{2})\/(\d{2})\/(\d{4})\s+(\d{2}:\d{2}:\d{2})/);
    if (ddmmyyyyMatch) {
      const [, day, month, year, time] = ddmmyyyyMatch;
      return `${year}-${month}-${day} ${time}`;
    }
    
    // YYYY-MM-DD formatını kontrol et
    const yyyymmddMatch = dateValue.match(/(\d{4})-(\d{2})-(\d{2})/);
    if (yyyymmddMatch) {
      return dateValue.substring(0, 19);
    }
    
    // Date objesi olarak parse et
    const date = new Date(dateValue);
    if (!isNaN(date.getTime())) {
      return date.toISOString().slice(0, 19).replace('T', ' ');
    }
  }
  
  return dateValue;
}

/**
 * Deprem verilerini veritabanına yükle
 */
async function loadEarthquakeData(depremler, tableName) {
  try {
    console.log(`📊 ${tableName} tablosuna yükleniyor...\n`);
    
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
    let totalSkipped = 0;
    
    for (const deprem of depremler) {
      // Gerekli alanları kontrol et
      if (!deprem.il_adi || !deprem.buyukluk || !deprem.tarih_saat || !deprem.enlem || !deprem.boylam) {
        if (totalSkipped < 5) {
          console.log(`⚠️  Eksik veri: il=${deprem.il_adi}, buyukluk=${deprem.buyukluk}, tarih=${deprem.tarih_saat}, enlem=${deprem.enlem}, boylam=${deprem.boylam}`);
        }
        totalSkipped++;
        continue;
      }
      
      const ilId = provinceMap[deprem.il_adi];
      
      if (!ilId) {
        totalSkipped++;
        continue;
      }
      
      let ilceId = null;
      if (deprem.ilce_adi) {
        const key = `${ilId}_${deprem.ilce_adi}`;
        ilceId = districtMap[key] || null;
      }
      
      // Tarih formatını düzelt
      const tarihSaat = normalizeDate(deprem.tarih_saat);
      
      try {
        if (tableName === 'deprem_canli') {
          await db.query(
            `INSERT INTO deprem_canli 
             (il_id, ilce_id, buyukluk, derinlik, tarih_saat, enlem, boylam, kaynak) 
             VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
            [
              ilId,
              ilceId,
              deprem.buyukluk,
              deprem.derinlik || null,
              tarihSaat,
              deprem.enlem,
              deprem.boylam,
              'AFAD'
            ]
          );
        } else if (tableName === 'deprem_gecmis') {
          await db.query(
            `INSERT INTO deprem_gecmis 
             (il_id, ilce_id, buyukluk, derinlik, tarih_saat, enlem, boylam, hasar_bilgisi, kaynak) 
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
              ilId,
              ilceId,
              deprem.buyukluk,
              deprem.derinlik || null,
              tarihSaat,
              deprem.enlem,
              deprem.boylam,
              deprem.hasar_bilgisi || null,
              'AFAD'
            ]
          );
        }
        
        totalAdded++;
      } catch (error) {
        if (error.code === 'ER_DUP_ENTRY') {
          totalSkipped++;
        } else {
          console.error(`❌ Hata (${deprem.il_adi}):`, error.message);
          totalSkipped++;
        }
      }
    }
    
    console.log(`✅ ${totalAdded} deprem verisi eklendi`);
    console.log(`⏭️  ${totalSkipped} deprem verisi atlandı\n`);
    
  } catch (error) {
    console.error('❌ Deprem verileri yüklenirken hata:', error.message);
    throw error;
  }
}

/**
 * Ana fonksiyon
 */
async function main() {
  try {
    console.log('🚀 Excel\'den Deprem Verileri Yükleme Scripti\n');
    
    // Excel dosya yolu
    const excelPath = process.argv[2] || path.join(__dirname, '..', 'data', 'earthquake_data.xlsx');
    const tableName = process.argv[3] || 'deprem_gecmis'; // 'deprem_canli' veya 'deprem_gecmis'
    
    if (!fs.existsSync(excelPath)) {
      console.log('❌ Excel dosyası bulunamadı!');
      console.log(`📁 Beklenen konum: ${excelPath}`);
      console.log('\n📝 Kullanım:');
      console.log('   node scripts/loadEarthquakeFromExcel.js [excel_dosya_yolu] [tablo_adi]');
      console.log('   Örnek: node scripts/loadEarthquakeFromExcel.js data/earthquake_data.xlsx deprem_gecmis');
      return;
    }
    
    console.log(`📂 Excel dosyası: ${excelPath}`);
    console.log(`📊 Tablo: ${tableName}\n`);
    
    // Excel'i oku ve filtrele
    const depremler = readExcelFile(excelPath);
    
    if (depremler.length === 0) {
      console.log('⚠️  Marmara bölgesi için deprem verisi bulunamadı!');
      return;
    }
    
    // Veritabanına yükle
    await loadEarthquakeData(depremler, tableName);
    
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

module.exports = { readExcelFile, loadEarthquakeData };

