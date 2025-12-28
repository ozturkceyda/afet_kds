const pool = require('../config/database');

// Excel'den çıkarılan 2024 yılı Marmara bölgesi orman yangını verileri
// Kaynak: TÜİK veya OGM istatistikleri
const fireData2024 = {
    'İstanbul': {
        toplam_yangin: 76,
        toplam_hektar: 21,
        il_id: 1
    },
    'Tekirdağ': {
        toplam_yangin: 20,
        toplam_hektar: 7,
        il_id: 5
    },
    'Edirne': {
        toplam_yangin: 46,
        toplam_hektar: 497,
        il_id: 7
    },
    'Kırklareli': {
        toplam_yangin: 24,
        toplam_hektar: 80,
        il_id: 8
    },
    'Balıkesir': {
        toplam_yangin: 102,
        toplam_hektar: 260,
        il_id: 4
    },
    'Çanakkale': {
        toplam_yangin: 124,
        toplam_hektar: 1706,
        il_id: 6
    },
    'Bursa': {
        toplam_yangin: 90,
        toplam_hektar: 674,
        il_id: 2
    },
    'Bilecik': {
        toplam_yangin: 22,
        toplam_hektar: 30,
        il_id: 9
    },
    'Kocaeli': {
        toplam_yangin: 22,
        toplam_hektar: 27,
        il_id: 3
    },
    'Sakarya': {
        toplam_yangin: 51,
        toplam_hektar: 33,
        il_id: 10
    },
    'Yalova': {
        toplam_yangin: 8,
        toplam_hektar: 30,
        il_id: 11
    }
};

// Yangın seviyesi belirleme fonksiyonu
function getFireLevel(hectares) {
    if (hectares < 10) return 'kucuk';
    if (hectares < 100) return 'orta';
    if (hectares < 1000) return 'buyuk';
    return 'cok_buyuk';
}

// Yangın nedeni rastgele dağıtım (gerçekçi dağılım)
function getRandomCause() {
    const rand = Math.random();
    if (rand < 0.85) return 'insan'; // %85 insan kaynaklı
    if (rand < 0.95) return 'dogal'; // %10 doğal
    return 'bilinmeyen'; // %5 bilinmeyen
}

// İnsan kaynaklı yangın nedeni detayı
function getHumanCauseDetail() {
    const reasons = ['ihmal', 'kasit', 'piknik', 'sigara', 'elektrik_hatti', 'tarim_atesi'];
    return reasons[Math.floor(Math.random() * reasons.length)];
}

// Orman türü rastgele seçimi
function getRandomForestType() {
    const types = ['Çam', 'Meşe', 'Kayın', 'Gürgen', 'Kızılağaç', 'Kestane', 'Karma'];
    return types[Math.floor(Math.random() * types.length)];
}

// 2024 yılı içinde rastgele tarih oluştur (yaz aylarına ağırlık ver)
function getRandomFireDate() {
    const year = 2024;
    // Yangınlar genellikle yaz aylarında olur (Haziran, Temmuz, Ağustos)
    const month = Math.random() < 0.7 
        ? Math.floor(Math.random() * 3) + 6 // Haziran (6), Temmuz (7), Ağustos (8)
        : Math.floor(Math.random() * 12) + 1; // Diğer aylar
    
    const daysInMonth = new Date(year, month, 0).getDate();
    const day = Math.floor(Math.random() * daysInMonth) + 1;
    const hour = Math.floor(Math.random() * 12) + 8; // 08:00 - 20:00 arası
    const minute = Math.floor(Math.random() * 60);
    
    return new Date(year, month - 1, day, hour, minute);
}

// Yangın bitiş tarihi oluştur (başlangıçtan sonra 1-72 saat arası)
function getFireEndDate(startDate) {
    const hours = Math.random() * 72 + 1; // 1-72 saat arası
    return new Date(startDate.getTime() + hours * 60 * 60 * 1000);
}

// Koordinatlar için il merkez koordinatları (yaklaşık)
const provinceCoordinates = {
    'İstanbul': { lat: 41.0082, lon: 28.9784 },
    'Tekirdağ': { lat: 40.9833, lon: 27.5167 },
    'Edirne': { lat: 41.6772, lon: 26.5556 },
    'Kırklareli': { lat: 41.7333, lon: 27.2167 },
    'Balıkesir': { lat: 39.6484, lon: 27.8826 },
    'Çanakkale': { lat: 40.1553, lon: 26.4142 },
    'Bursa': { lat: 40.1826, lon: 29.0665 },
    'Bilecik': { lat: 40.1500, lon: 30.0000 },
    'Kocaeli': { lat: 40.8533, lon: 29.8815 },
    'Sakarya': { lat: 40.7833, lon: 30.4000 },
    'Yalova': { lat: 40.6500, lon: 29.2667 }
};

async function loadFireData() {
    try {
        console.log('🔥 Marmara Bölgesi Orman Yangını Verileri Yükleniyor...\n');
        console.log('📊 Kaynak: 2024 Yılı İstatistikleri\n');

        let totalInserted = 0;
        let totalSkipped = 0;

        for (const [ilAdi, data] of Object.entries(fireData2024)) {
            console.log(`\n📍 ${ilAdi}:`);
            console.log(`   Toplam Yangın: ${data.toplam_yangin}`);
            console.log(`   Toplam Etkilenen Alan: ${data.toplam_hektar} hektar`);

            const ilId = data.il_id;
            const toplamYangin = data.toplam_yangin;
            const toplamHektar = data.toplam_hektar;
            const ortalamaHektar = toplamHektar / toplamYangin;

            const coords = provinceCoordinates[ilAdi];

            let inserted = 0;
            let skipped = 0;

            // Her yangın için kayıt oluştur
            for (let i = 0; i < toplamYangin; i++) {
                // Hektar dağılımı (ortalama etrafında varyasyon)
                const hektarVaryasyon = (Math.random() - 0.5) * ortalamaHektar * 0.8; // %40 varyasyon
                const hektar = Math.max(0.1, ortalamaHektar + hektarVaryasyon);
                const hektarRounded = Math.round(hektar * 100) / 100;

                const yanginSeviyesi = getFireLevel(hektarRounded);
                const yanginNedeni = getRandomCause();
                const yanginNedeniDetay = yanginNedeni === 'insan' ? getHumanCauseDetail() : null;
                
                const baslangicTarihi = getRandomFireDate();
                const bitisTarihi = getRandomFireDate(baslangicTarihi);
                const kontrolSuresi = (bitisTarihi.getTime() - baslangicTarihi.getTime()) / (1000 * 60 * 60); // saat

                // Koordinatlar (il merkezinden küçük sapmalarla)
                const latOffset = (Math.random() - 0.5) * 0.5; // ±0.25 derece
                const lonOffset = (Math.random() - 0.5) * 0.5;
                const enlem = Math.round((coords.lat + latOffset) * 10000000) / 10000000;
                const boylam = Math.round((coords.lon + lonOffset) * 10000000) / 10000000;

                // Kaynak kullanımı (hektara göre)
                const ekipSayisi = Math.ceil(hektarRounded / 5); // Her 5 hektar için 1 ekip
                const ucakSayisi = hektarRounded > 50 ? Math.ceil(hektarRounded / 100) : 0;
                const helikopterSayisi = hektarRounded > 20 ? Math.ceil(hektarRounded / 50) : 0;

                const ormanTuru = getRandomForestType();
                const lokasyonAdi = `${ilAdi} Ormanı - ${i + 1}. Yangın`;

                // Hasar bilgisi (büyük yangınlarda)
                let hasarBilgisi = null;
                if (hektarRounded > 50) {
                    const evSayisi = Math.floor(Math.random() * 5);
                    if (evSayisi > 0) {
                        hasarBilgisi = `${evSayisi} ev hasar gördü`;
                    }
                }

                try {
                    await pool.query(
                        `INSERT INTO orman_yanginlari 
                        (il_id, ilce_id, yangin_baslangic_tarihi, yangin_bitis_tarihi, etkilenen_alan, 
                         yangin_nedeni, yangin_nedeni_detay, yangin_seviyesi, durum, 
                         enlem, boylam, lokasyon_adi, 
                         kullanilan_ekip_sayisi, kullanilan_ucak_sayisi, kullanilan_helikopter_sayisi, 
                         kontrol_altina_alinma_suresi, hasar_bilgisi, etkilenen_orman_turu, kaynak)
                        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                        [
                            ilId,
                            null, // ilce_id
                            baslangicTarihi,
                            bitisTarihi,
                            hektarRounded,
                            yanginNedeni,
                            yanginNedeniDetay,
                            yanginSeviyesi,
                            'sonduruldu', // 2024 verileri olduğu için hepsi söndürülmüş
                            enlem,
                            boylam,
                            lokasyonAdi,
                            ekipSayisi,
                            ucakSayisi,
                            helikopterSayisi,
                            Math.round(kontrolSuresi * 100) / 100,
                            hasarBilgisi,
                            ormanTuru,
                            'OGM'
                        ]
                    );
                    inserted++;
                } catch (error) {
                    if (error.code === 'ER_DUP_ENTRY') {
                        skipped++;
                    } else {
                        console.error(`   ❌ Hata (yangın ${i + 1}): ${error.message}`);
                    }
                }
            }

            console.log(`   ✅ Eklenen: ${inserted}`);
            console.log(`   ⏭️  Atlanan: ${skipped}`);

            totalInserted += inserted;
            totalSkipped += skipped;
        }

        console.log(`\n📊 Özet:`);
        console.log(`   ✅ Toplam Eklenen: ${totalInserted} yangın`);
        console.log(`   ⏭️  Toplam Atlanan: ${totalSkipped} yangın`);

        // İstatistikler
        const [stats] = await pool.query(`
            SELECT 
                COUNT(*) as toplam_yangin,
                SUM(etkilenen_alan) as toplam_hektar,
                AVG(etkilenen_alan) as ortalama_hektar,
                COUNT(CASE WHEN yangin_seviyesi = 'kucuk' THEN 1 END) as kucuk_yangin,
                COUNT(CASE WHEN yangin_seviyesi = 'orta' THEN 1 END) as orta_yangin,
                COUNT(CASE WHEN yangin_seviyesi = 'buyuk' THEN 1 END) as buyuk_yangin,
                COUNT(CASE WHEN yangin_seviyesi = 'cok_buyuk' THEN 1 END) as cok_buyuk_yangin
            FROM orman_yanginlari
        `);

        if (stats.length > 0) {
            const stat = stats[0];
            console.log(`\n📈 Veritabanı İstatistikleri:`);
            console.log(`   • Toplam Yangın: ${stat.toplam_yangin}`);
            console.log(`   • Toplam Etkilenen Alan: ${parseFloat(stat.toplam_hektar).toFixed(2)} hektar`);
            console.log(`   • Ortalama Yangın Büyüklüğü: ${parseFloat(stat.ortalama_hektar).toFixed(2)} hektar`);
            console.log(`   • Küçük Yangınlar: ${stat.kucuk_yangin}`);
            console.log(`   • Orta Yangınlar: ${stat.orta_yangin}`);
            console.log(`   • Büyük Yangınlar: ${stat.buyuk_yangin}`);
            console.log(`   • Çok Büyük Yangınlar: ${stat.cok_buyuk_yangin}`);
        }

        // İl bazında özet
        const [provinceStats] = await pool.query(`
            SELECT 
                i.il_adi,
                COUNT(oy.id) as yangin_sayisi,
                SUM(oy.etkilenen_alan) as toplam_hektar,
                AVG(oy.etkilenen_alan) as ortalama_hektar
            FROM orman_yanginlari oy
            JOIN iller i ON oy.il_id = i.id
            WHERE i.bolge = 'Marmara'
            GROUP BY i.id, i.il_adi
            ORDER BY yangin_sayisi DESC
        `);

        console.log(`\n📋 İl Bazında Özet:`);
        console.log('════════════════════════════════════════════════════════════════════════════════');
        console.log('İl                  | Yangın Sayısı | Toplam Hektar | Ortalama Hektar');
        console.log('────────────────────────────────────────────────────────────────────────────────');
        provinceStats.forEach(stat => {
            console.log(
                `${stat.il_adi.padEnd(20)} | ${String(stat.yangin_sayisi).padEnd(13)} | ${parseFloat(stat.toplam_hektar).toFixed(2).padEnd(13)} | ${parseFloat(stat.ortalama_hektar).toFixed(2)}`
            );
        });
        console.log('════════════════════════════════════════════════════════════════════════════════');

        console.log('\n✅ Veri yükleme tamamlandı!');

    } catch (error) {
        console.error('\n❌ Hata:', error.message);
        throw error;
    } finally {
        await pool.end();
    }
}

if (require.main === module) {
    loadFireData();
}

module.exports = { loadFireData };


// Excel'den çıkarılan 2024 yılı Marmara bölgesi orman yangını verileri
// Kaynak: TÜİK veya OGM istatistikleri
const fireData2024 = {
    'İstanbul': {
        toplam_yangin: 76,
        toplam_hektar: 21,
        il_id: 1
    },
    'Tekirdağ': {
        toplam_yangin: 20,
        toplam_hektar: 7,
        il_id: 5
    },
    'Edirne': {
        toplam_yangin: 46,
        toplam_hektar: 497,
        il_id: 7
    },
    'Kırklareli': {
        toplam_yangin: 24,
        toplam_hektar: 80,
        il_id: 8
    },
    'Balıkesir': {
        toplam_yangin: 102,
        toplam_hektar: 260,
        il_id: 4
    },
    'Çanakkale': {
        toplam_yangin: 124,
        toplam_hektar: 1706,
        il_id: 6
    },
    'Bursa': {
        toplam_yangin: 90,
        toplam_hektar: 674,
        il_id: 2
    },
    'Bilecik': {
        toplam_yangin: 22,
        toplam_hektar: 30,
        il_id: 9
    },
    'Kocaeli': {
        toplam_yangin: 22,
        toplam_hektar: 27,
        il_id: 3
    },
    'Sakarya': {
        toplam_yangin: 51,
        toplam_hektar: 33,
        il_id: 10
    },
    'Yalova': {
        toplam_yangin: 8,
        toplam_hektar: 30,
        il_id: 11
    }
};

// Yangın seviyesi belirleme fonksiyonu
function getFireLevel(hectares) {
    if (hectares < 10) return 'kucuk';
    if (hectares < 100) return 'orta';
    if (hectares < 1000) return 'buyuk';
    return 'cok_buyuk';
}

// Yangın nedeni rastgele dağıtım (gerçekçi dağılım)
function getRandomCause() {
    const rand = Math.random();
    if (rand < 0.85) return 'insan'; // %85 insan kaynaklı
    if (rand < 0.95) return 'dogal'; // %10 doğal
    return 'bilinmeyen'; // %5 bilinmeyen
}

// İnsan kaynaklı yangın nedeni detayı
function getHumanCauseDetail() {
    const reasons = ['ihmal', 'kasit', 'piknik', 'sigara', 'elektrik_hatti', 'tarim_atesi'];
    return reasons[Math.floor(Math.random() * reasons.length)];
}

// Orman türü rastgele seçimi
function getRandomForestType() {
    const types = ['Çam', 'Meşe', 'Kayın', 'Gürgen', 'Kızılağaç', 'Kestane', 'Karma'];
    return types[Math.floor(Math.random() * types.length)];
}

// 2024 yılı içinde rastgele tarih oluştur (yaz aylarına ağırlık ver)
function getRandomFireDate() {
    const year = 2024;
    // Yangınlar genellikle yaz aylarında olur (Haziran, Temmuz, Ağustos)
    const month = Math.random() < 0.7 
        ? Math.floor(Math.random() * 3) + 6 // Haziran (6), Temmuz (7), Ağustos (8)
        : Math.floor(Math.random() * 12) + 1; // Diğer aylar
    
    const daysInMonth = new Date(year, month, 0).getDate();
    const day = Math.floor(Math.random() * daysInMonth) + 1;
    const hour = Math.floor(Math.random() * 12) + 8; // 08:00 - 20:00 arası
    const minute = Math.floor(Math.random() * 60);
    
    return new Date(year, month - 1, day, hour, minute);
}

// Yangın bitiş tarihi oluştur (başlangıçtan sonra 1-72 saat arası)
function getFireEndDate(startDate) {
    const hours = Math.random() * 72 + 1; // 1-72 saat arası
    return new Date(startDate.getTime() + hours * 60 * 60 * 1000);
}

// Koordinatlar için il merkez koordinatları (yaklaşık)
const provinceCoordinates = {
    'İstanbul': { lat: 41.0082, lon: 28.9784 },
    'Tekirdağ': { lat: 40.9833, lon: 27.5167 },
    'Edirne': { lat: 41.6772, lon: 26.5556 },
    'Kırklareli': { lat: 41.7333, lon: 27.2167 },
    'Balıkesir': { lat: 39.6484, lon: 27.8826 },
    'Çanakkale': { lat: 40.1553, lon: 26.4142 },
    'Bursa': { lat: 40.1826, lon: 29.0665 },
    'Bilecik': { lat: 40.1500, lon: 30.0000 },
    'Kocaeli': { lat: 40.8533, lon: 29.8815 },
    'Sakarya': { lat: 40.7833, lon: 30.4000 },
    'Yalova': { lat: 40.6500, lon: 29.2667 }
};

async function loadFireData() {
    try {
        console.log('🔥 Marmara Bölgesi Orman Yangını Verileri Yükleniyor...\n');
        console.log('📊 Kaynak: 2024 Yılı İstatistikleri\n');

        let totalInserted = 0;
        let totalSkipped = 0;

        for (const [ilAdi, data] of Object.entries(fireData2024)) {
            console.log(`\n📍 ${ilAdi}:`);
            console.log(`   Toplam Yangın: ${data.toplam_yangin}`);
            console.log(`   Toplam Etkilenen Alan: ${data.toplam_hektar} hektar`);

            const ilId = data.il_id;
            const toplamYangin = data.toplam_yangin;
            const toplamHektar = data.toplam_hektar;
            const ortalamaHektar = toplamHektar / toplamYangin;

            const coords = provinceCoordinates[ilAdi];

            let inserted = 0;
            let skipped = 0;

            // Her yangın için kayıt oluştur
            for (let i = 0; i < toplamYangin; i++) {
                // Hektar dağılımı (ortalama etrafında varyasyon)
                const hektarVaryasyon = (Math.random() - 0.5) * ortalamaHektar * 0.8; // %40 varyasyon
                const hektar = Math.max(0.1, ortalamaHektar + hektarVaryasyon);
                const hektarRounded = Math.round(hektar * 100) / 100;

                const yanginSeviyesi = getFireLevel(hektarRounded);
                const yanginNedeni = getRandomCause();
                const yanginNedeniDetay = yanginNedeni === 'insan' ? getHumanCauseDetail() : null;
                
                const baslangicTarihi = getRandomFireDate();
                const bitisTarihi = getRandomFireDate(baslangicTarihi);
                const kontrolSuresi = (bitisTarihi.getTime() - baslangicTarihi.getTime()) / (1000 * 60 * 60); // saat

                // Koordinatlar (il merkezinden küçük sapmalarla)
                const latOffset = (Math.random() - 0.5) * 0.5; // ±0.25 derece
                const lonOffset = (Math.random() - 0.5) * 0.5;
                const enlem = Math.round((coords.lat + latOffset) * 10000000) / 10000000;
                const boylam = Math.round((coords.lon + lonOffset) * 10000000) / 10000000;

                // Kaynak kullanımı (hektara göre)
                const ekipSayisi = Math.ceil(hektarRounded / 5); // Her 5 hektar için 1 ekip
                const ucakSayisi = hektarRounded > 50 ? Math.ceil(hektarRounded / 100) : 0;
                const helikopterSayisi = hektarRounded > 20 ? Math.ceil(hektarRounded / 50) : 0;

                const ormanTuru = getRandomForestType();
                const lokasyonAdi = `${ilAdi} Ormanı - ${i + 1}. Yangın`;

                // Hasar bilgisi (büyük yangınlarda)
                let hasarBilgisi = null;
                if (hektarRounded > 50) {
                    const evSayisi = Math.floor(Math.random() * 5);
                    if (evSayisi > 0) {
                        hasarBilgisi = `${evSayisi} ev hasar gördü`;
                    }
                }

                try {
                    await pool.query(
                        `INSERT INTO orman_yanginlari 
                        (il_id, ilce_id, yangin_baslangic_tarihi, yangin_bitis_tarihi, etkilenen_alan, 
                         yangin_nedeni, yangin_nedeni_detay, yangin_seviyesi, durum, 
                         enlem, boylam, lokasyon_adi, 
                         kullanilan_ekip_sayisi, kullanilan_ucak_sayisi, kullanilan_helikopter_sayisi, 
                         kontrol_altina_alinma_suresi, hasar_bilgisi, etkilenen_orman_turu, kaynak)
                        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                        [
                            ilId,
                            null, // ilce_id
                            baslangicTarihi,
                            bitisTarihi,
                            hektarRounded,
                            yanginNedeni,
                            yanginNedeniDetay,
                            yanginSeviyesi,
                            'sonduruldu', // 2024 verileri olduğu için hepsi söndürülmüş
                            enlem,
                            boylam,
                            lokasyonAdi,
                            ekipSayisi,
                            ucakSayisi,
                            helikopterSayisi,
                            Math.round(kontrolSuresi * 100) / 100,
                            hasarBilgisi,
                            ormanTuru,
                            'OGM'
                        ]
                    );
                    inserted++;
                } catch (error) {
                    if (error.code === 'ER_DUP_ENTRY') {
                        skipped++;
                    } else {
                        console.error(`   ❌ Hata (yangın ${i + 1}): ${error.message}`);
                    }
                }
            }

            console.log(`   ✅ Eklenen: ${inserted}`);
            console.log(`   ⏭️  Atlanan: ${skipped}`);

            totalInserted += inserted;
            totalSkipped += skipped;
        }

        console.log(`\n📊 Özet:`);
        console.log(`   ✅ Toplam Eklenen: ${totalInserted} yangın`);
        console.log(`   ⏭️  Toplam Atlanan: ${totalSkipped} yangın`);

        // İstatistikler
        const [stats] = await pool.query(`
            SELECT 
                COUNT(*) as toplam_yangin,
                SUM(etkilenen_alan) as toplam_hektar,
                AVG(etkilenen_alan) as ortalama_hektar,
                COUNT(CASE WHEN yangin_seviyesi = 'kucuk' THEN 1 END) as kucuk_yangin,
                COUNT(CASE WHEN yangin_seviyesi = 'orta' THEN 1 END) as orta_yangin,
                COUNT(CASE WHEN yangin_seviyesi = 'buyuk' THEN 1 END) as buyuk_yangin,
                COUNT(CASE WHEN yangin_seviyesi = 'cok_buyuk' THEN 1 END) as cok_buyuk_yangin
            FROM orman_yanginlari
        `);

        if (stats.length > 0) {
            const stat = stats[0];
            console.log(`\n📈 Veritabanı İstatistikleri:`);
            console.log(`   • Toplam Yangın: ${stat.toplam_yangin}`);
            console.log(`   • Toplam Etkilenen Alan: ${parseFloat(stat.toplam_hektar).toFixed(2)} hektar`);
            console.log(`   • Ortalama Yangın Büyüklüğü: ${parseFloat(stat.ortalama_hektar).toFixed(2)} hektar`);
            console.log(`   • Küçük Yangınlar: ${stat.kucuk_yangin}`);
            console.log(`   • Orta Yangınlar: ${stat.orta_yangin}`);
            console.log(`   • Büyük Yangınlar: ${stat.buyuk_yangin}`);
            console.log(`   • Çok Büyük Yangınlar: ${stat.cok_buyuk_yangin}`);
        }

        // İl bazında özet
        const [provinceStats] = await pool.query(`
            SELECT 
                i.il_adi,
                COUNT(oy.id) as yangin_sayisi,
                SUM(oy.etkilenen_alan) as toplam_hektar,
                AVG(oy.etkilenen_alan) as ortalama_hektar
            FROM orman_yanginlari oy
            JOIN iller i ON oy.il_id = i.id
            WHERE i.bolge = 'Marmara'
            GROUP BY i.id, i.il_adi
            ORDER BY yangin_sayisi DESC
        `);

        console.log(`\n📋 İl Bazında Özet:`);
        console.log('════════════════════════════════════════════════════════════════════════════════');
        console.log('İl                  | Yangın Sayısı | Toplam Hektar | Ortalama Hektar');
        console.log('────────────────────────────────────────────────────────────────────────────────');
        provinceStats.forEach(stat => {
            console.log(
                `${stat.il_adi.padEnd(20)} | ${String(stat.yangin_sayisi).padEnd(13)} | ${parseFloat(stat.toplam_hektar).toFixed(2).padEnd(13)} | ${parseFloat(stat.ortalama_hektar).toFixed(2)}`
            );
        });
        console.log('════════════════════════════════════════════════════════════════════════════════');

        console.log('\n✅ Veri yükleme tamamlandı!');

    } catch (error) {
        console.error('\n❌ Hata:', error.message);
        throw error;
    } finally {
        await pool.end();
    }
}

if (require.main === module) {
    loadFireData();
}

module.exports = { loadFireData };











