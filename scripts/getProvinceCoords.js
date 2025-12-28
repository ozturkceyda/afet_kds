const pool = require('../config/database');

async function getProvinceCoords() {
  try {
    const [rows] = await pool.query('SELECT id, il_adi, enlem, boylam FROM iller WHERE bolge = "Marmara"');
    console.log('Marmara illeri koordinatları:');
    rows.forEach(r => {
      console.log(`${r.il_adi} (ID: ${r.id}): ${r.enlem}, ${r.boylam}`);
    });
    process.exit(0);
  } catch (error) {
    console.error('Hata:', error.message);
    process.exit(1);
  }
}

getProvinceCoords();




















