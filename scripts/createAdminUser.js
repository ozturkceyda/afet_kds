require('dotenv').config();
const bcrypt = require('bcrypt');
const pool = require('../config/database');

async function createAdminUser() {
  try {
    const username = 'admin';
    const password = 'admin123';
    const email = 'admin@kds.gov.tr';

    // Şifreyi hashle
    const hashedPassword = await bcrypt.hash(password, 10);

    // Kullanıcı var mı kontrol et
    const [existing] = await pool.query(
      'SELECT id FROM kullanicilar WHERE kullanici_adi = ?',
      [username]
    );

    if (existing.length > 0) {
      console.log('⚠️  Admin kullanıcı zaten mevcut!');
      console.log('   Kullanıcı adı:', username);
      console.log('   Şifre:', password);
      process.exit(0);
    }

    // Yeni admin kullanıcı oluştur
    await pool.query(
      `INSERT INTO kullanicilar (kullanici_adi, email, sifre, rol, aktif) 
       VALUES (?, ?, ?, 'admin', 1)`,
      [username, email, hashedPassword]
    );

    console.log('✅ Admin kullanıcı başarıyla oluşturuldu!');
    console.log('   Kullanıcı adı:', username);
    console.log('   Şifre:', password);
    console.log('   Email:', email);
    console.log('\n⚠️  GÜVENLİK UYARISI: Üretim ortamında şifreyi değiştirin!');
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Hata:', error.message);
    process.exit(1);
  }
}

createAdminUser();
