// API Base URL
const API_BASE = '/api';

// DOM Elements
const provinceSelect = document.getElementById('provinceSelect');
const loading = document.getElementById('loading');
const errorDiv = document.getElementById('error');
const dashboardSection = document.getElementById('dashboardSection');
const provincesSection = document.getElementById('provincesSection');
const risksSection = document.getElementById('risksSection');
const earthquakesSection = document.getElementById('earthquakesSection');
const liveEarthquakesSection = document.getElementById('liveEarthquakesSection');
const weatherSection = document.getElementById('weatherSection');

// State
let provinces = [];
let selectedProvinceId = null;
let liveEarthquakeInterval = null;
let autoRefreshEnabled = true;

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    loadProvinces();
    setupEventListeners();
    setupFloodWarningsEventListeners();
});

// Event Listeners
function setupEventListeners() {
    // Province select change
    provinceSelect.addEventListener('change', (e) => {
        selectedProvinceId = e.target.value;
        if (selectedProvinceId) {
            loadProvinceRisks(selectedProvinceId);
            updateSelectedProvinceName();
            // Eğer deprem sayfasındaysak, deprem verilerini de yükle
            if (earthquakesSection.style.display !== 'none') {
                loadEarthquakeData(selectedProvinceId);
            }
            // Eğer hava durumu sayfasındaysak, hava durumu verilerini de yükle
            if (weatherSection.style.display !== 'none') {
                loadWeatherData(selectedProvinceId);
            }
        } else {
            clearRiskData();
        }
    });

    // Navigation
    document.querySelectorAll('.nav-item').forEach(item => {
        item.addEventListener('click', (e) => {
            e.preventDefault();
            const section = item.dataset.section;
            showSection(section);
            
            // Update active nav
            document.querySelectorAll('.nav-item').forEach(nav => nav.classList.remove('active'));
            item.classList.add('active');
        });
    });
}

// Show Section
function showSection(section) {
    dashboardSection.style.display = 'none';
    provincesSection.style.display = 'none';
    risksSection.style.display = 'none';
    earthquakesSection.style.display = 'none';
    liveEarthquakesSection.style.display = 'none';
    weatherSection.style.display = 'none';

    // Canlı deprem otomatik yenilemeyi durdur
    stopLiveEarthquakeRefresh();

    switch(section) {
        case 'dashboard':
            dashboardSection.style.display = 'block';
            loadFloodRiskWarnings();
            break;
        case 'provinces':
            provincesSection.style.display = 'block';
            displayProvincesList();
            break;
        case 'risks':
            risksSection.style.display = 'block';
            if (selectedProvinceId) {
                displayRisksList(selectedProvinceId);
            }
            break;
        case 'earthquakes':
            earthquakesSection.style.display = 'block';
            if (selectedProvinceId) {
                loadEarthquakeData(selectedProvinceId);
            } else {
                document.getElementById('earthquakesList').innerHTML = '<p>Lütfen önce bir il seçiniz.</p>';
            }
            break;
        case 'liveEarthquakes':
            liveEarthquakesSection.style.display = 'block';
            loadLiveEarthquakes();
            startLiveEarthquakeRefresh();
            break;
        case 'weather':
            weatherSection.style.display = 'block';
            loadAllProvincesWeather();
            if (selectedProvinceId) {
                loadWeatherData(selectedProvinceId);
            }
            break;
    }
}

// Load Provinces
async function loadProvinces() {
    try {
        showLoading();
        const response = await fetch(`${API_BASE}/provinces`);
        const result = await response.json();

        if (result.success) {
            provinces = result.data;
            populateProvinceSelect(provinces);
            updateTotalProvinces(provinces.length);
            hideLoading();
        } else {
            showError(result.message || 'İller yüklenirken hata oluştu');
        }
    } catch (error) {
        showError('API bağlantı hatası: ' + error.message);
    }
}

// Populate Province Select
function populateProvinceSelect(provinces) {
    provinceSelect.innerHTML = '<option value="">İl Seçiniz...</option>';
    provinces.forEach(province => {
        const option = document.createElement('option');
        option.value = province.id;
        option.textContent = province.il_adi;
        provinceSelect.appendChild(option);
    });
}

// Load Province Risks
async function loadProvinceRisks(ilId) {
    try {
        showLoading();
        const response = await fetch(`${API_BASE}/risks/average?il_id=${ilId}`);
        const result = await response.json();

        if (result.success && result.data) {
            displayRiskData(result.data);
            hideLoading();
        } else {
            showError(result.message || 'Risk skorları yüklenirken hata oluştu');
        }
    } catch (error) {
        showError('Risk skorları yüklenirken hata: ' + error.message);
    }
}

// Display Risk Data
function displayRiskData(data) {
    const earthquakeRisk = parseFloat(data.ortalama_deprem_riski || 0).toFixed(2);
    const floodRisk = parseFloat(data.ortalama_sel_riski || 0).toFixed(2);
    const fireRisk = parseFloat(data.ortalama_yangin_riski || 0).toFixed(2);
    const generalRisk = parseFloat(data.ortalama_genel_risk_skoru || 0).toFixed(2);

    document.getElementById('earthquakeRisk').textContent = earthquakeRisk;
    document.getElementById('floodRisk').textContent = floodRisk;
    document.getElementById('fireRisk').textContent = fireRisk;
    document.getElementById('generalRisk').textContent = generalRisk;

    // Update progress bars (assuming max value is 100)
    updateProgressBar('earthquakeRiskBar', earthquakeRisk, 100);
    updateProgressBar('floodRiskBar', floodRisk, 100);
    updateProgressBar('fireRiskBar', fireRisk, 100);
    updateProgressBar('generalRiskBar', generalRisk, 100);
}

// Update Progress Bar
function updateProgressBar(elementId, value, max) {
    const bar = document.getElementById(elementId);
    const percentage = Math.min((value / max) * 100, 100);
    bar.style.width = percentage + '%';
    
    // Change color based on risk level
    if (percentage > 70) {
        bar.style.background = 'linear-gradient(90deg, #e74c3c 0%, #c0392b 100%)';
    } else if (percentage > 40) {
        bar.style.background = 'linear-gradient(90deg, #f39c12 0%, #e67e22 100%)';
    } else {
        bar.style.background = 'linear-gradient(90deg, #3498db 0%, #2ecc71 100%)';
    }
}

// Clear Risk Data
function clearRiskData() {
    document.getElementById('earthquakeRisk').textContent = '-';
    document.getElementById('floodRisk').textContent = '-';
    document.getElementById('fireRisk').textContent = '-';
    document.getElementById('generalRisk').textContent = '-';
    
    ['earthquakeRiskBar', 'floodRiskBar', 'fireRiskBar', 'generalRiskBar'].forEach(id => {
        document.getElementById(id).style.width = '0%';
    });
}

// Update Selected Province Name
function updateSelectedProvinceName() {
    const selectedProvince = provinces.find(p => p.id == selectedProvinceId);
    document.getElementById('selectedProvince').textContent = selectedProvince ? selectedProvince.il_adi : '-';
}

// Update Total Provinces
function updateTotalProvinces(count) {
    document.getElementById('totalProvinces').textContent = count;
}

// Display Provinces List
function displayProvincesList() {
    const listContainer = document.getElementById('provincesList');
    listContainer.innerHTML = '';

    if (provinces.length === 0) {
        listContainer.innerHTML = '<p>İl bulunamadı.</p>';
        return;
    }

    provinces.forEach(province => {
        const item = document.createElement('div');
        item.className = 'province-item';
        item.innerHTML = `
            <h4>${province.il_adi}</h4>
            <p>Bölge: ${province.bolge || '-'}</p>
            <p>Nüfus: ${province.nufus ? province.nufus.toLocaleString('tr-TR') : '-'}</p>
        `;
        item.addEventListener('click', () => {
            provinceSelect.value = province.id;
            selectedProvinceId = province.id;
            loadProvinceRisks(province.id);
            showSection('dashboard');
            document.querySelectorAll('.nav-item').forEach(nav => nav.classList.remove('active'));
            document.querySelector('[data-section="dashboard"]').classList.add('active');
        });
        listContainer.appendChild(item);
    });
}

// Display Risks List
async function displayRisksList(ilId) {
    const listContainer = document.getElementById('risksList');
    listContainer.innerHTML = '<p>Yükleniyor...</p>';

    try {
        const response = await fetch(`${API_BASE}/risks?il_id=${ilId}`);
        const result = await response.json();

        if (result.success) {
            listContainer.innerHTML = '';

            if (result.data.length === 0) {
                listContainer.innerHTML = '<p>Bu il için risk skoru bulunamadı.</p>';
                return;
            }

            result.data.forEach(risk => {
                const item = document.createElement('div');
                item.className = 'risk-item';
                item.innerHTML = `
                    <div class="risk-item-header">
                        <h4>${risk.ilce_adi || risk.il_adi}</h4>
                    </div>
                    <div class="risk-item-values">
                        <div class="risk-item-value">
                            <label>Deprem Riski</label>
                            <span>${parseFloat(risk.deprem_riski || 0).toFixed(2)}</span>
                        </div>
                        <div class="risk-item-value">
                            <label>Sel Riski</label>
                            <span>${parseFloat(risk.sel_riski || 0).toFixed(2)}</span>
                        </div>
                        <div class="risk-item-value">
                            <label>Yangın Riski</label>
                            <span>${parseFloat(risk.yangin_riski || 0).toFixed(2)}</span>
                        </div>
                        <div class="risk-item-value">
                            <label>Genel Risk</label>
                            <span>${parseFloat(risk.genel_risk_skoru || 0).toFixed(2)}</span>
                        </div>
                    </div>
                `;
                listContainer.appendChild(item);
            });
        } else {
            listContainer.innerHTML = '<p>' + (result.message || 'Risk skorları yüklenirken hata oluştu') + '</p>';
        }
    } catch (error) {
        listContainer.innerHTML = '<p>Hata: ' + error.message + '</p>';
    }
}

// Show/Hide Loading
function showLoading() {
    loading.style.display = 'flex';
    errorDiv.style.display = 'none';
}

function hideLoading() {
    loading.style.display = 'none';
}

// Show Error
function showError(message) {
    errorDiv.style.display = 'block';
    errorDiv.querySelector('p').textContent = message;
    hideLoading();
}

// ==================== CANLI DEPREM FONKSİYONLARI ====================

// Load Live Earthquakes
async function loadLiveEarthquakes() {
    const listContainer = document.getElementById('liveEarthquakesList');
    const statsContainer = document.getElementById('liveStats');
    
    listContainer.innerHTML = '<p>Yükleniyor...</p>';
    statsContainer.style.display = 'none';

    try {
        // İstatistikleri yükle
        const statsResponse = await fetch(`${API_BASE}/earthquakes/live/statistics`);
        const statsResult = await statsResponse.json();

        if (statsResult.success && statsResult.data) {
            displayLiveEarthquakeStatistics(statsResult.data);
            statsContainer.style.display = 'grid';
        }

        // Canlı deprem listesini yükle
        const listResponse = await fetch(`${API_BASE}/earthquakes/live?limit=50`);
        const listResult = await listResponse.json();

        if (listResult.success) {
            listContainer.innerHTML = '';

            if (listResult.data.length === 0) {
                listContainer.innerHTML = '<p class="no-data">Son 24 saatte deprem verisi bulunamadı.</p>';
                return;
            }

            displayLiveEarthquakesList(listResult.data);
            updateLastUpdateTime();
        } else {
            listContainer.innerHTML = '<p class="error-text">' + (listResult.message || 'Canlı deprem verileri yüklenirken hata oluştu') + '</p>';
        }
    } catch (error) {
        listContainer.innerHTML = '<p class="error-text">Hata: ' + error.message + '</p>';
        updateLiveStatus('Hata', false);
    }
}

// Display Live Earthquake Statistics
function displayLiveEarthquakeStatistics(data) {
    document.getElementById('liveTotalEarthquakes').textContent = data.toplam_deprem || 0;
    document.getElementById('liveAvgMagnitude').textContent = data.ortalama_buyukluk 
        ? parseFloat(data.ortalama_buyukluk).toFixed(2) : '-';
    document.getElementById('liveMaxMagnitude').textContent = data.en_buyuk_deprem 
        ? parseFloat(data.en_buyuk_deprem).toFixed(2) : '-';
}

// Display Live Earthquakes List
function displayLiveEarthquakesList(earthquakes) {
    const listContainer = document.getElementById('liveEarthquakesList');
    listContainer.innerHTML = '';

    earthquakes.forEach(earthquake => {
        const item = document.createElement('div');
        item.className = 'live-earthquake-item';
        
        const date = new Date(earthquake.tarih_saat);
        const magnitude = parseFloat(earthquake.buyukluk).toFixed(2);
        const depth = earthquake.derinlik ? parseFloat(earthquake.derinlik).toFixed(2) + ' km' : '-';
        
        // Büyüklüğe göre renk belirle
        let magnitudeClass = 'magnitude-low';
        if (magnitude >= 5.0) {
            magnitudeClass = 'magnitude-high';
        } else if (magnitude >= 4.0) {
            magnitudeClass = 'magnitude-medium';
        }

        // Ne kadar zaman önce olduğunu hesapla
        const timeAgo = getTimeAgo(date);

        item.innerHTML = `
            <div class="live-earthquake-item-header">
                <div class="live-earthquake-magnitude ${magnitudeClass}">
                    <span class="magnitude-value">${magnitude}</span>
                </div>
                <div class="live-earthquake-info">
                    <h4>${earthquake.il_adi}${earthquake.ilce_adi ? ' - ' + earthquake.ilce_adi : ''}</h4>
                    <p class="live-earthquake-date">
                        ${date.toLocaleDateString('tr-TR', { 
                            year: 'numeric', 
                            month: 'long', 
                            day: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit'
                        })}
                        <span class="time-ago">(${timeAgo})</span>
                    </p>
                </div>
                <div class="live-badge">
                    <span class="live-badge-dot"></span>
                    CANLI
                </div>
            </div>
            <div class="live-earthquake-details">
                <div class="live-earthquake-detail">
                    <span class="detail-label">Derinlik:</span>
                    <span class="detail-value">${depth}</span>
                </div>
                <div class="live-earthquake-detail">
                    <span class="detail-label">Koordinat:</span>
                    <span class="detail-value">${parseFloat(earthquake.enlem).toFixed(4)}, ${parseFloat(earthquake.boylam).toFixed(4)}</span>
                </div>
                <div class="live-earthquake-detail">
                    <span class="detail-label">Kaynak:</span>
                    <span class="detail-value">${earthquake.kaynak || 'Kandilli'}</span>
                </div>
            </div>
        `;
        
        listContainer.appendChild(item);
    });
}

// Get Time Ago
function getTimeAgo(date) {
    const now = new Date();
    const diff = now - date;
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (days > 0) {
        return `${days} gün önce`;
    } else if (hours > 0) {
        return `${hours} saat önce`;
    } else if (minutes > 0) {
        return `${minutes} dakika önce`;
    } else {
        return 'Az önce';
    }
}

// Update Last Update Time
function updateLastUpdateTime() {
    const now = new Date();
    document.getElementById('liveLastUpdate').textContent = now.toLocaleTimeString('tr-TR');
}

// Update Live Status
function updateLiveStatus(status, isLive) {
    const statusElement = document.getElementById('liveStatus');
    const dotElement = document.querySelector('.live-dot');
    
    statusElement.textContent = status;
    if (isLive) {
        dotElement.classList.add('pulsing');
    } else {
        dotElement.classList.remove('pulsing');
    }
}

// Start Live Earthquake Auto Refresh
function startLiveEarthquakeRefresh() {
    if (liveEarthquakeInterval) {
        clearInterval(liveEarthquakeInterval);
    }

    // İlk yükleme
    loadLiveEarthquakes();
    updateLiveStatus('Canlı', true);

    // Her 30 saniyede bir yenile
    liveEarthquakeInterval = setInterval(() => {
        if (autoRefreshEnabled) {
            loadLiveEarthquakes();
        }
    }, 30000); // 30 saniye
}

// Stop Live Earthquake Auto Refresh
function stopLiveEarthquakeRefresh() {
    if (liveEarthquakeInterval) {
        clearInterval(liveEarthquakeInterval);
        liveEarthquakeInterval = null;
    }
    updateLiveStatus('Durduruldu', false);
}

// Setup Live Earthquake Event Listeners
document.addEventListener('DOMContentLoaded', () => {
    // Auto refresh toggle
    const autoRefreshToggle = document.getElementById('autoRefreshToggle');
    if (autoRefreshToggle) {
        autoRefreshToggle.addEventListener('change', (e) => {
            autoRefreshEnabled = e.target.checked;
            if (autoRefreshEnabled) {
                updateLiveStatus('Canlı', true);
            } else {
                updateLiveStatus('Duraklatıldı', false);
            }
        });
    }

    // Manual refresh button
    const refreshLiveBtn = document.getElementById('refreshLiveBtn');
    if (refreshLiveBtn) {
        refreshLiveBtn.addEventListener('click', () => {
            loadLiveEarthquakes();
            refreshLiveBtn.style.animation = 'spin 0.5s linear';
            setTimeout(() => {
                refreshLiveBtn.style.animation = '';
            }, 500);
        });
    }

    // Weather refresh button
    const refreshWeatherBtn = document.getElementById('refreshWeatherBtn');
    if (refreshWeatherBtn) {
        refreshWeatherBtn.addEventListener('click', () => {
            loadAllProvincesWeather();
            if (selectedProvinceId) {
                loadWeatherData(selectedProvinceId);
            }
            refreshWeatherBtn.style.animation = 'spin 0.5s linear';
            setTimeout(() => {
                refreshWeatherBtn.style.animation = '';
            }, 500);
        });
    }
});

// Load Earthquake Data
async function loadEarthquakeData(ilId) {
    const listContainer = document.getElementById('earthquakesList');
    const statsContainer = document.getElementById('earthquakeStats');
    
    listContainer.innerHTML = '<p>Yükleniyor...</p>';
    statsContainer.style.display = 'none';

    try {
        // İstatistikleri yükle
        const statsResponse = await fetch(`${API_BASE}/earthquakes/statistics?il_id=${ilId}`);
        const statsResult = await statsResponse.json();

        if (statsResult.success && statsResult.data) {
            displayEarthquakeStatistics(statsResult.data);
            statsContainer.style.display = 'grid';
        }

        // Deprem listesini yükle
        const listResponse = await fetch(`${API_BASE}/earthquakes?il_id=${ilId}&limit=50`);
        const listResult = await listResponse.json();

        if (listResult.success) {
            listContainer.innerHTML = '';

            if (listResult.data.length === 0) {
                listContainer.innerHTML = '<p>Bu il için deprem verisi bulunamadı.</p>';
                return;
            }

            displayEarthquakesList(listResult.data);
        } else {
            listContainer.innerHTML = '<p>' + (listResult.message || 'Deprem verileri yüklenirken hata oluştu') + '</p>';
        }
    } catch (error) {
        listContainer.innerHTML = '<p>Hata: ' + error.message + '</p>';
    }
}

// Display Earthquake Statistics
function displayEarthquakeStatistics(data) {
    document.getElementById('totalEarthquakes').textContent = data.toplam_deprem || 0;
    document.getElementById('avgMagnitude').textContent = data.ortalama_buyukluk 
        ? parseFloat(data.ortalama_buyukluk).toFixed(2) : '-';
    document.getElementById('maxMagnitude').textContent = data.en_buyuk_deprem 
        ? parseFloat(data.en_buyuk_deprem).toFixed(2) : '-';
    
    if (data.son_deprem) {
        const lastDate = new Date(data.son_deprem);
        document.getElementById('lastEarthquake').textContent = lastDate.toLocaleDateString('tr-TR');
    } else {
        document.getElementById('lastEarthquake').textContent = '-';
    }
}

// Display Earthquakes List
function displayEarthquakesList(earthquakes) {
    const listContainer = document.getElementById('earthquakesList');
    listContainer.innerHTML = '';

    earthquakes.forEach(earthquake => {
        const item = document.createElement('div');
        item.className = 'earthquake-item';
        
        const date = new Date(earthquake.tarih_saat);
        const magnitude = parseFloat(earthquake.buyukluk).toFixed(2);
        const depth = earthquake.derinlik ? parseFloat(earthquake.derinlik).toFixed(2) + ' km' : '-';
        
        // Büyüklüğe göre renk belirle
        let magnitudeClass = 'magnitude-low';
        if (magnitude >= 7.0) {
            magnitudeClass = 'magnitude-high';
        } else if (magnitude >= 5.0) {
            magnitudeClass = 'magnitude-medium';
        }

        item.innerHTML = `
            <div class="earthquake-item-header">
                <div class="earthquake-magnitude ${magnitudeClass}">
                    <span class="magnitude-value">${magnitude}</span>
                </div>
                <div class="earthquake-info">
                    <h4>${earthquake.il_adi}${earthquake.ilce_adi ? ' - ' + earthquake.ilce_adi : ''}</h4>
                    <p class="earthquake-date">${date.toLocaleDateString('tr-TR', { 
                        year: 'numeric', 
                        month: 'long', 
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                    })}</p>
                </div>
            </div>
            <div class="earthquake-details">
                <div class="earthquake-detail">
                    <span class="detail-label">Derinlik:</span>
                    <span class="detail-value">${depth}</span>
                </div>
                <div class="earthquake-detail">
                    <span class="detail-label">Koordinat:</span>
                    <span class="detail-value">${parseFloat(earthquake.enlem).toFixed(4)}, ${parseFloat(earthquake.boylam).toFixed(4)}</span>
                </div>
            </div>
        `;
        
        listContainer.appendChild(item);
    });
}

// ==================== HAVA DURUMU FONKSİYONLARI ====================

// Load All Provinces Weather
async function loadAllProvincesWeather() {
    const listContainer = document.getElementById('allProvincesWeatherList');
    const container = document.getElementById('allProvincesWeather');
    
    listContainer.innerHTML = '<p>Yükleniyor...</p>';
    container.style.display = 'block';

    try {
        const response = await fetch(`${API_BASE}/weather/all-latest`);
        const result = await response.json();

        if (result.success) {
            listContainer.innerHTML = '';

            if (result.data.length === 0) {
                listContainer.innerHTML = '<p class="no-data">Hava durumu verisi bulunamadı.</p>';
                return;
            }

            displayAllProvincesWeatherList(result.data);
        } else {
            listContainer.innerHTML = '<p class="error-text">' + (result.message || 'Hava durumu verileri yüklenirken hata oluştu') + '</p>';
        }
    } catch (error) {
        listContainer.innerHTML = '<p class="error-text">Hata: ' + error.message + '</p>';
    }
}

// Display All Provinces Weather List
function displayAllProvincesWeatherList(weatherData) {
    const listContainer = document.getElementById('allProvincesWeatherList');
    listContainer.innerHTML = '';

    weatherData.forEach(weather => {
        const item = document.createElement('div');
        item.className = 'weather-province-item';
        
        const date = weather.tarih_saat ? new Date(weather.tarih_saat) : null;
        const temp = weather.sicaklik ? parseFloat(weather.sicaklik).toFixed(1) + '°C' : '-';
        const humidity = weather.nem ? parseFloat(weather.nem).toFixed(0) + '%' : '-';
        const wind = weather.ruzgar_hizi ? parseFloat(weather.ruzgar_hizi).toFixed(1) + ' km/s' : '-';
        const rain = weather.yagis_miktari ? parseFloat(weather.yagis_miktari).toFixed(1) + ' mm' : '-';
        const condition = weather.hava_durumu || '-';
        const pressure = weather.basinc ? parseFloat(weather.basinc).toFixed(1) + ' hPa' : '-';

        // Sıcaklığa göre renk belirle
        let tempClass = 'temp-normal';
        if (weather.sicaklik) {
            const tempValue = parseFloat(weather.sicaklik);
            if (tempValue >= 30) {
                tempClass = 'temp-hot';
            } else if (tempValue <= 5) {
                tempClass = 'temp-cold';
            }
        }

        item.innerHTML = `
            <div class="weather-province-header">
                <h4>${weather.il_adi}${weather.ilce_adi ? ' - ' + weather.ilce_adi : ''}</h4>
                ${date ? `<p class="weather-date">${date.toLocaleDateString('tr-TR', { 
                    year: 'numeric', 
                    month: 'long', 
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit'
                })}</p>` : ''}
            </div>
            <div class="weather-province-details">
                <div class="weather-detail-main">
                    <div class="weather-temp ${tempClass}">
                        <span class="temp-value">${temp}</span>
                    </div>
                    <div class="weather-condition">
                        <span>${condition}</span>
                    </div>
                </div>
                <div class="weather-detail-grid">
                    <div class="weather-detail-item">
                        <span class="detail-icon">💧</span>
                        <div class="detail-info">
                            <span class="detail-label">Nem</span>
                            <span class="detail-value">${humidity}</span>
                        </div>
                    </div>
                    <div class="weather-detail-item">
                        <span class="detail-icon">💨</span>
                        <div class="detail-info">
                            <span class="detail-label">Rüzgar</span>
                            <span class="detail-value">${wind}</span>
                        </div>
                    </div>
                    <div class="weather-detail-item">
                        <span class="detail-icon">🌧️</span>
                        <div class="detail-info">
                            <span class="detail-label">Yağış</span>
                            <span class="detail-value">${rain}</span>
                        </div>
                    </div>
                    <div class="weather-detail-item">
                        <span class="detail-icon">📊</span>
                        <div class="detail-info">
                            <span class="detail-label">Basınç</span>
                            <span class="detail-value">${pressure}</span>
                        </div>
                    </div>
                </div>
            </div>
        `;
        
        listContainer.appendChild(item);
    });
}

// Load Weather Data for Single Province
async function loadWeatherData(ilId) {
    const listContainer = document.getElementById('weatherList');
    const statsContainer = document.getElementById('weatherStats');
    const singleContainer = document.getElementById('singleProvinceWeather');
    const titleElement = document.getElementById('provinceWeatherTitle');
    
    listContainer.innerHTML = '<p>Yükleniyor...</p>';
    statsContainer.style.display = 'none';
    singleContainer.style.display = 'block';

    // İl adını bul
    const selectedProvince = provinces.find(p => p.id == ilId);
    if (selectedProvince && titleElement) {
        titleElement.textContent = `${selectedProvince.il_adi} - Hava Durumu`;
    }

    try {
        // İstatistikleri yükle
        const statsResponse = await fetch(`${API_BASE}/weather/statistics?il_id=${ilId}`);
        const statsResult = await statsResponse.json();

        if (statsResult.success && statsResult.data) {
            displayWeatherStatistics(statsResult.data);
            statsContainer.style.display = 'grid';
        }

        // Hava durumu listesini yükle
        const listResponse = await fetch(`${API_BASE}/weather?il_id=${ilId}&limit=10`);
        const listResult = await listResponse.json();

        if (listResult.success) {
            listContainer.innerHTML = '';

            if (listResult.data.length === 0) {
                listContainer.innerHTML = '<p class="no-data">Bu il için hava durumu verisi bulunamadı.</p>';
                return;
            }

            displayWeatherList(listResult.data);
        } else {
            listContainer.innerHTML = '<p class="error-text">' + (listResult.message || 'Hava durumu verileri yüklenirken hata oluştu') + '</p>';
        }
    } catch (error) {
        listContainer.innerHTML = '<p class="error-text">Hata: ' + error.message + '</p>';
    }
}

// Display Weather Statistics
function displayWeatherStatistics(data) {
    document.getElementById('avgTemperature').textContent = data.ortalama_sicaklik 
        ? parseFloat(data.ortalama_sicaklik).toFixed(1) + '°C' : '-';
    document.getElementById('avgHumidity').textContent = data.ortalama_nem 
        ? parseFloat(data.ortalama_nem).toFixed(0) + '%' : '-';
    document.getElementById('avgWindSpeed').textContent = data.ortalama_ruzgar 
        ? parseFloat(data.ortalama_ruzgar).toFixed(1) + ' km/s' : '-';
    document.getElementById('totalRainfall').textContent = data.toplam_yagis 
        ? parseFloat(data.toplam_yagis).toFixed(1) + ' mm' : '-';
}

// Display Weather List
function displayWeatherList(weatherData) {
    const listContainer = document.getElementById('weatherList');
    listContainer.innerHTML = '';

    weatherData.forEach(weather => {
        const item = document.createElement('div');
        item.className = 'weather-item';
        
        const date = weather.tarih_saat ? new Date(weather.tarih_saat) : null;
        const temp = weather.sicaklik ? parseFloat(weather.sicaklik).toFixed(1) + '°C' : '-';
        const humidity = weather.nem ? parseFloat(weather.nem).toFixed(0) + '%' : '-';
        const wind = weather.ruzgar_hizi ? parseFloat(weather.ruzgar_hizi).toFixed(1) + ' km/s' : '-';
        const rain = weather.yagis_miktari ? parseFloat(weather.yagis_miktari).toFixed(1) + ' mm' : '-';
        const condition = weather.hava_durumu || '-';
        const pressure = weather.basinc ? parseFloat(weather.basinc).toFixed(1) + ' hPa' : '-';

        // Sıcaklığa göre renk belirle
        let tempClass = 'temp-normal';
        if (weather.sicaklik) {
            const tempValue = parseFloat(weather.sicaklik);
            if (tempValue >= 30) {
                tempClass = 'temp-hot';
            } else if (tempValue <= 5) {
                tempClass = 'temp-cold';
            }
        }

        item.innerHTML = `
            <div class="weather-item-header">
                <div class="weather-temp-display ${tempClass}">
                    <span class="temp-value-large">${temp}</span>
                </div>
                <div class="weather-info">
                    <h4>${weather.il_adi}${weather.ilce_adi ? ' - ' + weather.ilce_adi : ''}</h4>
                    ${date ? `<p class="weather-date">${date.toLocaleDateString('tr-TR', { 
                        year: 'numeric', 
                        month: 'long', 
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                    })}</p>` : ''}
                    <p class="weather-condition">${condition}</p>
                </div>
            </div>
            <div class="weather-item-details">
                <div class="weather-detail">
                    <span class="detail-icon">💧</span>
                    <span class="detail-label">Nem:</span>
                    <span class="detail-value">${humidity}</span>
                </div>
                <div class="weather-detail">
                    <span class="detail-icon">💨</span>
                    <span class="detail-label">Rüzgar:</span>
                    <span class="detail-value">${wind}</span>
                </div>
                <div class="weather-detail">
                    <span class="detail-icon">🌧️</span>
                    <span class="detail-label">Yağış:</span>
                    <span class="detail-value">${rain}</span>
                </div>
                <div class="weather-detail">
                    <span class="detail-icon">📊</span>
                    <span class="detail-label">Basınç:</span>
                    <span class="detail-value">${pressure}</span>
                </div>
            </div>
        `;
        
        listContainer.appendChild(item);
    });
}

// ==================== Flood Risk Warnings ====================

// Setup Flood Warnings Event Listeners
function setupFloodWarningsEventListeners() {
    const refreshBtn = document.getElementById('refreshFloodWarningsBtn');
    if (refreshBtn) {
        refreshBtn.addEventListener('click', () => {
            loadFloodRiskWarnings();
        });
    }
}

// Load Flood Risk Warnings
async function loadFloodRiskWarnings() {
    const warningsContainer = document.getElementById('floodWarningsList');
    
    if (!warningsContainer) return;

    try {
        warningsContainer.innerHTML = '<div class="loading-text">Yükleniyor...</div>';

        const response = await fetch(`${API_BASE}/flood-risk/warnings`);
        const result = await response.json();

        if (result.success) {
            displayFloodRiskWarnings(result.data);
        } else {
            warningsContainer.innerHTML = `<div class="error-text">${result.message || 'Uyarılar yüklenirken hata oluştu'}</div>`;
        }
    } catch (error) {
        warningsContainer.innerHTML = `<div class="error-text">Hata: ${error.message}</div>`;
    }
}

// Display Flood Risk Warnings
function displayFloodRiskWarnings(warnings) {
    const warningsContainer = document.getElementById('floodWarningsList');
    
    if (!warningsContainer) return;

    if (warnings.length === 0) {
        warningsContainer.innerHTML = `
            <div class="no-warnings-message">
                <div class="no-warnings-icon">✅</div>
                <p>Gelecek hafta için sel riski uyarısı bulunmamaktadır.</p>
            </div>
        `;
        return;
    }

    warningsContainer.innerHTML = '';

    warnings.forEach(warning => {
        const warningItem = document.createElement('div');
        warningItem.className = `flood-warning-item ${warning.risk_seviyesi}`;
        
        const riskIcon = warning.risk_seviyesi === 'kritik' ? '🔴' : '🟠';
        const riskLabel = warning.risk_seviyesi === 'kritik' ? 'KRİTİK' : 'YÜKSEK';
        
        warningItem.innerHTML = `
            <div class="warning-header">
                <div class="warning-icon">${riskIcon}</div>
                <div class="warning-info">
                    <h4>${warning.il_adi}</h4>
                    <span class="risk-badge ${warning.risk_seviyesi}">${riskLabel}</span>
                </div>
            </div>
            <div class="warning-body">
                <div class="warning-date">
                    <span class="date-icon">📅</span>
                    <span class="date-text">${warning.tarih_formatted}</span>
                </div>
                <div class="warning-details">
                    <div class="warning-detail">
                        <span class="detail-label">Tahmin Edilen Yağış:</span>
                        <span class="detail-value">${warning.tahmin_edilen_yagis} mm</span>
                    </div>
                    <div class="warning-detail">
                        <span class="detail-label">Risk Artışı:</span>
                        <span class="detail-value">+${warning.risk_artisi} puan</span>
                    </div>
                </div>
                <div class="warning-message">
                    <p>${warning.uyari_mesaji}</p>
                </div>
            </div>
        `;
        
        warningsContainer.appendChild(warningItem);
    });
}

// ==================== MAP FUNCTIONS (OpenStreetMap/Leaflet) ====================

// İl koordinatları (Marmara bölgesi) - Merkez noktalar
const PROVINCE_COORDS = {
    'İstanbul': { lat: 41.0082, lon: 28.9784 },
    'Bursa': { lat: 40.1826, lon: 29.0665 },
    'Kocaeli': { lat: 40.8533, lon: 29.8815 },
    'Sakarya': { lat: 40.7569, lon: 30.3786 },
    'Balıkesir': { lat: 39.6484, lon: 27.8826 },
    'Çanakkale': { lat: 40.1553, lon: 26.4142 },
    'Tekirdağ': { lat: 40.9833, lon: 27.5167 },
    'Yalova': { lat: 40.6550, lon: 29.2769 },
    'Bilecik': { lat: 40.1425, lon: 29.9793 },
    'Edirne': { lat: 41.6772, lon: 26.5556 },
    'Kırklareli': { lat: 41.7333, lon: 27.2167 }
};











