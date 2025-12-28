const db = require('../config/database');

class ProvinceModel {
  // Tüm illeri getir
  static async getAll() {
    try {
      const [rows] = await db.query(
        'SELECT * FROM iller ORDER BY il_adi ASC'
      );
      return rows;
    } catch (error) {
      throw new Error(`İller getirilirken hata: ${error.message}`);
    }
  }

  // ID'ye göre il getir
  static async getById(id) {
    try {
      const [rows] = await db.query(
        'SELECT * FROM iller WHERE id = ?',
        [id]
      );
      return rows[0] || null;
    } catch (error) {
      throw new Error(`İl getirilirken hata: ${error.message}`);
    }
  }

  // Marmara bölgesi illerini getir
  static async getMarmaraProvinces() {
    try {
      const [rows] = await db.query(
        'SELECT * FROM iller WHERE bolge = ? ORDER BY il_adi ASC',
        ['Marmara']
      );
      return rows;
    } catch (error) {
      throw new Error(`Marmara illeri getirilirken hata: ${error.message}`);
    }
  }

  // Haversine formülü ile iki nokta arası mesafe hesapla (km)
  static calculateDistance(lat1, lon1, lat2, lon2) {
    const R = 6371; // Dünya yarıçapı (km)
    const dLat = this.toRad(lat2 - lat1);
    const dLon = this.toRad(lon2 - lon1);
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(this.toRad(lat1)) * Math.cos(this.toRad(lat2)) *
      Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  // Dereceyi radyana çevir
  static toRad(degrees) {
    return degrees * (Math.PI / 180);
  }

  // Marmara bölgesi illeri arası gerçekçi yol rotaları tanımları
  static getRouteDefinitions() {
    // İl ID'lerini isimlerden bulma için mapping
    const provinceMap = {
      'İstanbul': 1, 'Bursa': 2, 'Kocaeli': 3, 'Sakarya': 4, 'Balıkesir': 5,
      'Çanakkale': 6, 'Tekirdağ': 7, 'Yalova': 8, 'Bilecik': 9, 'Edirne': 10, 'Kırklareli': 11
    };

    return {
      // İstanbul -> Balıkesir rotaları
      '1-5': [
        {
          name: 'O-5 Otoyolu (En Hızlı)',
          roadType: 'otoyol',
          roadNumber: 'O-5',
          via: ['Kocaeli'],
          baseDistanceMultiplier: 1.15, // Otoyol dolaylı ama hızlı
          speed: 120,
          toll: true,
          priority: 1
        },
        {
          name: 'D-100 + D-565 (Alternatif)',
          roadType: 'devlet_yolu',
          roadNumber: 'D-100 / D-565',
          via: ['Kocaeli', 'Bursa'],
          baseDistanceMultiplier: 1.25,
          speed: 90,
          toll: false,
          priority: 2
        }
      ],
      // Bursa -> Balıkesir
      '2-5': [
        {
          name: 'D-200 Devlet Yolu',
          roadType: 'devlet_yolu',
          roadNumber: 'D-200',
          via: [],
          baseDistanceMultiplier: 1.08,
          speed: 90,
          toll: false,
          priority: 1
        },
        {
          name: 'D-565 Devlet Yolu (Güney Rotası)',
          roadType: 'devlet_yolu',
          roadNumber: 'D-565',
          via: [],
          baseDistanceMultiplier: 1.15,
          speed: 80,
          toll: false,
          priority: 2
        }
      ],
      // Kocaeli -> Balıkesir
      '3-5': [
        {
          name: 'O-5 + D-200',
          roadType: 'otoyol',
          roadNumber: 'O-5 / D-200',
          via: ['Bursa'],
          baseDistanceMultiplier: 1.2,
          speed: 110,
          toll: true,
          priority: 1
        },
        {
          name: 'D-100 + D-565',
          roadType: 'devlet_yolu',
          roadNumber: 'D-100 / D-565',
          via: ['Bursa'],
          baseDistanceMultiplier: 1.3,
          speed: 85,
          toll: false,
          priority: 2
        }
      ],
      // Sakarya -> Balıkesir
      '4-5': [
        {
          name: 'D-100 + D-565',
          roadType: 'devlet_yolu',
          roadNumber: 'D-100 / D-565',
          via: ['Bursa'],
          baseDistanceMultiplier: 1.25,
          speed: 85,
          toll: false,
          priority: 1
        }
      ],
      // Çanakkale -> Balıkesir
      '6-5': [
        {
          name: 'D-550 Devlet Yolu',
          roadType: 'devlet_yolu',
          roadNumber: 'D-550',
          via: [],
          baseDistanceMultiplier: 1.05,
          speed: 90,
          toll: false,
          priority: 1
        }
      ],
      // Tekirdağ -> Balıkesir
      '7-5': [
        {
          name: 'D-550 Devlet Yolu',
          roadType: 'devlet_yolu',
          roadNumber: 'D-550',
          via: ['Çanakkale'],
          baseDistanceMultiplier: 1.3,
          speed: 85,
          toll: false,
          priority: 1
        },
        {
          name: 'D-100 + D-565 (Kuzey Rotası)',
          roadType: 'devlet_yolu',
          roadNumber: 'D-100 / D-565',
          via: ['İstanbul', 'Bursa'],
          baseDistanceMultiplier: 1.45,
          speed: 80,
          toll: false,
          priority: 2
        }
      ],
      // Yalova -> Balıkesir
      '8-5': [
        {
          name: 'Feribot + D-200',
          roadType: 'kombine',
          roadNumber: 'Feribot / D-200',
          via: ['Bursa'],
          baseDistanceMultiplier: 1.15,
          speed: 70, // Feribot süresi dahil
          toll: true,
          priority: 1
        },
        {
          name: 'D-575 + D-200',
          roadType: 'devlet_yolu',
          roadNumber: 'D-575 / D-200',
          via: ['Bursa'],
          baseDistanceMultiplier: 1.3,
          speed: 80,
          toll: false,
          priority: 2
        }
      ],
      // Bilecik -> Balıkesir
      '9-5': [
        {
          name: 'D-650 Devlet Yolu',
          roadType: 'devlet_yolu',
          roadNumber: 'D-650',
          via: [],
          baseDistanceMultiplier: 1.1,
          speed: 85,
          toll: false,
          priority: 1
        }
      ],
      // Edirne -> Balıkesir
      '10-5': [
        {
          name: 'D-550 Devlet Yolu',
          roadType: 'devlet_yolu',
          roadNumber: 'D-550',
          via: ['Tekirdağ', 'Çanakkale'],
          baseDistanceMultiplier: 1.4,
          speed: 85,
          toll: false,
          priority: 1
        }
      ],
      // Kırklareli -> Balıkesir
      '11-5': [
        {
          name: 'D-550 Devlet Yolu',
          roadType: 'devlet_yolu',
          roadNumber: 'D-550',
          via: ['Tekirdağ', 'Çanakkale'],
          baseDistanceMultiplier: 1.45,
          speed: 85,
          toll: false,
          priority: 1
        }
      ]
    };
  }

  // İl adından ID bul
  static async getProvinceIdByName(provinceName, provinces) {
    const province = provinces.find(p => p.il_adi === provinceName);
    return province ? province.id : null;
  }

  // Hedef ile diğer tüm iller arasındaki detaylı rotaları hesapla
  static async getShortestRoutes(targetIlId) {
    try {
      // Hedef ili getir
      const targetProvince = await this.getById(targetIlId);
      if (!targetProvince || !targetProvince.enlem || !targetProvince.boylam) {
        throw new Error('Hedef il bulunamadı veya koordinatları eksik');
      }

      // Tüm Marmara illerini getir
      const allProvinces = await this.getMarmaraProvinces();
      const routeDefinitions = this.getRouteDefinitions();

      // Her il için rotaları hesapla
      const allRoutes = [];
      
      for (const province of allProvinces) {
        if (province.id === targetIlId || !province.enlem || !province.boylam) {
          continue;
        }

        // Haversine mesafe (havayolu)
        const directDistance = this.calculateDistance(
          parseFloat(targetProvince.enlem),
          parseFloat(targetProvince.boylam),
          parseFloat(province.enlem),
          parseFloat(province.boylam)
        );

        // Rota tanımını bul
        const routeKey = `${province.id}-${targetIlId}`;
        const routeDefs = routeDefinitions[routeKey];

        if (routeDefs && routeDefs.length > 0) {
          // Her alternatif rotayı işle
          routeDefs.forEach((routeDef, altIndex) => {
            const roadDistance = directDistance * routeDef.baseDistanceMultiplier;
            
            // Yol türüne göre gerçekçi süre hesapla
            let estimatedTimeHours = roadDistance / routeDef.speed;
            
            // Geçiş illeri varsa ek süre ekle (her geçiş için +5 dk)
            if (routeDef.via && routeDef.via.length > 0) {
              estimatedTimeHours += (routeDef.via.length * 5) / 60;
            }

            // Feribot varsa +30 dk ekle
            if (routeDef.roadType === 'kombine') {
              estimatedTimeHours += 0.5;
            }

            const estimatedTimeMinutes = Math.round(estimatedTimeHours * 60);

            allRoutes.push({
              from: {
                id: province.id,
                name: province.il_adi,
                lat: parseFloat(province.enlem),
                lon: parseFloat(province.boylam)
              },
              to: {
                id: targetProvince.id,
                name: targetProvince.il_adi,
                lat: parseFloat(targetProvince.enlem),
                lon: parseFloat(targetProvince.boylam)
              },
              routeName: routeDef.name,
              roadType: routeDef.roadType,
              roadNumber: routeDef.roadNumber,
              via: routeDef.via || [],
              distance: Math.round(roadDistance * 10) / 10,
              directDistance: Math.round(directDistance * 10) / 10,
              estimatedTimeHours: Math.round(estimatedTimeHours * 10) / 10,
              estimatedTimeMinutes: estimatedTimeMinutes,
              speed: routeDef.speed,
              toll: routeDef.toll,
              isAlternative: altIndex > 0,
              priority: routeDef.priority
            });
          });
        } else {
          // Tanımlı rota yoksa varsayılan hesapla
          const roadDistance = directDistance * 1.2; // %20 ek mesafe
          const estimatedTimeHours = roadDistance / 80;
          const estimatedTimeMinutes = Math.round(estimatedTimeHours * 60);

          allRoutes.push({
            from: {
              id: province.id,
              name: province.il_adi,
              lat: parseFloat(province.enlem),
              lon: parseFloat(province.boylam)
            },
            to: {
              id: targetProvince.id,
              name: targetProvince.il_adi,
              lat: parseFloat(targetProvince.enlem),
              lon: parseFloat(targetProvince.boylam)
            },
            routeName: 'Genel Karayolu',
            roadType: 'devlet_yolu',
            roadNumber: '-',
            via: [],
            distance: Math.round(roadDistance * 10) / 10,
            directDistance: Math.round(directDistance * 10) / 10,
            estimatedTimeHours: Math.round(estimatedTimeHours * 10) / 10,
            estimatedTimeMinutes: estimatedTimeMinutes,
            speed: 80,
            toll: false,
            isAlternative: false,
            priority: 99
          });
        }
      }

      // Her başlangıç ili için en hızlı rotayı ilk sıraya al, sonra alternatifleri ekle
      const routesByProvince = {};
      allRoutes.forEach(route => {
        const key = route.from.id;
        if (!routesByProvince[key]) {
          routesByProvince[key] = [];
        }
        routesByProvince[key].push(route);
      });

      // Her il için rotaları önceliğe göre sırala ve birleştir
      const sortedRoutes = [];
      Object.values(routesByProvince).forEach(provinceRoutes => {
        provinceRoutes.sort((a, b) => {
          // Önce priority, sonra süre
          if (a.priority !== b.priority) return a.priority - b.priority;
          return a.estimatedTimeMinutes - b.estimatedTimeMinutes;
        });
        sortedRoutes.push(...provinceRoutes);
      });

      // Son olarak toplam süreye göre sırala (ana rotalar)
      const mainRoutes = sortedRoutes.filter(r => !r.isAlternative);
      const alternativeRoutes = sortedRoutes.filter(r => r.isAlternative);
      
      mainRoutes.sort((a, b) => a.estimatedTimeMinutes - b.estimatedTimeMinutes);

      return {
        main: mainRoutes,
        all: sortedRoutes
      };
    } catch (error) {
      throw new Error(`Rota hesaplanırken hata: ${error.message}`);
    }
  }
}

module.exports = ProvinceModel;












