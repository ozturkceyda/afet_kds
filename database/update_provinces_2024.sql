-- İller Tablosunu 2024 Nüfus Verileri ile Güncelleme
-- Kaynak: TÜİK 2024 Nüfus Verileri

-- Balıkesir
UPDATE iller SET nufus = 1276096 WHERE il_adi = 'Balıkesir';

-- Bilecik
UPDATE iller SET nufus = 228495 WHERE il_adi = 'Bilecik';

-- Bursa
UPDATE iller SET nufus = 3238618 WHERE il_adi = 'Bursa';

-- Çanakkale
UPDATE iller SET nufus = 568966 WHERE il_adi = 'Çanakkale';

-- Edirne
UPDATE iller SET nufus = 421247 WHERE il_adi = 'Edirne';

-- İstanbul
UPDATE iller SET nufus = 15701602 WHERE il_adi = 'İstanbul';

-- Kırklareli
UPDATE iller SET nufus = 379031 WHERE il_adi = 'Kırklareli';

-- Kocaeli
UPDATE iller SET nufus = 2130006 WHERE il_adi = 'Kocaeli';

-- Sakarya
UPDATE iller SET nufus = 1110735 WHERE il_adi = 'Sakarya';

-- Tekirdağ
UPDATE iller SET nufus = 1187162 WHERE il_adi = 'Tekirdağ';

-- Yalova
UPDATE iller SET nufus = 307882 WHERE il_adi = 'Yalova';

-- Güncelleme kontrolü
SELECT il_adi, nufus FROM iller ORDER BY il_adi;




















