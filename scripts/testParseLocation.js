/**
 * Location parse testi
 */

const marmaraIlleri = {
  'İstanbul': null,
  'Bursa': null,
  'Kocaeli': null,
  'Sakarya': null,
  'Balıkesir': null,
  'Çanakkale': null,
  'Tekirdağ': null,
  'Yalova': null,
  'Bilecik': null,
  'Edirne': null,
  'Kırklareli': null
};

function extractProvinceFromLocation(location) {
  if (!location) return null;
  
  const locationUpper = location.toUpperCase();
  
  // Parantez içindeki il adını bul: "(BALIKESIR)"
  const parenMatch = locationUpper.match(/\(([^)]+)\)/);
  if (parenMatch) {
    const ilInParen = parenMatch[1].trim();
    console.log(`  Parantez içinde bulunan: "${ilInParen}"`);
    // SADECE Marmara illerini kontrol et
    for (const il of Object.keys(marmaraIlleri)) {
      const ilUpper = il.toUpperCase();
      console.log(`    "${ilInParen}" === "${ilUpper}"? ${ilInParen === ilUpper}`);
      console.log(`    "${ilInParen}".includes("${ilUpper}")? ${ilInParen.includes(ilUpper)}`);
      // Tam eşleşme veya içerme kontrolü
      if (ilInParen === ilUpper || ilInParen.includes(ilUpper)) {
        // Marmara il listesinde var mı kontrol et
        if (marmaraIlleri[il] !== null) {
          console.log(`    ✅ Eşleşme bulundu: ${il}`);
          return il;
        }
      }
    }
  }
  
  // Parantez yoksa direkt il adını ara (sadece Marmara illeri)
  const locationLower = location.toLowerCase();
  for (const il of Object.keys(marmaraIlleri)) {
    const ilLower = il.toLowerCase();
    // İl adı location'da geçiyor mu ve Marmara il listesinde var mı?
    if (locationLower.includes(ilLower) && marmaraIlleri[il] !== null) {
      return il;
    }
  }
  
  return null;
}

// Test örnekleri
const testLocations = [
  'YAYLACIK-SINDIRGI (BALIKESIR)',
  'KOZCESME-BIGA (CANAKKALE)',
  'KATRANDAGI-EMET (KUTAHYA)',
  'İSTANBUL-KADIKÖY',
  'BURSA-OSMANGAZI'
];

console.log('🧪 Location Parse Testi\n');
testLocations.forEach(loc => {
  console.log(`\n📍 "${loc}":`);
  const result = extractProvinceFromLocation(loc);
  console.log(`  Sonuç: ${result || 'BULUNAMADI'}`);
});




















