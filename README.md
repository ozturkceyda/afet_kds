#  Afet Yönetimi Karar Destek Sistemi (KDS)

Marmara Bölgesi özelinde **deprem, sel ve orman yangını** afetlerine yönelik risk analizleri üreten, veriye dayalı karar destek mekanizmaları sunan **web tabanlı bir Afet Yönetimi Karar Destek Sistemi**dir.

Bu proje; afet risklerinin analiz edilmesi, öncelikli bölgelerin belirlenmesi ve karar vericilere destek olacak çıktılar üretilmesi amacıyla geliştirilmiştir.

---

##  Projenin Amacı

Bu sistemin temel hedefleri:

- Marmara Bölgesi için afet risklerini **bütüncül** şekilde analiz etmek  
- Deprem, sel ve yangın verilerini **tek bir platformda** toplamak  
- Risk skorları oluşturarak **öncelikli bölgeleri** belirlemek  
- Afet yönetimi süreçlerinde **veriye dayalı karar desteği** sağlamak  
- Akademik ve teknik açıdan **sürdürülebilir bir backend mimarisi** sunmak  

---

##  Sistem Kapsamı

Sistem aşağıdaki afet türleri için analiz ve raporlama üretir:

- Deprem Risk Analizi  
- Sel Risk Analizi  
- Orman Yangını Risk Analizi  
- Hava Durumu Tabanlı Risk Değerlendirmesi  
- Barınma Kapasitesi ve Afet Lojistiği Analizi  
- İl bazlı **genel risk skorları**  

---

##  Mimari Yapı (MVC)

Proje **MVC (Model – Controller – View)** mimarisi esas alınarak geliştirilmiştir.

###  Model Katmanı
- Veritabanı sorguları  
- Analiz algoritmaları  
- Risk skor hesaplamaları  

###  Controller Katmanı
- RESTful API endpoint’leri  
- İş kuralları  
- Veri akışının yönetimi  

###  View / Client Katmanı
- Dashboard arayüzü  
- Harita, grafik ve tablo görselleştirmeleri  
- Kullanıcı etkileşimleri  

Bu yapı sistemin **okunabilir**, **geliştirilebilir** ve **sürdürülebilir** olmasını sağlar.

---

##  Kullanılan Teknolojiler

### Backend
- **Node.js**
- **Express.js**
- **MySQL**
- **dotenv**
- **express-session**
- **bcrypt**

### Frontend
- HTML5  
- CSS3  
- Vanilla JavaScript  
- Leaflet.js (Harita)  
- Chart.js (Grafikler)  

### Geliştirme Ortamı
- WampServer  
- phpMyAdmin  

---

##  Proje Klasör Yapısı

```text
afet-kds/
├── app.js
├── server.js
├── package.json
├── package-lock.json
├── .env.example
├── config/
├── database/
├── models/
│   ├── ProvinceModel.js
│   ├── EarthquakeModel.js
│   ├── FloodModel.js
│   ├── FireModel.js
│   ├── WeatherModel.js
│   ├── ShelterCenterModel.js
│   └── UserModel.js
├── controllers/
├── routes/
│   └── api/
├── middleware/
├── scripts/
├── views/
│   ├── index.html
│   └── dashboard.html
├── public/
│   └── marmara.geojson
└── README.md

 API Endpoint Listesi
 İller

GET /api/provinces

GET /api/provinces/marmara

GET /api/provinces/:id

 Risk Skorları

GET /api/risks

GET /api/risks/average

GET /api/risks/all-averages

 Deprem

GET /api/earthquakes

GET /api/earthquakes/recent

GET /api/earthquakes/live

GET /api/earthquakes/statistics

 Sel

GET /api/flood-risk/analysis

GET /api/flood-risk/table

GET /api/flood-risk/warnings

 Yangın

GET /api/fire-risk/analysis

GET /api/fires/statistics

GET /api/fires/recent

 Hava Durumu

GET /api/weather

GET /api/weather/all-marmara

GET /api/weather/statistics

 İş Kuralları & Özel Senaryolar

Proje kapsamında iş kuralı içeren özel senaryolar uygulanmıştır:

Çoklu afet verileri birleştirilerek genel risk skoru hesaplanır

Risk seviyelerine göre bütçe ve altyapı öncelikleri belirlenir

Afet büyüklüğüne göre senaryo bazlı karar özetleri üretilir

Canlı ve geçmiş veriler birlikte analiz edilir

 Veritabanı Tasarımı

Veritabanı MySQL üzerinde tasarlanmıştır ve aşağıdaki temel tabloları içerir:

iller

deprem_gecmis

deprem_canli

sel_verileri

orman_yanginlari

hava_durumu_canli

barinma_merkezleri

risk_skorlari

kullanicilar

 ER Diyagramı proje teslimi kapsamında ayrıca sunulmuştur (PNG/PDF).

 Kurulum Adımları
1️) Bağımlılıkların Kurulması
npm install
2️) Ortam Değişkenleri
.env.example dosyası baz alınarak .env oluşturulur.
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=
DB_NAME=kds_afet_yonetimi
PORT=3000
3️) Sunucunun Çalıştırılması
npm start
Geliştirme modu:
npm run dev

 Dashboard Özellikleri

Marmara Bölgesi risk haritası (koroplet)

İl bazlı risk skorları

Deprem senaryo analizleri (M6.0 – M7.5)

Sel ve yangın analiz grafikleri

Bütçe ve altyapı önceliklendirme tabloları

Afet lojistiği ve barınma kapasitesi bilgileri

 Notlar

Proje MVC mimarisine katı şekilde uygundur

REST prensiplerine uygun API tasarımı yapılmıştır

Kod okunabilirliği ve sürdürülebilirlik önceliklendirilmiştir

Akademik proje standartlarına uygun olarak hazırlanmıştır

 Teslim Kapsamı

GitHub Repository (Public)

README.md

API endpoint listesi

ER Diyagramı (PNG/PDF)

.env.example dosyası

Sunucu Tabanlı Programlama dersi kapsamında hazırlanmıştır.





