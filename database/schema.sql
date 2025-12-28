-- Afet Yönetimi KDS Veritabanı Şeması
-- Veritabanı: kds_afet_yönetimi

-- İller Tablosu
CREATE TABLE IF NOT EXISTS `iller` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `il_adi` varchar(50) NOT NULL,
  `bolge` varchar(50) DEFAULT NULL,
  `enlem` decimal(10,7) DEFAULT NULL,
  `boylam` decimal(10,7) DEFAULT NULL,
  `nufus` int(11) DEFAULT NULL,
  `olusturma_tarihi` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_bolge` (`bolge`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- İlçeler Tablosu
CREATE TABLE IF NOT EXISTS `ilceler` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `il_id` int(11) NOT NULL,
  `ilce_adi` varchar(100) NOT NULL,
  `enlem` decimal(10,7) DEFAULT NULL,
  `boylam` decimal(10,7) DEFAULT NULL,
  `nufus` int(11) DEFAULT NULL,
  `olusturma_tarihi` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_il_id` (`il_id`),
  CONSTRAINT `fk_ilceler_iller` FOREIGN KEY (`il_id`) REFERENCES `iller` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Canlı Deprem Verileri Tablosu
CREATE TABLE IF NOT EXISTS `deprem_canli` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `il_id` int(11) NOT NULL,
  `ilce_id` int(11) DEFAULT NULL,
  `buyukluk` decimal(4,2) NOT NULL,
  `derinlik` decimal(6,2) DEFAULT NULL,
  `tarih_saat` datetime NOT NULL,
  `enlem` decimal(10,7) NOT NULL,
  `boylam` decimal(10,7) NOT NULL,
  `kaynak` varchar(100) DEFAULT NULL,
  `olusturma_tarihi` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_il_id` (`il_id`),
  KEY `idx_ilce_id` (`ilce_id`),
  KEY `idx_tarih_saat` (`tarih_saat`),
  CONSTRAINT `fk_deprem_canli_iller` FOREIGN KEY (`il_id`) REFERENCES `iller` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fk_deprem_canli_ilceler` FOREIGN KEY (`ilce_id`) REFERENCES `ilceler` (`id`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Geçmiş Deprem Verileri Tablosu
CREATE TABLE IF NOT EXISTS `deprem_gecmis` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `il_id` int(11) NOT NULL,
  `ilce_id` int(11) DEFAULT NULL,
  `buyukluk` decimal(4,2) NOT NULL,
  `derinlik` decimal(6,2) DEFAULT NULL,
  `tarih_saat` datetime NOT NULL,
  `enlem` decimal(10,7) NOT NULL,
  `boylam` decimal(10,7) NOT NULL,
  `hasar_bilgisi` text DEFAULT NULL,
  `kaynak` varchar(100) DEFAULT NULL,
  `olusturma_tarihi` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_il_id` (`il_id`),
  KEY `idx_ilce_id` (`ilce_id`),
  KEY `idx_tarih_saat` (`tarih_saat`),
  CONSTRAINT `fk_deprem_gecmis_iller` FOREIGN KEY (`il_id`) REFERENCES `iller` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fk_deprem_gecmis_ilceler` FOREIGN KEY (`ilce_id`) REFERENCES `ilceler` (`id`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Hava Durumu Verileri Tablosu
-- NOT: Görselde primary key görünmüyor, bu yüzden id ekliyoruz
CREATE TABLE IF NOT EXISTS `hava_durumu_verileri` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `il_id` int(11) NOT NULL,
  `ilce_id` int(11) DEFAULT NULL,
  `sicaklik` decimal(5,2) DEFAULT NULL,
  `nem` int(11) DEFAULT NULL,
  `ruzgar_hizi` decimal(5,2) DEFAULT NULL,
  `yagis_miktari` decimal(6,2) DEFAULT NULL,
  `hava_durumu` varchar(50) DEFAULT NULL,
  `basinc` decimal(7,2) DEFAULT NULL,
  `tarih_saat` datetime NOT NULL,
  `olusturma_tarihi` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_il_id` (`il_id`),
  KEY `idx_ilce_id` (`ilce_id`),
  KEY `idx_tarih_saat` (`tarih_saat`),
  CONSTRAINT `fk_hava_durumu_iller` FOREIGN KEY (`il_id`) REFERENCES `iller` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fk_hava_durumu_ilceler` FOREIGN KEY (`ilce_id`) REFERENCES `ilceler` (`id`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Risk Skorları Tablosu
CREATE TABLE IF NOT EXISTS `risk_skorlari` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `il_id` int(11) NOT NULL,
  `ilce_id` int(11) DEFAULT NULL,
  `deprem_riski` decimal(5,2) DEFAULT NULL,
  `sel_riski` decimal(5,2) DEFAULT NULL,
  `yangin_riski` decimal(5,2) DEFAULT NULL,
  `genel_risk_skoru` decimal(5,2) DEFAULT NULL,
  `guncelleme_tarihi` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_il_id` (`il_id`),
  KEY `idx_ilce_id` (`ilce_id`),
  KEY `idx_genel_risk` (`genel_risk_skoru`),
  CONSTRAINT `fk_risk_skorlari_iller` FOREIGN KEY (`il_id`) REFERENCES `iller` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fk_risk_skorlari_ilceler` FOREIGN KEY (`ilce_id`) REFERENCES `ilceler` (`id`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Barınma Merkezleri Tablosu
CREATE TABLE IF NOT EXISTS `barinma_merkezleri` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `il_id` int(11) NOT NULL,
  `ilce_id` int(11) DEFAULT NULL,
  `merkez_tipi` enum('cadirkent','prefabrik_yapi','gecici_iskan_merkezi') NOT NULL,
  `kapasite` int(11) NOT NULL DEFAULT 0,
  `dolu_kapasite` int(11) DEFAULT 0,
  `durum` enum('aktif','pasif','bakim') DEFAULT 'aktif',
  `adres` text DEFAULT NULL,
  `enlem` decimal(10,7) DEFAULT NULL,
  `boylam` decimal(10,7) DEFAULT NULL,
  `guncelleme_tarihi` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_il_id` (`il_id`),
  KEY `idx_ilce_id` (`ilce_id`),
  KEY `idx_merkez_tipi` (`merkez_tipi`),
  CONSTRAINT `fk_barinma_merkezleri_iller` FOREIGN KEY (`il_id`) REFERENCES `iller` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fk_barinma_merkezleri_ilceler` FOREIGN KEY (`ilce_id`) REFERENCES `ilceler` (`id`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Afet İhtiyaç Verileri Tablosu (Günlük ihtiyaç takibi)
CREATE TABLE IF NOT EXISTS `afet_ihtiyac_verileri` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `il_id` int(11) NOT NULL,
  `tarih` date NOT NULL,
  `gun` int(11) NOT NULL,
  `cadir_ihtiyac` int(11) DEFAULT 0,
  `gida_ihtiyac` decimal(10,2) DEFAULT 0,
  `ilac_ihtiyac` int(11) DEFAULT 0,
  `su_ihtiyac` decimal(10,2) DEFAULT 0,
  `battaniye_ihtiyac` int(11) DEFAULT 0,
  `olusturma_tarihi` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_il_id` (`il_id`),
  KEY `idx_tarih` (`tarih`),
  KEY `idx_gun` (`gun`),
  CONSTRAINT `fk_afet_ihtiyac_iller` FOREIGN KEY (`il_id`) REFERENCES `iller` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Sel Verileri Tablosu (Flood Event Data + Management Recommendations)
CREATE TABLE IF NOT EXISTS `sel_verileri` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `il_id` int(11) NOT NULL,
  `yil` int(11) NOT NULL,
  `sel_sayisi` int(11) DEFAULT 0,
  `onerilen_butce` decimal(10,2) DEFAULT NULL COMMENT 'Milyon TL - İl bazında önerilen bütçe',
  `dere_islahi_oncelik` int(11) DEFAULT NULL COMMENT '0-5 arası öncelik seviyesi',
  `yagmur_suyu_kanali_oncelik` int(11) DEFAULT NULL COMMENT '0-5 arası öncelik seviyesi',
  `baraj_regulator_oncelik` int(11) DEFAULT NULL COMMENT '0-5 arası öncelik seviyesi',
  `sel_onleme_duvari_oncelik` int(11) DEFAULT NULL COMMENT '0-5 arası öncelik seviyesi',
  `acil_mudahale_ekipmani_oncelik` int(11) DEFAULT NULL COMMENT '0-5 arası öncelik seviyesi',
  `olusturma_tarihi` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `guncelleme_tarihi` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `idx_il_yil` (`il_id`, `yil`),
  KEY `idx_il_id` (`il_id`),
  KEY `idx_yil` (`yil`),
  CONSTRAINT `fk_sel_verileri_iller` FOREIGN KEY (`il_id`) REFERENCES `iller` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Kullanıcılar Tablosu (Giriş Sistemi İçin)
CREATE TABLE IF NOT EXISTS `kullanicilar` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `kullanici_adi` varchar(100) NOT NULL UNIQUE,
  `email` varchar(255) NOT NULL UNIQUE,
  `sifre` varchar(255) NOT NULL,
  `ad_soyad` varchar(200) DEFAULT NULL,
  `rol` enum('admin','kullanici') DEFAULT 'kullanici',
  `aktif` tinyint(1) DEFAULT 1,
  `olusturma_tarihi` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `son_giris_tarihi` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `idx_kullanici_adi` (`kullanici_adi`),
  KEY `idx_email` (`email`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;






