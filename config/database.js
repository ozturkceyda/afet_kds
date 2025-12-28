const mysql = require('mysql2/promise');
require('dotenv').config();

const pool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 3306,
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'kds_afet_yönetimi',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});

// Test connection
pool.getConnection()
  .then(connection => {
    console.log('✅ MySQL bağlantısı başarılı!');
    connection.release();
  })
  .catch(err => {
    console.error('❌ MySQL bağlantı hatası:', err.message);
    console.error('💡 Çözüm önerileri:');
    console.error('   1. MySQL servisinin çalıştığından emin olun (wampmysqld64)');
    console.error('   2. WAMP/XAMPP kontrol panelinden MySQL\'i başlatın');
    console.error('   3. Veya start_mysql.bat dosyasını yönetici olarak çalıştırın');
    console.error('   4. .env dosyasındaki veritabanı bilgilerini kontrol edin');
  });

module.exports = pool;









