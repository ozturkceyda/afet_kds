const pool = require('../config/database');

async function checkWeatherData() {
  try {
    // Hava durumu dağılımı
    console.log('📊 Hava Durumu Dağılımı:\n');
    const [distribution] = await pool.query(
      'SELECT hava_durumu, COUNT(*) as sayi FROM hava_durumu_canli GROUP BY hava_durumu ORDER BY sayi DESC'
    );
    
    distribution.forEach(r => {
      console.log(`   ${r.hava_durumu.padEnd(25)} | ${r.sayi} kayıt`);
    });
    
    // Son kayıtlar
    console.log('\n\n📅 Son 20 Hava Durumu Kaydı:\n');
    const [recent] = await pool.query(
      `SELECT i.il_adi, hd.hava_durumu, hd.sicaklik, hd.yagis_miktari, hd.tarih_saat 
       FROM hava_durumu_canli hd 
       JOIN iller i ON hd.il_id = i.id 
       WHERE i.bolge = 'Marmara' 
       ORDER BY hd.tarih_saat DESC 
       LIMIT 20`
    );
    
    recent.forEach(r => {
      const yagis = r.yagis_miktari > 0 ? `${r.yagis_miktari}mm` : '0mm';
      console.log(`${r.il_adi.padEnd(15)} | ${r.hava_durumu.padEnd(20)} | ${r.sicaklik}°C | Yağış: ${yagis} | ${r.tarih_saat}`);
    });
    
    // Yağmurlu günler
    const [rainy] = await pool.query(
      `SELECT COUNT(*) as sayi 
       FROM hava_durumu_canli 
       WHERE hava_durumu LIKE '%Yağmur%' OR hava_durumu LIKE '%yağmur%' OR yagis_miktari > 0`
    );
    
    const [total] = await pool.query('SELECT COUNT(*) as sayi FROM hava_durumu_canli');
    
    console.log(`\n\n🌧️  Yağmurlu Günler: ${rainy[0].sayi} / ${total[0].sayi} (${((rainy[0].sayi / total[0].sayi) * 100).toFixed(1)}%)`);
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Hata:', error.message);
    process.exit(1);
  }
}

checkWeatherData();


async function checkWeatherData() {
  try {
    // Hava durumu dağılımı
    console.log('📊 Hava Durumu Dağılımı:\n');
    const [distribution] = await pool.query(
      'SELECT hava_durumu, COUNT(*) as sayi FROM hava_durumu_canli GROUP BY hava_durumu ORDER BY sayi DESC'
    );
    
    distribution.forEach(r => {
      console.log(`   ${r.hava_durumu.padEnd(25)} | ${r.sayi} kayıt`);
    });
    
    // Son kayıtlar
    console.log('\n\n📅 Son 20 Hava Durumu Kaydı:\n');
    const [recent] = await pool.query(
      `SELECT i.il_adi, hd.hava_durumu, hd.sicaklik, hd.yagis_miktari, hd.tarih_saat 
       FROM hava_durumu_canli hd 
       JOIN iller i ON hd.il_id = i.id 
       WHERE i.bolge = 'Marmara' 
       ORDER BY hd.tarih_saat DESC 
       LIMIT 20`
    );
    
    recent.forEach(r => {
      const yagis = r.yagis_miktari > 0 ? `${r.yagis_miktari}mm` : '0mm';
      console.log(`${r.il_adi.padEnd(15)} | ${r.hava_durumu.padEnd(20)} | ${r.sicaklik}°C | Yağış: ${yagis} | ${r.tarih_saat}`);
    });
    
    // Yağmurlu günler
    const [rainy] = await pool.query(
      `SELECT COUNT(*) as sayi 
       FROM hava_durumu_canli 
       WHERE hava_durumu LIKE '%Yağmur%' OR hava_durumu LIKE '%yağmur%' OR yagis_miktari > 0`
    );
    
    const [total] = await pool.query('SELECT COUNT(*) as sayi FROM hava_durumu_canli');
    
    console.log(`\n\n🌧️  Yağmurlu Günler: ${rainy[0].sayi} / ${total[0].sayi} (${((rainy[0].sayi / total[0].sayi) * 100).toFixed(1)}%)`);
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Hata:', error.message);
    process.exit(1);
  }
}

checkWeatherData();











