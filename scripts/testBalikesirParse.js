/**
 * Balıkesir depremini manuel test et
 */

const { extractProvinceFromLocation, normalizeTurkish } = require('./fetchLiveEarthquakes');

// Test location string'i
const testLocation = 'SINANDEDE-SINDIRGI (BALIKESIR)';

console.log('🧪 Balıkesir Parse Testi\n');
console.log(`Location: "${testLocation}"`);

// normalizeTurkish fonksiyonunu test et
const normalized = normalizeTurkish(testLocation);
console.log(`Normalized: "${normalized}"`);

// extractProvinceFromLocation'ı test et
// Ama önce marmaraIlleri objesini oluştur
const marmaraIlleri = {
  'İstanbul': 1,
  'Bursa': 2,
  'Kocaeli': 3,
  'Sakarya': 4,
  'Balıkesir': 5,
  'Çanakkale': 6,
  'Tekirdağ': 7,
  'Yalova': 8,
  'Bilecik': 9,
  'Edirne': 10,
  'Kırklareli': 11
};

// extractProvinceFromLocation fonksiyonunu kopyala ve test et
function extractProvinceFromLocationTest(location) {
  if (!location) return null;
  
  const locationUpper = location.toUpperCase();
  const locationNormalized = normalizeTurkish(location);
  
  // Parantez içindeki il adını bul: "(BALIKESIR)" veya "(CANAKKALE)"
  const parenMatch = locationUpper.match(/\(([^)]+)\)/);
  if (parenMatch) {
    const ilInParen = parenMatch[1].trim();
    const ilInParenNormalized = normalizeTurkish(ilInParen);
    
    console.log(`\nParantez içinde: "${ilInParen}"`);
    console.log(`Normalized: "${ilInParenNormalized}"`);
    
    // SADECE Marmara illerini kontrol et
    for (const il of Object.keys(marmaraIlleri)) {
      const ilUpper = il.toUpperCase();
      const ilNormalized = normalizeTurkish(il);
      
      console.log(`  "${ilInParenNormalized}" === "${ilNormalized}"? ${ilInParenNormalized === ilNormalized}`);
      console.log(`  "${ilInParenNormalized}".includes("${ilNormalized}")? ${ilInParenNormalized.includes(ilNormalized)}`);
      
      // Normalize edilmiş karşılaştırma (Türkçe karakter sorununu çözer)
      if (ilInParenNormalized === ilNormalized || 
          ilInParenNormalized.includes(ilNormalized) ||
          ilNormalized.includes(ilInParenNormalized)) {
        console.log(`  ✅ Eşleşme bulundu: ${il}`);
        return il;
      }
    }
  }
  
  return null;
}

const result = extractProvinceFromLocationTest(testLocation);
console.log(`\nSonuç: ${result || 'BULUNAMADI'}`);




















