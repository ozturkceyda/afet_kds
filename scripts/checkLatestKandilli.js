const http = require('http');

const url = 'http://www.koeri.boun.edu.tr/scripts/lst6.asp';

http.get(url, (res) => {
  let data = '';
  
  res.on('data', (chunk) => {
    data += chunk;
  });
  
  res.on('end', () => {
    const tableStart = data.indexOf('<pre>');
    const tableEnd = data.indexOf('</pre>');
    
    if (tableStart === -1 || tableEnd === -1) {
      console.log('❌ Veri bulunamadı');
      return;
    }
    
    const tableData = data.substring(tableStart + 5, tableEnd);
    const dataLines = tableData.split('\n').filter(line => {
      const trimmed = line.trim();
      return trimmed.length > 0 && 
             !trimmed.includes('Tarih') && 
             !trimmed.includes('---') &&
             !trimmed.includes('Büyüklük') &&
             trimmed.match(/^\d{4}\.\d{2}\.\d{2}/);
    });
    
    console.log(`📊 Kandilli'den ${dataLines.length} deprem bulundu\n`);
    console.log('🔍 İlk 10 deprem (en yeni):\n');
    
    for (let i = 0; i < Math.min(10, dataLines.length); i++) {
      const line = dataLines[i];
      const trimmed = line.trim();
      
      const dateTimeMatch = trimmed.match(/^(\d{4}\.\d{2}\.\d{2})\s+(\d{2}:\d{2}:\d{2})/);
      if (!dateTimeMatch) continue;
      
      const dateStr = dateTimeMatch[1];
      const timeStr = dateTimeMatch[2];
      const remaining = trimmed.substring(dateTimeMatch[0].length).trim();
      const parts = remaining.split(/\s+/);
      
      if (parts.length < 6) continue;
      
      const latitude = parseFloat(parts[0]);
      const longitude = parseFloat(parts[1]);
      
      // ML değerini bul
      let ml = null;
      for (let j = 4; j < Math.min(7, parts.length); j++) {
        const val = parseFloat(parts[j]);
        if (!isNaN(val) && val > 0 && val < 10) {
          ml = val;
          break;
        }
      }
      
      // Location
      const locationParts = parts.slice(ml ? parts.indexOf(ml.toString()) + 2 : 6);
      const location = locationParts.join(' ').trim();
      
      // Tarih hesapla
      const [year, month, day] = dateStr.split('.');
      const [hour, minute, second] = timeStr.split(':');
      const dateTime = new Date(
        parseInt(year),
        parseInt(month) - 1,
        parseInt(day),
        parseInt(hour),
        parseInt(minute),
        parseInt(second)
      );
      
      const now = new Date();
      const diffHours = Math.floor((now - dateTime) / (1000 * 60 * 60));
      const diffMinutes = Math.floor((now - dateTime) / (1000 * 60)) % 60;
      
      // Marmara kontrolü
      const isMarmara = latitude >= 39.5 && latitude <= 41.7 && longitude >= 26.0 && longitude <= 31.0;
      const marmaraIcon = isMarmara ? '✅' : '❌';
      
      console.log(`${marmaraIcon} ${dateStr} ${timeStr} - ${ml} büyüklüğünde`);
      console.log(`   Konum: ${location}`);
      console.log(`   Koordinat: ${latitude}, ${longitude}`);
      console.log(`   ${diffHours} saat ${diffMinutes} dakika önce\n`);
    }
  });
}).on('error', (error) => {
  console.error('❌ Hata:', error.message);
});

