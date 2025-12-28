const bcrypt = require('bcrypt');
const pool = require('../config/database');

async function resetAdminPassword() {
    console.log('🔐 Admin şifresi sıfırlanıyor...\n');
    
    try {
        // Admin kullanıcısını bul
        const [users] = await pool.query(
            'SELECT * FROM kullanicilar WHERE kullanici_adi = ? OR email LIKE ?',
            ['admin', '%admin%']
        );
        
        if (users.length === 0) {
            console.log('❌ Admin kullanıcısı bulunamadı!');
            console.log('💡 Önce scripts/createAdminUser.js çalıştırın.');
            return;
        }
        
        const admin = users[0];
        console.log(`✅ Admin kullanıcısı bulundu: ${admin.kullanici_adi} (${admin.email})\n`);
        
        // Yeni şifre oluştur
        const newPassword = 'admin123';
        const hashedPassword = await bcrypt.hash(newPassword, 10);
        
        // Şifreyi güncelle
        await pool.query(
            'UPDATE kullanicilar SET sifre = ? WHERE id = ?',
            [hashedPassword, admin.id]
        );
        
        console.log('✅ Admin şifresi başarıyla sıfırlandı!\n');
        console.log('═══════════════════════════════════════════════════════════════');
        console.log('📋 Giriş Bilgileri:');
        console.log(`   Kullanıcı Adı: ${admin.kullanici_adi}`);
        console.log(`   Şifre: ${newPassword}`);
        console.log(`   Email: ${admin.email}`);
        console.log('═══════════════════════════════════════════════════════════════');
        console.log('\n⚠️  GÜVENLİK UYARISI:');
        console.log('   Üretim ortamında mutlaka şifreyi değiştirin!\n');
        
    } catch (error) {
        console.error('❌ Şifre sıfırlanırken hata:', error.message);
        throw error;
    } finally {
        await pool.end();
    }
}

if (require.main === module) {
    resetAdminPassword();
}

module.exports = { resetAdminPassword };

const pool = require('../config/database');

async function resetAdminPassword() {
    console.log('🔐 Admin şifresi sıfırlanıyor...\n');
    
    try {
        // Admin kullanıcısını bul
        const [users] = await pool.query(
            'SELECT * FROM kullanicilar WHERE kullanici_adi = ? OR email LIKE ?',
            ['admin', '%admin%']
        );
        
        if (users.length === 0) {
            console.log('❌ Admin kullanıcısı bulunamadı!');
            console.log('💡 Önce scripts/createAdminUser.js çalıştırın.');
            return;
        }
        
        const admin = users[0];
        console.log(`✅ Admin kullanıcısı bulundu: ${admin.kullanici_adi} (${admin.email})\n`);
        
        // Yeni şifre oluştur
        const newPassword = 'admin123';
        const hashedPassword = await bcrypt.hash(newPassword, 10);
        
        // Şifreyi güncelle
        await pool.query(
            'UPDATE kullanicilar SET sifre = ? WHERE id = ?',
            [hashedPassword, admin.id]
        );
        
        console.log('✅ Admin şifresi başarıyla sıfırlandı!\n');
        console.log('═══════════════════════════════════════════════════════════════');
        console.log('📋 Giriş Bilgileri:');
        console.log(`   Kullanıcı Adı: ${admin.kullanici_adi}`);
        console.log(`   Şifre: ${newPassword}`);
        console.log(`   Email: ${admin.email}`);
        console.log('═══════════════════════════════════════════════════════════════');
        console.log('\n⚠️  GÜVENLİK UYARISI:');
        console.log('   Üretim ortamında mutlaka şifreyi değiştirin!\n');
        
    } catch (error) {
        console.error('❌ Şifre sıfırlanırken hata:', error.message);
        throw error;
    } finally {
        await pool.end();
    }
}

if (require.main === module) {
    resetAdminPassword();
}

module.exports = { resetAdminPassword };











