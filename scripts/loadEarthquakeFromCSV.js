/**
 * CSV'den Deprem Verileri Yükleme Scripti
 * 
 * Bu script CSV dosyasından deprem verilerini okuyup veritabanına yükler
 * Marmara bölgesi illerini otomatik filtreler
 */

const mysql = require('mysql2/promise');
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
 * CSV satırını parse et
 */
function parseCSVLine(line) {
  // Basit CSV parsing (virgülle ayrılmış)
  // Eğer CSV farklı formatdaysa (noktalı virgül, tab vb.) düzenleyin
  const values = [];
  let current = '';
  let inQuotes = false;
  
  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    
    if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === ',' && !inQuotes) {
      values.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }
  values.push(current.trim());
  
  return values;
}

/**
 * CSV dosyasını oku ve parse et
 */
function readCSVFile(filePath) {
  try {
    const content = fs.readFileSync(filePath, 'utf-8');
    const lines = content.split('\n').filter(line => line.trim() !== '');
    
    if (lines.length === 0) {
      console.log('⚠️  CSV dosyası boş!');
      return [];
    }
    
    // İlk satır header olabilir, kontrol et
    const header = lines[0];
    const dataLines = lines.slice(1);
    
    console.log(`📄 CSV dosyası okundu: ${lines.length} satır`);
    console.log(`📋 Header: ${header.substring(0, 100)}...\n`);
    
    // Header'dan sütun indekslerini bul
    const headerCols = parseCSVLine(header);
    const colMap = {};
    headerCols.forEach((col, index) => {
      colMap[col.toLowerCase()] = index;
    });
    
    console.log('📊 Sütunlar:', Object.keys(colMap).join(', '));
    
    // Veri satırlarını parse et
    const data = [];
    for (const line of dataLines) {
      if (!line.trim()) continue;
      
      const values = parseCSVLine(line);
      
      // İl adını bul (farklı sütun isimleri olabilir)
      let ilAdi = null;
      const ilColumns = ['il', 'il_adi', 'province', 'city', 'şehir', 'il adı'];
      for (const colName of ilColumns) {
        if (colMap[colName] !== undefined) {
          ilAdi = values[colMap[colName]];
          break;
        }
      }
      
      // Marmara bölgesi için filtrele
      if (ilAdi && marmaraIlleri.some(il => ilAdi.includes(il) || il.includes(ilAdi))) {
        // Normalize il adı
        const normalizedIl = marmaraIlleri.find(il => 
          ilAdi.includes(il) || il.includes(ilAdi) || ilAdi === il
        );
        
        if (normalizedIl) {
          const deprem = {
            il_adi: normalizedIl,
            ilce_adi: null,
            buyukluk: null,
            derinlik: null,
            tarih_saat: null,
            enlem: null,
            boylam: null,
            kaynak: 'AFAD'
          };
          
          // Büyüklük (magnitude)
          const magColumns = ['magnitude', 'büyüklük', 'buyukluk', 'mag', 'ml', 'mw'];
          for (const colName of magColumns) {
            if (colMap[colName] !== undefined && values[colMap[colName]]) {
              deprem.buyukluk = parseFloat(values[colMap[colName]]);
              break;
            }
          }
          
          // Derinlik (depth)
          const depthColumns = ['depth', 'derinlik', 'depth_km'];
          for (const colName of depthColumns) {
            if (colMap[colName] !== undefined && values[colMap[colName]]) {
              deprem.derinlik = parseFloat(values[colMap[colName]]);
              break;
            }
          }
          
          // Tarih/Saat
          const dateColumns = ['date', 'tarih', 'tarih_saat', 'time', 'datetime'];
          for (const colName of dateColumns) {
            if (colMap[colName] !== undefined && values[colMap[colName]]) {
              deprem.tarih_saat = values[colMap[colName]];
              break;
            }
          }
          
          // Enlem (latitude)
          const latColumns = ['latitude', 'enlem', 'lat'];
          for (const colName of latColumns) {
            if (colMap[colName] !== undefined && values[colMap[colName]]) {
              deprem.enlem = parseFloat(values[colMap[colName]]);
              break;
            }
          }
          
          // Boylam (longitude)
          const lonColumns = ['longitude', 'boylam', 'lon', 'lng'];
          for (const colName of lonColumns) {
            if (colMap[colName] !== undefined && values[colMap[colName]]) {
              deprem.boylam = parseFloat(values[colMap[colName]]);
              break;
            }
          }
          
          // İlçe (district)
          const districtColumns = ['ilce', 'ilce_adi', 'district', 'county'];
          for (const colName of districtColumns) {
            if (colMap[colName] !== undefined && values[colMap[colName]]) {
              deprem.ilce_adi = values[colMap[colName]] || null;
              break;
            }
          }
          
          // Sadece gerekli alanlar doluysa ekle
          if (deprem.buyukluk && deprem.tarih_saat && deprem.enlem && deprem.boylam) {
            data.push(deprem);
          }
        }
      }
    }
    
    console.log(`✅ Marmara bölgesi için ${data.length} deprem verisi bulundu\n`);
    return data;
    
  } catch (error) {
    console.error('❌ CSV dosyası okunurken hata:', error.message);
    throw error;
  }
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
      const ilId = provinceMap[deprem.il_adi];
      
      if (!ilId) {
        console.log(`⚠️  ${deprem.il_adi} il bulunamadı`);
        totalSkipped++;
        continue;
      }
      
      let ilceId = null;
      if (deprem.ilce_adi) {
        const key = `${ilId}_${deprem.ilce_adi}`;
        ilceId = districtMap[key] || null;
      }
      
      // Tarih formatını düzelt
      let tarihSaat = deprem.tarih_saat;
      // Eğer tarih formatı farklıysa dönüştür
      if (tarihSaat && !tarihSaat.match(/^\d{4}-\d{2}-\d{2}/)) {
        // Farklı tarih formatlarını burada dönüştürebilirsiniz
        console.log(`⚠️  Tarih formatı kontrol edilmeli: ${tarihSaat}`);
      }
      
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
              deprem.kaynak || 'AFAD'
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
              deprem.kaynak || 'AFAD'
            ]
          );
        }
        
        totalAdded++;
      } catch (error) {
        if (error.code === 'ER_DUP_ENTRY') {
          // Duplicate entry, skip
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
    console.log('🚀 CSV\'den Deprem Verileri Yükleme Scripti\n');
    
    // CSV dosya yolu
    const csvPath = process.argv[2] || path.join(__dirname, '..', 'data', 'earthquake_data.csv');
    const tableName = process.argv[3] || 'deprem_gecmis'; // 'deprem_canli' veya 'deprem_gecmis'
    
    if (!fs.existsSync(csvPath)) {
      console.log('❌ CSV dosyası bulunamadı!');
      console.log(`📁 Beklenen konum: ${csvPath}`);
      console.log('\n📝 Kullanım:');
      console.log('   node scripts/loadEarthquakeFromCSV.js [csv_dosya_yolu] [tablo_adi]');
      console.log('   Örnek: node scripts/loadEarthquakeFromCSV.js data/earthquake.csv deprem_gecmis');
      return;
    }
    
    console.log(`📂 CSV dosyası: ${csvPath}`);
    console.log(`📊 Tablo: ${tableName}\n`);
    
    // CSV'yi oku ve filtrele
    const depremler = readCSVFile(csvPath);
    
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

module.exports = { readCSVFile, loadEarthquakeData };




















