Afet Yönetimi Karar Destek Sistemi (KDS)

Marmara Bölgesi özelinde deprem, sel ve yangın afetlerine yönelik risk analizleri üreten, veriye dayalı karar destek mekanizmaları sunan web tabanlı bir Afet Yönetimi Karar Destek Sistemi.
Bu proje; afet risklerinin analiz edilmesi, öncelikli bölgelerin belirlenmesi ve karar vericilere destek olacak çıktılar üretilmesi amacıyla geliştirilmiştir.

Projenin Amacı

Bu sistemin temel hedefleri:
Marmara Bölgesi için afet risklerini bütüncül şekilde analiz etmek
Deprem, sel ve yangın verilerini tek bir platformda toplamak
Risk skorları oluşturarak öncelikli bölgeleri belirlemek
Afet yönetimi süreçlerinde veriye dayalı karar desteği sağlamak
Akademik ve teknik açıdan sürdürülebilir bir backend mimarisi sunmak

Sistem Kapsamı

Sistem aşağıdaki afet türleri için analiz ve raporlama üretir:
Deprem Risk Analizi
Sel Risk Analizi
Orman Yangını Risk Analizi
Hava Durumu Tabanlı Risk Değerlendirmesi
Barınma Kapasitesi ve Afet Lojistiği Analizi
İl bazlı genel risk skorları

Mimari Yapı
Proje MVC (Model–Controller) mimarisi esas alınarak geliştirilmiştir.

Model Katmanı:
Veritabanı sorguları, analiz algoritmaları ve risk hesaplamaları

Controller Katmanı:
API endpoint’leri, iş kuralları ve veri akışı

View / Client Katmanı:
Dashboard arayüzü ve kullanıcı etkileşimleri

Bu yapı, sistemin okunabilir, geliştirilebilir ve sürdürülebilir olmasını sağlar.

Kullanılan Teknolojiler
Backend

Node.js
Express.js
MySQL
dotenv
bcrypt
express-session

Frontend
HTML5
CSS3
Vanilla JavaScript

Diğer
RESTful API mimarisi
SQL tabanlı analiz ve raporlama
WampServer (lokal geliştirme ortamı)

afet-kds/
│
├── server.js
├── package.json
├── .env
├── schema.sql
│
├── config/
│   └── database.js
│
├── models/
│   ├── EarthquakeModel.js
│   ├── FloodModel.js
│   ├── FireModel.js
│   ├── RiskScoreModel.js
│   ├── ProvinceModel.js
│   ├── WeatherModel.js
│   ├── ShelterCenterModel.js
│   └── UserModel.js
│
├── controllers/
├── routes/
│
├── views/
│   ├── index.html
│   └── dashboard.html
│
├── public/
│   └── marmara.geojson
│
└── README.md

Veritabanı Yapısı

Veritabanı, afet yönetimi ve risk analizi odaklı olacak şekilde tasarlanmıştır.

Başlıca tablolar:

iller
deprem_gecmis
deprem_canli
sel_verileri
orman_yanginlari
risk_skorlari
hava_durumu_canli
barinma_merkezleri
kullanicilar
Risk skorları; deprem, sel ve yangın verilerinin birleştirilmesiyle dinamik olarak hesaplanır.

Analiz ve Hesaplama Mantığı
Risk Skorları

Afet türlerine göre ayrı ayrı hesaplanır
Genel risk skoru, afet risklerinin ortalaması alınarak oluşturulur
Normalize edilmiş değerler kullanılır

Sel Analizi
4 yıllık geçmiş veriler
Min–Max normalizasyonu
Hava durumu (yağış, nem) entegrasyonu

Önceliklendirme ve bütçe önerileri

Yangın Analizi
Yangın sayısıEtkilenen alan
Yangın seviyesi
Risk seviyesine göre önlem önerileri
Deprem Analizi
Canlı ve geçmiş deprem verileri
Büyüklük, derinlik, zaman analizi
İl bazlı istatistikler

API Endpoint’leri
İller
GET /api/iller

Risk Skorları
GET /api/risk-skorlari
GET /api/risk-skorlari/:ilId

Deprem

GET /api/depremler/canli
GET /api/depremler/gecmis
GET /api/depremler/istatistik/:ilId

Sel

GET /api/sel/analiz
GET /api/sel/trend/:ilId
POST /api/sel/oneriler

Yangın

GET /api/yangin/analiz
GET /api/yangin/nedenler
GET /api/yangin/onlemler

Hava Durumu

GET /api/hava-durumu
GET /api/hava-durumu/:ilId

Kurulum ve Çalıştırma
1. Bağımlılıkları Yükleme
npm install

2. Ortam Değişkenleri
.env dosyası:
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=
DB_NAME=afet_kds
PORT=3000

3. Veritabanı
schema.sql dosyası çalıştırılır
Tablolar ve örnek veriler oluşturulur

4. Server Başlatma
npm start

Tarayıcı:http://localhost:3000
Proje Notları

Sistem akademik bir Karar Destek Sistemi (KDS) olarak tasarlanmıştır
Risk analizleri deterministik ve tekrarlanabilir sonuçlar üretir
Mimari yapı yeni afet türlerinin eklenmesine uygundur
Kod yapısı modülerdir ve genişletilebilir

Sonuç

Afet Yönetimi Karar Destek Sistemi;
afet verilerini analiz eden, riskleri hesaplayan ve karar vericilere rehberlik eden bütüncül bir yazılım çözümüdür.





