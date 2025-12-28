const pool = require('../config/database');
const fs = require('fs');
const path = require('path');
const ProvinceModel = require('../models/ProvinceModel');

/**
 * Gerçek Orman Yangını Verilerini Yükle
 * 
 * Bu script CSV veya JSON formatındaki gerçek yangın verilerini yükler.
 * 
 * CSV Formatı (virgülle ayrılmış):
 * il_adi,yangin_baslangic_tarihi,yangin_bitis_tarihi,etkilenen_alan,yangin_nedeni,yangin_nedeni_detay,yangin_seviyesi,durum,enlem,boylam,lokasyon_adi,kullanilan_ekip_sayisi,kullanilan_ucak_sayisi,kullanilan_helikopter_sayisi,kontrol_altina_alinma_suresi,hasar_bilgisi,etkilenen_orman_turu,kaynak
 * 
 * Örnek:
 * İstanbul,2024-07-15 14:30:00,2024-07-16 18:00:00,125.50,insan,ihmal,buyuk,sonduruldu,41.0082,28.9784,Beykoz Ormanı,150,5,3,27.5,5 ev hasar gördü,Çam,OGM
 */

function parseCSVLine(line) {
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

function parseDate(dateStr) {
    // YYYY-MM-DD HH:MM:SS formatını parse et
    if (!dateStr) return null;
    const date = new Date(dateStr);
    return isNaN(date.getTime()) ? null : date;
}

function parseFloatSafe(value) {
    if (!value || value === '' || value === 'NULL') return null;
    const num = parseFloat(value);
    return isNaN(num) ? null : num;
}

function parseIntSafe(value) {
    if (!value || value === '' || value === 'NULL') return null;
    const num = parseInt(value);
    return isNaN(num) ? null : num;
}

async function loadFromCSV(filePath) {
    console.log(`📂 CSV dosyası okunuyor: ${filePath}\n`);
    
    if (!fs.existsSync(filePath)) {
        throw new Error(`Dosya bulunamadı: ${filePath}`);
    }
    
    const fileContent = fs.readFileSync(filePath, 'utf-8');
    const lines = fileContent.split('\n').filter(line => line.trim());
    
    if (lines.length < 2) {
        throw new Error('CSV dosyası boş veya sadece başlık satırı var');
    }
    
    // Başlık satırını atla
    const dataLines = lines.slice(1);
    
    // İlleri yükle
    const provinces = await ProvinceModel.getAll();
    const provinceMap = {};
    provinces.forEach(p => {
        provinceMap[p.il_adi] = p.id;
    });
    
    let successCount = 0;
    let errorCount = 0;
    const errors = [];
    
    console.log(`📊 ${dataLines.length} kayıt işleniyor...\n`);
    
    for (let i = 0; i < dataLines.length; i++) {
        const line = dataLines[i].trim();
        if (!line) continue;
        
        try {
            const values = parseCSVLine(line);
            
            if (values.length < 18) {
                console.warn(`⚠️  Satır ${i + 2}: Yetersiz sütun sayısı (${values.length}/18), atlanıyor`);
                errorCount++;
                continue;
            }
            
            const [
                ilAdi,
                yanginBaslangicTarihi,
                yanginBitisTarihi,
                etkilenenAlan,
                yanginNedeni,
                yanginNedeniDetay,
                yanginSeviyesi,
                durum,
                enlem,
                boylam,
                lokasyonAdi,
                kullanilanEkipSayisi,
                kullanilanUcakSayisi,
                kullanilanHelikopterSayisi,
                kontrolAltinaAlinmaSuresi,
                hasarBilgisi,
                etkilenenOrmanTuru,
                kaynak
            ] = values;
            
            // İl ID'sini bul
            const ilId = provinceMap[ilAdi];
            if (!ilId) {
                console.warn(`⚠️  Satır ${i + 2}: İl bulunamadı: ${ilAdi}`);
                errorCount++;
                continue;
            }
            
            // Tarihleri parse et
            const baslangicTarihi = parseDate(yanginBaslangicTarihi);
            const bitisTarihi = parseDate(yanginBitisTarihi);
            
            if (!baslangicTarihi) {
                console.warn(`⚠️  Satır ${i + 2}: Geçersiz başlangıç tarihi: ${yanginBaslangicTarihi}`);
                errorCount++;
                continue;
            }
            
            // Verileri hazırla
            const fireData = {
                il_id: ilId,
                ilce_id: null,
                yangin_baslangic_tarihi: baslangicTarihi,
                yangin_bitis_tarihi: bitisTarihi,
                etkilenen_alan: parseFloatSafe(etkilenenAlan) || 0,
                yangin_nedeni: yanginNedeni || 'bilinmeyen',
                yangin_nedeni_detay: yanginNedeniDetay || null,
                yangin_seviyesi: yanginSeviyesi || 'orta',
                durum: durum || 'sonduruldu',
                enlem: parseFloatSafe(enlem),
                boylam: parseFloatSafe(boylam),
                lokasyon_adi: lokasyonAdi || null,
                kullanilan_ekip_sayisi: parseIntSafe(kullanilanEkipSayisi) || 0,
                kullanilan_ucak_sayisi: parseIntSafe(kullanilanUcakSayisi) || 0,
                kullanilan_helikopter_sayisi: parseIntSafe(kullanilanHelikopterSayisi) || 0,
                kontrol_altina_alinma_suresi: parseFloatSafe(kontrolAltinaAlinmaSuresi),
                hasar_bilgisi: hasarBilgisi || null,
                etkilenen_orman_turu: etkilenenOrmanTuru || null,
                kaynak: kaynak || 'OGM'
            };
            
            // Duplicate kontrolü
            const [existing] = await pool.query(
                `SELECT id FROM orman_yanginlari
                 WHERE il_id = ? 
                 AND yangin_baslangic_tarihi = ?
                 AND ABS(etkilenen_alan - ?) < 0.01`,
                [fireData.il_id, fireData.yangin_baslangic_tarihi, fireData.etkilenen_alan]
            );
            
            if (existing.length > 0) {
                continue; // Duplicate, atla
            }
            
            // Veritabanına ekle
            await pool.query(
                `INSERT INTO orman_yanginlari (
                    il_id, ilce_id, yangin_baslangic_tarihi, yangin_bitis_tarihi,
                    etkilenen_alan, yangin_nedeni, yangin_nedeni_detay, yangin_seviyesi,
                    durum, enlem, boylam, lokasyon_adi, kullanilan_ekip_sayisi,
                    kullanilan_ucak_sayisi, kullanilan_helikopter_sayisi,
                    kontrol_altina_alinma_suresi, hasar_bilgisi, etkilenen_orman_turu, kaynak
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                [
                    fireData.il_id, fireData.ilce_id, fireData.yangin_baslangic_tarihi,
                    fireData.yangin_bitis_tarihi, fireData.etkilenen_alan,
                    fireData.yangin_nedeni, fireData.yangin_nedeni_detay,
                    fireData.yangin_seviyesi, fireData.durum, fireData.enlem,
                    fireData.boylam, fireData.lokasyon_adi, fireData.kullanilan_ekip_sayisi,
                    fireData.kullanilan_ucak_sayisi, fireData.kullanilan_helikopter_sayisi,
                    fireData.kontrol_altina_alinma_suresi, fireData.hasar_bilgisi,
                    fireData.etkilenen_orman_turu, fireData.kaynak
                ]
            );
            
            successCount++;
            
            if (successCount % 10 === 0) {
                process.stdout.write(`\r   ✅ ${successCount} kayıt yüklendi...`);
            }
            
        } catch (error) {
            errorCount++;
            errors.push(`Satır ${i + 2}: ${error.message}`);
            if (errors.length <= 10) {
                console.warn(`\n⚠️  Satır ${i + 2} hatası: ${error.message}`);
            }
        }
    }
    
    console.log(`\n\n📊 Özet:`);
    console.log(`   ✅ Başarılı: ${successCount} kayıt`);
    console.log(`   ❌ Hatalı: ${errorCount} kayıt`);
    
    if (errors.length > 10) {
        console.log(`\n⚠️  İlk 10 hata gösterildi. Toplam ${errors.length} hata var.`);
    }
    
    return { successCount, errorCount, errors };
}

async function main() {
    const args = process.argv.slice(2);
    
    if (args.length === 0) {
        console.log('📋 Gerçek Orman Yangını Verilerini Yükleme Scripti\n');
        console.log('Kullanım:');
        console.log('  node scripts/loadRealFireData.js <csv_dosya_yolu>\n');
        console.log('CSV Formatı:');
        console.log('  il_adi,yangin_baslangic_tarihi,yangin_bitis_tarihi,etkilenen_alan,yangin_nedeni,yangin_nedeni_detay,yangin_seviyesi,durum,enlem,boylam,lokasyon_adi,kullanilan_ekip_sayisi,kullanilan_ucak_sayisi,kullanilan_helikopter_sayisi,kontrol_altina_alinma_suresi,hasar_bilgisi,etkilenen_orman_turu,kaynak\n');
        console.log('Örnek:');
        console.log('  node scripts/loadRealFireData.js data/gercek_yanginlar.csv\n');
        console.log('💡 Gerçek verileri şu kaynaklardan alabilirsiniz:');
        console.log('   - OGM (Orman Genel Müdürlüğü)');
        console.log('   - AFAD');
        console.log('   - TÜİK');
        console.log('   - İl Afet ve Acil Durum Müdürlükleri\n');
        return;
    }
    
    const csvPath = path.resolve(args[0]);
    
    try {
        console.log('🔥 Gerçek Orman Yangını Verileri Yükleniyor...\n');
        await loadFromCSV(csvPath);
        console.log('\n✅ Yükleme tamamlandı!');
    } catch (error) {
        console.error('\n❌ Hata:', error.message);
        process.exit(1);
    } finally {
        await pool.end();
    }
}

if (require.main === module) {
    main();
}

module.exports = { loadFromCSV };

const fs = require('fs');
const path = require('path');
const ProvinceModel = require('../models/ProvinceModel');

/**
 * Gerçek Orman Yangını Verilerini Yükle
 * 
 * Bu script CSV veya JSON formatındaki gerçek yangın verilerini yükler.
 * 
 * CSV Formatı (virgülle ayrılmış):
 * il_adi,yangin_baslangic_tarihi,yangin_bitis_tarihi,etkilenen_alan,yangin_nedeni,yangin_nedeni_detay,yangin_seviyesi,durum,enlem,boylam,lokasyon_adi,kullanilan_ekip_sayisi,kullanilan_ucak_sayisi,kullanilan_helikopter_sayisi,kontrol_altina_alinma_suresi,hasar_bilgisi,etkilenen_orman_turu,kaynak
 * 
 * Örnek:
 * İstanbul,2024-07-15 14:30:00,2024-07-16 18:00:00,125.50,insan,ihmal,buyuk,sonduruldu,41.0082,28.9784,Beykoz Ormanı,150,5,3,27.5,5 ev hasar gördü,Çam,OGM
 */

function parseCSVLine(line) {
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

function parseDate(dateStr) {
    // YYYY-MM-DD HH:MM:SS formatını parse et
    if (!dateStr) return null;
    const date = new Date(dateStr);
    return isNaN(date.getTime()) ? null : date;
}

function parseFloatSafe(value) {
    if (!value || value === '' || value === 'NULL') return null;
    const num = parseFloat(value);
    return isNaN(num) ? null : num;
}

function parseIntSafe(value) {
    if (!value || value === '' || value === 'NULL') return null;
    const num = parseInt(value);
    return isNaN(num) ? null : num;
}

async function loadFromCSV(filePath) {
    console.log(`📂 CSV dosyası okunuyor: ${filePath}\n`);
    
    if (!fs.existsSync(filePath)) {
        throw new Error(`Dosya bulunamadı: ${filePath}`);
    }
    
    const fileContent = fs.readFileSync(filePath, 'utf-8');
    const lines = fileContent.split('\n').filter(line => line.trim());
    
    if (lines.length < 2) {
        throw new Error('CSV dosyası boş veya sadece başlık satırı var');
    }
    
    // Başlık satırını atla
    const dataLines = lines.slice(1);
    
    // İlleri yükle
    const provinces = await ProvinceModel.getAll();
    const provinceMap = {};
    provinces.forEach(p => {
        provinceMap[p.il_adi] = p.id;
    });
    
    let successCount = 0;
    let errorCount = 0;
    const errors = [];
    
    console.log(`📊 ${dataLines.length} kayıt işleniyor...\n`);
    
    for (let i = 0; i < dataLines.length; i++) {
        const line = dataLines[i].trim();
        if (!line) continue;
        
        try {
            const values = parseCSVLine(line);
            
            if (values.length < 18) {
                console.warn(`⚠️  Satır ${i + 2}: Yetersiz sütun sayısı (${values.length}/18), atlanıyor`);
                errorCount++;
                continue;
            }
            
            const [
                ilAdi,
                yanginBaslangicTarihi,
                yanginBitisTarihi,
                etkilenenAlan,
                yanginNedeni,
                yanginNedeniDetay,
                yanginSeviyesi,
                durum,
                enlem,
                boylam,
                lokasyonAdi,
                kullanilanEkipSayisi,
                kullanilanUcakSayisi,
                kullanilanHelikopterSayisi,
                kontrolAltinaAlinmaSuresi,
                hasarBilgisi,
                etkilenenOrmanTuru,
                kaynak
            ] = values;
            
            // İl ID'sini bul
            const ilId = provinceMap[ilAdi];
            if (!ilId) {
                console.warn(`⚠️  Satır ${i + 2}: İl bulunamadı: ${ilAdi}`);
                errorCount++;
                continue;
            }
            
            // Tarihleri parse et
            const baslangicTarihi = parseDate(yanginBaslangicTarihi);
            const bitisTarihi = parseDate(yanginBitisTarihi);
            
            if (!baslangicTarihi) {
                console.warn(`⚠️  Satır ${i + 2}: Geçersiz başlangıç tarihi: ${yanginBaslangicTarihi}`);
                errorCount++;
                continue;
            }
            
            // Verileri hazırla
            const fireData = {
                il_id: ilId,
                ilce_id: null,
                yangin_baslangic_tarihi: baslangicTarihi,
                yangin_bitis_tarihi: bitisTarihi,
                etkilenen_alan: parseFloatSafe(etkilenenAlan) || 0,
                yangin_nedeni: yanginNedeni || 'bilinmeyen',
                yangin_nedeni_detay: yanginNedeniDetay || null,
                yangin_seviyesi: yanginSeviyesi || 'orta',
                durum: durum || 'sonduruldu',
                enlem: parseFloatSafe(enlem),
                boylam: parseFloatSafe(boylam),
                lokasyon_adi: lokasyonAdi || null,
                kullanilan_ekip_sayisi: parseIntSafe(kullanilanEkipSayisi) || 0,
                kullanilan_ucak_sayisi: parseIntSafe(kullanilanUcakSayisi) || 0,
                kullanilan_helikopter_sayisi: parseIntSafe(kullanilanHelikopterSayisi) || 0,
                kontrol_altina_alinma_suresi: parseFloatSafe(kontrolAltinaAlinmaSuresi),
                hasar_bilgisi: hasarBilgisi || null,
                etkilenen_orman_turu: etkilenenOrmanTuru || null,
                kaynak: kaynak || 'OGM'
            };
            
            // Duplicate kontrolü
            const [existing] = await pool.query(
                `SELECT id FROM orman_yanginlari
                 WHERE il_id = ? 
                 AND yangin_baslangic_tarihi = ?
                 AND ABS(etkilenen_alan - ?) < 0.01`,
                [fireData.il_id, fireData.yangin_baslangic_tarihi, fireData.etkilenen_alan]
            );
            
            if (existing.length > 0) {
                continue; // Duplicate, atla
            }
            
            // Veritabanına ekle
            await pool.query(
                `INSERT INTO orman_yanginlari (
                    il_id, ilce_id, yangin_baslangic_tarihi, yangin_bitis_tarihi,
                    etkilenen_alan, yangin_nedeni, yangin_nedeni_detay, yangin_seviyesi,
                    durum, enlem, boylam, lokasyon_adi, kullanilan_ekip_sayisi,
                    kullanilan_ucak_sayisi, kullanilan_helikopter_sayisi,
                    kontrol_altina_alinma_suresi, hasar_bilgisi, etkilenen_orman_turu, kaynak
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                [
                    fireData.il_id, fireData.ilce_id, fireData.yangin_baslangic_tarihi,
                    fireData.yangin_bitis_tarihi, fireData.etkilenen_alan,
                    fireData.yangin_nedeni, fireData.yangin_nedeni_detay,
                    fireData.yangin_seviyesi, fireData.durum, fireData.enlem,
                    fireData.boylam, fireData.lokasyon_adi, fireData.kullanilan_ekip_sayisi,
                    fireData.kullanilan_ucak_sayisi, fireData.kullanilan_helikopter_sayisi,
                    fireData.kontrol_altina_alinma_suresi, fireData.hasar_bilgisi,
                    fireData.etkilenen_orman_turu, fireData.kaynak
                ]
            );
            
            successCount++;
            
            if (successCount % 10 === 0) {
                process.stdout.write(`\r   ✅ ${successCount} kayıt yüklendi...`);
            }
            
        } catch (error) {
            errorCount++;
            errors.push(`Satır ${i + 2}: ${error.message}`);
            if (errors.length <= 10) {
                console.warn(`\n⚠️  Satır ${i + 2} hatası: ${error.message}`);
            }
        }
    }
    
    console.log(`\n\n📊 Özet:`);
    console.log(`   ✅ Başarılı: ${successCount} kayıt`);
    console.log(`   ❌ Hatalı: ${errorCount} kayıt`);
    
    if (errors.length > 10) {
        console.log(`\n⚠️  İlk 10 hata gösterildi. Toplam ${errors.length} hata var.`);
    }
    
    return { successCount, errorCount, errors };
}

async function main() {
    const args = process.argv.slice(2);
    
    if (args.length === 0) {
        console.log('📋 Gerçek Orman Yangını Verilerini Yükleme Scripti\n');
        console.log('Kullanım:');
        console.log('  node scripts/loadRealFireData.js <csv_dosya_yolu>\n');
        console.log('CSV Formatı:');
        console.log('  il_adi,yangin_baslangic_tarihi,yangin_bitis_tarihi,etkilenen_alan,yangin_nedeni,yangin_nedeni_detay,yangin_seviyesi,durum,enlem,boylam,lokasyon_adi,kullanilan_ekip_sayisi,kullanilan_ucak_sayisi,kullanilan_helikopter_sayisi,kontrol_altina_alinma_suresi,hasar_bilgisi,etkilenen_orman_turu,kaynak\n');
        console.log('Örnek:');
        console.log('  node scripts/loadRealFireData.js data/gercek_yanginlar.csv\n');
        console.log('💡 Gerçek verileri şu kaynaklardan alabilirsiniz:');
        console.log('   - OGM (Orman Genel Müdürlüğü)');
        console.log('   - AFAD');
        console.log('   - TÜİK');
        console.log('   - İl Afet ve Acil Durum Müdürlükleri\n');
        return;
    }
    
    const csvPath = path.resolve(args[0]);
    
    try {
        console.log('🔥 Gerçek Orman Yangını Verileri Yükleniyor...\n');
        await loadFromCSV(csvPath);
        console.log('\n✅ Yükleme tamamlandı!');
    } catch (error) {
        console.error('\n❌ Hata:', error.message);
        process.exit(1);
    } finally {
        await pool.end();
    }
}

if (require.main === module) {
    main();
}

module.exports = { loadFromCSV };











