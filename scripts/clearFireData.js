const pool = require('../config/database');

async function clearFireData() {
    console.log('🗑️  Simüle edilmiş yangın verileri temizleniyor...\n');
    
    try {
        const [result] = await pool.query('DELETE FROM orman_yanginlari');
        console.log(`✅ ${result.affectedRows} simüle yangın kaydı silindi\n`);
        
        // İstatistikleri göster
        const [stats] = await pool.query(`
            SELECT COUNT(*) as count FROM orman_yanginlari
        `);
        console.log(`📊 Kalan kayıt sayısı: ${stats[0].count}`);
        
        console.log('\n✅ Temizleme tamamlandı!');
        console.log('💡 Artık gerçek verileri yükleyebilirsiniz.\n');
        
    } catch (error) {
        console.error('❌ Temizleme sırasında hata:', error.message);
        throw error;
    } finally {
        await pool.end();
    }
}

if (require.main === module) {
    clearFireData();
}

module.exports = { clearFireData };


async function clearFireData() {
    console.log('🗑️  Simüle edilmiş yangın verileri temizleniyor...\n');
    
    try {
        const [result] = await pool.query('DELETE FROM orman_yanginlari');
        console.log(`✅ ${result.affectedRows} simüle yangın kaydı silindi\n`);
        
        // İstatistikleri göster
        const [stats] = await pool.query(`
            SELECT COUNT(*) as count FROM orman_yanginlari
        `);
        console.log(`📊 Kalan kayıt sayısı: ${stats[0].count}`);
        
        console.log('\n✅ Temizleme tamamlandı!');
        console.log('💡 Artık gerçek verileri yükleyebilirsiniz.\n');
        
    } catch (error) {
        console.error('❌ Temizleme sırasında hata:', error.message);
        throw error;
    } finally {
        await pool.end();
    }
}

if (require.main === module) {
    clearFireData();
}

module.exports = { clearFireData };











