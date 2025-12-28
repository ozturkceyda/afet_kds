/**
 * Kandilli Rasathanesi veri formatını test et
 */

const http = require('http');

http.get('http://www.koeri.boun.edu.tr/scripts/lst6.asp', (res) => {
  let data = '';
  
  res.on('data', (chunk) => {
    data += chunk;
  });
  
  res.on('end', () => {
    console.log('📡 Kandilli verisi alındı\n');
    
    const start = data.indexOf('<pre>');
    const end = data.indexOf('</pre>');
    
    if (start === -1 || end === -1) {
      console.log('❌ <pre> etiketi bulunamadı');
      return;
    }
    
    const tableData = data.substring(start + 5, end);
    const lines = tableData.split('\n');
    
    console.log('📋 İlk 15 satır:\n');
    let count = 0;
    for (const line of lines) {
      const trimmed = line.trim();
      if (trimmed.length > 0 && trimmed.match(/^\d{4}\.\d{2}\.\d{2}/)) {
        console.log(`${count + 1}. ${trimmed}`);
        count++;
        if (count >= 15) break;
      }
    }
    
    console.log('\n\n🔍 Parse testi:\n');
    const testLine = lines.find(l => l.trim().match(/^\d{4}\.\d{2}\.\d{2}/));
    if (testLine) {
      console.log('Örnek satır:', testLine.trim());
      console.log('\nParse edilmiş:');
      
      const trimmed = testLine.trim();
      const dateTimeMatch = trimmed.match(/^(\d{4}\.\d{2}\.\d{2})\s+(\d{2}:\d{2}:\d{2})/);
      if (dateTimeMatch) {
        console.log('  Tarih:', dateTimeMatch[1]);
        console.log('  Saat:', dateTimeMatch[2]);
        
        const remaining = trimmed.substring(dateTimeMatch[0].length).trim();
        const parts = remaining.split(/\s+/);
        console.log('  Kalan kısım (split):', parts);
        console.log('  Enlem:', parts[0]);
        console.log('  Boylam:', parts[1]);
        console.log('  Derinlik:', parts[2]);
        console.log('  MD:', parts[3]);
        console.log('  ML:', parts[4]);
        console.log('  Mw:', parts[5]);
        console.log('  Yer:', parts.slice(6).join(' '));
      }
    }
  });
}).on('error', (error) => {
  console.error('❌ Hata:', error.message);
});




















