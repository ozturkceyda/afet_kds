/**
 * Kandilli parse fonksiyonunu test et
 */

const http = require('http');

function parseKandilliData(htmlData) {
  const earthquakes = [];
  
  // HTML içinden tablo verilerini çıkar
  const tableStart = htmlData.indexOf('<pre>');
  const tableEnd = htmlData.indexOf('</pre>');
  
  if (tableStart === -1 || tableEnd === -1) {
    console.log('❌ <pre> tag bulunamadı');
    return earthquakes;
  }
  
  const tableData = htmlData.substring(tableStart + 5, tableEnd);
  const dataLines = tableData.split('\n').filter(line => {
    const trimmed = line.trim();
    return trimmed.length > 0 && 
           !trimmed.includes('Tarih') && 
           !trimmed.includes('---') &&
           !trimmed.includes('Büyüklük') &&
           trimmed.match(/^\d{4}\.\d{2}\.\d{2}/);
  });
  
  console.log(`📊 Toplam ${dataLines.length} satır bulundu\n`);
  
  // İlk 10 satırı göster
  for (let i = 0; i < Math.min(10, dataLines.length); i++) {
    const line = dataLines[i];
    console.log(`Satır ${i + 1}: ${line.substring(0, 100)}...`);
    
    try {
      const trimmed = line.trim();
      const dateTimeMatch = trimmed.match(/^(\d{4}\.\d{2}\.\d{2})\s+(\d{2}:\d{2}:\d{2})/);
      if (!dateTimeMatch) {
        console.log('  ❌ Tarih/saat parse edilemedi\n');
        continue;
      }
      
      const dateStr = dateTimeMatch[1];
      const timeStr = dateTimeMatch[2];
      const remaining = trimmed.substring(dateTimeMatch[0].length).trim();
      const parts = remaining.split(/\s+/);
      
      console.log(`  ✅ Tarih: ${dateStr}, Saat: ${timeStr}`);
      console.log(`  📍 Parts: ${parts.length} adet`);
      console.log(`  📍 İlk 5 part: ${parts.slice(0, 5).join(', ')}`);
      
      if (parts.length >= 6) {
        const latitude = parseFloat(parts[0]);
        const longitude = parseFloat(parts[1]);
        const depth = parseFloat(parts[2]);
        
        console.log(`  📍 Enlem: ${latitude}, Boylam: ${longitude}, Derinlik: ${depth}`);
        
        // ML değerini bul
        let ml = null;
        for (let j = 3; j < parts.length; j++) {
          const val = parseFloat(parts[j]);
          if (!isNaN(val) && val > 0) {
            ml = val;
            break;
          }
        }
        console.log(`  📍 ML: ${ml}`);
        
        // Location
        const locationStart = remaining.indexOf(parts[3] + ' ' + parts[4] + ' ' + parts[5]) + (parts[3] + ' ' + parts[4] + ' ' + parts[5]).length;
        const location = remaining.substring(locationStart).trim();
        console.log(`  📍 Location: ${location}`);
      }
      
      console.log('');
    } catch (error) {
      console.log(`  ❌ Hata: ${error.message}\n`);
    }
  }
  
  return earthquakes;
}

// Test
const url = 'http://www.koeri.boun.edu.tr/scripts/lst6.asp';

http.get(url, (res) => {
  let data = '';
  
  res.on('data', (chunk) => {
    data += chunk;
  });
  
  res.on('end', () => {
    console.log('📡 Kandilli verisi alındı\n');
    parseKandilliData(data);
  });
}).on('error', (error) => {
  console.error('❌ Hata:', error.message);
});




















