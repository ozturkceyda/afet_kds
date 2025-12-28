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
const mapSection = document.getElementById('mapSection');

// State
let provinces = [];
let selectedProvinceId = null;
let liveEarthquakeInterval = null;
let autoRefreshEnabled = true;
let marmaraMap = null;
let dashboardMarmaraMap = null;
let provinceLayers = {};
let dashboardProvinceLayers = {};
let selectedScenario = '6.5-7.0'; // 'realtime', '6.5-7.0', '7.0-7.5', '7.5+' - Default to 6.5-7.0 to show estimates
let currentDisasterType = 'earthquake'; // 'earthquake', 'flood', 'fire'
let provinceRiskData = {}; // Store risk data for all provinces
let selectedProvinceForMap = null; // Seçili il haritada

// Initialize - Load everything IMMEDIATELY
document.addEventListener('DOMContentLoaded', () => {
    // Start loading provinces immediately (don't wait)
    loadProvinces();
    setupEventListeners();
    setupFloodWarningsEventListeners();
    setupFloodEventListeners();
    
    // Modal event listeners
    const modal = document.getElementById('provinceDetailModal');
    const closeBtn = document.getElementById('provinceModalCloseBtn');
    const closeBtnBottom = document.getElementById('provinceModalCloseBtnBottom');
    const backdrop = modal?.querySelector('.province-modal-backdrop');
    
    if (closeBtn) {
        closeBtn.addEventListener('click', closeProvinceModal);
    }
    
    if (closeBtnBottom) {
        closeBtnBottom.addEventListener('click', closeProvinceModal);
    }
    
    if (backdrop) {
        backdrop.addEventListener('click', closeProvinceModal);
    }
    
    // ESC tuşu ile kapat
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && modal?.classList.contains('active')) {
            closeProvinceModal();
        }
    });
    
    // If dashboard is visible, load it immediately
    if (dashboardSection && dashboardSection.style.display !== 'none') {
        // Load dashboard data and map immediately - NO DELAYS
        loadComprehensiveDashboard();
        initDashboardMap();
        loadFloodRiskWarnings();
    }
});

// Event Listeners
function setupEventListeners() {
    // Province select change
    if (!provinceSelect) return;
    provinceSelect.addEventListener('change', (e) => {
        selectedProvinceId = e.target.value;
        if (selectedProvinceId) {
            loadProvinceRisks(selectedProvinceId);
            updateSelectedProvinceName();
            
            // Highlight selected province on map
            highlightProvinceOnMap(selectedProvinceId);
            
            // Dashboard istatistiklerini güncelle (il bazında senaryo)
            if (dashboardSection.style.display !== 'none') {
                // Reload all dashboard data to ensure consistency
                reloadDashboardData();
            }
            // Eğer deprem sayfasındaysak, deprem verilerini de yükle
            if (earthquakesSection.style.display !== 'none') {
                loadEarthquakeData(selectedProvinceId);
            }
            // Eğer hava durumu sayfasındaysak, hava durumu verilerini de yükle
            if (weatherSection.style.display !== 'none') {
                loadWeatherData(selectedProvinceId);
            }
            // Eğer sel sayfasındaysak, il bazında detaylı analizi göster
            if (currentDisasterType === 'flood') {
                loadFloodProvinceAnalysis(selectedProvinceId);
            }
            // Eğer deprem dashboard'ındaysak, ulaşım rotalarını yükle
            if (currentDisasterType === 'earthquake' && dashboardSection.style.display !== 'none') {
                loadTransportRoutes(selectedProvinceId);
            }
        } else {
            clearRiskData();
            // İl seçimi kaldırıldığında genel senaryoyu göster
            if (dashboardSection.style.display !== 'none') {
                // Reload all dashboard data to ensure consistency
                reloadDashboardData();
            }
            // Sel analiz panelini gizle
            if (currentDisasterType === 'flood') {
                const analysisContainer = document.getElementById('floodProvinceAnalysis');
                if (analysisContainer) {
                    analysisContainer.style.display = 'none';
                }
            }
            // Ulaşım rotaları panelini gizle
            if (currentDisasterType === 'earthquake') {
                const transportContainer = document.getElementById('transportRoutesContainer');
                if (transportContainer) {
                    transportContainer.style.display = 'none';
                }
            }
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

    // Disaster Type Tabs
    document.querySelectorAll('.disaster-tab').forEach(tab => {
        tab.addEventListener('click', (e) => {
            const disasterType = tab.dataset.disaster;
            switchDisasterTab(disasterType);
            
            // Update active tab
            document.querySelectorAll('.disaster-tab').forEach(t => t.classList.remove('active'));
            tab.classList.add('active');
        });
    });
}

// Switch Disaster Tab
function switchDisasterTab(disasterType) {
    // Update current disaster type
    currentDisasterType = disasterType;
    
    // Hide all disaster content
    document.querySelectorAll('.disaster-content').forEach(content => {
        content.classList.remove('active');
    });

    // Show selected disaster content
    const contentId = disasterType + 'Content';
    const content = document.getElementById(contentId);
    if (content) {
        content.classList.add('active');
        
        // Load specific data based on disaster type
        if (disasterType === 'earthquake') {
            // Earthquake content is already loaded
            if (selectedProvinceId) {
                loadProvinceRisks(selectedProvinceId);
                loadTransportRoutes(selectedProvinceId);
            }
            // Ensure charts are initialized
            initCharts();
        } else if (disasterType === 'flood') {
            // Load flood data
            loadFloodData();
        } else if (disasterType === 'fire') {
            // Load fire data
            loadFireData();
        }
    }
    
    // Update map colors based on new disaster type
    updateMapColors();
    
    // Update open popups to show only the current disaster type
    updateOpenPopups();
}

// Update open popups when disaster tab changes
async function updateOpenPopups() {
    if (!dashboardMarmaraMap) return;
    
    // Get the currently open popup
    const openPopup = dashboardMarmaraMap._popup;
    if (openPopup && openPopup._source) {
        const layer = openPopup._source;
        const feature = layer.feature;
        if (feature && feature.properties) {
            const provinceName = feature.properties.IlAdi;
            
            try {
                // Fetch risk data again
                const riskData = await fetchProvinceRiskData(provinceName);
                
                // Create new popup content with current disaster type
                const popupContent = createProvincePopup(provinceName, riskData);
                
                // Update the popup
                layer.bindPopup(popupContent, {
                    maxWidth: 300,
                    className: 'province-popup'
                }).openPopup();
            } catch (error) {
                console.error('Error updating popup:', error);
            }
        }
    }
}

// Flood Risk Analysis State
let floodAnalysisData = [];
let floodMap = null;
let floodCountsChart = null;
let floodRiskDistributionChart = null;
let floodBudgetChart = null;
let floodInfrastructureChart = null;

// Load Flood Data - Complete Analysis
async function loadFloodData() {
    try {
        // Show loading state
        const tableBody = document.getElementById('floodRiskTableBody');
        if (tableBody) {
            tableBody.innerHTML = '<tr><td colspan="5" style="text-align: center; padding: 40px; color: #a0aec0;">Analiz yükleniyor...</td></tr>';
        }

        // Fetch complete analysis
        const response = await fetch(`${API_BASE}/flood-risk/analysis`);
        const result = await response.json();

        if (result.success && result.data) {
            floodAnalysisData = result.data;
            
            // Render all components
            renderFloodTable(floodAnalysisData);
            renderFloodMap(floodAnalysisData);
            renderWeatherBasedFloodAlert(floodAnalysisData);
            
            // Calculate and save recommendations
            try {
                await fetch(`${API_BASE}/flood-risk/calculate-recommendations`, {
                    method: 'POST'
                });
            } catch (error) {
                console.warn('Öneriler kaydedilirken hata:', error);
            }
            
            // Initialize charts (will use saved recommendations if available)
            await initFloodCharts(floodAnalysisData);
        } else {
            throw new Error(result.message || 'Sel riski analizi yüklenemedi');
        }
    } catch (error) {
        console.error('Sel verileri yüklenirken hata:', error);
        const tableBody = document.getElementById('floodRiskTableBody');
        if (tableBody) {
            tableBody.innerHTML = `<tr><td colspan="5" style="text-align: center; padding: 40px; color: #ef4444;">Hata: ${error.message}</td></tr>`;
        }
    }
}

// Render Flood Risk Table
function renderFloodTable(data) {
    const tableBody = document.getElementById('floodRiskTableBody');
    if (!tableBody) return;

    if (data.length === 0) {
        tableBody.innerHTML = '<tr><td colspan="5" style="text-align: center; padding: 40px; color: #a0aec0;">Veri bulunamadı</td></tr>';
        return;
    }

    tableBody.innerHTML = data.map(item => {
        const priorityClass = item.is_priority ? 'priority-row' : '';
        const weatherRiskBadge = item.weather_risk_score > 0 
            ? `<span class="weather-risk-badge" style="background-color: ${item.weather_risk_color}; color: #fff;">${item.weather_risk_label}</span>`
            : '';
        return `
            <tr class="${priorityClass}" data-province="${item.il_adi}">
                <td>
                    <strong style="display: inline-block; min-width: 100px;">${item.il_adi}</strong>
                    ${weatherRiskBadge}
                </td>
                <td>${item.ortalama_sel_sayisi.toFixed(2)}</td>
                <td>${item.combined_risk_score ? item.combined_risk_score.toFixed(4) : item.normalized_score.toFixed(4)}</td>
                <td>
                    <span class="risk-badge ${item.risk_level}">${item.risk_label}</span>
                </td>
                <td>
                    ${item.is_priority ? '<span class="priority-badge">⚠️ Öncelikli</span>' : '<span style="color: #718096;">Normal</span>'}
                </td>
            </tr>
        `;
    }).join('');

    // Add search and filter functionality
    setupFloodTableFilters();
}

// Setup Table Search and Filter
function setupFloodTableFilters() {
    const searchInput = document.getElementById('floodTableSearch');
    const filterSelect = document.getElementById('floodTableFilter');
    
    if (searchInput) {
        searchInput.addEventListener('input', filterTable);
    }
    
    if (filterSelect) {
        filterSelect.addEventListener('change', filterTable);
    }
}

function filterTable() {
    const searchInput = document.getElementById('floodTableSearch');
    const filterSelect = document.getElementById('floodTableFilter');
    const tableBody = document.getElementById('floodRiskTableBody');
    
    if (!tableBody) return;
    
    const searchTerm = (searchInput?.value || '').toLowerCase();
    const filterValue = filterSelect?.value || 'all';
    
    const rows = tableBody.querySelectorAll('tr');
    rows.forEach(row => {
        const province = (row.dataset.province || '').toLowerCase();
        const riskLevel = row.querySelector('.risk-badge')?.classList.contains(filterValue) || filterValue === 'all';
        const isPriority = row.classList.contains('priority-row');
        
        const matchesSearch = province.includes(searchTerm);
        const matchesFilter = filterValue === 'all' || 
                            (filterValue === 'priority' && isPriority) ||
                            riskLevel;
        
        row.style.display = (matchesSearch && matchesFilter) ? '' : 'none';
    });
}

// Render Flood Map (Choropleth)
function renderFloodMap(data) {
    const mapContainer = document.getElementById('floodRiskMap');
    if (!mapContainer) return;

    // Initialize map if not already done
    if (!floodMap) {
        floodMap = L.map('floodRiskMap', {
            center: [40.5, 28.5],
            zoom: 8,
            minZoom: 7,
            maxZoom: 12,
            zoomControl: false,
            attributionControl: false,
            preferCanvas: false
        });
        
        // Force dark background
        const mapContainer = document.getElementById('floodRiskMap');
        if (mapContainer) {
            const leafletContainer = mapContainer.querySelector('.leaflet-container');
            if (leafletContainer) {
                leafletContainer.style.backgroundColor = '#1a1a1a';
            }
        }
    } else {
        floodMap.eachLayer(layer => {
            if (layer instanceof L.GeoJSON) {
                floodMap.removeLayer(layer);
            }
        });
    }

    // Load GeoJSON and color by risk
    loadFloodGeoJSON(data);

    // Create legend
    renderFloodMapLegend();
}

// Load GeoJSON with risk colors
async function loadFloodGeoJSON(analysisData) {
    try {
        const response = await fetch('/marmara_iller.geojson');
        if (!response.ok) return;
        
        const geojsonData = await response.json();
        
        const geoJsonLayer = L.geoJSON(geojsonData, {
            style: function(feature) {
                const provinceName = feature.properties.IlAdi;
                const provinceData = analysisData.find(d => d.il_adi === provinceName);
                
                if (!provinceData) {
                    return {
                        fillColor: '#718096',
                        fillOpacity: 0.6,
                        color: '#4a5568',
                        weight: 2
                    };
                }
                
                return {
                    fillColor: provinceData.risk_color,
                    fillOpacity: 0.7,
                    color: '#fff',
                    weight: 2
                };
            },
            onEachFeature: function(feature, layer) {
                const provinceName = feature.properties.IlAdi;
                const provinceData = analysisData.find(d => d.il_adi === provinceName);
                
                if (provinceData) {
                    const weatherInfo = provinceData.weather_risk_score > 0 
                        ? `
                            <p style="margin: 4px 0; padding-top: 8px; border-top: 1px solid #e5e7eb;">
                                <strong>🌧️ Hava Durumu Riski:</strong><br>
                                <span style="color: ${provinceData.weather_risk_color};">${provinceData.weather_risk_label}</span><br>
                                <span style="font-size: 11px; color: #6b7280;">
                                    Ort. Yağış: ${provinceData.ortalama_yagis ? provinceData.ortalama_yagis.toFixed(1) : '0'} mm/gün<br>
                                    Toplam: ${provinceData.toplam_yagis ? provinceData.toplam_yagis.toFixed(1) : '0'} mm (7 gün)
                                </span>
                            </p>
                        `
                        : '';
                    const popupContent = `
                        <div style="padding: 8px;">
                            <h4 style="margin: 0 0 8px 0; color: #1a252f;">${provinceName}</h4>
                            <p style="margin: 4px 0;"><strong>Ort. Sayı:</strong> ${provinceData.ortalama_sel_sayisi.toFixed(2)}</p>
                            <p style="margin: 4px 0;"><strong>Birleşik Skor:</strong> ${provinceData.combined_risk_score ? provinceData.combined_risk_score.toFixed(4) : provinceData.normalized_score.toFixed(4)}</p>
                            <p style="margin: 4px 0;"><strong>Risk Seviyesi:</strong> <span style="color: ${provinceData.risk_color};">${provinceData.risk_label}</span></p>
                            ${provinceData.is_priority ? '<p style="margin: 4px 0; color: #ef4444;"><strong>⚠️ Öncelikli Bölge</strong></p>' : ''}
                            ${weatherInfo}
                        </div>
                    `;
                    
                    // Hover ile popup göster (mouseover - tıklamadan)
                    layer.bindPopup(popupContent, {
                        closeOnClick: false,
                        autoClose: false,
                        closeButton: false,
                        className: 'flood-map-popup'
                    });
                    
                    // Mouseover'da popup'ı göster
                    layer.on('mouseover', function(e) {
                        layer.openPopup();
                    });
                    
                    // Mouseout'da popup'ı kapat
                    layer.on('mouseout', function(e) {
                        layer.closePopup();
                    });
                }
            }
        }).addTo(floodMap);
        
        floodMap.fitBounds(geoJsonLayer.getBounds());
    } catch (error) {
        console.error('Error loading flood GeoJSON:', error);
    }
}

// Render Map Legend
function renderFloodMapLegend() {
    const legendContainer = document.getElementById('floodMapLegend');
    if (!legendContainer) return;

    const riskLevels = [
        { level: 'very_high', label: 'Çok Yüksek', color: '#ef4444' },
        { level: 'high', label: 'Yüksek', color: '#f97316' },
        { level: 'medium', label: 'Orta', color: '#eab308' },
        { level: 'low', label: 'Düşük', color: '#22c55e' },
        { level: 'very_low', label: 'Çok Düşük', color: '#3b82f6' }
    ];

    legendContainer.innerHTML = riskLevels.map(item => `
        <div class="legend-item">
            <div class="legend-color" style="background-color: ${item.color};"></div>
            <span class="legend-label">${item.label}</span>
        </div>
    `).join('');
}

// Render Weather-Based Flood Risk Alert
function renderWeatherBasedFloodAlert(data) {
    const alertContainer = document.getElementById('floodWeatherAlert');
    const alertMessage = document.getElementById('weatherAlertMessage');
    
    if (!alertContainer || !alertMessage) return;

    // Hava durumu riski olan illeri bul
    const highWeatherRiskProvinces = data.filter(item => 
        item.weather_risk_score > 0 && 
        (item.weather_risk_level === 'yüksek' || item.weather_risk_level === 'çok_yüksek')
    );

    if (highWeatherRiskProvinces.length === 0) {
        // Düşük risk veya veri yok
        const hasData = data.some(item => item.weather_risk_score > 0);
        if (hasData) {
            alertContainer.style.display = 'block';
            alertContainer.className = 'flood-weather-alert';
            alertMessage.innerHTML = `
                <span style="color: #22c55e;">✅ Önümüzdeki beş gün sel riski bulunmuyor.</span>
            `;
        } else {
            alertContainer.style.display = 'none';
        }
        return;
    }

    // Yüksek riskli iller var
    alertContainer.style.display = 'block';
    
    // Risk seviyesine göre alert rengini ayarla
    const maxRisk = Math.max(...highWeatherRiskProvinces.map(p => p.weather_risk_score));
    if (maxRisk >= 0.7) {
        alertContainer.className = 'flood-weather-alert high-risk';
    } else if (maxRisk >= 0.5) {
        alertContainer.className = 'flood-weather-alert medium-risk';
    } else {
        alertContainer.className = 'flood-weather-alert';
    }

    // İl listesini oluştur
    const provinceList = highWeatherRiskProvinces
        .sort((a, b) => b.weather_risk_score - a.weather_risk_score)
        .slice(0, 5)
        .map(p => {
            const yagisInfo = p.ortalama_yagis > 0 
                ? ` (Ort. yağış: ${p.ortalama_yagis.toFixed(1)} mm/gün)`
                : '';
            return `<strong>${p.il_adi}</strong> - ${p.weather_risk_label}${yagisInfo}`;
        })
        .join('<br>');

    const totalHighRisk = highWeatherRiskProvinces.length;
    const remainingCount = totalHighRisk > 5 ? ` ve ${totalHighRisk - 5} il daha` : '';

    alertMessage.innerHTML = `
        <span style="color: #fff; font-weight: 600;">⚠️ ${totalHighRisk} ilde hava durumuna göre yüksek sel riski tespit edildi:</span><br>
        <div style="margin-top: 8px; color: #a0aec0;">
            ${provinceList}${remainingCount}
        </div>
        <div style="margin-top: 8px; font-size: 13px; color: #94a3b8;">
            💡 Risk skoru: Tarihsel sel verileri (%60) + Hava durumu verileri (%40) şeklinde hesaplanmıştır.
        </div>
    `;
}

// Render Province Cards
async function renderFloodProvinceCards(data) {
    const container = document.getElementById('floodProvinceCards');
    if (!container) return;

    // Show loading state
    container.innerHTML = '<div style="grid-column: 1 / -1; text-align: center; padding: 40px; color: #a0aec0;">İl detayları yükleniyor...</div>';

    // Fetch yearly trends for all provinces
    const results = await Promise.all(data.map(async item => {
        try {
            const trendResponse = await fetch(`${API_BASE}/flood-risk/province/${item.il_id}`);
            const trendResult = await trendResponse.json();
            const trend = trendResult.success && trendResult.data?.yearly_trend ? trendResult.data.yearly_trend : [];
            return { item, trend };
        } catch (error) {
            console.error(`Error fetching trend for ${item.il_adi}:`, error);
            return { item, trend: [] };
        }
    }));

    // Render cards
    const maxTrend = Math.max(...results.map(r => Math.max(...r.trend.map(t => t.sel_sayisi), 1)), 1);
    
    container.innerHTML = results.map(({ item, trend }) => {
        return `
            <div class="flood-province-card ${item.is_priority ? 'priority' : ''}">
                <div class="province-card-header">
                    <h5 class="province-card-title">${item.il_adi}</h5>
                    <span class="risk-badge ${item.risk_level}">${item.risk_label}</span>
                </div>
                <div class="province-card-body">
                    <div class="card-stat">
                        <span class="card-stat-label">Ort. Sel Sayısı</span>
                        <span class="card-stat-value">${item.ortalama_sel_sayisi.toFixed(2)}</span>
                    </div>
                    <div class="card-stat">
                        <span class="card-stat-label">Normalize Skor</span>
                        <span class="card-stat-value">${item.normalized_score.toFixed(4)}</span>
                    </div>
                    ${item.is_priority ? `
                    <div class="card-stat">
                        <span class="priority-badge">⚠️ Öncelikli Bölge</span>
                    </div>
                    ` : ''}
                    ${trend.length > 0 ? `
                    <div class="province-trend">
                        <h5>4 Yıllık Trend (2022-2025)</h5>
                        <div class="trend-bars">
                            ${trend.map(trendItem => `
                                <div class="trend-bar" style="height: ${(trendItem.sel_sayisi / maxTrend) * 100}%;" title="${trendItem.yil}: ${trendItem.sel_sayisi} sel">
                                    <span class="trend-bar-label">${trendItem.yil}</span>
                                </div>
                            `).join('')}
                        </div>
                    </div>
                    ` : ''}
                </div>
            </div>
        `;
    }).join('');
}

// Show Priority Alert
function showPriorityAlert(data) {
    const priorityProvinces = data.filter(item => item.is_priority);
    const alertContainer = document.getElementById('floodPriorityAlert');
    
    if (!alertContainer) return;
    
    if (priorityProvinces.length > 0) {
        alertContainer.style.display = 'block';
        const priorityNames = priorityProvinces.map(p => p.il_adi).join(', ');
        const alertText = alertContainer.querySelector('.priority-alert-text p');
        if (alertText) {
            alertText.textContent = `Normalize skoru > 0.60 olan iller: ${priorityNames}. Acil müdahale gereklidir.`;
        }
    } else {
        alertContainer.style.display = 'none';
    }
}

// Setup Flood Event Listeners
function setupFloodEventListeners() {
    // Event listeners can be added here if needed in the future
}

// Initialize Flood Charts
async function initFloodCharts(data) {
    if (typeof Chart === 'undefined') {
        console.warn('Chart.js yüklenmedi');
        return;
    }

    // Destroy existing charts if they exist
    if (floodCountsChart) floodCountsChart.destroy();
    if (floodRiskDistributionChart) floodRiskDistributionChart.destroy();
    if (floodBudgetChart) floodBudgetChart.destroy();
    if (floodInfrastructureChart) floodInfrastructureChart.destroy();

    // Create charts
    createFloodCountsChart(data);
    createFloodRiskDistributionChart(data);
    await createFloodBudgetChart(data);
    await createFloodInfrastructureChart(data);
}

// Chart 1: İl Bazında Ortalama Sel Sayıları (Bar Chart)
function createFloodCountsChart(data) {
    const ctx = document.getElementById('floodCountsChart');
    if (!ctx) return;

    // Sort by average count (descending)
    const sortedData = [...data].sort((a, b) => b.ortalama_sel_sayisi - a.ortalama_sel_sayisi);
    
    const labels = sortedData.map(item => item.il_adi);
    const counts = sortedData.map(item => item.ortalama_sel_sayisi);
    const colors = sortedData.map(item => item.risk_color);

    floodCountsChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: labels,
            datasets: [{
                label: 'Ortalama Sel Sayısı',
                data: counts,
                backgroundColor: colors.map(color => color + '80'), // Add transparency
                borderColor: colors,
                borderWidth: 2,
                borderRadius: 6
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: true,
            plugins: {
                legend: {
                    display: false
                },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            return `Ortalama: ${context.parsed.y.toFixed(2)} sel`;
                        }
                    }
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    ticks: {
                        color: '#a0aec0',
                        precision: 0
                    },
                    grid: {
                        color: 'rgba(255, 255, 255, 0.05)'
                    }
                },
                x: {
                    ticks: {
                        color: '#a0aec0',
                        maxRotation: 45,
                        minRotation: 45
                    },
                    grid: {
                        display: false
                    }
                }
            }
        }
    });
}

// Chart 2: Risk Seviyesi Dağılımı (Doughnut Chart)
function createFloodRiskDistributionChart(data) {
    const ctx = document.getElementById('floodRiskDistributionChart');
    if (!ctx) return;

    // Count by risk level
    const riskCounts = {
        'Çok Yüksek': 0,
        'Yüksek': 0,
        'Orta': 0,
        'Düşük': 0,
        'Çok Düşük': 0
    };

    data.forEach(item => {
        riskCounts[item.risk_label] = (riskCounts[item.risk_label] || 0) + 1;
    });

    const labels = Object.keys(riskCounts).filter(key => riskCounts[key] > 0);
    const counts = labels.map(label => riskCounts[label]);
    
    // Get colors for each risk level
    const colorMap = {
        'Çok Yüksek': '#ef4444',
        'Yüksek': '#f97316',
        'Orta': '#eab308',
        'Düşük': '#22c55e',
        'Çok Düşük': '#3b82f6'
    };
    const colors = labels.map(label => colorMap[label]);

    floodRiskDistributionChart = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: labels,
            datasets: [{
                data: counts,
                backgroundColor: colors.map(color => color + '80'),
                borderColor: colors,
                borderWidth: 2
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: true,
            plugins: {
                legend: {
                    position: 'bottom',
                    labels: {
                        color: '#e2e8f0',
                        padding: 15,
                        font: {
                            size: 12
                        }
                    }
                },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            const label = context.label || '';
                            const value = context.parsed || 0;
                            const total = context.dataset.data.reduce((a, b) => a + b, 0);
                            const percentage = ((value / total) * 100).toFixed(1);
                            return `${label}: ${value} il (${percentage}%)`;
                        }
                    }
                }
            }
        }
    });
}

// Chart 3: Önerilen Bütçe Dağılımı (Bar Chart)
async function createFloodBudgetChart(data) {
    const ctx = document.getElementById('floodBudgetChart');
    if (!ctx || !data || data.length === 0) {
        console.warn('Bütçe grafiği için veri veya canvas bulunamadı');
        return;
    }

    // Önce veritabanından önerileri al, yoksa hesapla
    let budgetData = [];
    try {
        const response = await fetch(`${API_BASE}/flood-risk/recommendations`);
        const result = await response.json();
        if (result.success && result.data && result.data.length > 0) {
            // Veritabanından gelen verileri kullan
            budgetData = result.data.map(item => ({
                il_adi: item.il_adi,
                budget: parseFloat(item.onerilen_butce || 0),
                is_priority: false,
                risk_color: '#667eea'
            }));
            // Analiz verileri ile eşleştir
            data.forEach(analizItem => {
                const oneriItem = budgetData.find(b => b.il_adi === analizItem.il_adi);
                if (oneriItem) {
                    oneriItem.is_priority = analizItem.is_priority;
                    oneriItem.risk_color = analizItem.risk_color;
                }
            });
        }
    } catch (error) {
        console.warn('Öneriler veritabanından alınamadı, hesaplanıyor:', error);
    }

    // Eğer veritabanından veri gelmediyse, hesapla
    if (budgetData.length === 0) {

        // Bütçe hesaplama: Risk skoruna ve sel sayısına göre mantıklı bir formül
        budgetData = data.map(item => {
            let budget = 5; // Base bütçe
            budget += item.normalized_score * 80; // Risk skoruna göre bütçe
            budget += item.ortalama_sel_sayisi * 3; // Her sel için ek bütçe
            
            if (item.is_priority) {
                budget *= 1.3; // Öncelikli bölgeler için %30 ekstra
            }
            
            return {
                il_adi: item.il_adi,
                budget: Math.round(budget),
                is_priority: item.is_priority,
                risk_color: item.risk_color,
                normalized_score: item.normalized_score
            };
        });
    }

    // Bütçeye göre sırala (yüksekten düşüğe)
    budgetData.sort((a, b) => b.budget - a.budget);

    const labels = budgetData.map(item => item.il_adi);
    const budgets = budgetData.map(item => item.budget);
    const colors = budgetData.map(item => item.is_priority ? '#ef4444' : item.risk_color);
    
    // Toplam bütçe hesapla
    const totalBudget = budgets.reduce((sum, val) => sum + val, 0);

    // Eğer önceki chart varsa destroy et
    if (floodBudgetChart) {
        floodBudgetChart.destroy();
    }

    floodBudgetChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: labels,
            datasets: [{
                label: 'Bütçe (Milyon TL)',
                data: budgets,
                backgroundColor: colors.map(color => color + 'CC'),
                borderColor: colors,
                borderWidth: 2,
                borderRadius: 6
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: true,
            plugins: {
                legend: {
                    display: false
                },
                tooltip: {
                    backgroundColor: 'rgba(0, 0, 0, 0.8)',
                    padding: 12,
                    titleColor: '#fff',
                    bodyColor: '#e2e8f0',
                    borderColor: 'rgba(255, 255, 255, 0.1)',
                    borderWidth: 1,
                    callbacks: {
                        label: function(context) {
                            const budget = context.parsed.y;
                            const item = budgetData[context.dataIndex];
                            let tooltip = `Bütçe: ${budget.toLocaleString('tr-TR')} Milyon TL`;
                            if (item.is_priority) {
                                tooltip += ' ⚠️ Öncelikli';
                            }
                            const percentage = ((budget / totalBudget) * 100).toFixed(1);
                            tooltip += ` (${percentage}%)`;
                            return tooltip;
                        },
                        footer: function(tooltipItems) {
                            return `Toplam Bütçe: ${totalBudget.toLocaleString('tr-TR')} Milyon TL`;
                        }
                    }
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    ticks: {
                        color: '#a0aec0',
                        callback: function(value) {
                            return value + 'M TL';
                        }
                    },
                    grid: {
                        color: 'rgba(255, 255, 255, 0.05)'
                    }
                },
                x: {
                    ticks: {
                        color: '#a0aec0',
                        maxRotation: 45,
                        minRotation: 45
                    },
                    grid: {
                        display: false
                    }
                }
            }
        }
    });
}

// Chart 4: Altyapı İyileştirme Öncelikleri (Grouped Bar Chart - Daha açıklayıcı)
async function createFloodInfrastructureChart(data) {
    const ctx = document.getElementById('floodInfrastructureChart');
    if (!ctx || !data || data.length === 0) {
        console.warn('Altyapı grafiği için veri veya canvas bulunamadı');
        return;
    }

    // Önce veritabanından önerileri al, yoksa hesapla
    let infrastructureData = [];
    try {
        const response = await fetch(`${API_BASE}/flood-risk/recommendations`);
        const result = await response.json();
        if (result.success && result.data && result.data.length > 0) {
            // Veritabanından gelen verileri kullan
            infrastructureData = result.data.map(item => ({
                il_adi: item.il_adi,
                improvements: {
                    'Dere Islahı': parseInt(item.dere_islahi_oncelik || 0),
                    'Yağmur Suyu Kanalı': parseInt(item.yagmur_suyu_kanali_oncelik || 0),
                    'Baraj/Dere Regülatörü': parseInt(item.baraj_regulator_oncelik || 0),
                    'Sel Önleme Duvarı': parseInt(item.sel_onleme_duvari_oncelik || 0),
                    'Acil Müdahale Ekipmanı': parseInt(item.acil_mudahale_ekipmani_oncelik || 0)
                },
                risk_score: 0,
                is_priority: false
            }));
            // Analiz verileri ile eşleştir
            data.forEach(analizItem => {
                const oneriItem = infrastructureData.find(i => i.il_adi === analizItem.il_adi);
                if (oneriItem) {
                    oneriItem.risk_score = analizItem.normalized_score;
                    oneriItem.is_priority = analizItem.is_priority;
                }
            });
        }
    } catch (error) {
        console.warn('Öneriler veritabanından alınamadı, hesaplanıyor:', error);
    }

    // Altyapı iyileştirme türleri ve renkleri
    const infrastructureTypes = [
        { name: 'Dere Islahı', color: '#3b82f6', cost: 15 }, // Milyon TL başına maliyet
        { name: 'Yağmur Suyu Kanalı', color: '#22c55e', cost: 12 },
        { name: 'Baraj/Dere Regülatörü', color: '#eab308', cost: 25 },
        { name: 'Sel Önleme Duvarı', color: '#f97316', cost: 8 },
        { name: 'Acil Müdahale Ekipmanı', color: '#ef4444', cost: 5 }
    ];

    // Eğer veritabanından veri gelmediyse, hesapla
    if (infrastructureData.length === 0) {
        // Her il için altyapı iyileştirme öncelikleri hesapla
        infrastructureData = data.map(item => {
        const improvements = {
            'Dere Islahı': 0,
            'Yağmur Suyu Kanalı': 0,
            'Baraj/Dere Regülatörü': 0,
            'Sel Önleme Duvarı': 0,
            'Acil Müdahale Ekipmanı': 0
        };

        // Risk seviyesine göre iyileştirme öncelikleri (1-5 arası öncelik seviyesi)
        const riskScore = item.normalized_score;
        
        if (riskScore >= 0.8) {
            // Çok yüksek risk: Tüm iyileştirmeler yüksek öncelik
            improvements['Dere Islahı'] = 5;
            improvements['Yağmur Suyu Kanalı'] = 5;
            improvements['Baraj/Dere Regülatörü'] = 4;
            improvements['Sel Önleme Duvarı'] = 5;
            improvements['Acil Müdahale Ekipmanı'] = 5;
        } else if (riskScore >= 0.6) {
            // Yüksek risk
            improvements['Dere Islahı'] = 4;
            improvements['Yağmur Suyu Kanalı'] = 4;
            improvements['Baraj/Dere Regülatörü'] = 3;
            improvements['Sel Önleme Duvarı'] = 4;
            improvements['Acil Müdahale Ekipmanı'] = 4;
        } else if (riskScore >= 0.4) {
            // Orta risk
            improvements['Dere Islahı'] = 3;
            improvements['Yağmur Suyu Kanalı'] = 3;
            improvements['Baraj/Dere Regülatörü'] = 2;
            improvements['Sel Önleme Duvarı'] = 2;
            improvements['Acil Müdahale Ekipmanı'] = 3;
        } else if (riskScore >= 0.2) {
            // Düşük risk
            improvements['Dere Islahı'] = 2;
            improvements['Yağmur Suyu Kanalı'] = 2;
            improvements['Baraj/Dere Regülatörü'] = 1;
            improvements['Sel Önleme Duvarı'] = 1;
            improvements['Acil Müdahale Ekipmanı'] = 2;
        } else {
            // Çok düşük risk
            improvements['Dere Islahı'] = 1;
            improvements['Yağmur Suyu Kanalı'] = 1;
            improvements['Baraj/Dere Regülatörü'] = 0;
            improvements['Sel Önleme Duvarı'] = 0;
            improvements['Acil Müdahale Ekipmanı'] = 1;
        }

        // Ortalama sel sayısına göre ek öncelik (özellikle acil müdahale için)
        if (item.ortalama_sel_sayisi >= 7) {
            improvements['Acil Müdahale Ekipmanı'] = Math.min(5, improvements['Acil Müdahale Ekipmanı'] + 2);
            improvements['Sel Önleme Duvarı'] = Math.min(5, improvements['Sel Önleme Duvarı'] + 1);
        } else if (item.ortalama_sel_sayisi >= 5) {
            improvements['Acil Müdahale Ekipmanı'] = Math.min(5, improvements['Acil Müdahale Ekipmanı'] + 1);
        }

            return {
                il_adi: item.il_adi,
                improvements: improvements,
                risk_score: riskScore,
                is_priority: item.is_priority
            };
        });
    }

    // Toplam öncelik skoruna göre sırala (önemli iller önce)
    infrastructureData.sort((a, b) => {
        const aTotal = Object.values(a.improvements).reduce((sum, val) => sum + val, 0);
        const bTotal = Object.values(b.improvements).reduce((sum, val) => sum + val, 0);
        return bTotal - aTotal;
    });

    // Veri kontrolü
    if (!infrastructureData || infrastructureData.length === 0) {
        console.error('Altyapı verisi bulunamadı! infrastructureData:', infrastructureData);
        return;
    }

    // İlk 8 ili göster (çok fazla olursa okunmaz)
    const topProvinces = infrastructureData.slice(0, 8);
    const labels = topProvinces.map(item => item.il_adi);
    
    if (labels.length === 0) {
        console.error('Grafik için etiket verisi bulunamadı!');
        return;
    }
    
    const datasets = infrastructureTypes.map((type) => ({
        label: type.name,
        data: topProvinces.map(item => (item.improvements && item.improvements[type.name]) || 0),
        backgroundColor: type.color + 'CC',
        borderColor: type.color,
        borderWidth: 1.5,
        borderRadius: 4
    }));
    
    console.log('Altyapı grafiği oluşturuluyor:', { 
        labels: labels.length, 
        datasets: datasets.length,
        dataSample: topProvinces.slice(0, 2)
    });

    // Eğer önceki chart varsa destroy et
    if (floodInfrastructureChart) {
        floodInfrastructureChart.destroy();
    }

    floodInfrastructureChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: labels,
            datasets: datasets
        },
        options: {
            responsive: true,
            maintainAspectRatio: true,
            plugins: {
                legend: {
                    position: 'bottom',
                    labels: {
                        color: '#e2e8f0',
                        padding: 12,
                        font: {
                            size: 11
                        },
                        usePointStyle: true,
                        pointStyle: 'circle'
                    }
                },
                tooltip: {
                    backgroundColor: 'rgba(0, 0, 0, 0.8)',
                    padding: 12,
                    titleColor: '#fff',
                    bodyColor: '#e2e8f0',
                    borderColor: 'rgba(255, 255, 255, 0.1)',
                    borderWidth: 1,
                    callbacks: {
                        label: function(context) {
                            const label = context.dataset.label || '';
                            const value = context.parsed.y;
                            if (value === 0) return null;
                            
                            const type = infrastructureTypes.find(t => t.name === label);
                            const estimatedCost = value * type.cost;
                            
                            return `${label}: Öncelik ${value}/5 (Tahmini Maliyet: ${estimatedCost}M TL)`;
                        }
                    }
                }
            },
            scales: {
                x: {
                    stacked: false, // Grouped bars için false
                    ticks: {
                        color: '#a0aec0',
                        maxRotation: 45,
                        minRotation: 45,
                        font: {
                            size: 10
                        }
                    },
                    grid: {
                        display: false
                    }
                },
                y: {
                    stacked: false,
                    beginAtZero: true,
                    max: 5,
                    ticks: {
                        color: '#a0aec0',
                        stepSize: 1,
                        precision: 0,
                        callback: function(value) {
                            return value === 0 ? '' : value;
                        }
                    },
                    grid: {
                        color: 'rgba(255, 255, 255, 0.05)'
                    },
                    title: {
                        display: true,
                        text: 'Öncelik Seviyesi (0-5)',
                        color: '#a0aec0',
                        font: {
                            size: 11,
                            weight: 'normal'
                        },
                        padding: { top: 10, bottom: 5 }
                    }
                }
            }
        }
    });
}

// Update Flood Statistics
async function updateFloodStatistics() {
    try {
        // Get all province risk data
        let response = await fetch(`${API_BASE}/risks/all-averages`);
        let result;
        
        if (response.ok) {
            result = await response.json();
        } else {
            // Fallback: get data for each province
            const allProvinces = provinces.filter(p => 
                ['İstanbul', 'Bursa', 'Kocaeli', 'Sakarya', 'Balıkesir', 'Tekirdağ', 'Çanakkale', 'Yalova', 'Bilecik', 'Edirne', 'Kırklareli'].includes(p.il_adi)
            );
            
            const riskPromises = allProvinces.map(p => 
                fetch(`${API_BASE}/risks/average?il_id=${p.id}`).then(r => r.json())
            );
            const results = await Promise.all(riskPromises);
            const allRisks = results.filter(r => r.success && r.data).map(r => r.data);
            
            // Process data
            processFloodStatistics(allRisks);
            return;
        }
        
        if (result.success && result.data) {
            const allRisks = Array.isArray(result.data) ? result.data : [result.data];
            processFloodStatistics(allRisks);
        }
    } catch (error) {
        console.error('Error updating flood statistics:', error);
    }
}

// Process Flood Statistics
function processFloodStatistics(allRisks) {
    // Calculate total rainfall and statistics
    let totalRainfall = 0;
    let rainfall24h = 0;
    let rainfall7d = 0;
    let highRiskCount = 0;
    let maxRiskProvince = null;
    let maxRisk = 0;
    
    // Get weather data for all provinces (simulated for now)
    allRisks.forEach(risk => {
        const floodRisk = parseFloat(risk.ortalama_sel_riski || 0);
        if (floodRisk > maxRisk) {
            maxRisk = floodRisk;
            maxRiskProvince = risk;
        }
        if (floodRisk >= 60) {
            highRiskCount++;
        }
        
        // Simulated rainfall data (in real app, get from weather API)
        const simulatedRainfall = Math.random() * 50;
        totalRainfall += simulatedRainfall;
        rainfall24h += simulatedRainfall * 0.1;
        rainfall7d += simulatedRainfall * 0.7;
    });
    
    // Update UI
    const floodRainfall = document.getElementById('floodRainfall');
    const floodRainfall24h = document.getElementById('floodRainfall24h');
    const floodRainfall7d = document.getElementById('floodRainfall7d');
    const floodRiskAreas = document.getElementById('floodRiskAreas');
    const floodHighRiskCount = document.getElementById('floodHighRiskCount');
    
    if (floodRainfall) floodRainfall.textContent = totalRainfall.toFixed(1);
    if (floodRainfall24h) floodRainfall24h.textContent = rainfall24h.toFixed(1);
    if (floodRainfall7d) floodRainfall7d.textContent = rainfall7d.toFixed(1);
    if (floodRiskAreas) {
        const province = provinces.find(p => p.id == maxRiskProvince?.il_id);
        floodRiskAreas.textContent = province ? province.il_adi : '-';
    }
    if (floodHighRiskCount) floodHighRiskCount.textContent = highRiskCount;
}

// Load Flood Charts
function loadFloodCharts() {
    if (typeof Chart === 'undefined') return;
    
    // Weekly Rainfall Chart
    const weeklyCtx = document.getElementById('floodWeeklyChart');
    if (weeklyCtx && !floodWeeklyChart) {
        // Generate last 7 days data
        const days = [];
        const rainfall = [];
        for (let i = 6; i >= 0; i--) {
            const date = new Date();
            date.setDate(date.getDate() - i);
            days.push(date.toLocaleDateString('tr-TR', { weekday: 'short', day: 'numeric' }));
            rainfall.push(Math.random() * 30 + 5); // Simulated data
        }
        
        floodWeeklyChart = new Chart(weeklyCtx, {
            type: 'bar',
            data: {
                labels: days,
                datasets: [{
                    label: 'Yağış (mm)',
                    data: rainfall,
                    backgroundColor: 'rgba(52, 152, 219, 0.7)',
                    borderColor: 'rgba(52, 152, 219, 1)',
                    borderWidth: 2
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        display: false
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        ticks: {
                            color: '#aaa'
                        },
                        grid: {
                            color: '#444'
                        }
                    },
                    x: {
                        ticks: {
                            color: '#aaa'
                        },
                        grid: {
                            color: '#444'
                        }
                    }
                }
            }
        });
    }
    
    // Province Rainfall Comparison Chart
    const provinceCtx = document.getElementById('floodProvinceChart');
    if (provinceCtx && !floodProvinceChart) {
        // Get top 5 provinces by flood risk
        const marmaraProvinces = provinces.filter(p => 
            ['İstanbul', 'Bursa', 'Kocaeli', 'Sakarya', 'Balıkesir', 'Tekirdağ', 'Çanakkale', 'Yalova', 'Bilecik', 'Edirne', 'Kırklareli'].includes(p.il_adi)
        );
        
        Promise.all(marmaraProvinces.map(p => 
            fetch(`${API_BASE}/risks/average?il_id=${p.id}`).then(r => r.json())
        ))
            .then(results => {
                const allRisks = results.filter(r => r.success && r.data).map(r => r.data);
                const sortedRisks = allRisks
                    .sort((a, b) => (b.ortalama_sel_riski || 0) - (a.ortalama_sel_riski || 0))
                    .slice(0, 5);
                
                const provinceNames = sortedRisks.map(r => {
                    const p = provinces.find(prov => prov.id == r.il_id);
                    return p ? p.il_adi : 'Bilinmeyen';
                });
                const rainfallData = sortedRisks.map(() => Math.random() * 40 + 10);
                
                floodProvinceChart = new Chart(provinceCtx, {
                    type: 'bar',
                    data: {
                        labels: provinceNames,
                        datasets: [{
                            label: 'Yağış (mm)',
                            data: rainfallData,
                            backgroundColor: 'rgba(231, 76, 60, 0.7)',
                            borderColor: 'rgba(231, 76, 60, 1)',
                            borderWidth: 2
                        }]
                    },
                    options: {
                        responsive: true,
                        maintainAspectRatio: false,
                        plugins: {
                            legend: {
                                display: false
                            }
                        },
                        scales: {
                            y: {
                                beginAtZero: true,
                                ticks: {
                                    color: '#aaa'
                                },
                                grid: {
                                    color: '#444'
                                }
                            },
                            x: {
                                ticks: {
                                    color: '#aaa'
                                },
                                grid: {
                                    color: '#444'
                                }
                            }
                        }
                    }
                });
            })
            .catch(error => console.error('Error loading province chart:', error));
    }
}

// Load Flood Rankings
async function loadFloodRankings() {
    try {
        // Get data for all Marmara provinces
        const marmaraProvinces = provinces.filter(p => 
            ['İstanbul', 'Bursa', 'Kocaeli', 'Sakarya', 'Balıkesir', 'Tekirdağ', 'Çanakkale', 'Yalova', 'Bilecik', 'Edirne', 'Kırklareli'].includes(p.il_adi)
        );
        
        const riskPromises = marmaraProvinces.map(p => 
            fetch(`${API_BASE}/risks/average?il_id=${p.id}`).then(r => r.json())
        );
        const results = await Promise.all(riskPromises);
        const allRisks = results.filter(r => r.success && r.data).map(r => r.data);
        
        if (allRisks && allRisks.length > 0) {
            // Top Rainfall Provinces (simulated rainfall data for now)
            const topRainfall = allRisks
                .map(risk => ({
                    ...risk,
                    rainfall: Math.random() * 50 + 10 // Simulated - can be replaced with real weather data
                }))
                .sort((a, b) => b.rainfall - a.rainfall)
                .slice(0, 5);
            
            const topRainfallContainer = document.getElementById('floodTopRainfallProvinces');
            if (topRainfallContainer) {
                topRainfallContainer.innerHTML = topRainfall.map((risk, index) => {
                    const province = provinces.find(p => p.id == risk.il_id);
                    return `
                        <div class="province-ranking-item">
                            <div style="display: flex; align-items: center;">
                                <span class="province-ranking-rank">${index + 1}</span>
                                <span class="province-ranking-name">${province ? province.il_adi : 'Bilinmeyen'}</span>
                            </div>
                            <span class="province-ranking-value">${risk.rainfall.toFixed(1)} mm</span>
                        </div>
                    `;
                }).join('');
            }
            
            // Top Risk Provinces
            const topRisk = allRisks
                .map(risk => ({
                    ...risk,
                    floodRisk: parseFloat(risk.ortalama_sel_riski || 0)
                }))
                .sort((a, b) => b.floodRisk - a.floodRisk)
                .slice(0, 5);
            
            const topRiskContainer = document.getElementById('floodTopRiskProvinces');
            if (topRiskContainer) {
                topRiskContainer.innerHTML = topRisk.map((risk, index) => {
                    const province = provinces.find(p => p.id == risk.il_id);
                    const riskClass = risk.floodRisk >= 60 ? 'high-risk' : risk.floodRisk >= 30 ? 'medium-risk' : 'low-risk';
                    return `
                        <div class="province-ranking-item ${riskClass}">
                            <div style="display: flex; align-items: center;">
                                <span class="province-ranking-rank">${index + 1}</span>
                                <span class="province-ranking-name">${province ? province.il_adi : 'Bilinmeyen'}</span>
                            </div>
                            <span class="province-ranking-value">${risk.floodRisk.toFixed(1)}</span>
                        </div>
                    `;
                }).join('');
            }
        }
    } catch (error) {
        console.error('Error loading flood rankings:', error);
    }
}

// Load Flood Province Analysis
async function loadFloodProvinceAnalysis(provinceId) {
    if (!provinceId) return;
    
    try {
        const province = provinces.find(p => p.id == provinceId);
        if (!province) return;
        
        // Show analysis container
        const analysisContainer = document.getElementById('floodProvinceAnalysis');
        if (analysisContainer) {
            analysisContainer.style.display = 'block';
            
            // Update province name
            const nameElement = document.getElementById('floodProvinceAnalysisName');
            if (nameElement) nameElement.textContent = province.il_adi;
            
            // Load risk data
            const riskResponse = await fetch(`${API_BASE}/risks/average?il_id=${provinceId}`);
            const riskResult = await riskResponse.json();
            
            if (riskResult.success && riskResult.data) {
                const riskData = riskResult.data;
                const floodRisk = parseFloat(riskData.ortalama_sel_riski || 0);
                
                // Update risk score
                const riskScoreElement = document.getElementById('floodProvinceRiskScore');
                if (riskScoreElement) riskScoreElement.textContent = floodRisk.toFixed(1);
                
                // Update risk level
                const riskLevelElement = document.getElementById('floodProvinceRiskLevel');
                if (riskLevelElement) {
                    let level = 'Düşük';
                    if (floodRisk >= 60) level = 'Yüksek';
                    else if (floodRisk >= 30) level = 'Orta';
                    riskLevelElement.textContent = level;
                }
            }
            
            // Simulated rainfall data
            const rainfall24h = (Math.random() * 20 + 5).toFixed(1);
            const rainfall7d = (Math.random() * 100 + 30).toFixed(1);
            const rainfall30d = (Math.random() * 300 + 100).toFixed(1);
            
            const rainfall24hElement = document.getElementById('floodProvinceRainfall24h');
            const rainfall7dElement = document.getElementById('floodProvinceRainfall7d');
            const rainfall30dElement = document.getElementById('floodProvinceRainfall30d');
            
            if (rainfall24hElement) rainfall24hElement.textContent = rainfall24h;
            if (rainfall7dElement) rainfall7dElement.textContent = rainfall7d;
            if (rainfall30dElement) rainfall30dElement.textContent = rainfall30d;
            
            // Load trend chart
            loadFloodProvinceTrendChart();
        }
        
        // Setup close button
        const closeBtn = document.getElementById('closeFloodAnalysisBtn');
        if (closeBtn) {
            closeBtn.onclick = () => {
                if (analysisContainer) analysisContainer.style.display = 'none';
            };
        }
    } catch (error) {
        console.error('Error loading flood province analysis:', error);
    }
}

// Load Flood Province Trend Chart
function loadFloodProvinceTrendChart() {
    if (typeof Chart === 'undefined') return;
    
    const trendCtx = document.getElementById('floodProvinceTrendChart');
    if (trendCtx && !floodProvinceTrendChart) {
        // Generate last 30 days data
        const days = [];
        const rainfall = [];
        for (let i = 29; i >= 0; i--) {
            const date = new Date();
            date.setDate(date.getDate() - i);
            if (i % 5 === 0 || i === 0) {
                days.push(date.toLocaleDateString('tr-TR', { day: 'numeric', month: 'short' }));
            } else {
                days.push('');
            }
            rainfall.push(Math.random() * 15 + 2);
        }
        
        floodProvinceTrendChart = new Chart(trendCtx, {
            type: 'line',
            data: {
                labels: days,
                datasets: [{
                    label: 'Günlük Yağış (mm)',
                    data: rainfall,
                    borderColor: 'rgba(52, 152, 219, 1)',
                    backgroundColor: 'rgba(52, 152, 219, 0.1)',
                    borderWidth: 2,
                    fill: true,
                    tension: 0.4
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        display: false
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        ticks: {
                            color: '#aaa'
                        },
                        grid: {
                            color: '#444'
                        }
                    },
                    x: {
                        ticks: {
                            color: '#aaa'
                        },
                        grid: {
                            color: '#444'
                        }
                    }
                }
            }
        });
    }
}

// Fire Risk Analysis State
let fireAnalysisData = [];
let fireMap = null;
let fireCountsChart = null;
let fireRiskDistributionChart = null;
let fireCauseChart = null;
let firePreventionChart = null;

// Load Fire Data - Complete Analysis
async function loadFireData() {
    try {
        // Show loading state
        const tableBody = document.getElementById('fireRiskTableBody');
        if (tableBody) {
            tableBody.innerHTML = '<tr><td colspan="6" style="text-align: center; padding: 40px; color: #a0aec0;">Analiz yükleniyor...</td></tr>';
        }

        // Fetch complete analysis
        const response = await fetch(`${API_BASE}/fire-risk/analysis`);
        const result = await response.json();

        if (result.success && result.data) {
            fireAnalysisData = result.data;
            
            // Render all components
            renderFireTable(fireAnalysisData);
            renderFireMap(fireAnalysisData);
            
            // Initialize charts
            initFireCharts(fireAnalysisData);
            
            // Load cause distribution
            loadFireCauseDistribution();
            
            // Load prevention measures
            loadFirePreventionMeasures();
        } else {
            throw new Error(result.message || 'Yangın riski analizi yüklenemedi');
        }
    } catch (error) {
        console.error('Yangın verileri yüklenirken hata:', error);
        const tableBody = document.getElementById('fireRiskTableBody');
        if (tableBody) {
            tableBody.innerHTML = `<tr><td colspan="6" style="text-align: center; padding: 40px; color: #ef4444;">Hata: ${error.message}</td></tr>`;
        }
    }
}

// Render Fire Risk Table
function renderFireTable(data) {
    const tableBody = document.getElementById('fireRiskTableBody');
    if (!tableBody) return;

    if (data.length === 0) {
        tableBody.innerHTML = '<tr><td colspan="6" style="text-align: center; padding: 40px; color: #a0aec0;">Veri bulunamadı</td></tr>';
        return;
    }

    tableBody.innerHTML = data.map(item => {
        const priorityClass = item.is_priority ? 'priority-row' : '';
        return `
            <tr class="${priorityClass}" data-province="${item.il_adi}" data-risk="${item.risk_seviyesi}">
                <td><strong>${item.il_adi}</strong></td>
                <td>${item.toplam_yangin_sayisi}</td>
                <td>${item.toplam_etkilenen_alan.toFixed(2)}</td>
                <td>${item.normalized_score.toFixed(4)}</td>
                <td>
                    <span class="risk-badge ${item.risk_seviyesi}" style="background-color: ${item.risk_color};">${item.risk_label}</span>
                </td>
                <td>
                    ${item.is_priority ? '<span class="priority-badge">⚠️ Öncelikli</span>' : '<span style="color: #718096;">Normal</span>'}
                </td>
            </tr>
        `;
    }).join('');

    // Add search and filter functionality
    setupFireTableFilters();
}

// Setup Fire Table Search and Filter
function setupFireTableFilters() {
    const searchInput = document.getElementById('fireTableSearch');
    const filterSelect = document.getElementById('fireTableFilter');
    
    // Remove existing listeners to avoid duplicates
    const newSearchInput = searchInput?.cloneNode(true);
    const newFilterSelect = filterSelect?.cloneNode(true);
    if (searchInput && searchInput.parentNode) {
        searchInput.parentNode.replaceChild(newSearchInput, searchInput);
        newSearchInput.addEventListener('input', filterFireTable);
    }
    
    if (filterSelect && filterSelect.parentNode) {
        filterSelect.parentNode.replaceChild(newFilterSelect, filterSelect);
        newFilterSelect.addEventListener('change', filterFireTable);
    }
}

function filterFireTable() {
    const searchInput = document.getElementById('fireTableSearch');
    const filterSelect = document.getElementById('fireTableFilter');
    const tableBody = document.getElementById('fireRiskTableBody');
    
    if (!tableBody) return;
    
    const searchTerm = (searchInput?.value || '').toLowerCase();
    const filterValue = filterSelect?.value || 'all';
    
    const rows = tableBody.querySelectorAll('tr');
    rows.forEach(row => {
        const province = (row.dataset.province || '').toLowerCase();
        const riskLevel = row.dataset.risk || '';
        const isPriority = row.classList.contains('priority-row');
        
        const matchesSearch = province.includes(searchTerm);
        const matchesFilter = filterValue === 'all' || 
                            (filterValue === 'priority' && isPriority) ||
                            riskLevel === filterValue;
        
        row.style.display = (matchesSearch && matchesFilter) ? '' : 'none';
    });
}

// Render Fire Map (Choropleth)
function renderFireMap(data) {
    const mapContainer = document.getElementById('fireRiskMap');
    if (!mapContainer) return;

    // Initialize map if not already done
    if (!fireMap) {
        fireMap = L.map('fireRiskMap', {
            center: [40.5, 28.5],
            zoom: 8,
            minZoom: 7,
            maxZoom: 12,
            zoomControl: false,
            attributionControl: false,
            preferCanvas: false
        });
        
        // Force fire-themed dark background (red-tinted dark)
        if (mapContainer) {
            const leafletContainer = mapContainer.querySelector('.leaflet-container');
            if (leafletContainer) {
                leafletContainer.style.background = 'linear-gradient(135deg, #1a1a1a 0%, #2a1a1a 100%)';
            }
            mapContainer.style.background = 'linear-gradient(135deg, #1a1a1a 0%, #2a1a1a 100%)';
        }
    } else {
        fireMap.eachLayer(layer => {
            if (layer instanceof L.GeoJSON) {
                fireMap.removeLayer(layer);
            }
        });
    }

    // Load GeoJSON and color by risk
    loadFireGeoJSON(data);

    // Create legend
    renderFireMapLegend();
}

// Load GeoJSON with risk colors for fire
async function loadFireGeoJSON(analysisData) {
    try {
        const response = await fetch('/marmara_iller.geojson');
        if (!response.ok) return;
        
        const geojsonData = await response.json();
        
        const geoJsonLayer = L.geoJSON(geojsonData, {
            style: function(feature) {
                const provinceName = feature.properties.IlAdi;
                const provinceData = analysisData.find(d => d.il_adi === provinceName);
                
                if (!provinceData) {
                    return {
                        fillColor: '#64748b',
                        fillOpacity: 0.5,
                        color: '#475569',
                        weight: 2
                    };
                }
                
                return {
                    fillColor: provinceData.risk_color,
                    fillOpacity: 0.75,
                    color: '#fff',
                    weight: 2.5
                };
            },
            onEachFeature: function(feature, layer) {
                const provinceName = feature.properties.IlAdi;
                const provinceData = analysisData.find(d => d.il_adi === provinceName);
                
                if (provinceData) {
                    const popupContent = `
                        <div style="padding: 8px;">
                            <h4 style="margin: 0 0 8px 0; color: #1a252f;">${provinceName}</h4>
                            <p style="margin: 4px 0;"><strong>Toplam Yangın:</strong> ${provinceData.toplam_yangin_sayisi}</p>
                            <p style="margin: 4px 0;"><strong>Etkilenen Alan:</strong> ${provinceData.toplam_etkilenen_alan.toFixed(2)} ha</p>
                            <p style="margin: 4px 0;"><strong>Normalize Skor:</strong> ${provinceData.normalized_score.toFixed(4)}</p>
                            <p style="margin: 4px 0;"><strong>Risk Seviyesi:</strong> <span style="color: ${provinceData.risk_color};">${provinceData.risk_label}</span></p>
                            ${provinceData.is_priority ? '<p style="margin: 4px 0; color: #ef4444;"><strong>⚠️ Öncelikli Bölge</strong></p>' : ''}
                        </div>
                    `;
                    
                    // Hover ile popup göster
                    layer.bindPopup(popupContent, {
                        closeOnClick: false,
                        autoClose: false,
                        closeButton: false,
                        className: 'fire-map-popup'
                    });
                    
                    // Mouseover'da popup'ı göster
                    layer.on('mouseover', function(e) {
                        layer.setStyle({
                            weight: 5,
                            color: '#ef4444',
                            dashArray: '',
                            fillOpacity: 0.95
                        });
                        layer.bringToFront();
                        layer.openPopup();
                    });
                    
                    // Mouseout'da popup'ı kapat
                    layer.on('mouseout', function(e) {
                        geoJsonLayer.resetStyle(e.target);
                        e.target.closePopup();
                    });
                }
            }
        }).addTo(fireMap);
        
        fireMap.fitBounds(geoJsonLayer.getBounds());
    } catch (error) {
        console.error('Error loading fire GeoJSON:', error);
    }
}

// Render Fire Map Legend
function renderFireMapLegend() {
    const legendContainer = document.getElementById('fireMapLegend');
    if (!legendContainer) return;

    const riskLevels = [
        { level: 'çok_yüksek', label: 'Çok Yüksek', color: '#dc2626' },
        { level: 'yüksek', label: 'Yüksek', color: '#ef4444' },
        { level: 'orta', label: 'Orta', color: '#f97316' },
        { level: 'düşük', label: 'Düşük', color: '#fbbf24' },
        { level: 'çok_düşük', label: 'Çok Düşük', color: '#fb923c' }
    ];

    legendContainer.innerHTML = riskLevels.map(item => `
        <div class="legend-item">
            <div class="legend-color" style="background-color: ${item.color};"></div>
            <span class="legend-label">${item.label}</span>
        </div>
    `).join('');
}

// Initialize Fire Charts
function initFireCharts(data) {
    if (typeof Chart === 'undefined') {
        console.warn('Chart.js yüklenmedi');
        return;
    }

    // Destroy existing charts if they exist
    if (fireCountsChart) fireCountsChart.destroy();
    if (fireRiskDistributionChart) fireRiskDistributionChart.destroy();
    if (fireCauseChart) fireCauseChart.destroy();
    if (firePreventionChart) firePreventionChart.destroy();

    // Create charts
    createFireCountsChart(data);
    createFireRiskDistributionChart(data);
}

// Load Fire Cause Distribution
async function loadFireCauseDistribution() {
    try {
        const response = await fetch(`${API_BASE}/fire-risk/cause-distribution`);
        const result = await response.json();

        if (result.success && result.data) {
            createFireCauseChart(result.data);
        } else {
            console.error('Yangın nedenleri dağılımı yüklenemedi:', result.message);
        }
    } catch (error) {
        console.error('Yangın nedenleri dağılımı yüklenirken hata:', error);
    }
}

// Chart 3: Yangın Nedenleri Dağılımı (Doughnut Chart)
function createFireCauseChart(causeData) {
    const ctx = document.getElementById('fireCauseChart');
    if (!ctx) return;

    if (!causeData || causeData.length === 0) {
        console.warn('Yangın nedenleri verisi bulunamadı');
        return;
    }

    // İnsan kaynaklı ve doğal olarak ayır
    const humanCauses = causeData.filter(item => item.category === 'insan');
    const naturalCauses = causeData.filter(item => item.category === 'dogal');

    // İnsan kaynaklıları önce göster, sonra doğal
    const sortedData = [...humanCauses, ...naturalCauses];

    const labels = sortedData.map(item => item.neden_label);
    const counts = sortedData.map(item => item.yangin_sayisi);
    const colors = sortedData.map(item => item.color);

    fireCauseChart = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: labels,
            datasets: [{
                data: counts,
                backgroundColor: colors.map(color => color + '80'),
                borderColor: colors,
                borderWidth: 3,
                hoverOffset: 10
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: true,
            plugins: {
                legend: {
                    position: 'bottom',
                    labels: {
                        color: '#a0aec0',
                        padding: 20,
                        font: {
                            size: 13,
                            weight: '500'
                        },
                        generateLabels: function(chart) {
                            const chartData = chart.data;
                            if (chartData.labels.length && chartData.datasets.length) {
                                const dataset = chartData.datasets[0];
                                const total = dataset.data.reduce((a, b) => a + b, 0);
                                return chartData.labels.map((label, i) => {
                                    const value = dataset.data[i];
                                    const percentage = ((value / total) * 100).toFixed(1);
                                    return {
                                        text: `${label}: ${value} yangın (${percentage}%)`,
                                        fillStyle: dataset.backgroundColor[i],
                                        strokeStyle: dataset.borderColor[i],
                                        lineWidth: dataset.borderWidth,
                                        hidden: false,
                                        index: i
                                    };
                                });
                            }
                            return [];
                        }
                    }
                },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            const label = context.label || '';
                            const value = context.parsed || 0;
                            const total = context.dataset.data.reduce((a, b) => a + b, 0);
                            const percentage = ((value / total) * 100).toFixed(1);
                            const dataItem = causeData[context.dataIndex];
                            return [
                                `${label}: ${value} yangın`,
                                `${percentage}% toplam yangının`,
                                `Toplam alan: ${dataItem.toplam_alan.toFixed(2)} ha`,
                                `Ortalama alan: ${dataItem.ortalama_alan.toFixed(2)} ha/yangın`
                            ];
                        }
                    },
                    backgroundColor: 'rgba(0, 0, 0, 0.8)',
                    padding: 12,
                    titleColor: '#fff',
                    bodyColor: '#a0aec0',
                    borderColor: 'rgba(255, 255, 255, 0.1)',
                    borderWidth: 1
                }
            },
            cutout: '60%'
        }
    });
}

// Load Fire Prevention Measures
async function loadFirePreventionMeasures() {
    try {
        const response = await fetch(`${API_BASE}/fire-risk/prevention-measures`);
        const result = await response.json();

        if (result.success && result.data) {
            createFirePreventionChart(result.data);
        } else {
            console.error('Yangın önlemleri yüklenemedi:', result.message);
        }
    } catch (error) {
        console.error('Yangın önlemleri yüklenirken hata:', error);
    }
}

// Chart 4: Alınması Gereken Önlemler (Horizontal Bar Chart)
function createFirePreventionChart(data) {
    const ctx = document.getElementById('firePreventionChart');
    if (!ctx) return;

    if (!data || !data.measuresByProvince || data.measuresByProvince.length === 0) {
        console.warn('Yangın önlemleri verisi bulunamadı');
        return;
    }

    // Önlem tiplerini topla (tüm iller için ortalaması)
    const measureTypes = data.measureTypes || [];
    const measureAverages = {};

    measureTypes.forEach(measure => {
        let totalPriority = 0;
        let count = 0;

        data.measuresByProvince.forEach(province => {
            const measureData = province.measures.find(m => m.measure_id === measure.id);
            if (measureData) {
                totalPriority += measureData.priority;
                count++;
            }
        });

        if (count > 0) {
            measureAverages[measure.id] = {
                name: measure.name,
                averagePriority: totalPriority / count,
                color: measure.color
            };
        }
    });

    // Ortalama önceliğe göre sırala
    const sortedMeasures = Object.entries(measureAverages)
        .map(([id, data]) => ({ id, ...data }))
        .sort((a, b) => b.averagePriority - a.averagePriority);

    const labels = sortedMeasures.map(m => m.name);
    const priorities = sortedMeasures.map(m => parseFloat(m.averagePriority.toFixed(1)));
    const colors = sortedMeasures.map(m => m.color);

    firePreventionChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: labels,
            datasets: [{
                label: 'Öncelik Skoru',
                data: priorities,
                backgroundColor: colors.map(color => color + '80'),
                borderColor: colors,
                borderWidth: 2,
                borderRadius: 6
            }]
        },
        options: {
            indexAxis: 'y', // Horizontal bar chart
            responsive: true,
            maintainAspectRatio: true,
            plugins: {
                legend: {
                    display: false
                },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            return `Öncelik Skoru: ${context.parsed.x}`;
                        },
                        afterBody: function(context) {
                            const measureId = sortedMeasures[context[0].dataIndex].id;
                            const topProvinces = data.measuresByProvince
                                .map(p => ({
                                    name: p.il_adi,
                                    priority: p.measures.find(m => m.measure_id === measureId)?.priority || 0
                                }))
                                .sort((a, b) => b.priority - a.priority)
                                .slice(0, 3);
                            
                            if (topProvinces.length === 0) return '';
                            
                            return [
                                '',
                                'Öncelikli İller:',
                                ...topProvinces.map(p => `  • ${p.name}: ${p.priority.toFixed(1)}`)
                            ];
                        }
                    },
                    backgroundColor: 'rgba(0, 0, 0, 0.8)',
                    padding: 12,
                    titleColor: '#fff',
                    bodyColor: '#a0aec0',
                    borderColor: 'rgba(255, 255, 255, 0.1)',
                    borderWidth: 1
                }
            },
            scales: {
                x: {
                    beginAtZero: true,
                    ticks: {
                        color: '#a0aec0',
                        precision: 1
                    },
                    grid: {
                        color: 'rgba(255, 255, 255, 0.05)'
                    },
                    title: {
                        display: true,
                        text: 'Öncelik Skoru',
                        color: '#a0aec0'
                    }
                },
                y: {
                    ticks: {
                        color: '#a0aec0'
                    },
                    grid: {
                        display: false
                    }
                }
            }
        }
    });
}

// Chart 1: İl Bazında Toplam Yangın Sayıları (Bar Chart)
function createFireCountsChart(data) {
    const ctx = document.getElementById('fireCountsChart');
    if (!ctx) return;

    // Sort by total count (descending)
    const sortedData = [...data].sort((a, b) => b.toplam_yangin_sayisi - a.toplam_yangin_sayisi);
    
    const labels = sortedData.map(item => item.il_adi);
    const counts = sortedData.map(item => item.toplam_yangin_sayisi);
    const colors = sortedData.map(item => item.risk_color);

    fireCountsChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: labels,
            datasets: [{
                label: 'Toplam Yangın Sayısı',
                data: counts,
                backgroundColor: colors.map(color => color + '80'),
                borderColor: colors,
                borderWidth: 2,
                borderRadius: 6
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: true,
            plugins: {
                legend: {
                    display: false
                },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            return `Toplam: ${context.parsed.y} yangın`;
                        }
                    }
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    ticks: {
                        color: '#a0aec0',
                        precision: 0
                    },
                    grid: {
                        color: 'rgba(255, 255, 255, 0.05)'
                    }
                },
                x: {
                    ticks: {
                        color: '#a0aec0',
                        maxRotation: 45,
                        minRotation: 45
                    },
                    grid: {
                        display: false
                    }
                }
            }
        }
    });
}

// Chart 2: Risk Seviyesi Dağılımı (Pie Chart)
function createFireRiskDistributionChart(data) {
    const ctx = document.getElementById('fireRiskDistributionChart');
    if (!ctx) return;

    // Count by risk level
    const riskCounts = {};
    data.forEach(item => {
        const level = item.risk_seviyesi;
        if (!riskCounts[level]) {
            riskCounts[level] = {
                count: 0,
                label: item.risk_label,
                color: item.risk_color
            };
        }
        riskCounts[level].count++;
    });

    const labels = Object.values(riskCounts).map(item => item.label);
    const counts = Object.values(riskCounts).map(item => item.count);
    const colors = Object.values(riskCounts).map(item => item.color);

    fireRiskDistributionChart = new Chart(ctx, {
        type: 'pie',
        data: {
            labels: labels,
            datasets: [{
                data: counts,
                backgroundColor: colors.map(color => color + '80'),
                borderColor: colors,
                borderWidth: 2
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: true,
            plugins: {
                legend: {
                    position: 'bottom',
                    labels: {
                        color: '#a0aec0',
                        padding: 15,
                        font: {
                            size: 12
                        }
                    }
                },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            const label = context.label || '';
                            const value = context.parsed || 0;
                            const total = context.dataset.data.reduce((a, b) => a + b, 0);
                            const percentage = ((value / total) * 100).toFixed(1);
                            return `${label}: ${value} il (${percentage}%)`;
                        }
                    }
                }
            }
        }
    });
}

// Setup Scenario Buttons - Removed (scenario selector UI removed)
function setupScenarioButtons() {
    // Scenario selector UI has been removed from the dashboard
}

// Reload all dashboard data to ensure consistency
async function reloadDashboardData() {
    // Reload emergency info (shows current scenario)
    loadEmergencyInfo();
    
    // Reload dashboard statistics with selected scenario
    await loadDashboardStatistics();
    
    // loadEstimates kaldırıldı - Estimates card kaldırıldı
    
    // Update map colors when scenario changes
    updateMapColors();
}

// Show Section
function showSection(section) {
    dashboardSection.style.display = 'none';
    provincesSection.style.display = 'none';
    risksSection.style.display = 'none';
    earthquakesSection.style.display = 'none';
    liveEarthquakesSection.style.display = 'none';
    weatherSection.style.display = 'none';
    mapSection.style.display = 'none';

    // Canlı deprem otomatik yenilemeyi durdur
    stopLiveEarthquakeRefresh();

    switch(section) {
        case 'dashboard':
            dashboardSection.style.display = 'block';
            loadFloodRiskWarnings();
            // Load comprehensive dashboard data (includes charts)
            loadComprehensiveDashboard();
            // Initialize dashboard map immediately
            initDashboardMap();
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
            // Varsayılan olarak 23-27 Aralık 2025 verilerini yükle
            loadWeatherByDateRange('2025-12-23', '2025-12-27');
            if (selectedProvinceId) {
                loadWeatherData(selectedProvinceId);
            }
            break;
        case 'map':
            mapSection.style.display = 'block';
            // Wait a bit for section to be visible, then init map
            setTimeout(() => {
                initMarmaraMap();
            }, 100);
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
        console.error('Error loading provinces:', error);
        showError('API bağlantı hatası: ' + (error.message || 'Bilinmeyen hata'));
    }
}

// Populate Province Select
function populateProvinceSelect(provinces) {
    if (!provinceSelect) return;
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

    const eqElement = document.getElementById('earthquakeRisk');
    const floodElement = document.getElementById('floodRisk');
    const fireElement = document.getElementById('fireRisk');
    const generalElement = document.getElementById('generalRisk');

    // Update earthquake risk (only if element exists - in earthquake tab)
    if (eqElement) {
        eqElement.textContent = earthquakeRisk;
        updateProgressBar('earthquakeRiskBar', earthquakeRisk, 100);
    }

    // Update flood risk (only if element exists - in flood tab)
    if (floodElement) {
        floodElement.textContent = floodRisk;
        updateProgressBar('floodRiskBar', floodRisk, 100);
    }

    // Update fire risk (only if element exists - in fire tab)
    if (fireElement) {
        fireElement.textContent = fireRisk;
        updateProgressBar('fireRiskBar', fireRisk, 100);
    }

    // General risk might be in multiple places, update if exists
    if (generalElement) {
        generalElement.textContent = generalRisk;
        updateProgressBar('generalRiskBar', generalRisk, 100);
    }
}

// Update Progress Bar
function updateProgressBar(elementId, value, max) {
    const bar = document.getElementById(elementId);
    if (!bar) {
        // Element bulunamadı, sessizce çık (farklı sekmede olabilir)
        return;
    }
    
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
    const eqElement = document.getElementById('earthquakeRisk');
    const floodElement = document.getElementById('floodRisk');
    const fireElement = document.getElementById('fireRisk');
    const generalElement = document.getElementById('generalRisk');

    if (eqElement) eqElement.textContent = '-';
    if (floodElement) floodElement.textContent = '-';
    if (fireElement) fireElement.textContent = '-';
    if (generalElement) generalElement.textContent = '-';
    
    ['earthquakeRiskBar', 'floodRiskBar', 'fireRiskBar', 'generalRiskBar'].forEach(id => {
        const element = document.getElementById(id);
        if (element) {
            element.style.width = '0%';
        }
    });
}

// Update Selected Province Name
function updateSelectedProvinceName() {
    const selectedProvince = provinces.find(p => p.id == selectedProvinceId);
    const element = document.getElementById('selectedProvince');
    if (element) {
        element.textContent = selectedProvince ? selectedProvince.il_adi : '-';
    }
}

// Update Total Provinces
function updateTotalProvinces(count) {
    const element = document.getElementById('totalProvinces');
    if (element) {
        element.textContent = count;
    }
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
    if (loading) loading.style.display = 'flex';
    if (errorDiv) errorDiv.style.display = 'none';
}

function hideLoading() {
    if (loading) loading.style.display = 'none';
}

// Show Error
function showError(message) {
    if (errorDiv) {
    errorDiv.style.display = 'block';
        const errorP = errorDiv.querySelector('p');
        if (errorP) {
            errorP.textContent = message;
        } else {
            errorDiv.textContent = message;
        }
    }
    hideLoading();
}

// ==================== CANLI DEPREM FONKSİYONLARI ====================

// Load Live Earthquakes
async function loadLiveEarthquakes() {
    const listContainer = document.getElementById('liveEarthquakesList');
    const statsContainer = document.getElementById('liveStats');
    
    if (!listContainer) return; // Element yoksa çık
    
    listContainer.innerHTML = '<div class="loading-text">Yükleniyor...</div>';
    if (statsContainer) statsContainer.style.display = 'none';

    try {
        // İstatistikleri yükle
        const statsResponse = await fetch(`${API_BASE}/earthquakes/live/statistics`);
        const statsResult = await statsResponse.json();

        if (statsResult.success && statsResult.data && statsContainer) {
            displayLiveEarthquakeStatistics(statsResult.data);
            statsContainer.style.display = 'grid';
        }

        // Canlı deprem listesini yükle
        const listResponse = await fetch(`${API_BASE}/earthquakes/live?limit=30`);
        const listResult = await listResponse.json();

        if (listResult.success) {
            listContainer.innerHTML = '';

            if (!listResult.data || listResult.data.length === 0) {
                listContainer.innerHTML = '<div class="no-data-message">📭 Son 24 saatte deprem verisi bulunamadı.</div>';
                return;
            }

            displayLiveEarthquakesList(listResult.data);
            updateLastUpdateTime();
        } else {
            listContainer.innerHTML = '<div class="error-message">❌ ' + (listResult.message || 'Canlı deprem verileri yüklenirken hata oluştu') + '</div>';
        }
    } catch (error) {
        if (listContainer) {
            listContainer.innerHTML = '<div class="error-message">❌ Hata: ' + error.message + '</div>';
        }
        updateLiveStatus('Hata', false);
    }
}

// Display Live Earthquake Statistics
function displayLiveEarthquakeStatistics(data) {
    const totalElement = document.getElementById('liveTotalEarthquakes');
    const avgElement = document.getElementById('liveAvgMagnitude');
    const maxElement = document.getElementById('liveMaxMagnitude');

    if (totalElement) totalElement.textContent = data.toplam_deprem || 0;
    if (avgElement) avgElement.textContent = data.ortalama_buyukluk 
        ? parseFloat(data.ortalama_buyukluk).toFixed(2) : '-';
    if (maxElement) maxElement.textContent = data.en_buyuk_deprem 
        ? parseFloat(data.en_buyuk_deprem).toFixed(2) : '-';
}

// Display Live Earthquakes List
function displayLiveEarthquakesList(earthquakes) {
    const listContainer = document.getElementById('liveEarthquakesList');
    if (!listContainer) return;
    
    listContainer.innerHTML = '';

    // Sort by date (newest first)
    const sortedEarthquakes = [...earthquakes].sort((a, b) => {
        return new Date(b.tarih_saat) - new Date(a.tarih_saat);
    });

    sortedEarthquakes.forEach((earthquake) => {
        const item = document.createElement('div');
        item.className = 'live-earthquake-item';
        
        const date = new Date(earthquake.tarih_saat);
        const magnitude = parseFloat(earthquake.buyukluk).toFixed(2);
        const depth = earthquake.derinlik ? parseFloat(earthquake.derinlik).toFixed(1) + ' km' : '-';
        
        // Büyüklüğe göre renk belirle
        let magnitudeClass = 'magnitude-low';
        let magnitudeColor = '#3498db';
        if (magnitude >= 5.0) {
            magnitudeClass = 'magnitude-high';
            magnitudeColor = '#e74c3c';
        } else if (magnitude >= 4.0) {
            magnitudeClass = 'magnitude-medium';
            magnitudeColor = '#f39c12';
        } else if (magnitude >= 3.0) {
            magnitudeClass = 'magnitude-medium-low';
            magnitudeColor = '#e67e22';
        }

        // Ne kadar zaman önce olduğunu hesapla
        const timeAgo = getTimeAgo(date);
        
        // Kaynak bilgisi
        const source = earthquake.kaynak || 'Kandilli';

        item.innerHTML = `
            <div class="live-earthquake-item-content">
                <div class="live-earthquake-magnitude ${magnitudeClass}" style="background: ${magnitudeColor};">
                    <span class="magnitude-value">${magnitude}</span>
                </div>
                <div class="live-earthquake-main">
                    <div class="live-earthquake-header">
                        <h4 class="live-earthquake-location">${earthquake.il_adi}${earthquake.ilce_adi ? ', ' + earthquake.ilce_adi : ''}</h4>
                <div class="live-badge">
                    <span class="live-badge-dot"></span>
                    CANLI
                </div>
            </div>
            <div class="live-earthquake-details">
                        <div class="live-detail-item">
                            <span class="detail-icon">⏰</span>
                            <span class="detail-text">${date.toLocaleDateString('tr-TR', { 
                                day: '2-digit',
                                month: 'short',
                                year: 'numeric',
                                hour: '2-digit',
                                minute: '2-digit'
                            })}</span>
                            <span class="time-ago">${timeAgo}</span>
                </div>
                        <div class="live-detail-item">
                            <span class="detail-icon">📍</span>
                            <span class="detail-text">${depth}</span>
                </div>
                        <div class="live-detail-item">
                            <span class="detail-icon">📡</span>
                            <span class="detail-text">${source}</span>
                        </div>
                    </div>
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
    const element = document.getElementById('liveLastUpdate');
    if (element) {
        element.textContent = now.toLocaleTimeString('tr-TR');
    }
}

// Update Live Status
function updateLiveStatus(status, isLive) {
    const statusElement = document.getElementById('liveStatus');
    const dotElement = document.querySelector('.live-dot');
    
    if (statusElement) statusElement.textContent = status;
    if (dotElement) {
    if (isLive) {
        dotElement.classList.add('pulsing');
    } else {
        dotElement.classList.remove('pulsing');
        }
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

    // Load date range button
    // Tarih seçici kutucukları kaldırıldı

    // AFAD fetch button
    const fetchAFADBtn = document.getElementById('fetchAFADBtn');
    if (fetchAFADBtn) {
        fetchAFADBtn.addEventListener('click', async () => {
            const originalText = fetchAFADBtn.textContent;
            fetchAFADBtn.disabled = true;
            fetchAFADBtn.textContent = '⏳ Çekiliyor...';
            
            try {
                const response = await fetch(`${API_BASE}/earthquakes/fetch`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    }
                });
                
                const result = await response.json();
                
                if (result.success) {
                    fetchAFADBtn.textContent = '✅ Başarılı!';
                    fetchAFADBtn.style.background = 'linear-gradient(135deg, #2ecc71 0%, #27ae60 100%)';
                    
                    // Canlı deprem listesini yenile
                    setTimeout(() => {
                        loadLiveEarthquakes();
                        fetchAFADBtn.textContent = originalText;
                        fetchAFADBtn.style.background = 'linear-gradient(135deg, #e74c3c 0%, #c0392b 100%)';
                        fetchAFADBtn.disabled = false;
                    }, 2000);
                    
                    // Başarı mesajı göster
                    if (result.data) {
                        console.log(`✅ AFAD: ${result.data.afad.count}, Kandilli: ${result.data.kandilli.count}, Toplam: ${result.data.total}, Kaydedilen: ${result.data.saved}`);
                    }
                } else {
                    fetchAFADBtn.textContent = '❌ Hata!';
                    fetchAFADBtn.style.background = 'linear-gradient(135deg, #e74c3c 0%, #c0392b 100%)';
                    setTimeout(() => {
                        fetchAFADBtn.textContent = originalText;
                        fetchAFADBtn.disabled = false;
                    }, 2000);
                    alert('AFAD verileri çekilirken hata: ' + (result.message || 'Bilinmeyen hata'));
                }
            } catch (error) {
                fetchAFADBtn.textContent = '❌ Hata!';
                fetchAFADBtn.style.background = 'linear-gradient(135deg, #e74c3c 0%, #c0392b 100%)';
                setTimeout(() => {
                    fetchAFADBtn.textContent = originalText;
                    fetchAFADBtn.disabled = false;
                }, 2000);
                alert('AFAD verileri çekilirken hata: ' + error.message);
            }
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
    const totalElement = document.getElementById('totalEarthquakes');
    const avgElement = document.getElementById('avgMagnitude');
    const maxElement = document.getElementById('maxMagnitude');
    const lastElement = document.getElementById('lastEarthquake');

    if (totalElement) totalElement.textContent = data.toplam_deprem || 0;
    if (avgElement) avgElement.textContent = data.ortalama_buyukluk 
        ? parseFloat(data.ortalama_buyukluk).toFixed(2) : '-';
    if (maxElement) maxElement.textContent = data.en_buyuk_deprem 
        ? parseFloat(data.en_buyuk_deprem).toFixed(2) : '-';
    
    if (lastElement) {
    if (data.son_deprem) {
        const lastDate = new Date(data.son_deprem);
            lastElement.textContent = lastDate.toLocaleDateString('tr-TR');
    } else {
            lastElement.textContent = '-';
        }
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
        // Get forecast data for next 7 days for all provinces
        const response = await fetch(`${API_BASE}/weather/all-forecast`);
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

// Load Weather by Date Range
async function loadWeatherByDateRange(startDate, endDate) {
    const listContainer = document.getElementById('allProvincesWeatherList');
    const container = document.getElementById('allProvincesWeather');
    
    if (!listContainer || !container) return;
    
    listContainer.innerHTML = '<p>Yükleniyor...</p>';
    container.style.display = 'block';

    try {
        // Get weather data for specified date range
        const response = await fetch(`${API_BASE}/weather/date-range?startDate=${startDate}&endDate=${endDate}`);
        const result = await response.json();

        if (result.success) {
            listContainer.innerHTML = '';

            if (result.data.length === 0) {
                listContainer.innerHTML = `
                    <p class="no-data">${startDate} - ${endDate} tarihleri için hava durumu verisi bulunamadı.</p>
                    <p style="margin-top: 10px; color: #888; font-size: 14px;">
                        💡 Bu tarihler için veri görmek için önce API'den veri çekmeniz gerekiyor.
                    </p>
                `;
                return;
            }

            // Başlık kaldırıldı

            displayAllProvincesWeatherList(result.data);
        } else {
            let errorMessage = result.message || 'Hava durumu verileri yüklenirken hata oluştu';
            if (result.error) {
                errorMessage += '<br><small style="color: #999;">Detay: ' + result.error + '</small>';
            }
            listContainer.innerHTML = '<p class="error-text">' + errorMessage + '</p>';
        }
    } catch (error) {
        listContainer.innerHTML = '<p class="error-text">Bağlantı hatası: ' + error.message + '</p>';
    }
}

// Display All Provinces Weather List - Table format (cities as rows, days as columns)
function displayAllProvincesWeatherList(weatherData) {
    const listContainer = document.getElementById('allProvincesWeatherList');
    listContainer.innerHTML = '';

    // Group weather data by province
    const groupedByProvince = {};
    weatherData.forEach(weather => {
        const provinceName = weather.il_adi;
        if (!groupedByProvince[provinceName]) {
            groupedByProvince[provinceName] = [];
        }
        groupedByProvince[provinceName].push(weather);
    });

    // Sort provinces alphabetically
    const sortedProvinces = Object.keys(groupedByProvince).sort();

    // Collect all unique days from all provinces
    const allDays = new Set();
    sortedProvinces.forEach(provinceName => {
        const provinceData = groupedByProvince[provinceName];
        provinceData.forEach(weather => {
            if (weather.tarih_saat) {
                let date;
                if (typeof weather.tarih_saat === 'string') {
                    date = new Date(weather.tarih_saat.replace(' ', 'T'));
                } else {
                    date = new Date(weather.tarih_saat);
                }
                if (!isNaN(date.getTime())) {
                    const year = date.getFullYear();
                    const month = String(date.getMonth() + 1).padStart(2, '0');
                    const day = String(date.getDate()).padStart(2, '0');
                    const dateKey = `${year}-${month}-${day}`;
                    allDays.add(dateKey);
                }
            }
        });
    });

    // Sort days
    const sortedDays = Array.from(allDays).sort().slice(0, 5); // Show max 5 days

    // Create table
    const table = document.createElement('table');
    table.className = 'weather-forecast-table';

    // Create header row
    const thead = document.createElement('thead');
    const headerRow = document.createElement('tr');
    
    // First cell (empty for province names)
    const emptyHeader = document.createElement('th');
    emptyHeader.className = 'weather-table-province-header';
    headerRow.appendChild(emptyHeader);

    // Day headers
    sortedDays.forEach(dateKey => {
        const dateParts = dateKey.split('-');
        const date = new Date(parseInt(dateParts[0]), parseInt(dateParts[1]) - 1, parseInt(dateParts[2]));
        const dayName = date.toLocaleDateString('tr-TR', { weekday: 'long' });
        const dayNumber = date.getDate();
        const monthName = date.toLocaleDateString('tr-TR', { month: 'long' });
        
        const dayHeader = document.createElement('th');
        dayHeader.className = 'weather-table-day-header';
        dayHeader.innerHTML = `
            <div class="day-name">${dayName}</div>
            <div class="day-date">${dayNumber} ${monthName}</div>
        `;
        headerRow.appendChild(dayHeader);
    });

    thead.appendChild(headerRow);
    table.appendChild(thead);

    // Create body
    const tbody = document.createElement('tbody');

    // Create rows for each province
    sortedProvinces.forEach(provinceName => {
        const provinceData = groupedByProvince[provinceName];
        
        // Group province data by day
        const groupedByDay = {};
        provinceData.forEach(weather => {
            if (weather.tarih_saat) {
                let date;
                if (typeof weather.tarih_saat === 'string') {
                    date = new Date(weather.tarih_saat.replace(' ', 'T'));
                } else {
                    date = new Date(weather.tarih_saat);
                }
                if (!isNaN(date.getTime())) {
                    const year = date.getFullYear();
                    const month = String(date.getMonth() + 1).padStart(2, '0');
                    const day = String(date.getDate()).padStart(2, '0');
                    const dateKey = `${year}-${month}-${day}`;
                    
                    if (!groupedByDay[dateKey]) {
                        groupedByDay[dateKey] = [];
                    }
                    groupedByDay[dateKey].push(weather);
                }
            }
        });

        // Create row
        const row = document.createElement('tr');
        row.className = 'weather-table-row';

        // Province name cell
        const provinceCell = document.createElement('td');
        provinceCell.className = 'weather-table-province';
        provinceCell.textContent = provinceName;
        row.appendChild(provinceCell);

        // Day cells
        sortedDays.forEach(dateKey => {
            const dayCell = document.createElement('td');
            dayCell.className = 'weather-table-day-cell';

            const dayData = groupedByDay[dateKey];
            if (dayData && dayData.length > 0) {
                // Calculate min/max temperatures for the day
                const temps = dayData.map(w => parseFloat(w.sicaklik) || 0);
                const minTemp = Math.min(...temps);
                const maxTemp = Math.max(...temps);
                
                // Calculate total rainfall for the day
                const totalRainfall = dayData.reduce((sum, w) => sum + (parseFloat(w.yagis_miktari) || 0), 0);
                
                // Get all conditions and find the most common one
                const conditions = dayData.map(w => w.hava_durumu || 'Açık');
                const conditionCounts = {};
                conditions.forEach(cond => {
                    conditionCounts[cond] = (conditionCounts[cond] || 0) + 1;
                });
                
                // Find most common condition
                let mostCommonCondition = conditions[0];
                let maxCount = 0;
                for (const [cond, count] of Object.entries(conditionCounts)) {
                    if (count > maxCount) {
                        maxCount = count;
                        mostCommonCondition = cond;
                    }
                }
                
                const condition = mostCommonCondition;
                
                // Get weather icon based on condition and rainfall
                let weatherIcon = '☀️';
                const conditionLower = condition.toLowerCase();
                
                // Priority: rain > snow > thunderstorm > clouds > clear
                // Yağış eşiğini düşürdük: 0.1mm'den fazla yağış varsa yağmurlu göster
                if (totalRainfall > 0.1 || conditionLower.includes('yağmur') || conditionLower.includes('yağış') || conditionLower.includes('sağanak') || conditionLower.includes('drizzle') || conditionLower.includes('hafif yağmur') || conditionLower.includes('orta şiddetli yağmur')) {
                    weatherIcon = '🌧️';
                } else if (conditionLower.includes('kar') || conditionLower.includes('snow') || conditionLower.includes('sleet')) {
                    weatherIcon = '❄️';
                } else if (conditionLower.includes('fırtına') || conditionLower.includes('thunder')) {
                    weatherIcon = '⛈️';
                } else if (conditionLower.includes('kapalı') || conditionLower.includes('çok bulutlu') || conditionLower.includes('broken clouds') || conditionLower.includes('overcast')) {
                    weatherIcon = '☁️';
                } else if (conditionLower.includes('parçalı') || conditionLower.includes('scattered') || conditionLower.includes('az bulutlu') || conditionLower.includes('few clouds')) {
                    weatherIcon = '⛅';
                } else if (conditionLower.includes('sis') || conditionLower.includes('mist') || conditionLower.includes('fog') || conditionLower.includes('haze')) {
                    weatherIcon = '🌫️';
                } else {
                    weatherIcon = '☀️';
                }

                dayCell.innerHTML = `
                    <div class="weather-cell-content">
                        <div class="weather-icon">${weatherIcon}</div>
                        <div class="weather-temps">
                            <span class="temp-high">${Math.round(maxTemp)}</span>
                            <span class="temp-separator">/</span>
                            <span class="temp-low">${Math.round(minTemp)}</span>
                        </div>
                    </div>
                `;
            } else {
                dayCell.innerHTML = '<div class="weather-cell-content">-</div>';
            }

            row.appendChild(dayCell);
        });

        tbody.appendChild(row);
    });

    table.appendChild(tbody);
    listContainer.appendChild(table);
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
    const tempElement = document.getElementById('avgTemperature');
    const humidityElement = document.getElementById('avgHumidity');
    const windElement = document.getElementById('avgWindSpeed');
    const rainElement = document.getElementById('totalRainfall');

    if (tempElement) tempElement.textContent = data.ortalama_sicaklik 
        ? parseFloat(data.ortalama_sicaklik).toFixed(1) + '°C' : '-';
    if (humidityElement) humidityElement.textContent = data.ortalama_nem 
        ? parseFloat(data.ortalama_nem).toFixed(0) + '%' : '-';
    if (windElement) windElement.textContent = data.ortalama_ruzgar 
        ? parseFloat(data.ortalama_ruzgar).toFixed(1) + ' km/s' : '-';
    if (rainElement) rainElement.textContent = data.toplam_yagis 
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

// Initialize Dashboard Map with GeoJSON - INSTANT
async function initDashboardMap() {
    // Check if Leaflet is loaded - should be in head
    if (typeof L === 'undefined') {
        // Try once more on next frame
        requestAnimationFrame(() => {
            if (typeof L !== 'undefined') {
                initDashboardMap();
            }
        });
        return;
    }

    // Check if map container exists
    const mapContainer = document.getElementById('dashboardMarmaraMap');
    if (!mapContainer) {
        return;
    }

    // Remove existing dashboard map if it exists
    if (dashboardMarmaraMap) {
        dashboardMarmaraMap.remove();
        dashboardMarmaraMap = null;
        dashboardProvinceLayers = {};
    }

    // Ensure provinces are loaded - do it in parallel, don't wait
    if (!provinces || provinces.length === 0) {
        loadProvinces(); // Don't await - load in background
    }

    // Create map centered on Marmara Region
    dashboardMarmaraMap = L.map('dashboardMarmaraMap', {
        center: [40.5, 28.5],
        zoom: 8,
        minZoom: 7,
        maxZoom: 12
    });

    // Tile layer removed - only showing GeoJSON polygons
    // Harita sadece il sınırlarını gösterecek, arka plan haritası yok

    // Load GeoJSON and display provinces
    loadDashboardGeoJSON();

    // Resize map immediately - NO DELAY
    requestAnimationFrame(() => {
        if (dashboardMarmaraMap) {
            dashboardMarmaraMap.invalidateSize();
        }
    });
}

// Get color based on risk score
function getRiskColor(riskScore) {
    if (!riskScore || riskScore === 0) return '#95a5a6'; // Gray for no data
    if (riskScore < 30) return '#2ecc71'; // Green - Low risk
    if (riskScore < 60) return '#f39c12'; // Orange - Medium risk
    if (riskScore < 80) return '#e67e22'; // Dark orange - High risk
    return '#e74c3c'; // Red - Very high risk
}

// Get risk score for current disaster type
function getCurrentRiskScore(riskData) {
    if (!riskData) return 0;
    
    switch(currentDisasterType) {
        case 'earthquake':
            return parseFloat(riskData.earthquake || 0);
        case 'flood':
            return parseFloat(riskData.flood || 0);
        case 'fire':
            return parseFloat(riskData.fire || 0);
        default:
            return parseFloat(riskData.earthquake || 0);
    }
}

// Load and display Marmara provinces from GeoJSON for Dashboard - INSTANT
async function loadDashboardGeoJSON() {
    try {
        // Fetch GeoJSON file immediately - NO DELAYS, NO LOGS
        const response = await fetch('/marmara_iller.geojson');
        if (!response.ok) {
            throw new Error(`Failed to load GeoJSON: ${response.statusText}`);
        }
        
        const geojsonData = await response.json();
        console.log('✅ GeoJSON loaded successfully', geojsonData);

        // Load risk data for all provinces
        await loadAllProvinceRiskData();

        // Default style function - will be updated with risk colors
        const getDefaultStyle = (provinceName) => {
            const riskData = provinceRiskData[provinceName];
            const riskScore = getCurrentRiskScore(riskData);
            const riskColor = getRiskColor(riskScore);
            
            return {
                fillColor: riskColor,
                fillOpacity: 0.7,
                color: '#444',
                weight: 2,
                opacity: 1
            };
        };

        // Hover style
        const hoverStyle = {
            fillOpacity: 0.9,
            weight: 3,
            opacity: 1
        };

        // Create GeoJSON layer with custom styling
        const geoJsonLayer = L.geoJSON(geojsonData, {
            style: function(feature) {
                return getDefaultStyle(feature.properties.IlAdi);
            },
            onEachFeature: function(feature, layer) {
                const provinceName = feature.properties.IlAdi;
                
                // Store layer reference
                dashboardProvinceLayers[provinceName] = layer;

                // Store label marker reference for this layer
                let labelMarker = null;

                // Hover effect
                layer.on({
                    mouseover: function(e) {
                        const layer = e.target;
                        const currentStyle = layer.options;
                        layer.setStyle({
                            ...currentStyle,
                            ...hoverStyle
                        });
                        layer.bringToFront();
                        
                        // Show province name label on hover
                        if (layer.getBounds && !labelMarker) {
                            const bounds = layer.getBounds();
                            const center = bounds.getCenter();
                            
                            // Calculate text width dynamically
                            const textWidth = provinceName.length * 8 + 20;
                            
                            // Create label marker
                            const labelIcon = L.divIcon({
                                className: 'province-label',
                                html: `<div class="province-label-text">${provinceName}</div>`,
                                iconSize: [textWidth, 24],
                                iconAnchor: [textWidth / 2, 12]
                            });
                            
                            labelMarker = L.marker(center, {
                                icon: labelIcon,
                                interactive: false,
                                zIndexOffset: 1000,
                                keyboard: false
                            }).addTo(dashboardMarmaraMap);
                        }
                    },
                    mouseout: function(e) {
                        const layer = e.target;
                        const provinceName = feature.properties.IlAdi;
                        layer.setStyle(getDefaultStyle(provinceName));
                        
                        // Remove label marker on mouseout
                        if (labelMarker) {
                            dashboardMarmaraMap.removeLayer(labelMarker);
                            labelMarker = null;
                        }
                    }
                });

                // Click event - show modal with province details
                layer.on('click', async function(e) {
                    const layer = e.target;
                    const provinceName = feature.properties.IlAdi;
                    
                    // Seçili ili güncelle ve haritada vurgula
                    selectedProvinceForMap = provinceName;
                    updateMapProvinceStyles();
                    
                    // Find province in dropdown and select it
                    const province = provinces.find(p => p.il_adi === provinceName);
                    if (province && provinceSelect) {
                        provinceSelect.value = province.id;
                        selectedProvinceId = province.id;
                        
                        // Trigger change event to update dashboard
                        const changeEvent = new Event('change', { bubbles: true });
                        provinceSelect.dispatchEvent(changeEvent);
                    }
                    
                    // Modal'ı göster (loading state)
                    showProvinceModal(provinceName, null);

                    // Fetch risk data for this province
                    try {
                        const riskData = await fetchProvinceRiskData(provinceName);
                        
                        // Modal içeriğini güncelle
                        showProvinceModal(provinceName, riskData);
                    } catch (error) {
                        console.error('Error fetching risk data:', error);
                        showProvinceModal(provinceName, null, error);
                    }
                });
            }
        }).addTo(dashboardMarmaraMap);

        // Fit map to show all provinces
        dashboardMarmaraMap.fitBounds(geoJsonLayer.getBounds().pad(0.1));
        
        console.log('✅ Marmara provinces displayed on dashboard map');
    } catch (error) {
        console.error('❌ Error loading GeoJSON:', error);
    }
}

// Get color based on risk score
function getRiskColor(riskScore) {
    if (!riskScore || riskScore === 0) return '#95a5a6'; // Gray for no data
    if (riskScore < 30) return '#2ecc71'; // Green - Low risk
    if (riskScore < 60) return '#f39c12'; // Orange - Medium risk
    if (riskScore < 80) return '#e67e22'; // Dark orange - High risk
    return '#e74c3c'; // Red - Very high risk
}

// Get risk score for current disaster type
function getCurrentRiskScore(riskData) {
    if (!riskData) return 0;
    
    switch(currentDisasterType) {
        case 'earthquake':
            return parseFloat(riskData.earthquake || 0);
        case 'flood':
            return parseFloat(riskData.flood || 0);
        case 'fire':
            return parseFloat(riskData.fire || 0);
        default:
            return parseFloat(riskData.earthquake || 0);
    }
}

// Load risk data for all provinces
async function loadAllProvinceRiskData() {
    if (!provinces || provinces.length === 0) {
        await loadProvinces();
    }
    
    // Load risk data for all Marmara provinces in parallel
    const marmaraProvinces = ['İstanbul', 'Bursa', 'Kocaeli', 'Sakarya', 'Balıkesir', 'Tekirdağ', 'Çanakkale', 'Yalova', 'Bilecik', 'Edirne', 'Kırklareli'];
    
    const riskPromises = marmaraProvinces.map(async (provinceName) => {
        try {
            const riskData = await fetchProvinceRiskData(provinceName);
            provinceRiskData[provinceName] = riskData;
        } catch (error) {
            console.warn(`Failed to load risk data for ${provinceName}:`, error);
            provinceRiskData[provinceName] = { earthquake: 0, flood: 0, fire: 0 };
        }
    });
    
    await Promise.all(riskPromises);
    console.log('✅ All province risk data loaded');
}

// Update map colors based on current disaster type
function updateMapColors() {
    if (!dashboardMarmaraMap || !dashboardProvinceLayers) return;
    
    Object.keys(dashboardProvinceLayers).forEach(provinceName => {
        const layer = dashboardProvinceLayers[provinceName];
        if (layer) {
            const riskData = provinceRiskData[provinceName];
            const riskScore = getCurrentRiskScore(riskData);
            const riskColor = getRiskColor(riskScore);
            
            // Don't update if this is the selected province (keep highlight)
            const province = provinces.find(p => p.il_adi === provinceName);
            const isSelected = province && selectedProvinceId && province.id == selectedProvinceId;
            
            if (!isSelected) {
                layer.setStyle({
                    fillColor: riskColor,
                    fillOpacity: 0.7,
                    color: '#444',
                    weight: 2,
                    opacity: 1
                });
            }
        }
    });
}

// Tüm il stillerini güncelle (seçili il vurgulaması için)
function updateMapProvinceStyles() {
    if (!dashboardMarmaraMap || !dashboardProvinceLayers) return;
    
    Object.keys(dashboardProvinceLayers).forEach(provinceName => {
        const layer = dashboardProvinceLayers[provinceName];
        if (layer) {
            const riskData = provinceRiskData[provinceName];
            const riskScore = getCurrentRiskScore(riskData);
            const riskColor = getRiskColor(riskScore);
            
            const isSelected = selectedProvinceForMap === provinceName;
            
            layer.setStyle({
                fillColor: riskColor,
                fillOpacity: isSelected ? 0.9 : (selectedProvinceForMap && selectedProvinceForMap !== provinceName ? 0.5 : 0.7),
                color: isSelected ? '#fff' : '#444',
                weight: isSelected ? 4 : 2,
                opacity: isSelected ? 1 : (selectedProvinceForMap && selectedProvinceForMap !== provinceName ? 0.6 : 1)
            });
        }
    });
}

// İl bazlı senaryo değişkeni (modal için)
let provinceModalScenario = '6.5-7.0';

// İl bazlı deprem sonuç verileri (gerçek veriler)
const provinceEarthquakeData = {
    'İstanbul': {
        6.0: { dead: 0, injured: 900, duration: 10 },
        6.5: { dead: 300, injured: 2200, duration: 18 },
        7.0: { dead: 4200, injured: 16000, duration: 32 },
        7.5: { dead: 11000, injured: 42000, duration: 55 }
    },
    'Kocaeli': {
        6.0: { dead: 0, injured: 300, duration: 9 },
        6.5: { dead: 120, injured: 900, duration: 16 },
        7.0: { dead: 1600, injured: 6000, duration: 30 },
        7.5: { dead: 4200, injured: 15000, duration: 50 }
    },
    'Bursa': {
        6.0: { dead: 0, injured: 350, duration: 9 },
        6.5: { dead: 150, injured: 1100, duration: 16 },
        7.0: { dead: 1800, injured: 7200, duration: 30 },
        7.5: { dead: 4800, injured: 18000, duration: 50 }
    },
    'Sakarya': {
        6.0: { dead: 0, injured: 260, duration: 8 },
        6.5: { dead: 110, injured: 850, duration: 15 },
        7.0: { dead: 1500, injured: 5800, duration: 28 },
        7.5: { dead: 4000, injured: 14000, duration: 48 }
    },
    'Tekirdağ': {
        6.0: { dead: 0, injured: 200, duration: 7 },
        6.5: { dead: 90, injured: 700, duration: 14 },
        7.0: { dead: 1200, injured: 4300, duration: 26 },
        7.5: { dead: 3300, injured: 11000, duration: 45 }
    },
    'Balıkesir': {
        6.0: { dead: 0, injured: 150, duration: 7 },
        6.5: { dead: 60, injured: 400, duration: 14 },
        7.0: { dead: 900, injured: 3000, duration: 26 },
        7.5: { dead: 2600, injured: 8500, duration: 45 }
    },
    'Çanakkale': {
        6.0: { dead: 0, injured: 130, duration: 7 },
        6.5: { dead: 70, injured: 450, duration: 14 },
        7.0: { dead: 850, injured: 2800, duration: 26 },
        7.5: { dead: 2400, injured: 7800, duration: 45 }
    },
    'Yalova': {
        6.0: { dead: 0, injured: 160, duration: 8 },
        6.5: { dead: 100, injured: 600, duration: 15 },
        7.0: { dead: 1100, injured: 3900, duration: 28 },
        7.5: { dead: 3000, injured: 9800, duration: 48 }
    },
    'Kırklareli': {
        6.0: { dead: 0, injured: 90, duration: 6 },
        6.5: { dead: 40, injured: 300, duration: 12 },
        7.0: { dead: 650, injured: 2100, duration: 24 },
        7.5: { dead: 1900, injured: 6000, duration: 42 }
    },
    'Edirne': {
        6.0: { dead: 0, injured: 80, duration: 6 },
        6.5: { dead: 35, injured: 280, duration: 12 },
        7.0: { dead: 520, injured: 1800, duration: 24 },
        7.5: { dead: 1600, injured: 5200, duration: 42 }
    },
    'Bilecik': {
        6.0: { dead: 0, injured: 100, duration: 7 },
        6.5: { dead: 45, injured: 320, duration: 13 },
        7.0: { dead: 700, injured: 2400, duration: 25 },
        7.5: { dead: 2100, injured: 6500, duration: 44 }
    }
};

// İl bazlı kaynak verileri (deprem büyüklüğüne göre arama-kurtarma, barınma, sağlık, iletişim)
const provinceResourceData = {
    'İstanbul': {
        6.0: { searchRescue: 1, shelter: 2, medical: 6, communication: 1 },
        6.5: { searchRescue: 3, shelter: 5, medical: 15, communication: 2 },
        7.0: { searchRescue: 16, shelter: 32, medical: 107, communication: 11 },
        7.5: { searchRescue: 42, shelter: 84, medical: 280, communication: 28 }
    },
    'Kocaeli': {
        6.0: { searchRescue: 1, shelter: 1, medical: 2, communication: 1 },
        6.5: { searchRescue: 1, shelter: 2, medical: 6, communication: 1 },
        7.0: { searchRescue: 6, shelter: 12, medical: 40, communication: 4 },
        7.5: { searchRescue: 15, shelter: 30, medical: 100, communication: 10 }
    },
    'Bursa': {
        6.0: { searchRescue: 1, shelter: 1, medical: 3, communication: 1 },
        6.5: { searchRescue: 2, shelter: 3, medical: 8, communication: 2 },
        7.0: { searchRescue: 8, shelter: 15, medical: 48, communication: 6 },
        7.5: { searchRescue: 18, shelter: 36, medical: 120, communication: 12 }
    },
    'Sakarya': {
        6.0: { searchRescue: 1, shelter: 1, medical: 2, communication: 1 },
        6.5: { searchRescue: 1, shelter: 2, medical: 6, communication: 1 },
        7.0: { searchRescue: 6, shelter: 12, medical: 39, communication: 4 },
        7.5: { searchRescue: 14, shelter: 28, medical: 94, communication: 10 }
    },
    'Tekirdağ': {
        6.0: { searchRescue: 1, shelter: 1, medical: 2, communication: 1 },
        6.5: { searchRescue: 1, shelter: 2, medical: 5, communication: 1 },
        7.0: { searchRescue: 5, shelter: 9, medical: 29, communication: 4 },
        7.5: { searchRescue: 11, shelter: 22, medical: 74, communication: 8 }
    },
    'Balıkesir': {
        6.0: { searchRescue: 1, shelter: 1, medical: 1, communication: 1 },
        6.5: { searchRescue: 1, shelter: 1, medical: 3, communication: 1 },
        7.0: { searchRescue: 3, shelter: 6, medical: 20, communication: 2 },
        7.5: { searchRescue: 9, shelter: 17, medical: 57, communication: 6 }
    },
    'Çanakkale': {
        6.0: { searchRescue: 1, shelter: 1, medical: 1, communication: 1 },
        6.5: { searchRescue: 1, shelter: 1, medical: 3, communication: 1 },
        7.0: { searchRescue: 3, shelter: 6, medical: 19, communication: 2 },
        7.5: { searchRescue: 8, shelter: 16, medical: 52, communication: 6 }
    },
    'Yalova': {
        6.0: { searchRescue: 1, shelter: 1, medical: 2, communication: 1 },
        6.5: { searchRescue: 1, shelter: 2, medical: 4, communication: 1 },
        7.0: { searchRescue: 4, shelter: 8, medical: 26, communication: 3 },
        7.5: { searchRescue: 10, shelter: 20, medical: 66, communication: 7 }
    },
    'Kırklareli': {
        6.0: { searchRescue: 1, shelter: 1, medical: 1, communication: 1 },
        6.5: { searchRescue: 1, shelter: 1, medical: 2, communication: 1 },
        7.0: { searchRescue: 3, shelter: 5, medical: 14, communication: 2 },
        7.5: { searchRescue: 6, shelter: 12, medical: 40, communication: 4 }
    },
    'Edirne': {
        6.0: { searchRescue: 1, shelter: 1, medical: 1, communication: 1 },
        6.5: { searchRescue: 1, shelter: 1, medical: 2, communication: 1 },
        7.0: { searchRescue: 2, shelter: 4, medical: 12, communication: 2 },
        7.5: { searchRescue: 6, shelter: 11, medical: 35, communication: 4 }
    },
    'Bilecik': {
        6.0: { searchRescue: 1, shelter: 1, medical: 1, communication: 1 },
        6.5: { searchRescue: 1, shelter: 1, medical: 3, communication: 1 },
        7.0: { searchRescue: 3, shelter: 5, medical: 16, communication: 2 },
        7.5: { searchRescue: 7, shelter: 13, medical: 44, communication: 5 }
    }
};

// Senaryoya göre sonuçları hesapla (il nüfusuna göre)
function calculateProvinceImpact(provinceName, scenario, depremRiski) {
    const province = provinces.find(p => p.il_adi === provinceName);
    const population = province?.nufus || 0;
    
    // İl için spesifik veri var mı kontrol et
    const provinceData = provinceEarthquakeData[provinceName];
    
    // Senaryo büyüklükleri
    const magnitudes = [6.0, 6.5, 7.0, 7.5, 7.6];
    
    // Senaryo seçimine göre hangi büyüklükleri göstereceğiz
    let activeMagnitudes = [];
    let customMagnitude = null;
    
    if (scenario.startsWith('custom_')) {
        // Özel büyüklük
        customMagnitude = parseFloat(scenario.split('_')[1]);
        if (!isNaN(customMagnitude) && customMagnitude >= 4.0 && customMagnitude <= 9.0) {
            activeMagnitudes = [customMagnitude];
        } else {
            activeMagnitudes = [7.0]; // Varsayılan
        }
    } else if (scenario === '6.5-7.0') {
        activeMagnitudes = [6.0, 6.5, 7.0];
    } else if (scenario === '7.0-7.5') {
        activeMagnitudes = [6.0, 6.5, 7.0, 7.5];
    } else if (scenario === '7.5+') {
        activeMagnitudes = [6.0, 6.5, 7.0, 7.5, 7.6];
    }
    
    const results = {
        dead: [],
        injured: [],
        homeless: [],
        economicDamage: []
    };
    
    // Eğer özel büyüklük varsa sadece onu kullan, yoksa tüm büyüklükleri kullan
    const magnitudesToProcess = customMagnitude !== null ? [customMagnitude] : magnitudes;
    
    magnitudesToProcess.forEach(magnitude => {
        let dead, injured, homeless, economicDamage;
        let deadWithIntervention, injuredWithIntervention, homelessWithIntervention, economicDamageWithIntervention;
        
        // İl için spesifik veri varsa kullan (interpolasyon ile)
        let data = null;
        if (provinceData) {
            // Tam eşleşme varsa
            if (provinceData[magnitude]) {
                data = provinceData[magnitude];
            } else {
                // Interpolasyon ile en yakın değeri bul
                const keys = Object.keys(provinceData).map(k => parseFloat(k)).sort((a, b) => a - b);
                let lower = null, upper = null;
                for (let i = 0; i < keys.length; i++) {
                    if (keys[i] < magnitude) lower = keys[i];
                    if (keys[i] > magnitude && !upper) upper = keys[i];
                }
                
                if (lower === null && upper !== null) {
                    data = provinceData[upper];
                } else if (lower !== null && upper === null) {
                    data = provinceData[lower];
                } else if (lower !== null && upper !== null) {
                    // İki değer arasında interpolasyon
                    const lowerData = provinceData[lower];
                    const upperData = provinceData[upper];
                    const ratio = (magnitude - lower) / (upper - lower);
                    
                    data = {
                        dead: Math.round(lowerData.dead + (upperData.dead - lowerData.dead) * ratio),
                        injured: Math.round(lowerData.injured + (upperData.injured - lowerData.injured) * ratio),
                        duration: Math.round(lowerData.duration + (upperData.duration - lowerData.duration) * ratio)
                    };
                }
            }
        }
        
        if (data) {
            dead = data.dead;
            injured = data.injured;
            
            // Evsiz sayısı: Yaralı sayısının yaklaşık 2-3 katı (tahmini)
            homeless = Math.ceil(injured * 2.5);
            
            // Ekonomik hasar: Ölü ve yaralı sayısına göre hesapla
            // Her ölü için ~5M TL, her yaralı için ~50K TL
            economicDamage = (dead * 5) + (injured * 0.05); // Milyar TL
            
            // Müdahale edilirse (%60-80 azalma)
            const reductionFactor = magnitude >= 7.5 ? 0.70 : magnitude >= 7.0 ? 0.75 : 0.80;
            deadWithIntervention = Math.ceil(dead * (1 - reductionFactor));
            injuredWithIntervention = Math.ceil(injured * (1 - reductionFactor));
            homelessWithIntervention = Math.ceil(homeless * (1 - reductionFactor));
            economicDamageWithIntervention = economicDamage * (1 - reductionFactor);
        } else {
            // Genel formül kullan (veri yoksa)
            let affectedRatio = 0.3;
            if (magnitude >= 8.0) affectedRatio = 0.50;
            else if (magnitude >= 7.6) affectedRatio = 0.45;
            else if (magnitude >= 7.5) affectedRatio = 0.40;
            else if (magnitude >= 7.0) affectedRatio = 0.35;
            else if (magnitude >= 6.5) affectedRatio = 0.25;
            else if (magnitude >= 6.0) affectedRatio = 0.20;
            else if (magnitude >= 5.5) affectedRatio = 0.15;
            else if (magnitude >= 5.0) affectedRatio = 0.10;
            else affectedRatio = 0.05;
            
            const riskMultiplier = Math.min(depremRiski / 100, 1.0);
        const affectedPopulation = Math.ceil(population * affectedRatio * riskMultiplier);
        
            // Interpolasyon ile yakın değerleri bul
        let deadRatio = 0.001;
            let injuredRatio = 0.01;
            let homelessRatio = 0.15;
            
            if (magnitude >= 8.0) {
                deadRatio = 0.08;
                injuredRatio = 0.15;
                homelessRatio = 0.40;
            } else if (magnitude >= 7.6) {
                deadRatio = 0.07;
                injuredRatio = 0.12;
            homelessRatio = 0.35;
        } else if (magnitude >= 7.5) {
                deadRatio = 0.06;
                injuredRatio = 0.10;
            homelessRatio = 0.30;
            } else if (magnitude >= 7.0) {
                deadRatio = 0.05;
                injuredRatio = 0.08;
            homelessRatio = 0.25;
            } else if (magnitude >= 6.5) {
                deadRatio = 0.03;
                injuredRatio = 0.05;
                homelessRatio = 0.20;
            } else if (magnitude >= 6.0) {
                deadRatio = 0.02;
                injuredRatio = 0.03;
                homelessRatio = 0.15;
            } else if (magnitude >= 5.5) {
                deadRatio = 0.01;
                injuredRatio = 0.02;
                homelessRatio = 0.10;
            } else if (magnitude >= 5.0) {
                deadRatio = 0.005;
                injuredRatio = 0.01;
                homelessRatio = 0.08;
        }
        
        // Müdahale edilmezse
            dead = Math.ceil(affectedPopulation * deadRatio);
            injured = Math.ceil(affectedPopulation * injuredRatio);
            homeless = Math.ceil(affectedPopulation * homelessRatio);
        
        // Müdahale edilirse (%60-80 azalma)
        const reductionFactor = magnitude >= 7.5 ? 0.70 : magnitude >= 7.0 ? 0.75 : 0.80;
            deadWithIntervention = Math.ceil(dead * (1 - reductionFactor));
            injuredWithIntervention = Math.ceil(injured * (1 - reductionFactor));
            homelessWithIntervention = Math.ceil(homeless * (1 - reductionFactor));
            
            // Ekonomik hasar
            let damagePerPerson = 0.1;
            if (magnitude >= 8.0) damagePerPerson = 0.8;
            else if (magnitude >= 7.6) damagePerPerson = 0.6;
            else if (magnitude >= 7.5) damagePerPerson = 0.5;
            else if (magnitude >= 7.0) damagePerPerson = 0.35;
            else if (magnitude >= 6.5) damagePerPerson = 0.25;
            else if (magnitude >= 6.0) damagePerPerson = 0.15;
            else if (magnitude >= 5.5) damagePerPerson = 0.12;
            else if (magnitude >= 5.0) damagePerPerson = 0.1;
            
            economicDamage = (affectedPopulation / 1000) * damagePerPerson * riskMultiplier;
            economicDamageWithIntervention = economicDamage * (1 - reductionFactor);
        }
        
        results.dead.push({ without: dead, with: deadWithIntervention });
        results.injured.push({ without: injured, with: injuredWithIntervention });
        results.homeless.push({ without: homeless, with: homelessWithIntervention });
        results.economicDamage.push({ without: economicDamage, with: economicDamageWithIntervention });
    });
    
    return results;
}

// Önlemler verisini hazırla
function getRecommendedMeasuresData(depremRiski, impactData) {
    const maxDead = Math.max(...impactData.dead.map(d => d.without));
    const maxInjured = Math.max(...impactData.injured.map(d => d.without));
    const maxHomeless = Math.max(...impactData.homeless.map(d => d.without));
    const maxEconomic = Math.max(...impactData.economicDamage.map(d => d.without));
    
    const measures = {
        labels: [],
        priorities: [],
        categories: []
    };
    
    // Risk seviyesine göre önlemler
    if (depremRiski >= 70) {
        measures.labels.push('Kentsel Dönüşüm', 'Bina Dayanıklılık Testi', 'Acil Durum Planları', 'Arama-Kurtarma Kapasitesi', 'Barınma Merkezleri', 'Sağlık Tesisleri');
        measures.priorities.push(100, 95, 90, 85, 80, 75);
        measures.categories.push('Altyapı', 'Güvenlik', 'Planlama', 'Operasyon', 'Barınma', 'Sağlık');
    } else if (depremRiski >= 50) {
        measures.labels.push('Kentsel Dönüşüm Planlama', 'Bina Stoku Analizi', 'Acil Durum Planları', 'Arama-Kurtarma Değerlendirme', 'Barınma Kapasitesi');
        measures.priorities.push(90, 85, 80, 75, 70);
        measures.categories.push('Altyapı', 'Güvenlik', 'Planlama', 'Operasyon', 'Barınma');
    } else if (depremRiski >= 30) {
        measures.labels.push('Bina Stoku Analizi', 'Kentsel Dönüşüm Değerlendirme', 'Acil Durum Planları', 'Halk Eğitimi');
        measures.priorities.push(75, 70, 65, 60);
        measures.categories.push('Güvenlik', 'Altyapı', 'Planlama', 'Eğitim');
    } else {
        measures.labels.push('Deprem Tatbikatları', 'Acil Durum Planları', 'Halk Bilinçlendirme', 'Bina Kontrolü');
        measures.priorities.push(60, 55, 50, 45);
        measures.categories.push('Eğitim', 'Planlama', 'Eğitim', 'Güvenlik');
    }
    
    // Etki büyüklüğüne göre ek önlemler
    if (maxDead > 1000) {
        measures.labels.push('Acil Sağlık Kapasitesi');
        measures.priorities.push(95);
        measures.categories.push('Sağlık');
    }
    if (maxHomeless > 100000) {
        measures.labels.push('Geçici İskan Alanları');
        measures.priorities.push(85);
        measures.categories.push('Barınma');
    }
    if (maxEconomic > 100) {
        measures.labels.push('Ekonomik Destek Paketleri');
        measures.priorities.push(70);
        measures.categories.push('Ekonomi');
    }
    
    return measures;
}

// Önlemler grafiği oluştur
function createMeasuresChart(canvasId, measuresData) {
    const ctx = document.getElementById(canvasId);
    if (!ctx) return;
    
    // Kategori renkleri
    const categoryColors = {
        'Altyapı': '#3498db',
        'Güvenlik': '#e74c3c',
        'Planlama': '#f39c12',
        'Operasyon': '#9b59b6',
        'Barınma': '#1abc9c',
        'Sağlık': '#e67e22',
        'Eğitim': '#34495e',
        'Ekonomi': '#16a085'
    };
    
    const backgroundColors = measuresData.categories.map(cat => categoryColors[cat] || '#95a5a6');
    
    new Chart(ctx, {
        type: 'bar',
        data: {
            labels: measuresData.labels,
            datasets: [{
                label: 'Öncelik Skoru',
                data: measuresData.priorities,
                backgroundColor: backgroundColors.map(c => c + '80'),
                borderColor: backgroundColors,
                borderWidth: 2
            }]
        },
        options: {
            indexAxis: 'y',
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { display: false },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            const index = context.dataIndex;
                            const category = measuresData.categories[index];
                            return `${context.parsed.x}% - ${category}`;
                        }
                    }
                }
            },
            scales: {
                x: {
                    beginAtZero: true,
                    max: 100,
                    ticks: {
                        color: '#aaa',
                        font: { size: 10 },
                        callback: function(value) {
                            return value + '%';
                        }
                    },
                    grid: { color: 'rgba(255, 255, 255, 0.05)' }
                },
                y: {
                    ticks: { 
                        color: '#aaa', 
                        font: { size: 11 }
                    },
                    grid: { display: false }
                }
            }
        }
    });
}

// Karar özeti oluştur
function generateDecisionSummary(provinceName, scenario, depremRiski, impactData) {
    const province = provinces.find(p => p.il_adi === provinceName);
    const population = province?.nufus || 0;
    
    // Senaryo etiketini belirle
    let scenarioLabel = 'M6.5-7.0';
    if (scenario === '7.0-7.5') scenarioLabel = 'M7.0-7.5';
    else if (scenario === '7.5+') scenarioLabel = 'M7.5+';
    
    // En yüksek etkiyi bul
    const maxDead = Math.max(...impactData.dead.map(d => d.without));
    const maxInjured = Math.max(...impactData.injured.map(d => d.without));
    const maxHomeless = Math.max(...impactData.homeless.map(d => d.without));
    const maxEconomic = Math.max(...impactData.economicDamage.map(d => d.without));
    
    let criticalImpact = 'Evsiz sayısı';
    let criticalValue = maxHomeless;
    if (maxDead > criticalValue) {
        criticalImpact = 'Ölü sayısı';
        criticalValue = maxDead;
    } else if (maxInjured > criticalValue) {
        criticalImpact = 'Yaralı sayısı';
        criticalValue = maxInjured;
    } else if (maxEconomic > criticalValue / 1000) {
        criticalImpact = 'Ekonomik hasar';
        criticalValue = maxEconomic;
    }
    
    // Risk seviyesine göre öncelik belirle
    let priority = 'Orta Öncelik';
    let priorityColor = '#FBC02D';
    if (depremRiski >= 70) {
        priority = 'Çok Yüksek Öncelik';
        priorityColor = '#D32F2F';
    } else if (depremRiski >= 50) {
        priority = 'Yüksek Öncelik';
        priorityColor = '#F57C00';
    } else if (depremRiski < 30) {
        priority = 'Düşük Öncelik';
        priorityColor = '#388E3C';
    }
    
    // Zorunlu aksiyonları belirle
    let mandatoryActions = [];
    if (depremRiski >= 70 || maxDead > 1000) {
        mandatoryActions.push('Acil arama-kurtarma ekipleri sevk edilmeli');
        mandatoryActions.push('Acil barınma merkezleri kurulmalı');
        mandatoryActions.push('Sağlık kapasitesi acilen artırılmalı');
    } else if (depremRiski >= 50 || maxDead > 500) {
        mandatoryActions.push('Arama-kurtarma ekipleri hazır tutulmalı');
        mandatoryActions.push('Barınma merkezleri planlanmalı');
        mandatoryActions.push('Sağlık kapasitesi değerlendirilmeli');
    } else {
        mandatoryActions.push('Acil durum planları gözden geçirilmeli');
        mandatoryActions.push('Barınma kapasitesi kontrol edilmeli');
    }
    
    if (maxHomeless > 100000) {
        mandatoryActions.push('Geçici iskan alanları hazırlanmalı');
    }
    
    if (maxEconomic > 100) {
        mandatoryActions.push('Ekonomik destek paketleri hazırlanmalı');
    }
    
    const actionsList = mandatoryActions.map((action, index) => `
        <div class="decision-action-item">
            <span class="action-number">${index + 1}</span>
            <span class="action-text">${action}</span>
        </div>
    `).join('');
    
    return `
        <div class="decision-summary-content">
            <div class="decision-row">
                <span class="decision-label">Öncelikli Senaryo:</span>
                <span class="decision-value">${scenarioLabel}</span>
            </div>
            <div class="decision-row">
                <span class="decision-label">Öncelik Seviyesi:</span>
                <span class="decision-value" style="color: ${priorityColor};">${priority}</span>
            </div>
            <div class="decision-row">
                <span class="decision-label">En Kritik Etki:</span>
                <span class="decision-value">${criticalImpact} (${criticalValue >= 1000 ? (criticalValue / 1000).toFixed(1) + 'K' : criticalValue.toLocaleString('tr-TR')})</span>
            </div>
            <div class="decision-row">
                <span class="decision-label">İl Nüfusu:</span>
                <span class="decision-value">${population.toLocaleString('tr-TR')} kişi</span>
            </div>
        </div>
        <div class="decision-actions">
            <h5 class="decision-actions-title">Zorunlu Aksiyonlar:</h5>
            <div class="decision-actions-list">
                ${actionsList}
            </div>
        </div>
    `;
}

// Tüm Senaryolar İçin Karar Özetleri Oluştur
function generateAllScenarioSummaries(provinceName, depremRiski) {
    const magnitudes = [6.0, 6.5, 7.0, 7.5];
    const summaries = [];
    
    magnitudes.forEach(magnitude => {
        // Her büyüklük için impact hesapla
        const customScenario = `custom_${magnitude}`;
        const impactData = calculateProvinceImpact(provinceName, customScenario, depremRiski);
        
        // Bu büyüklük için karar özeti oluştur
        const summary = generateDecisionSummaryForMagnitude(provinceName, magnitude, depremRiski, impactData);
        summaries.push(summary);
    });
    
    return summaries.join('');
}

// Belirli Bir Büyüklük İçin Karar Özeti
function generateDecisionSummaryForMagnitude(provinceName, magnitude, depremRiski, impactData) {
    const province = provinces.find(p => p.il_adi === provinceName);
    const population = province?.nufus || 0;
    
    // Bu büyüklük için verileri al (tek büyüklük olduğu için ilk eleman)
    const dead = impactData.dead[0] || { without: 0, with: 0 };
    const injured = impactData.injured[0] || { without: 0, with: 0 };
    const homeless = impactData.homeless[0] || { without: 0, with: 0 };
    const economic = impactData.economicDamage[0] || { without: 0, with: 0 };
    
    // En kritik etkiyi belirle
    let criticalImpact = 'Evsiz sayısı';
    let criticalValue = homeless.without;
    if (dead.without > criticalValue) {
        criticalImpact = 'Ölü sayısı';
        criticalValue = dead.without;
    } else if (injured.without > criticalValue) {
        criticalImpact = 'Yaralı sayısı';
        criticalValue = injured.without;
    } else if (economic.without > criticalValue / 1000) {
        criticalImpact = 'Ekonomik hasar';
        criticalValue = economic.without;
    }
    
    // Risk seviyesine ve büyüklüğe göre öncelik belirle
    let priority = 'Orta Öncelik';
    let priorityColor = '#FBC02D';
    const riskScore = depremRiski * (magnitude / 7.0); // Büyüklüğe göre ayarla
    
    if (riskScore >= 70 || dead.without > 1000 || magnitude >= 7.5) {
        priority = 'Çok Yüksek Öncelik';
        priorityColor = '#D32F2F';
    } else if (riskScore >= 50 || dead.without > 500 || magnitude >= 7.0) {
        priority = 'Yüksek Öncelik';
        priorityColor = '#F57C00';
    } else if (riskScore < 30 && magnitude < 6.5) {
        priority = 'Düşük Öncelik';
        priorityColor = '#388E3C';
    }
    
    // Zorunlu aksiyonları belirle (il bazlı spesifik veriler ile)
    let mandatoryActions = [];
    
    // İl için spesifik kaynak verileri var mı kontrol et
    const resourceData = provinceResourceData[provinceName];
    
    // Deprem büyüklüğüne göre kaynak sayılarını al
    let searchRescueTeams, shelterCenters, medicalTeams, communicationUnits;
    
    if (resourceData) {
        // Tam eşleşme varsa
        if (resourceData[magnitude]) {
            const data = resourceData[magnitude];
            searchRescueTeams = data.searchRescue;
            shelterCenters = data.shelter;
            medicalTeams = data.medical;
            communicationUnits = data.communication;
        } else {
            // En yakın değerleri bul (interpolasyon)
            const keys = Object.keys(resourceData).map(k => parseFloat(k)).sort((a, b) => a - b);
            let lower = null, upper = null;
            for (let i = 0; i < keys.length; i++) {
                if (keys[i] < magnitude) lower = keys[i];
                if (keys[i] > magnitude && !upper) upper = keys[i];
            }
            
            if (lower === null && upper !== null) {
                const data = resourceData[upper];
                searchRescueTeams = data.searchRescue;
                shelterCenters = data.shelter;
                medicalTeams = data.medical;
                communicationUnits = data.communication;
            } else if (lower !== null && upper === null) {
                const data = resourceData[lower];
                searchRescueTeams = data.searchRescue;
                shelterCenters = data.shelter;
                medicalTeams = data.medical;
                communicationUnits = data.communication;
            } else if (lower !== null && upper !== null) {
                // İki değer arasında interpolasyon
                const lowerData = resourceData[lower];
                const upperData = resourceData[upper];
                const ratio = (magnitude - lower) / (upper - lower);
                
                searchRescueTeams = Math.round(lowerData.searchRescue + (upperData.searchRescue - lowerData.searchRescue) * ratio);
                shelterCenters = Math.round(lowerData.shelter + (upperData.shelter - lowerData.shelter) * ratio);
                medicalTeams = Math.round(lowerData.medical + (upperData.medical - lowerData.medical) * ratio);
                communicationUnits = Math.round(lowerData.communication + (upperData.communication - lowerData.communication) * ratio);
            } else {
                // Varsayılan değerler
                searchRescueTeams = Math.ceil(population / 100000);
                shelterCenters = Math.ceil(population / 50000);
                medicalTeams = Math.ceil(population / 20000);
                communicationUnits = Math.ceil(population / 150000);
            }
        }
    } else {
        // İl için veri yoksa nüfusa göre hesapla
        searchRescueTeams = Math.ceil(population / 100000);
        shelterCenters = Math.ceil(population / 50000);
        medicalTeams = Math.ceil(population / 20000);
        communicationUnits = Math.ceil(population / 150000);
    }
    
    const temporaryShelters = Math.ceil(homeless.without / 5000); // Her 5K evsiz için 1 alan
    
    if (magnitude >= 7.5 || dead.without > 1000) {
        mandatoryActions.push({
            text: 'Acil arama-kurtarma ekipleri sevk edilmeli',
            count: searchRescueTeams,
            unit: 'ekip'
        });
        mandatoryActions.push({
            text: 'Acil barınma merkezleri kurulmalı',
            count: shelterCenters,
            unit: 'merkez'
        });
        mandatoryActions.push({
            text: 'Sağlık kapasitesi acilen artırılmalı',
            count: medicalTeams,
            unit: 'ekip'
        });
        mandatoryActions.push({
            text: 'İletişim altyapısı güçlendirilmeli',
            count: communicationUnits,
            unit: 'birim'
        });
    } else if (magnitude >= 7.0 || dead.without > 500) {
        mandatoryActions.push({
            text: 'Arama-kurtarma ekipleri hazır tutulmalı',
            count: searchRescueTeams,
            unit: 'ekip'
        });
        mandatoryActions.push({
            text: 'Barınma merkezleri planlanmalı',
            count: shelterCenters,
            unit: 'merkez'
        });
        mandatoryActions.push({
            text: 'Sağlık kapasitesi değerlendirilmeli',
            count: medicalTeams,
            unit: 'ekip'
        });
        mandatoryActions.push({
            text: 'Acil durum planları aktif edilmeli',
            count: 1,
            unit: 'plan'
        });
    } else if (magnitude >= 6.5) {
        mandatoryActions.push({
            text: 'Acil durum planları gözden geçirilmeli',
            count: 1,
            unit: 'plan'
        });
        mandatoryActions.push({
            text: 'Barınma kapasitesi kontrol edilmeli',
            count: shelterCenters,
            unit: 'merkez'
        });
        mandatoryActions.push({
            text: 'Ekipman stokları kontrol edilmeli',
            count: Math.ceil(population / 100000),
            unit: 'depo'
        });
    } else {
        mandatoryActions.push({
            text: 'Acil durum planları güncellenmeli',
            count: 1,
            unit: 'plan'
        });
        mandatoryActions.push({
            text: 'Halk bilinçlendirme çalışmaları yapılmalı',
            count: Math.ceil(population / 50000),
            unit: 'etkinlik'
        });
    }
    
    if (homeless.without > 100000) {
        mandatoryActions.push({
            text: 'Geçici iskan alanları hazırlanmalı',
            count: temporaryShelters,
            unit: 'alan'
        });
    }
    
    if (economic.without > 100) {
        mandatoryActions.push({
            text: 'Ekonomik destek paketleri hazırlanmalı',
            count: Math.ceil(homeless.without / 1000),
            unit: 'paket'
        });
    }
    
    const actionsList = mandatoryActions.map((action, index) => {
        const actionText = typeof action === 'string' ? action : action.text;
        const actionCount = typeof action === 'object' && action.count ? ` (${action.count} ${action.unit})` : '';
        return `
        <div class="decision-action-item">
            <span class="action-number">${index + 1}</span>
            <span class="action-text">${actionText}${actionCount}</span>
        </div>
    `;
    }).join('');
    
    return `
        <div class="decision-summary-card">
            <div class="decision-summary-header">
                <h5 class="decision-summary-title">M${magnitude.toFixed(1)} Senaryosu</h5>
                <span class="decision-priority-badge" style="background-color: ${priorityColor};">${priority}</span>
            </div>
            <div class="decision-summary-content">
                <div class="decision-metrics-grid">
                    <div class="decision-metric">
                        <span class="metric-label">💀 Ölü</span>
                        <span class="metric-value">${dead.without.toLocaleString('tr-TR')}</span>
                        <span class="metric-reduction">→ ${dead.with.toLocaleString('tr-TR')} (müdahale ile)</span>
                    </div>
                    <div class="decision-metric">
                        <span class="metric-label">🩹 Yaralı</span>
                        <span class="metric-value">${(injured.without / 1000).toFixed(1)}K</span>
                        <span class="metric-reduction">→ ${(injured.with / 1000).toFixed(1)}K (müdahale ile)</span>
                    </div>
                    <div class="decision-metric">
                        <span class="metric-label">🏠 Evsiz</span>
                        <span class="metric-value">${(homeless.without / 1000).toFixed(1)}K</span>
                        <span class="metric-reduction">→ ${(homeless.with / 1000).toFixed(1)}K (müdahale ile)</span>
                    </div>
                    <div class="decision-metric">
                        <span class="metric-label">💰 Ekonomik Hasar</span>
                        <span class="metric-value">${economic.without.toFixed(1)} Milyar TL</span>
                        <span class="metric-reduction">→ ${economic.with.toFixed(1)} Milyar TL (müdahale ile)</span>
                    </div>
                </div>
                <div class="decision-actions">
                    <h6 class="decision-actions-title">Zorunlu Aksiyonlar:</h6>
                    <div class="decision-actions-list">
                        ${actionsList}
                    </div>
                </div>
            </div>
        </div>
    `;
}

// İl Detayları Modal'ı göster - Senaryo seçici ve 4 mini grafik ile
function showProvinceModal(provinceName, riskData, error = null) {
    const modal = document.getElementById('provinceDetailModal');
    const modalBody = document.getElementById('provinceModalBody');
    
    if (!modal || !modalBody) {
        console.error('❌ [showProvinceModal] Modal elements not found');
        return;
    }
    
    // Error state with retry button
    if (error) {
        const errorCode = error.status || error.details?.status || 'UNKNOWN';
        const errorMessage = error.message || error.details?.errorMessage || 'Bilinmeyen hata';
        
        modalBody.innerHTML = `
            <div class="province-modal-error">
                <div style="margin-bottom: 15px;">
                    <h4 style="color: #e74c3c; margin: 0 0 10px 0;">⚠️ Hata Oluştu</h4>
                    <p style="color: #aaa; margin: 0 0 5px 0;">İl: <strong>${provinceName}</strong></p>
                    <p style="color: #aaa; margin: 0 0 5px 0;">Hata Kodu: <strong style="color: #e74c3c;">${errorCode}</strong></p>
                    <p style="color: #aaa; margin: 0;">${errorMessage}</p>
                </div>
                <button class="province-modal-retry-btn" onclick="retryProvinceModal('${provinceName}')">
                    🔄 Tekrar Dene
                </button>
            </div>
        `;
        modal.classList.add('active');
        return;
    }
    
    // Loading state
    if (!riskData) {
        modalBody.innerHTML = `
            <div class="province-modal-loading">
                <p>Yükleniyor...</p>
            </div>
        `;
        modal.classList.add('active');
        return;
    }
    
    // Deprem riski
    const depremRiski = parseFloat(riskData.earthquake || 0);
    
    // Risk seviyesi renkleri ve seviyeleri
    function getRiskColor(risk) {
        if (risk >= 70) return '#D32F2F'; // Kırmızı - Çok Yüksek
        if (risk >= 50) return '#F57C00'; // Turuncu - Yüksek
        if (risk >= 30) return '#FBC02D'; // Sarı - Orta
        return '#388E3C'; // Yeşil - Düşük
    }
    
    function getRiskLevel(risk) {
        if (risk >= 70) return 'Çok Yüksek';
        if (risk >= 50) return 'Yüksek';
        if (risk >= 30) return 'Orta';
        return 'Düşük';
    }
    
    const riskColor = getRiskColor(depremRiski);
    const riskLevel = getRiskLevel(depremRiski);
    
    // Senaryoya göre sonuçları hesapla
    const impactData = calculateProvinceImpact(provinceName, provinceModalScenario, depremRiski);
    
    // Grafik ID'leri
    const timestamp = Date.now();
    const chartIds = {
        dead: `chart_dead_${provinceName.replace(/\s+/g, '_')}_${timestamp}`,
        injured: `chart_injured_${provinceName.replace(/\s+/g, '_')}_${timestamp}`,
        homeless: `chart_homeless_${provinceName.replace(/\s+/g, '_')}_${timestamp}`,
        economic: `chart_economic_${provinceName.replace(/\s+/g, '_')}_${timestamp}`,
        measures: `measuresChart_${provinceName.replace(/\s+/g, '_')}_${timestamp}`
    };
    
    modalBody.innerHTML = `
        <div class="province-modal-row">
            <span class="province-modal-label">İl:</span>
            <span class="province-modal-value">${provinceName}</span>
        </div>
        <div class="province-modal-divider"></div>
        
        <!-- Deprem Riski Kartı -->
        <div class="earthquake-risk-card" style="background: linear-gradient(135deg, ${riskColor}22 0%, ${riskColor}11 100%); border-left: 4px solid ${riskColor};">
            <div class="risk-score-header">
                <span class="risk-score-label">Deprem Riski</span>
                <span class="risk-score-badge" style="background-color: ${riskColor};">${riskLevel}</span>
            </div>
            <div class="risk-score-value">${depremRiski.toFixed(2)}</div>
            <div class="risk-score-bar">
                <div class="risk-score-bar-fill" style="width: ${Math.min(depremRiski, 100)}%; background-color: ${riskColor};"></div>
            </div>
        </div>
        
        <div class="province-modal-divider"></div>
        
        <!-- Alınması Gereken Önlemler - Grafik -->
        <div class="modal-measures-section">
            <h4 class="modal-section-title">🛡️ Alınması Gereken Önlemler</h4>
            <div class="measures-chart-container">
                <canvas id="${chartIds.measures}"></canvas>
            </div>
        </div>
        
        <div class="province-modal-divider"></div>
        
        <!-- Önlem Alınmazsa Olası Sonuçlar - 4 Mini Grafik -->
        <div class="modal-impact-grid">
            <h4 class="modal-section-title" style="grid-column: 1 / -1; margin-bottom: 16px;">⚠️ Önlem Alınmazsa Olası Sonuçlar</h4>
            
            <!-- Ölü Sayısı -->
            <div class="impact-chart-card">
                <div class="chart-title">💀 Ölü Sayısı</div>
                <canvas id="${chartIds.dead}"></canvas>
            </div>
            
            <!-- Yaralı Sayısı -->
            <div class="impact-chart-card">
                <div class="chart-title">🩹 Yaralı Sayısı (bin)</div>
                <canvas id="${chartIds.injured}"></canvas>
            </div>
            
            <!-- Evsiz Sayısı -->
            <div class="impact-chart-card">
                <div class="chart-title">🏠 Evsiz Sayısı (bin)</div>
                <canvas id="${chartIds.homeless}"></canvas>
            </div>
            
            <!-- Ekonomik Hasar -->
            <div class="impact-chart-card">
                <div class="chart-title">💰 Ekonomik Hasar (Milyar TL)</div>
                <canvas id="${chartIds.economic}"></canvas>
            </div>
        </div>
        
        <div class="province-modal-divider"></div>
        
        <!-- Afet İhtiyaç Grafiği - React Component -->
        <div class="afet-ihtiyac-section">
            <div class="afet-ihtiyac-header">
                <h4 class="modal-section-title">📦 Afet Bölgesi İhtiyaç Bilgileri</h4>
                <div class="afet-ihtiyac-scenario-selector">
                    <button class="scenario-btn-small" 
                            onclick="updateAfetIhtiyacScenario('6.0', '${provinceName}', ${timestamp})">
                        <span>6.0</span>
                    </button>
                    <button class="scenario-btn-small" 
                            onclick="updateAfetIhtiyacScenario('6.5', '${provinceName}', ${timestamp})">
                        <span>6.5</span>
                    </button>
                    <button class="scenario-btn-small active" 
                            onclick="updateAfetIhtiyacScenario('7.0', '${provinceName}', ${timestamp})">
                        <span>7.0</span>
                    </button>
                    <button class="scenario-btn-small" 
                            onclick="updateAfetIhtiyacScenario('7.5', '${provinceName}', ${timestamp})">
                        <span>7.5</span>
                    </button>
                </div>
            </div>
            <div id="afetIhtiyacGrafikContainer_${provinceName.replace(/\s+/g, '_')}_${timestamp}"></div>
        </div>
        
        <div class="province-modal-divider"></div>
        
        <!-- Karar Özetleri - Her Senaryo İçin -->
        <div class="decision-summaries-section">
            <h4 class="modal-section-title" style="margin-bottom: 20px;">📋 Senaryo Bazlı Karar Özetleri</h4>
            <div class="decision-summaries-grid">
                ${generateAllScenarioSummaries(provinceName, depremRiski)}
            </div>
        </div>
    `;
    
    // Grafikleri oluştur
    setTimeout(() => {
        const magnitudes = ['M6', 'M6.5', 'M7', 'M7.5', 'M7.6'];
        
        // Ölü Sayısı Grafiği
        createImpactChart(chartIds.dead, magnitudes, impactData.dead, '#D32F2F', 'Ölü Sayısı', '');
        
        // Yaralı Sayısı Grafiği (bin)
        const injuredData = impactData.injured.map(d => ({
            without: (d.without / 1000).toFixed(1),
            with: (d.with / 1000).toFixed(1)
        }));
        createImpactChart(chartIds.injured, magnitudes, injuredData, '#FF9800', 'Yaralı Sayısı (bin)', 'bin');
        
        // Evsiz Sayısı Grafiği (bin)
        const homelessData = impactData.homeless.map(d => ({
            without: (d.without / 1000).toFixed(1),
            with: (d.with / 1000).toFixed(1)
        }));
        createImpactChart(chartIds.homeless, magnitudes, homelessData, '#FBC02D', 'Evsiz Sayısı (bin)', 'bin');
        
        // Ekonomik Hasar Grafiği
        createImpactChart(chartIds.economic, magnitudes, impactData.economicDamage, '#9C27B0', 'Ekonomik Hasar (Milyar TL)', 'Milyar TL');
        
        // Önlemler Grafiği
        const measuresData = getRecommendedMeasuresData(depremRiski, impactData);
        createMeasuresChart(chartIds.measures, measuresData);
        
        // React Component'i render et - Afet İhtiyaç Grafiği
        renderAfetIhtiyacGrafik(provinceName, provinceModalScenario, impactData, timestamp);
    }, 100);
    
    modal.classList.add('active');
}

// React Component root'larını sakla (cleanup için)
const reactComponentRoots = {};

// React Component'i render et - Afet İhtiyaç Grafiği
function renderAfetIhtiyacGrafik(provinceName, scenario, impactData, timestamp) {
    // React ve ReactDOM yüklü mü kontrol et
    if (typeof React === 'undefined' || typeof ReactDOM === 'undefined' || typeof window.AfetIhtiyacGrafik === 'undefined') {
        console.warn('React veya AfetIhtiyacGrafik component yüklenmedi');
        return;
    }
    
    const containerId = `afetIhtiyacGrafikContainer_${provinceName.replace(/\s+/g, '_')}_${timestamp}`;
    const container = document.getElementById(containerId);
    
    if (!container) {
        console.warn(`Container bulunamadı: ${containerId}`);
        return;
    }
    
    // Önceki root'u temizle (eğer varsa)
    if (reactComponentRoots[containerId]) {
        try {
            reactComponentRoots[containerId].unmount();
        } catch (e) {
            // Ignore unmount errors
        }
        delete reactComponentRoots[containerId];
    }
    
    // Senaryodan deprem büyüklüğünü çıkar (scenario artık direkt magnitude olabilir: '6.0', '6.5', '7.0', '7.5')
    let earthquakeMagnitude = 7.0; // Varsayılan
    if (scenario === '6.0' || scenario === '6.5-7.0') {
        earthquakeMagnitude = scenario === '6.0' ? 6.0 : 7.0;
    } else if (scenario === '6.5') {
        earthquakeMagnitude = 6.5;
    } else if (scenario === '7.0' || scenario === '7.0-7.5') {
        earthquakeMagnitude = scenario === '7.0' ? 7.0 : 7.5;
    } else if (scenario === '7.5' || scenario === '7.5+') {
        earthquakeMagnitude = 7.5;
    } else if (scenario.startsWith('custom_')) {
        earthquakeMagnitude = parseFloat(scenario.split('_')[1]) || 7.0;
    }
    
    // ImpactData'dan seçili senaryoya göre yaralı ve evsiz sayılarını al
    let injuredCount = 0;
    let homelessCount = 0;
    
    // Magnitude'a göre index bul (M6=0, M6.5=1, M7=2, M7.5=3, M7.6=4)
    let magnitudeIndex = 2; // Varsayılan M7
    if (earthquakeMagnitude === 6.0) magnitudeIndex = 0;
    else if (earthquakeMagnitude === 6.5) magnitudeIndex = 1;
    else if (earthquakeMagnitude === 7.0) magnitudeIndex = 2;
    else if (earthquakeMagnitude === 7.5) magnitudeIndex = 3;
    else if (earthquakeMagnitude >= 7.6) magnitudeIndex = 4;
    
    // Seçili senaryoya göre değerleri al
    if (impactData && impactData.injured && impactData.injured.length > magnitudeIndex) {
        // Seçili senaryoya göre değeri al (without - müdahale edilmezse)
        injuredCount = Math.round(parseFloat(impactData.injured[magnitudeIndex]?.without || 0));
    } else if (impactData && impactData.injured && impactData.injured.length > 0) {
        // Fallback: Son değeri al (en yüksek büyüklük)
        const lastIndex = impactData.injured.length - 1;
        injuredCount = Math.round(parseFloat(impactData.injured[lastIndex]?.without || 0));
    }
    
    if (impactData && impactData.homeless && impactData.homeless.length > magnitudeIndex) {
        // Seçili senaryoya göre değeri al (without - müdahale edilmezse)
        homelessCount = Math.round(parseFloat(impactData.homeless[magnitudeIndex]?.without || 0));
    } else if (impactData && impactData.homeless && impactData.homeless.length > 0) {
        // Fallback: Son değeri al (en yüksek büyüklük)
        const lastIndex = impactData.homeless.length - 1;
        homelessCount = Math.round(parseFloat(impactData.homeless[lastIndex]?.without || 0));
    }
    
    // React component'ini render et
    try {
        const root = ReactDOM.createRoot(container);
        reactComponentRoots[containerId] = root;
        
        root.render(
            React.createElement(window.AfetIhtiyacGrafik, {
                city: provinceName,
                earthquakeMagnitude: earthquakeMagnitude,
                injuredCount: injuredCount,
                homelessCount: homelessCount
            })
        );
    } catch (error) {
        console.error('React component render hatası:', error);
    }
}

// Impact chart oluştur
function createImpactChart(canvasId, labels, data, color, title, unit) {
    const ctx = document.getElementById(canvasId);
    if (!ctx) return;
    
    const withoutData = data.map(d => parseFloat(d.without || 0));
    const withData = data.map(d => parseFloat(d.with || 0));
    
    new Chart(ctx, {
        type: 'bar',
        data: {
            labels: labels,
            datasets: [
                {
                    label: 'Müdahale Edilmezse',
                    data: withoutData,
                    backgroundColor: color,
                    borderColor: color,
                    borderWidth: 1
                },
                {
                    label: 'Müdahale Edilirse',
                    data: withData,
                    backgroundColor: '#4CAF50',
                    borderColor: '#4CAF50',
                    borderWidth: 1
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { display: false },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            const value = context.parsed.y;
                            const label = context.dataset.label;
                            return `${label}: ${value.toLocaleString('tr-TR')} ${unit}`;
                        }
                    }
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    ticks: {
                        color: '#aaa',
                        font: { size: 10 },
                        callback: function(value) {
                            if (value >= 1000000) return (value / 1000000).toFixed(1) + 'M';
                            if (value >= 1000) return (value / 1000).toFixed(1) + 'K';
                            return value;
                        }
                    },
                    grid: { color: 'rgba(255, 255, 255, 0.05)' }
                },
                x: {
                    ticks: { color: '#aaa', font: { size: 10 } },
                    grid: { display: false }
                }
            }
        }
    });
}

// İl bazlı senaryo güncelleme
async function updateProvinceModalScenario(newScenario, provinceName) {
    provinceModalScenario = newScenario;
    
    // Risk verilerini tekrar yükle ve modal'ı güncelle
    try {
        const riskData = await fetchProvinceRiskData(provinceName);
        showProvinceModal(provinceName, riskData);
    } catch (error) {
        console.error('Error updating modal scenario:', error);
    }
}

// Global erişim
window.updateProvinceModalScenario = updateProvinceModalScenario;

// Afet İhtiyaç Grafiği için senaryo güncelleme
async function updateAfetIhtiyacScenario(newMagnitude, provinceName, timestamp) {
    // Risk verilerini tekrar yükle
    try {
        const riskData = await fetchProvinceRiskData(provinceName);
        const depremRiski = parseFloat(riskData.earthquake || 0);
        
        // Senaryo seçimine göre hangi senaryo grubunu kullanacağımızı belirle
        let scenarioGroup = '6.5-7.0';
        if (newMagnitude === '7.5') scenarioGroup = '7.5+';
        else if (newMagnitude === '7.0') scenarioGroup = '7.0-7.5';
        else if (newMagnitude === '6.5' || newMagnitude === '6.0') scenarioGroup = '6.5-7.0';
        
        // Senaryoya göre sonuçları hesapla
        const impactData = calculateProvinceImpact(provinceName, scenarioGroup, depremRiski);
        
        // Sadece Afet İhtiyaç Grafiğini güncelle (yeni magnitude ile)
        renderAfetIhtiyacGrafik(provinceName, newMagnitude, impactData, timestamp);
        
        // Senaryo butonlarını güncelle
        const container = document.getElementById(`afetIhtiyacGrafikContainer_${provinceName.replace(/\s+/g, '_')}_${timestamp}`);
        if (container) {
            const parentSection = container.closest('.afet-ihtiyac-section');
            if (parentSection) {
                const buttons = parentSection.querySelectorAll('.scenario-btn-small');
                buttons.forEach(btn => {
                    const onclickAttr = btn.getAttribute('onclick');
                    if (onclickAttr) {
                        const match = onclickAttr.match(/'([^']+)'/);
                        if (match && match[1] === newMagnitude) {
                            btn.classList.add('active');
                        } else {
                            btn.classList.remove('active');
                        }
                    }
                });
            }
        }
    } catch (error) {
        console.error('Error updating afet ihtiyac scenario:', error);
    }
}

// Global erişim
window.updateAfetIhtiyacScenario = updateAfetIhtiyacScenario;

// Retry function for modal
async function retryProvinceModal(provinceName) {
    console.log(`🔄 [retryProvinceModal] Retrying for: ${provinceName}`);
    
    // Show loading state
    showProvinceModal(provinceName, null);
    
    try {
        const riskData = await fetchProvinceRiskData(provinceName);
        showProvinceModal(provinceName, riskData);
    } catch (error) {
        console.error('❌ [retryProvinceModal] Retry failed:', error);
        showProvinceModal(provinceName, null, error);
    }
}

// Make retry function globally accessible
window.retryProvinceModal = retryProvinceModal;

// İl Detayları Modal'ı kapat
function closeProvinceModal() {
    const modal = document.getElementById('provinceDetailModal');
    if (modal) {
        modal.classList.remove('active');
    }
}

// Highlight selected province on map
function highlightProvinceOnMap(provinceId) {
    if (!provinceId || !provinces || !dashboardMarmaraMap) return;
    
    // Find province name
    const province = provinces.find(p => p.id == provinceId);
    if (!province) return;
    
    const provinceName = province.il_adi;
    const layer = dashboardProvinceLayers[provinceName];
    
    if (layer) {
        // Reset all provinces to default style
        Object.keys(dashboardProvinceLayers).forEach(name => {
            const l = dashboardProvinceLayers[name];
            if (l && name !== provinceName) {
                const riskData = provinceRiskData[name];
                const riskScore = getCurrentRiskScore(riskData);
                const riskColor = getRiskColor(riskScore);
                l.setStyle({
                    fillColor: riskColor,
                    fillOpacity: 0.7,
                    color: '#444',
                    weight: 2,
                    opacity: 1
                });
            }
        });
        
        // Highlight selected province
        const riskData = provinceRiskData[provinceName];
        const riskScore = getCurrentRiskScore(riskData);
        const riskColor = getRiskColor(riskScore);
        
        layer.setStyle({
            fillColor: riskColor,
            fillOpacity: 0.9,
            color: '#fff',
            weight: 4,
            opacity: 1
        });
        
        // Zoom to province
        dashboardMarmaraMap.fitBounds(layer.getBounds().pad(0.2));
        
        // Open popup
        const riskDataForPopup = riskData || { earthquake: 0, flood: 0, fire: 0 };
        const popupContent = createProvincePopup(provinceName, riskDataForPopup);
        layer.bindPopup(popupContent, {
            maxWidth: 300,
            className: 'province-popup'
        }).openPopup();
    }
}

// Initialize Marmara Map with GeoJSON
async function initMarmaraMap() {
    // Remove existing map if it exists
    if (marmaraMap) {
        marmaraMap.remove();
        marmaraMap = null;
        provinceLayers = {};
    }

    // Ensure provinces are loaded
    if (!provinces || provinces.length === 0) {
        console.log('📋 Provinces not loaded, loading now...');
        await loadProvinces();
    }
    console.log(`✅ Provinces loaded: ${provinces.length} provinces`);

    // Create map centered on Marmara Region
    marmaraMap = L.map('marmaraMap', {
        center: [40.5, 28.5],
        zoom: 8,
        minZoom: 7,
        maxZoom: 12
    });

    // Tile layer removed - only showing GeoJSON polygons
    // Harita sadece il sınırlarını gösterecek, arka plan haritası yok

    // Load GeoJSON and display provinces
    loadMarmaraGeoJSON();

    // Resize map after a short delay to ensure container is visible
    setTimeout(() => {
        if (marmaraMap) {
            marmaraMap.invalidateSize();
        }
    }, 300);
}

// Load and display Marmara provinces from GeoJSON
async function loadMarmaraGeoJSON() {
    try {
        console.log('🗺️ Loading Marmara provinces GeoJSON...');
        
        // Fetch GeoJSON file
        const response = await fetch('/marmara_iller.geojson');
        if (!response.ok) {
            throw new Error(`Failed to load GeoJSON: ${response.statusText}`);
        }
        
        const geojsonData = await response.json();
        console.log('✅ GeoJSON loaded successfully', geojsonData);

        // Default style for provinces
        const defaultStyle = {
            fillColor: '#3498db',
            fillOpacity: 0.6,
            color: '#2c3e50',
            weight: 2,
            opacity: 1
        };

        // Hover style
        const hoverStyle = {
            fillColor: '#2980b9',
            fillOpacity: 0.8,
            color: '#1a252f',
            weight: 3,
            opacity: 1
        };

        // Create GeoJSON layer with custom styling
        const geoJsonLayer = L.geoJSON(geojsonData, {
            style: defaultStyle,
            onEachFeature: function(feature, layer) {
                const provinceName = feature.properties.IlAdi;
                
                // Store layer reference
                provinceLayers[provinceName] = layer;

                // Store label marker reference for this layer
                let labelMarker = null;

                // Hover effect
                layer.on({
                    mouseover: function(e) {
                        const layer = e.target;
                        layer.setStyle(hoverStyle);
                        layer.bringToFront();
                        
                        // Show province name label on hover
                        if (layer.getBounds && !labelMarker) {
                            const bounds = layer.getBounds();
                            const center = bounds.getCenter();
                            
                            // Calculate text width dynamically
                            const textWidth = provinceName.length * 8 + 20;
                            
                            // Create label marker
                            const labelIcon = L.divIcon({
                                className: 'province-label',
                                html: `<div class="province-label-text">${provinceName}</div>`,
                                iconSize: [textWidth, 24],
                                iconAnchor: [textWidth / 2, 12]
                            });
                            
                            labelMarker = L.marker(center, {
                                icon: labelIcon,
                                interactive: false,
                                zIndexOffset: 1000,
                                keyboard: false
                            }).addTo(marmaraMap);
                        }
                    },
                    mouseout: function(e) {
                        const layer = e.target;
                        layer.setStyle(defaultStyle);
                        
                        // Remove label marker on mouseout
                        if (labelMarker) {
                            marmaraMap.removeLayer(labelMarker);
                            labelMarker = null;
                        }
                    }
                });

                // Click event - show popup with risk data
                layer.on('click', async function(e) {
                    const layer = e.target;
                    const provinceName = feature.properties.IlAdi;
                    
                    // Show loading in popup
                    layer.bindPopup(`
                        <div class="map-popup-loading">
                            <p>Yükleniyor...</p>
                        </div>
                    `).openPopup();

                    // Fetch risk data for this province
                    try {
                        const riskData = await fetchProvinceRiskData(provinceName);
                        
                        // Create popup content
                        const popupContent = createProvincePopup(provinceName, riskData);
                        layer.bindPopup(popupContent, {
                            maxWidth: 300,
                            className: 'province-popup'
                        }).openPopup();
                    } catch (error) {
                        console.error('Error fetching risk data:', error);
                        layer.bindPopup(`
                            <div class="map-popup-error">
                                <h4>${provinceName}</h4>
                                <p>Risk verileri yüklenirken hata oluştu.</p>
                            </div>
                        `).openPopup();
                    }
                });
            }
        }).addTo(marmaraMap);

        // Fit map to show all provinces
        marmaraMap.fitBounds(geoJsonLayer.getBounds().pad(0.1));
        
        console.log('✅ Marmara provinces displayed on map');
    } catch (error) {
        console.error('❌ Error loading GeoJSON:', error);
        showError('Harita yüklenirken hata oluştu: ' + error.message);
    }
}

// Fetch risk data for a province - İyileştirilmiş hata yönetimi
async function fetchProvinceRiskData(provinceName) {
    let errorDetails = null;
    
    try {
        console.log(`🔍 [fetchProvinceRiskData] Fetching risk data for: "${provinceName}"`);
        console.log(`📋 [fetchProvinceRiskData] Available provinces:`, provinces?.map(p => `${p.il_adi} (ID: ${p.id})`) || 'Provinces not loaded');
        
        // Validate provinces array
        if (!provinces || provinces.length === 0) {
            throw new Error('Provinces array is empty or not loaded');
        }
        
        // Find province ID from provinces array
        const province = provinces.find(p => p.il_adi === provinceName);
        if (!province) {
            const availableNames = provinces.map(p => p.il_adi).join(', ');
            throw new Error(`Province "${provinceName}" not found in provinces array. Available: ${availableNames}`);
        }

        console.log(`✅ [fetchProvinceRiskData] Found province: ${province.il_adi} (ID: ${province.id})`);

        // URL encoding for Turkish characters
        const encodedProvinceId = encodeURIComponent(province.id);
        const apiUrl = `${API_BASE}/risks/average?il_id=${encodedProvinceId}`;
        console.log(`📡 [fetchProvinceRiskData] API URL: ${apiUrl}`);
        console.log(`📡 [fetchProvinceRiskData] Request method: GET`);
        
        // Fetch with timeout
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout
        
        let response;
        try {
            response = await fetch(apiUrl, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                },
                signal: controller.signal
            });
            clearTimeout(timeoutId);
        } catch (fetchError) {
            clearTimeout(timeoutId);
            if (fetchError.name === 'AbortError') {
                throw new Error('Request timeout (10s)');
            }
            throw fetchError;
        }
        
        console.log(`📥 [fetchProvinceRiskData] Response status: ${response.status} ${response.statusText}`);
        console.log(`📥 [fetchProvinceRiskData] Response headers:`, Object.fromEntries(response.headers.entries()));
        
        // Check if response is OK
        if (!response.ok) {
            let errorBody = '';
            try {
                errorBody = await response.text();
                console.error(`❌ [fetchProvinceRiskData] Error response body:`, errorBody);
            } catch (e) {
                console.error(`❌ [fetchProvinceRiskData] Could not read error response body:`, e);
            }
            
            errorDetails = {
                status: response.status,
                statusText: response.statusText,
                url: apiUrl,
                body: errorBody
            };
            
            throw new Error(`API returned ${response.status} ${response.statusText}`);
        }
        
        // Parse JSON response
        let result;
        try {
            const responseText = await response.text();
            console.log(`📊 [fetchProvinceRiskData] Raw response text:`, responseText.substring(0, 500));
            
            result = JSON.parse(responseText);
            console.log(`📊 [fetchProvinceRiskData] Parsed JSON result:`, result);
        } catch (parseError) {
            console.error(`❌ [fetchProvinceRiskData] JSON parse error:`, parseError);
            errorDetails = {
                status: response.status,
                statusText: response.statusText,
                url: apiUrl,
                parseError: parseError.message
            };
            throw new Error(`Failed to parse JSON response: ${parseError.message}`);
        }

        // Validate response structure
        if (!result) {
            throw new Error('Response is null or undefined');
        }

        if (result.success && result.data) {
            const riskData = {
                earthquake: parseFloat(result.data.ortalama_deprem_riski || result.data.deprem_riski || 0),
                flood: parseFloat(result.data.ortalama_sel_riski || result.data.sel_riski || 0),
                fire: parseFloat(result.data.ortalama_yangin_riski || result.data.yangin_riski || 0),
                ortalama_genel_risk_skoru: parseFloat(result.data.ortalama_genel_risk_skoru || result.data.genel_risk_skoru || 0),
                ilce_sayisi: parseInt(result.data.ilce_sayisi || 0),
                il_id: province.id,
                il_adi: province.il_adi || result.data.il_adi || province.il_adi
            };
            console.log(`✅ [fetchProvinceRiskData] Risk data retrieved successfully:`, riskData);
            return riskData;
        } else {
            console.warn(`⚠️ [fetchProvinceRiskData] API returned success=false or no data:`, result);
            errorDetails = {
                status: response.status,
                url: apiUrl,
                apiResponse: result
            };
            // Return placeholder data if no data found
            return {
                earthquake: 0,
                flood: 0,
                fire: 0,
                il_id: province.id,
                il_adi: province.il_adi
            };
        }
    } catch (error) {
        const errorInfo = {
            provinceName,
            errorMessage: error.message,
            errorStack: error.stack,
            errorDetails,
            timestamp: new Date().toISOString()
        };
        
        console.error(`❌ [fetchProvinceRiskData] Error details:`, errorInfo);
        console.error(`❌ [fetchProvinceRiskData] Full error object:`, error);
        
        // Re-throw with enhanced error info
        const enhancedError = new Error(error.message);
        enhancedError.details = errorInfo;
        enhancedError.status = errorDetails?.status;
        throw enhancedError;
    }
}

// Create popup content for province
function createProvincePopup(provinceName, riskData) {
    console.log(`📝 Creating popup for ${provinceName} with data:`, riskData);
    console.log(`📊 Current disaster type: ${currentDisasterType}`);
    
    // Handle null or undefined riskData
    if (!riskData) {
        riskData = {
            earthquake: 0,
            flood: 0,
            fire: 0
        };
    }
    
    const earthquakeRisk = (riskData.earthquake !== undefined && riskData.earthquake !== null) 
        ? parseFloat(riskData.earthquake).toFixed(1) 
        : '0.0';
    const floodRisk = (riskData.flood !== undefined && riskData.flood !== null) 
        ? parseFloat(riskData.flood).toFixed(1) 
        : '0.0';
    const fireRisk = (riskData.fire !== undefined && riskData.fire !== null) 
        ? parseFloat(riskData.fire).toFixed(1) 
        : '0.0';

    // Show only the risk type for the current disaster tab
    let riskItems = '';
    
    if (currentDisasterType === 'earthquake') {
        riskItems = `
                <div class="popup-risk-item">
                <span class="risk-icon risk-icon-earthquake">🌍</span>
                <span class="risk-label">Deprem Riski:</span>
                    <span class="risk-value">${earthquakeRisk}</span>
                </div>
        `;
    } else if (currentDisasterType === 'flood') {
        riskItems = `
                <div class="popup-risk-item">
                <span class="risk-icon risk-icon-flood">🌊</span>
                <span class="risk-label">Sel Riski:</span>
                    <span class="risk-value">${floodRisk}</span>
                </div>
        `;
    } else if (currentDisasterType === 'fire') {
        riskItems = `
                <div class="popup-risk-item">
                <span class="risk-icon risk-icon-fire">🔥</span>
                <span class="risk-label">Yangın Riski:</span>
                    <span class="risk-value">${fireRisk}</span>
                </div>
        `;
    }

    const popupContent = `
        <div class="province-popup-content">
            <div class="popup-risks">
                ${riskItems}
            </div>
        </div>
    `;
    
    console.log(`✅ Popup content created:`, popupContent);
    return popupContent;
}

// ==================== COMPREHENSIVE DASHBOARD FUNCTIONS ====================

// Chart instances
// shelterChart kaldırıldı
// needsChart kaldırıldı
let floodWeeklyChart = null;
let floodProvinceChart = null;
let floodProvinceTrendChart = null;
let urbanTransformationChart = null;
let earthquake30DaysChart = null;
let impactChartDeaths = null;
let impactChartInjured = null;
let impactChartHomeless = null;
let impactChartDamage = null;

// Load comprehensive dashboard data - INSTANT, NO DELAYS
async function loadComprehensiveDashboard() {
    // Start ALL operations immediately in parallel - NO AWAIT, NO DELAY
    loadEmergencyInfo();
    loadDashboardStatistics();
    // loadEstimates kaldırıldı - Estimates card kaldırıldı
    // Charts must be initialized immediately
    initCharts();
}

// Load Emergency Info
async function loadEmergencyInfo() {
    const now = new Date();
    const titleElement = document.getElementById('emergencyTitle');
    const locationElement = document.getElementById('emergencyLocation');
    const timeElement = document.getElementById('emergencyTime');
    const dateElement = document.getElementById('emergencyDate');

    // Update based on selected scenario
    if (selectedScenario === 'realtime') {
        // Get latest earthquake for realtime scenario
        try {
            const response = await fetch(`${API_BASE}/earthquakes/live?limit=1`);
            const result = await response.json();
            
            if (result.success && result.data && result.data.length > 0) {
                const eq = result.data[0];
                const eqDate = new Date(eq.tarih_saat);
                if (titleElement) titleElement.textContent = `Deprem - ${eq.buyukluk} Büyüklüğünde`;
                if (locationElement) locationElement.textContent = `${eq.il_adi}${eq.ilce_adi ? ' - ' + eq.ilce_adi : ''}`;
                if (timeElement) timeElement.textContent = eqDate.toLocaleTimeString('tr-TR');
                if (dateElement) dateElement.textContent = eqDate.toLocaleDateString('tr-TR');
                return;
            }
        } catch (error) {
            console.error('Error loading realtime earthquake:', error);
        }
    }
    
    // Default or scenario-based info
    let scenarioText = '';
    if (selectedScenario === 'realtime') {
        scenarioText = 'Gerçek Zamanlı Deprem Verileri';
    } else if (selectedScenario === '6.5-7.0') {
        scenarioText = '6.5 - 7.0 Büyüklüğünde Deprem Senaryosu';
    } else if (selectedScenario === '7.0-7.5') {
        scenarioText = '7.0 - 7.5 Büyüklüğünde Deprem Senaryosu';
    } else if (selectedScenario === '7.5+') {
        scenarioText = '7.5+ Büyüklüğünde Deprem Senaryosu';
    }
    
    const location = selectedProvinceId 
        ? (provinces.find(p => p.id == selectedProvinceId)?.il_adi || 'Marmara Bölgesi')
        : 'Marmara Bölgesi';
    
    if (titleElement) titleElement.textContent = scenarioText || 'Marmara Bölgesi Afet Durumu';
    if (locationElement) locationElement.textContent = location;
    if (timeElement) timeElement.textContent = now.toLocaleTimeString('tr-TR');
    if (dateElement) dateElement.textContent = now.toLocaleDateString('tr-TR');
}

// Calculate affected population based on earthquake magnitude
function calculateAffectedPopulation(magnitude, totalPopulation) {
    if (!magnitude || magnitude < 6.5) {
        return 0; // Only calculate for 6.5+ earthquakes
    }
    
    // Büyüklüğe göre etkilenen nüfus oranı
    let affectedRatio = 0;
    if (magnitude >= 7.5) {
        affectedRatio = 0.25; // %25 (7.5 ve üstü)
    } else if (magnitude >= 7.0) {
        affectedRatio = 0.20; // %20 (7.0 - 7.5 arası)
    } else if (magnitude >= 6.5) {
        affectedRatio = 0.15; // %15 (6.5 - 7.0 arası)
    }
    
    return Math.floor(totalPopulation * affectedRatio);
}

// Calculate scenario needs for a specific magnitude range
function calculateScenarioNeeds(magnitudeRange, totalPopulation) {
    let magnitude = 0;
    if (magnitudeRange === '6.5-7.0') {
        magnitude = 6.75; // Orta değer
    } else if (magnitudeRange === '7.0-7.5') {
        magnitude = 7.25; // Orta değer
    } else if (magnitudeRange === '7.5+') {
        magnitude = 7.75; // Orta değer
    }
    
    const affectedPopulation = calculateAffectedPopulation(magnitude, totalPopulation);
    
    if (affectedPopulation === 0) {
        return {
            affectedPopulation: 0,
            teams: 0,
            personnel: 0,
            tents: 0,
            vehicles: 0,
            medicalTeams: 0,
            searchRescueTeams: 0
        };
    }
    
    // Senaryo bazlı hesaplamalar
    let teamsPer1000, personnelPer500, tentsPerPerson, vehiclesPerTeam, medicalRatio, searchRescueRatio;
    
    if (magnitudeRange === '7.5+') {
        // 7.5 ve üstü - En yüksek ihtiyaç
        teamsPer1000 = 1.5;
        personnelPer500 = 3.0;
        tentsPerPerson = 4.0;
        vehiclesPerTeam = 3;
        medicalRatio = 0.008; // Etkilenen nüfusun %0.8'i
        searchRescueRatio = 0.012; // Etkilenen nüfusun %1.2'si
    } else if (magnitudeRange === '7.0-7.5') {
        // 7.0 - 7.5 arası - Orta-yüksek ihtiyaç
        teamsPer1000 = 1.2;
        personnelPer500 = 2.5;
        tentsPerPerson = 4.5;
        vehiclesPerTeam = 2.5;
        medicalRatio = 0.006;
        searchRescueRatio = 0.010;
    } else {
        // 6.5 - 7.0 arası - Orta ihtiyaç
        teamsPer1000 = 1.0;
        personnelPer500 = 2.0;
        tentsPerPerson = 5.0;
        vehiclesPerTeam = 2;
        medicalRatio = 0.004;
        searchRescueRatio = 0.008;
    }
    
    const totalTeams = Math.ceil(affectedPopulation / (1000 / teamsPer1000));
    const totalPersonnel = Math.ceil(affectedPopulation / (500 / personnelPer500));
    const totalTents = Math.ceil(affectedPopulation / tentsPerPerson);
    const totalVehicles = Math.ceil(totalTeams * vehiclesPerTeam);
    const medicalTeams = Math.ceil(affectedPopulation * medicalRatio);
    const searchRescueTeams = Math.ceil(affectedPopulation * searchRescueRatio);
    
    return {
        affectedPopulation: affectedPopulation,
        teams: totalTeams,
        personnel: totalPersonnel,
        tents: totalTents,
        vehicles: totalVehicles,
        medicalTeams: medicalTeams,
        searchRescueTeams: searchRescueTeams
    };
}

// Calculate disaster response needs based on affected population
function calculateDisasterNeeds(affectedPopulation, magnitude) {
    if (affectedPopulation === 0) {
        return {
            teams: { toMove: 0, moving: 0, reached: 0 },
            personnel: { toMove: 0, moving: 0, reached: 0 },
            tasks: { started: 0, answered: 0, finished: 0 },
            requests: { started: 0, answered: 0, finished: 0 },
            victims: { dead: 0, injured: 0, missing: 0, trapped: 0, homeless: 0 }
        };
    }
    
    // Ekip hesaplamaları (her 1000-2000 kişi için 1 ekip)
    const teamsPer1000 = magnitude >= 7.5 ? 1.5 : magnitude >= 7.0 ? 1.2 : 1.0;
    const totalTeamsNeeded = Math.ceil(affectedPopulation / (1000 / teamsPer1000));
    
    // Personel hesaplamaları (her 200-500 kişi için 1 personel)
    const personnelPer500 = magnitude >= 7.5 ? 3 : magnitude >= 7.0 ? 2.5 : 2.0;
    const totalPersonnelNeeded = Math.ceil(affectedPopulation / (500 / personnelPer500));
    
    // Görev hesaplamaları (etkilenen nüfusun %10-20'si kadar görev)
    const taskRatio = magnitude >= 7.5 ? 0.20 : magnitude >= 7.0 ? 0.15 : 0.10;
    const totalTasks = Math.ceil(affectedPopulation * taskRatio);
    
    // Talep hesaplamaları (etkilenen nüfusun %5-15'i kadar talep)
    const requestRatio = magnitude >= 7.5 ? 0.15 : magnitude >= 7.0 ? 0.10 : 0.05;
    const totalRequests = Math.ceil(affectedPopulation * requestRatio);
    
    // Afetzede durumu (büyüklüğe göre)
    let victimRatios = {
        dead: 0,
        injured: 0,
        missing: 0,
        trapped: 0,
        homeless: 0
    };
    
    if (magnitude >= 8.0) {
        victimRatios = { dead: 0.002, injured: 0.015, missing: 0.001, trapped: 0.005, homeless: 0.25 };
    } else if (magnitude >= 7.5) {
        victimRatios = { dead: 0.001, injured: 0.010, missing: 0.0005, trapped: 0.003, homeless: 0.20 };
    } else if (magnitude >= 7.0) {
        victimRatios = { dead: 0.0005, injured: 0.007, missing: 0.0003, trapped: 0.002, homeless: 0.15 };
    } else if (magnitude >= 6.5) {
        victimRatios = { dead: 0.0002, injured: 0.005, missing: 0.0001, trapped: 0.001, homeless: 0.10 };
    }
    
    return {
        teams: {
            toMove: Math.ceil(totalTeamsNeeded * 0.4),
            moving: Math.ceil(totalTeamsNeeded * 0.3),
            reached: Math.ceil(totalTeamsNeeded * 0.3)
        },
        personnel: {
            toMove: Math.ceil(totalPersonnelNeeded * 0.4),
            moving: Math.ceil(totalPersonnelNeeded * 0.3),
            reached: Math.ceil(totalPersonnelNeeded * 0.3)
        },
        tasks: {
            started: Math.ceil(totalTasks * 0.6),
            answered: Math.ceil(totalTasks * 0.4),
            finished: Math.ceil(totalTasks * 0.2)
        },
        requests: {
            started: Math.ceil(totalRequests * 0.5),
            answered: Math.ceil(totalRequests * 0.3),
            finished: Math.ceil(totalRequests * 0.1)
        },
        victims: {
            dead: Math.ceil(affectedPopulation * victimRatios.dead),
            injured: Math.ceil(affectedPopulation * victimRatios.injured),
            missing: Math.ceil(affectedPopulation * victimRatios.missing),
            trapped: Math.ceil(affectedPopulation * victimRatios.trapped),
            homeless: Math.ceil(affectedPopulation * victimRatios.homeless)
        }
    };
}

// Load Dashboard Statistics
async function loadDashboardStatistics() {
    try {
        // Get provinces data for population
        const provincesResponse = await fetch(`${API_BASE}/provinces`);
        const provincesResult = await provincesResponse.json();
        
        if (!provincesResult.success || !provincesResult.data) {
            console.error('Provinces data not available');
            return;
        }
        
        let needs = null;
        let largestEarthquake = null;
        let affectedProvince = null;
        let affectedPopulation = 0;
        let magnitude = 0;
        let calculationType = 'general'; // 'general' or 'province'
        
        // Determine which province to use for calculation
        let targetProvince = null;
        if (selectedProvinceId) {
            targetProvince = provincesResult.data.find(p => p.id == selectedProvinceId);
            if (targetProvince) {
                calculationType = 'province';
            }
        }
        
        // If scenario is realtime, check for actual earthquakes
        if (selectedScenario === 'realtime') {
            // Get recent earthquakes (last 24 hours)
            const eqResponse = await fetch(`${API_BASE}/earthquakes/live?limit=100`);
        const eqResult = await eqResponse.json();
        
            // Find the largest earthquake in last 24 hours (6.5+)
            if (eqResult.success && eqResult.data && eqResult.data.length > 0) {
                // Filter earthquakes 6.5 and above
                const majorEarthquakes = eqResult.data.filter(eq => parseFloat(eq.buyukluk) >= 6.5);
                
                if (majorEarthquakes.length > 0) {
                    // If province is selected, filter earthquakes for that province
                    let filteredEarthquakes = majorEarthquakes;
                    if (targetProvince) {
                        filteredEarthquakes = majorEarthquakes.filter(eq => 
                            eq.il_adi === targetProvince.il_adi
                        );
                    }
                    
                    if (filteredEarthquakes.length > 0) {
                        // Find the largest one
                        largestEarthquake = filteredEarthquakes.reduce((max, eq) => 
                            parseFloat(eq.buyukluk) > parseFloat(max.buyukluk) ? eq : max
                        );
                        
                        // Use selected province or find from earthquake data
                        if (targetProvince) {
                            affectedProvince = targetProvince;
                        } else {
                            affectedProvince = provincesResult.data.find(p => 
                                p.il_adi === largestEarthquake.il_adi
                            );
                        }
                        
                        if (affectedProvince && affectedProvince.nufus) {
                            magnitude = parseFloat(largestEarthquake.buyukluk);
                            affectedPopulation = calculateAffectedPopulation(
                                magnitude,
                                parseInt(affectedProvince.nufus)
                            );
                        }
                    } else if (targetProvince) {
                        // Province selected but no earthquake for that province
                        needs = calculateDisasterNeeds(0, 0);
                    }
                }
            }
            
            // If no major earthquake, use default values (0)
            if (!needs) {
                needs = calculateDisasterNeeds(affectedPopulation, magnitude);
            }
        } else {
            // Scenario-based calculation
            // Determine magnitude for scenario
            if (selectedScenario === '6.5-7.0') {
                magnitude = 6.75;
            } else if (selectedScenario === '7.0-7.5') {
                magnitude = 7.25;
            } else if (selectedScenario === '7.5+') {
                magnitude = 7.75;
            }
            
            // Use selected province population or total Marmara population
            let targetPopulation = 0;
            if (targetProvince && targetProvince.nufus) {
                targetPopulation = parseInt(targetProvince.nufus);
                affectedProvince = targetProvince;
            } else {
                // Calculate total Marmara population
                targetPopulation = provincesResult.data.reduce((sum, p) => sum + (parseInt(p.nufus) || 0), 0);
            }
            
            // Calculate affected population for scenario
            affectedPopulation = calculateAffectedPopulation(magnitude, targetPopulation);
            
            // Calculate needs for scenario
            needs = calculateDisasterNeeds(affectedPopulation, magnitude);
            
            // Update emergency info for scenario
            const titleElement = document.getElementById('emergencyTitle');
            const locationElement = document.getElementById('emergencyLocation');
            const timeElement = document.getElementById('emergencyTime');
            const dateElement = document.getElementById('emergencyDate');
            
            if (targetProvince) {
                if (titleElement) titleElement.textContent = `${magnitude.toFixed(1)} Büyüklüğünde Deprem Senaryosu - ${targetProvince.il_adi}`;
                if (locationElement) locationElement.textContent = `${targetProvince.il_adi} (İl Bazında)`;
            } else {
                if (titleElement) titleElement.textContent = `${magnitude.toFixed(1)} Büyüklüğünde Deprem Senaryosu - Marmara Bölgesi`;
                if (locationElement) locationElement.textContent = 'Marmara Bölgesi (Tüm İller - Genel)';
            }
            
            const now = new Date();
            if (timeElement) timeElement.textContent = now.toLocaleTimeString('tr-TR');
            if (dateElement) dateElement.textContent = now.toLocaleDateString('tr-TR');
        }
        
        // Set task statistics
        const tasksStartedEl = document.getElementById('tasksStarted');
        const tasksAnsweredEl = document.getElementById('tasksAnswered');
        const tasksFinishedEl = document.getElementById('tasksFinished');
        if (tasksStartedEl) tasksStartedEl.textContent = needs.tasks.started.toLocaleString('tr-TR');
        if (tasksAnsweredEl) tasksAnsweredEl.textContent = needs.tasks.answered.toLocaleString('tr-TR');
        if (tasksFinishedEl) tasksFinishedEl.textContent = needs.tasks.finished.toLocaleString('tr-TR');
        
        // Set request statistics
        const requestsStartedEl = document.getElementById('requestsStarted');
        const requestsAnsweredEl = document.getElementById('requestsAnswered');
        const requestsFinishedEl = document.getElementById('requestsFinished');
        if (requestsStartedEl) requestsStartedEl.textContent = needs.requests.started.toLocaleString('tr-TR');
        if (requestsAnsweredEl) requestsAnsweredEl.textContent = needs.requests.answered.toLocaleString('tr-TR');
        if (requestsFinishedEl) requestsFinishedEl.textContent = needs.requests.finished.toLocaleString('tr-TR');
        
        // Set team statistics
        const teamsToMoveEl = document.getElementById('teamsToMove');
        const teamsMovingEl = document.getElementById('teamsMoving');
        const teamsReachedEl = document.getElementById('teamsReached');
        if (teamsToMoveEl) teamsToMoveEl.textContent = needs.teams.toMove.toLocaleString('tr-TR');
        if (teamsMovingEl) teamsMovingEl.textContent = needs.teams.moving.toLocaleString('tr-TR');
        if (teamsReachedEl) teamsReachedEl.textContent = needs.teams.reached.toLocaleString('tr-TR');
        
        // Set personnel statistics
        const personnelToMoveEl = document.getElementById('personnelToMove');
        const personnelMovingEl = document.getElementById('personnelMoving');
        const personnelReachedEl = document.getElementById('personnelReached');
        if (personnelToMoveEl) personnelToMoveEl.textContent = needs.personnel.toMove.toLocaleString('tr-TR');
        if (personnelMovingEl) personnelMovingEl.textContent = needs.personnel.moving.toLocaleString('tr-TR');
        if (personnelReachedEl) personnelReachedEl.textContent = needs.personnel.reached.toLocaleString('tr-TR');
        
        // Set victim statistics
        const victimsDeadEl = document.getElementById('victimsDead');
        const victimsInjuredEl = document.getElementById('victimsInjured');
        const victimsMissingEl = document.getElementById('victimsMissing');
        const victimsTrappedEl = document.getElementById('victimsTrapped');
        const victimsHomelessEl = document.getElementById('victimsHomeless');
        if (victimsDeadEl) victimsDeadEl.textContent = needs.victims.dead.toLocaleString('tr-TR');
        if (victimsInjuredEl) victimsInjuredEl.textContent = needs.victims.injured.toLocaleString('tr-TR');
        if (victimsMissingEl) victimsMissingEl.textContent = needs.victims.missing.toLocaleString('tr-TR');
        if (victimsTrappedEl) victimsTrappedEl.textContent = needs.victims.trapped.toLocaleString('tr-TR');
        if (victimsHomelessEl) victimsHomelessEl.textContent = needs.victims.homeless.toLocaleString('tr-TR');
        
        // Update emergency info if there's a major earthquake (only for realtime)
        if (selectedScenario === 'realtime') {
            const titleElement = document.getElementById('emergencyTitle');
            const locationElement = document.getElementById('emergencyLocation');
            const timeElement = document.getElementById('emergencyTime');
            const dateElement = document.getElementById('emergencyDate');
            
            if (largestEarthquake && affectedProvince) {
                if (titleElement) titleElement.textContent = `${largestEarthquake.buyukluk} Büyüklüğünde Deprem - ${affectedProvince.il_adi}`;
                if (locationElement) {
                    if (targetProvince && targetProvince.id == affectedProvince.id) {
                        locationElement.textContent = `${affectedProvince.il_adi}${largestEarthquake.ilce_adi ? ' - ' + largestEarthquake.ilce_adi : ''} (İl Bazında)`;
                    } else {
                        locationElement.textContent = `${affectedProvince.il_adi}${largestEarthquake.ilce_adi ? ' - ' + largestEarthquake.ilce_adi : ''}`;
                    }
                }
                
                const eqDate = new Date(largestEarthquake.tarih_saat);
                if (timeElement) timeElement.textContent = eqDate.toLocaleTimeString('tr-TR');
                if (dateElement) dateElement.textContent = eqDate.toLocaleDateString('tr-TR');
            } else {
                // Reset to default if no earthquake
                if (titleElement) {
                    if (targetProvince) {
                        titleElement.textContent = `Aktif Afet Durumu - ${targetProvince.il_adi}`;
                    } else {
                        titleElement.textContent = 'Aktif Afet Durumu';
                    }
                }
                if (locationElement) {
                    if (targetProvince) {
                        locationElement.textContent = `${targetProvince.il_adi} (İl Bazında - Deprem Yok)`;
                    } else {
                        locationElement.textContent = '-';
                    }
                }
                if (timeElement) timeElement.textContent = '-';
                if (dateElement) dateElement.textContent = '-';
            }
        }
        
    } catch (error) {
        console.error('Error loading dashboard statistics:', error);
    }
}

// Initialize Charts (Instant loading - NO DELAYS)
async function initCharts() {
    // Chart.js should be loaded in head, but check anyway
    if (typeof Chart === 'undefined') {
        // Try once more on next frame
        requestAnimationFrame(() => {
            if (typeof Chart !== 'undefined') {
                initCharts();
            }
        });
        return;
    }
    
    try {
        // Shelter Chart kaldırıldı
        // Needs Chart kaldırıldı
    
    // Needs Chart (Line Chart) - Calculate based on scenario
        await initNeedsChart();
    } catch (error) {
        console.error('Error initializing needs chart:', error);
    }
    
    // Urban Transformation Priority Chart - Instant
    initUrbanTransformationChart();
    
    // Last 30 Days Earthquake Chart - Load from database
    await initEarthquake30DaysChart();
    
    // Impact Distribution Charts - Instant
    initImpactDistributionCharts();
}

// Shelter Chart fonksiyonları kaldırıldı
    
// Needs Chart fonksiyonları kaldırıldı

// Get current magnitude from selected scenario
function getCurrentMagnitude() {
    const activeScenario = document.querySelector('.scenario-btn.active');
    if (!activeScenario) return 6.75;
    
    const scenario = activeScenario.dataset.scenario;
    if (scenario === '6.5-7.0') return 6.75;
    if (scenario === '7.0-7.5') return 7.25;
    if (scenario === '7.5+') return 7.75;
    return 6.75; // Default
}

// Get total Marmara population
async function getTotalMarmaraPopulation() {
    try {
        const response = await fetch(`${API_BASE}/provinces/marmara`);
        const result = await response.json();
        
        if (result.success && result.data) {
            return result.data.reduce((sum, p) => sum + (parseInt(p.nufus) || 0), 0);
        }
        return 26549840; // Default Marmara population
    } catch (error) {
        console.error('Error fetching population:', error);
        return 26549840; // Default
    }
}

// createNeedsChart fonksiyonu kaldırıldı

// Initialize Last 30 Days Earthquake Chart
async function initEarthquake30DaysChart() {
    try {
        const chartCtx = document.getElementById('earthquake30DaysChart');
        if (!chartCtx || earthquake30DaysChart) return;
        
        // Fetch data from API
        const response = await fetch(`${API_BASE}/earthquakes/last30days`);
        const result = await response.json();
        
        if (!result.success || !result.data || result.data.length === 0) {
            console.warn('No earthquake data available for last 30 days chart');
            return;
        }
        
        const labels = result.data.map(item => item.il_adi);
        const counts = result.data.map(item => parseInt(item.deprem_sayisi || 0));
        
        // Color based on earthquake count (more earthquakes = darker red)
        const colors = counts.map(count => {
            if (count >= 200) return 'rgba(192, 57, 43, 0.8)';      // Dark Red - Very High
            if (count >= 100) return 'rgba(231, 76, 60, 0.8)';      // Red - High
            if (count >= 50) return 'rgba(230, 126, 34, 0.8)';     // Orange - Medium-High
            if (count >= 20) return 'rgba(241, 196, 15, 0.8)';      // Yellow - Medium
            return 'rgba(46, 204, 113, 0.8)';                       // Green - Low
        });
        
        earthquake30DaysChart = new Chart(chartCtx, {
            type: 'bar',
            data: {
                labels: labels,
                datasets: [{
                    label: 'Deprem Sayısı',
                    data: counts,
                    backgroundColor: colors,
                    borderColor: colors.map(c => c.replace('0.8', '1')),
                    borderWidth: 2
                }]
            },
            options: {
                indexAxis: 'y', // Horizontal bar chart
                responsive: true,
                maintainAspectRatio: false,
                animation: {
                    duration: 1000,
                    easing: 'easeInOutQuart'
                },
                plugins: {
                    legend: {
                        display: false
                    },
                    tooltip: {
                        callbacks: {
                            label: function(context) {
                                const count = context.parsed.x;
                                const item = result.data[context.dataIndex];
                                const avgMag = parseFloat(item.ortalama_buyukluk || 0).toFixed(2);
                                const maxMag = parseFloat(item.max_buyukluk || 0).toFixed(2);
                                return [
                                    `Deprem Sayısı: ${count}`,
                                    `Ortalama Büyüklük: ${avgMag}`,
                                    `Max Büyüklük: ${maxMag}`
                                ];
                            }
                        }
                    }
                },
                scales: {
                    x: {
                        beginAtZero: true,
                        title: {
                            display: true,
                            text: 'Deprem Sayısı',
                            color: '#e0e0e0',
                            font: {
                                size: 12
                            }
                        },
                        ticks: {
                            color: '#aaa',
                            font: {
                                size: 11
                            },
                            stepSize: 1,
                            precision: 0
                        },
                        grid: {
                            color: 'rgba(255, 255, 255, 0.1)'
                        }
                    },
                    y: {
                        title: {
                            display: true,
                            text: 'İller',
                            color: '#e0e0e0',
                            font: {
                                size: 12
                            }
                        },
                        ticks: {
                            color: '#e0e0e0',
                            font: {
                                size: 11
                            }
                        },
                        grid: {
                            color: 'rgba(255, 255, 255, 0.1)'
                        }
                    }
                },
                layout: {
                    padding: {
                        top: 10,
                        bottom: 10,
                        left: 10,
                        right: 10
                    }
                }
            }
        });
        
        console.log('✅ Last 30 days earthquake chart initialized');
        
        // Load analysis data
        await loadEarthquakeAnalysis(result.data);
    } catch (error) {
        console.error('Error initializing last 30 days earthquake chart:', error);
    }
}

// Load and display earthquake analysis
async function loadEarthquakeAnalysis(data) {
    try {
        if (!data || data.length === 0) return;
        
        // Calculate statistics
        const total = data.reduce((sum, item) => sum + parseInt(item.deprem_sayisi || 0), 0);
        const bigEarthquakes = data.reduce((sum, item) => {
            // Count earthquakes >= 3.0 based on max_buyukluk
            const maxMag = parseFloat(item.max_buyukluk || 0);
            if (maxMag >= 3.0) {
                // Estimate: if max is 3.0+, there's at least one big earthquake
                // We can count provinces with max >= 3.0 as having at least one
                return sum + 1;
            }
            return sum;
        }, 0);
        const dailyAverage = (total / 30).toFixed(1);
        
        // Find most risky province (most earthquakes)
        const mostRisky = data.reduce((max, item) => {
            const count = parseInt(item.deprem_sayisi || 0);
            const maxCount = parseInt(max.deprem_sayisi || 0);
            return count > maxCount ? item : max;
        }, data[0]);
        
        // Update UI
        const mostRiskyEl = document.getElementById('mostRiskyProvince');
        const totalEl = document.getElementById('totalEarthquakes');
        const bigEl = document.getElementById('bigEarthquakes');
        const dailyEl = document.getElementById('dailyAverage');
        const recommendationEl = document.getElementById('analysisRecommendation');
        
        if (mostRiskyEl) {
            const riskyCount = parseInt(mostRisky.deprem_sayisi);
            const riskyMax = parseFloat(mostRisky.max_buyukluk).toFixed(2);
            mostRiskyEl.innerHTML = `<strong style="color: #f39c12;">${mostRisky.il_adi}</strong><br><span style="font-size: 14px; color: #aaa;">${riskyCount} deprem (Max: ${riskyMax})</span>`;
        }
        
        if (totalEl) {
            totalEl.innerHTML = `<strong style="color: #3498db;">${total}</strong> <span style="font-size: 14px; color: #aaa;">deprem</span>`;
        }
        
        if (bigEl) {
            // Count actual big earthquakes (>= 3.0)
            const actualBigCount = data.reduce((sum, item) => {
                const maxMag = parseFloat(item.max_buyukluk || 0);
                if (maxMag >= 3.0) {
                    // Rough estimate: if max is 3.0+, assume at least 1-2 big ones
                    return sum + Math.max(1, Math.floor(parseInt(item.deprem_sayisi || 0) * 0.05));
                }
                return sum;
            }, 0);
            const percentage = ((actualBigCount/total)*100).toFixed(1);
            bigEl.innerHTML = `<strong style="color: #e67e22;">${actualBigCount}</strong> <span style="font-size: 14px; color: #aaa;">adet (${percentage}%)</span>`;
        }
        
        if (dailyEl) {
            dailyEl.innerHTML = `<strong style="color: #9b59b6;">${dailyAverage}</strong> <span style="font-size: 14px; color: #aaa;">deprem/gün</span>`;
        }
        
        if (recommendationEl) {
            let recommendation = '';
            if (parseInt(mostRisky.deprem_sayisi) >= 200) {
                recommendation = `${mostRisky.il_adi} bölgesinde çok yüksek sismik aktivite gözlemleniyor. Acil durum planları gözden geçirilmeli ve sürekli izleme yapılmalı.`;
            } else if (parseInt(mostRisky.deprem_sayisi) >= 50) {
                recommendation = `${mostRisky.il_adi} bölgesinde yüksek aktivite var. Erken uyarı sistemleri aktif tutulmalı ve bina güvenliği denetimleri yapılmalı.`;
            } else {
                recommendation = 'Marmara bölgesinde normal seviyede sismik aktivite var. Düzenli izleme ve hazırlık çalışmaları devam etmeli.';
            }
            recommendationEl.textContent = recommendation;
        }
        
    } catch (error) {
        console.error('Error loading earthquake analysis:', error);
    }
}

// Initialize Urban Transformation Priority Chart
async function initUrbanTransformationChart() {
    try {
        const urbanCtx = document.getElementById('urbanTransformationChart');
        if (!urbanCtx || urbanTransformationChart) return;
        
        // Fetch all province risk data
        const response = await fetch(`${API_BASE}/risks/all-averages`);
        const result = await response.json();
        
        if (!result.success || !result.data || result.data.length === 0) {
            console.warn('No risk data available for urban transformation chart');
            return;
        }
        
        // Sort by earthquake risk (descending) - highest priority first
        const sortedData = result.data
            .filter(item => item.ortalama_deprem_riski !== null)
            .sort((a, b) => (b.ortalama_deprem_riski || 0) - (a.ortalama_deprem_riski || 0));
        
        const labels = sortedData.map(item => item.il_adi);
        const riskScores = sortedData.map(item => parseFloat(item.ortalama_deprem_riski || 0));
        
        // Color coding based on risk level
        const colors = riskScores.map(score => {
            if (score >= 80) return 'rgba(231, 76, 60, 0.8)';      // Red - Very High
            if (score >= 60) return 'rgba(230, 126, 34, 0.8)';    // Orange - High
            if (score >= 40) return 'rgba(241, 196, 15, 0.8)';    // Yellow - Medium
            return 'rgba(46, 204, 113, 0.8)';                     // Green - Low
        });
        
        urbanTransformationChart = new Chart(urbanCtx, {
            type: 'bar',
            data: {
                labels: labels,
                datasets: [{
                    label: 'Deprem Riski Skoru',
                    data: riskScores,
                    backgroundColor: colors,
                    borderColor: colors.map(c => c.replace('0.8', '1')),
                    borderWidth: 2
                }]
            },
            options: {
                indexAxis: 'y', // Horizontal bar chart
                responsive: true,
                maintainAspectRatio: false,
                animation: {
                    duration: 1000,
                    easing: 'easeInOutQuart'
                },
                plugins: {
                    legend: {
                        display: false
                    },
                    tooltip: {
                        callbacks: {
                            label: function(context) {
                                const score = context.parsed.x;
                                let priority = '';
                                if (score >= 80) priority = 'Çok Yüksek Öncelik';
                                else if (score >= 60) priority = 'Yüksek Öncelik';
                                else if (score >= 40) priority = 'Orta Öncelik';
                                else priority = 'Düşük Öncelik';
                                return `Risk Skoru: ${score.toFixed(1)} - ${priority}`;
                            }
                        }
                    }
                },
                scales: {
                    x: {
                        beginAtZero: true,
                        max: 100,
                        title: {
                            display: true,
                            text: 'Deprem Riski Skoru (0-100)',
                            color: '#e0e0e0',
                            font: {
                                size: 12
                            }
                        },
                        ticks: {
                            color: '#aaa',
                            font: {
                                size: 11
                            }
                        },
                        grid: {
                            color: 'rgba(255, 255, 255, 0.1)'
                        }
                    },
                    y: {
                        title: {
                            display: true,
                            text: 'İller',
                            color: '#e0e0e0',
                            font: {
                                size: 12
                            }
                        },
                        ticks: {
                            color: '#e0e0e0',
                            font: {
                                size: 11
                            }
                        },
                        grid: {
                            color: 'rgba(255, 255, 255, 0.1)'
                        }
                    }
                },
                layout: {
                    padding: {
                        top: 10,
                        bottom: 10,
                        left: 10,
                        right: 10
                    }
                }
            }
        });
        
        console.log('✅ Urban transformation chart initialized');
    } catch (error) {
        console.error('Error initializing urban transformation chart:', error);
    }
}

// Initialize Impact Distribution Charts
async function initImpactDistributionCharts() {
    try {
        // Senaryo verileri - Marmara bölgesi için gerçekçi tahminler
        // 7.6 büyüklüğünde deprem için en az 70.000 ölü tahmin ediliyor
        const scenarioData = {
            magnitudes: [6.0, 6.5, 7.0, 7.5, 7.6],
            // Müdahale edilmezse
            deathsNoIntervention: [800, 2500, 12000, 45000, 70000],
            injuredNoIntervention: [8000, 25000, 120000, 450000, 700000],
            homelessNoIntervention: [80000, 250000, 1200000, 4500000, 7000000],
            damageNoIntervention: [8.5, 25.0, 120.0, 450.0, 700.0],
            // Müdahale edilirse (önlemler alınırsa azaltılmış değerler)
            deathsWithIntervention: [200, 600, 3000, 12000, 20000],      // %70-75 azalma
            injuredWithIntervention: [3000, 10000, 50000, 180000, 280000], // %60-65 azalma
            homelessWithIntervention: [40000, 120000, 600000, 2200000, 3500000], // %50 azalma
            damageWithIntervention: [5.0, 15.0, 70.0, 280.0, 420.0]      // %40 azalma
        };
        
        const labels = scenarioData.magnitudes.map(m => `M${m}`);
        
        // Mevcut chart'ları yok et
        if (impactChartDeaths) {
            impactChartDeaths.destroy();
            impactChartDeaths = null;
        }
        if (impactChartInjured) {
            impactChartInjured.destroy();
            impactChartInjured = null;
        }
        if (impactChartHomeless) {
            impactChartHomeless.destroy();
            impactChartHomeless = null;
        }
        if (impactChartDamage) {
            impactChartDamage.destroy();
            impactChartDamage = null;
        }
        
        const commonOptions = {
            responsive: true,
            maintainAspectRatio: false,
            animation: {
                duration: 800,
                easing: 'easeInOutQuart'
            },
            plugins: {
                legend: {
                    display: false
                },
                tooltip: {
                    backgroundColor: 'rgba(0, 0, 0, 0.85)',
                    titleColor: '#fff',
                    bodyColor: '#e0e0e0',
                    borderColor: 'rgba(255, 255, 255, 0.1)',
                    borderWidth: 1,
                    padding: 12,
                    cornerRadius: 8
                }
            },
            scales: {
                x: {
                    ticks: {
                        color: '#aaa',
                        font: {
                            size: 11
                        }
                    },
                    grid: {
                        color: 'rgba(255, 255, 255, 0.05)',
                        drawBorder: false
                    }
                },
                y: {
                    ticks: {
                        color: '#aaa',
                        font: {
                            size: 10
                        }
                    },
                    grid: {
                        color: 'rgba(255, 255, 255, 0.05)',
                        drawBorder: false
                    },
                    beginAtZero: true
                }
            },
            layout: {
                padding: {
                    top: 10,
                    bottom: 10,
                    left: 10,
                    right: 10
                }
            }
        };
        
        // 1. Ölü Sayısı Chart (Kırmızı) - Karşılaştırmalı
        const deathsCtx = document.getElementById('impactChartDeaths');
        if (deathsCtx) {
            impactChartDeaths = new Chart(deathsCtx, {
                type: 'bar',
                data: {
                    labels: labels,
                    datasets: [
                        {
                            label: 'Müdahale Edilmezse',
                            data: scenarioData.deathsNoIntervention,
                            backgroundColor: 'rgba(231, 76, 60, 0.8)',
                            borderColor: 'rgba(231, 76, 60, 1)',
                            borderWidth: 2,
                            borderRadius: 4
                        },
                        {
                            label: 'Müdahale Edilirse',
                            data: scenarioData.deathsWithIntervention,
                            backgroundColor: 'rgba(46, 204, 113, 0.8)',
                            borderColor: 'rgba(46, 204, 113, 1)',
                            borderWidth: 2,
                            borderRadius: 4
                        }
                    ]
                },
                options: {
                    ...commonOptions,
                    datasets: {
                        bar: {
                            barPercentage: 0.6,
                            categoryPercentage: 0.8
                        }
                    },
                    scales: {
                        ...commonOptions.scales,
                        y: {
                            ...commonOptions.scales.y,
                            ticks: {
                                ...commonOptions.scales.y.ticks,
                                callback: function(value) {
                                    if (value >= 1000) {
                                        return (value / 1000).toFixed(0) + 'k';
                                    }
                                    return value;
                                }
                            }
                        }
                    },
                    plugins: {
                        ...commonOptions.plugins,
                        tooltip: {
                            ...commonOptions.plugins.tooltip,
                            callbacks: {
                                label: function(context) {
                                    const value = context.parsed.y;
                                    const datasetLabel = context.dataset.label;
                                    const reduction = datasetLabel === 'Müdahale Edilirse' 
                                        ? Math.round((1 - value / scenarioData.deathsNoIntervention[context.dataIndex]) * 100)
                                        : 0;
                                    let tooltip = `${datasetLabel}: ${value.toLocaleString('tr-TR')} kişi`;
                                    if (reduction > 0) {
                                        tooltip += ` (${reduction}% azalma)`;
                                    }
                                    return tooltip;
                                }
                            }
                        }
                    }
                }
            });
        }
        
        // 2. Yaralı Sayısı Chart (Turuncu) - Bin birimiyle - Karşılaştırmalı
        const injuredCtx = document.getElementById('impactChartInjured');
        if (injuredCtx) {
            const injuredDataNoIntervention = scenarioData.injuredNoIntervention.map(v => v / 1000);
            const injuredDataWithIntervention = scenarioData.injuredWithIntervention.map(v => v / 1000);
            impactChartInjured = new Chart(injuredCtx, {
                type: 'bar',
                data: {
                    labels: labels,
                    datasets: [
                        {
                            label: 'Müdahale Edilmezse',
                            data: injuredDataNoIntervention,
                            backgroundColor: 'rgba(230, 126, 34, 0.8)',
                            borderColor: 'rgba(230, 126, 34, 1)',
                            borderWidth: 2,
                            borderRadius: 4
                        },
                        {
                            label: 'Müdahale Edilirse',
                            data: injuredDataWithIntervention,
                            backgroundColor: 'rgba(46, 204, 113, 0.8)',
                            borderColor: 'rgba(46, 204, 113, 1)',
                            borderWidth: 2,
                            borderRadius: 4
                        }
                    ]
                },
                options: {
                    ...commonOptions,
                    datasets: {
                        bar: {
                            barPercentage: 0.6,
                            categoryPercentage: 0.8
                        }
                    },
                    scales: {
                        ...commonOptions.scales,
                        y: {
                            ...commonOptions.scales.y,
                            ticks: {
                                ...commonOptions.scales.y.ticks,
                                callback: function(value) {
                                    if (value >= 1000) {
                                        return (value / 1000).toFixed(1) + 'M';
                                    }
                                    return value.toFixed(0) + ' bin';
                                }
                            }
                        }
                    },
                    plugins: {
                        ...commonOptions.plugins,
                        tooltip: {
                            ...commonOptions.plugins.tooltip,
                            callbacks: {
                                label: function(context) {
                                    const value = context.parsed.y;
                                    const originalValue = value * 1000;
                                    const datasetLabel = context.dataset.label;
                                    const reduction = datasetLabel === 'Müdahale Edilirse'
                                        ? Math.round((1 - originalValue / scenarioData.injuredNoIntervention[context.dataIndex]) * 100)
                                        : 0;
                                    let tooltip = `${datasetLabel}: ${originalValue.toLocaleString('tr-TR')} kişi (${value.toFixed(1)} bin)`;
                                    if (reduction > 0) {
                                        tooltip += ` (${reduction}% azalma)`;
                                    }
                                    return tooltip;
                                }
                            }
                        }
                    }
                }
            });
        }
        
        // 3. Evsiz Sayısı Chart (Sarı) - Bin birimiyle - Karşılaştırmalı
        const homelessCtx = document.getElementById('impactChartHomeless');
        if (homelessCtx) {
            const homelessDataNoIntervention = scenarioData.homelessNoIntervention.map(v => v / 1000);
            const homelessDataWithIntervention = scenarioData.homelessWithIntervention.map(v => v / 1000);
            impactChartHomeless = new Chart(homelessCtx, {
                type: 'bar',
                data: {
                    labels: labels,
                    datasets: [
                        {
                            label: 'Müdahale Edilmezse',
                            data: homelessDataNoIntervention,
                            backgroundColor: 'rgba(241, 196, 15, 0.8)',
                            borderColor: 'rgba(241, 196, 15, 1)',
                            borderWidth: 2,
                            borderRadius: 4
                        },
                        {
                            label: 'Müdahale Edilirse',
                            data: homelessDataWithIntervention,
                            backgroundColor: 'rgba(46, 204, 113, 0.8)',
                            borderColor: 'rgba(46, 204, 113, 1)',
                            borderWidth: 2,
                            borderRadius: 4
                        }
                    ]
                },
                options: {
                    ...commonOptions,
                    datasets: {
                        bar: {
                            barPercentage: 0.6,
                            categoryPercentage: 0.8
                        }
                    },
                    scales: {
                        ...commonOptions.scales,
                        y: {
                            ...commonOptions.scales.y,
                            ticks: {
                                ...commonOptions.scales.y.ticks,
                                callback: function(value) {
                                    if (value >= 1000) {
                                        return (value / 1000).toFixed(1) + 'M';
                                    }
                                    return value.toFixed(0) + ' bin';
                                }
                            }
                        }
                    },
                    plugins: {
                        ...commonOptions.plugins,
                        tooltip: {
                            ...commonOptions.plugins.tooltip,
                            callbacks: {
                                label: function(context) {
                                    const value = context.parsed.y;
                                    const originalValue = value * 1000;
                                    const datasetLabel = context.dataset.label;
                                    const displayValue = value >= 1000 
                                        ? (value / 1000).toFixed(1) + 'M' 
                                        : value.toFixed(1) + ' bin';
                                    const reduction = datasetLabel === 'Müdahale Edilirse'
                                        ? Math.round((1 - originalValue / scenarioData.homelessNoIntervention[context.dataIndex]) * 100)
                                        : 0;
                                    let tooltip = `${datasetLabel}: ${originalValue.toLocaleString('tr-TR')} kişi (${displayValue})`;
                                    if (reduction > 0) {
                                        tooltip += ` (${reduction}% azalma)`;
                                    }
                                    return tooltip;
                                }
                            }
                        }
                    }
                }
            });
        }
        
        // 4. Ekonomik Hasar Chart (Mor) - Milyar TL - Karşılaştırmalı
        const damageCtx = document.getElementById('impactChartDamage');
        if (damageCtx) {
            impactChartDamage = new Chart(damageCtx, {
                type: 'bar',
                data: {
                    labels: labels,
                    datasets: [
                        {
                            label: 'Müdahale Edilmezse',
                            data: scenarioData.damageNoIntervention,
                            backgroundColor: 'rgba(155, 89, 182, 0.8)',
                            borderColor: 'rgba(155, 89, 182, 1)',
                            borderWidth: 2,
                            borderRadius: 4
                        },
                        {
                            label: 'Müdahale Edilirse',
                            data: scenarioData.damageWithIntervention,
                            backgroundColor: 'rgba(46, 204, 113, 0.8)',
                            borderColor: 'rgba(46, 204, 113, 1)',
                            borderWidth: 2,
                            borderRadius: 4
                        }
                    ]
                },
                options: {
                    ...commonOptions,
                    datasets: {
                        bar: {
                            barPercentage: 0.6,
                            categoryPercentage: 0.8
                        }
                    },
                    scales: {
                        ...commonOptions.scales,
                        y: {
                            ...commonOptions.scales.y,
                            ticks: {
                                ...commonOptions.scales.y.ticks,
                                callback: function(value) {
                                    return value.toFixed(0) + ' Milyar TL';
                                }
                            }
                        }
                    },
                    plugins: {
                        ...commonOptions.plugins,
                        tooltip: {
                            ...commonOptions.plugins.tooltip,
                            callbacks: {
                                label: function(context) {
                                    const value = context.parsed.y;
                                    const datasetLabel = context.dataset.label;
                                    const reduction = datasetLabel === 'Müdahale Edilirse'
                                        ? Math.round((1 - value / scenarioData.damageNoIntervention[context.dataIndex]) * 100)
                                        : 0;
                                    let tooltip = `${datasetLabel}: ${value.toFixed(1)} Milyar TL`;
                                    if (reduction > 0) {
                                        tooltip += ` (${reduction}% azalma)`;
                                    }
                                    return tooltip;
                                }
                            }
                        }
                    }
                }
            });
        }
        
        console.log('✅ Impact distribution charts initialized');
    } catch (error) {
        console.error('Error initializing impact distribution charts:', error);
    }
}



// Load Earthquake Scenarios
async function loadEarthquakeScenarios() {
    try {
        const scenariosContainer = document.getElementById('earthquakeScenariosList');
        if (!scenariosContainer) return;
        
        // Get provinces data for population
        const provincesResponse = await fetch(`${API_BASE}/provinces`);
        const provincesResult = await provincesResponse.json();
        
        if (!provincesResult.success || !provincesResult.data) {
            scenariosContainer.innerHTML = '<div class="error-text">İl verileri yüklenemedi.</div>';
            return;
        }
        
        // Calculate total Marmara population
        const totalPopulation = provincesResult.data.reduce((sum, p) => sum + (parseInt(p.nufus) || 0), 0);
        
        // Calculate scenarios for different magnitude ranges
        const scenarios = [
            { range: '6.5-7.0', label: '6.5 - 7.0 Arası Deprem', color: '#f39c12' },
            { range: '7.0-7.5', label: '7.0 - 7.5 Arası Deprem', color: '#e67e22' },
            { range: '7.5+', label: '7.5 ve Üstü Deprem', color: '#e74c3c' }
        ];
        
        scenariosContainer.innerHTML = '';
        
        scenarios.forEach(scenario => {
            const needs = calculateScenarioNeeds(scenario.range, totalPopulation);
            
            const scenarioCard = document.createElement('div');
            scenarioCard.className = 'scenario-card';
            scenarioCard.style.borderLeft = `4px solid ${scenario.color}`;
            
            scenarioCard.innerHTML = `
                <div class="scenario-header">
                    <h4 style="color: ${scenario.color}">${scenario.label}</h4>
                    <span class="scenario-badge" style="background-color: ${scenario.color}20; color: ${scenario.color}">
                        ${scenario.range}
                    </span>
                </div>
                <div class="scenario-content">
                    <div class="scenario-stats-grid">
                        <div class="scenario-stat-item">
                            <div class="stat-icon">👥</div>
                            <div class="stat-details">
                                <span class="stat-label">Etkilenen Nüfus</span>
                                <span class="stat-value">${needs.affectedPopulation.toLocaleString('tr-TR')}</span>
                            </div>
                        </div>
                        <div class="scenario-stat-item">
                            <div class="stat-icon">🚑</div>
                            <div class="stat-details">
                                <span class="stat-label">Gerekli Ekip Sayısı</span>
                                <span class="stat-value">${needs.teams.toLocaleString('tr-TR')}</span>
                            </div>
                        </div>
                        <div class="scenario-stat-item">
                            <div class="stat-icon">👤</div>
                            <div class="stat-details">
                                <span class="stat-label">Gerekli Personel Sayısı</span>
                                <span class="stat-value">${needs.personnel.toLocaleString('tr-TR')}</span>
                            </div>
                        </div>
                        <div class="scenario-stat-item">
                            <div class="stat-icon">⛺</div>
                            <div class="stat-details">
                                <span class="stat-label">Gerekli Çadır Sayısı</span>
                                <span class="stat-value">${needs.tents.toLocaleString('tr-TR')}</span>
                            </div>
                        </div>
                        <div class="scenario-stat-item">
                            <div class="stat-icon">🚗</div>
                            <div class="stat-details">
                                <span class="stat-label">Gerekli Araç Sayısı</span>
                                <span class="stat-value">${needs.vehicles.toLocaleString('tr-TR')}</span>
                            </div>
                        </div>
                        <div class="scenario-stat-item">
                            <div class="stat-icon">🏥</div>
                            <div class="stat-details">
                                <span class="stat-label">Tıbbi Ekip Sayısı</span>
                                <span class="stat-value">${needs.medicalTeams.toLocaleString('tr-TR')}</span>
                            </div>
                        </div>
                        <div class="scenario-stat-item">
                            <div class="stat-icon">🔍</div>
                            <div class="stat-details">
                                <span class="stat-label">Arama-Kurtarma Ekip Sayısı</span>
                                <span class="stat-value">${needs.searchRescueTeams.toLocaleString('tr-TR')}</span>
                            </div>
                        </div>
                    </div>
                </div>
            `;
            
            scenariosContainer.appendChild(scenarioCard);
        });
        
    } catch (error) {
        console.error('Error loading earthquake scenarios:', error);
        const scenariosContainer = document.getElementById('earthquakeScenariosList');
        if (scenariosContainer) {
            scenariosContainer.innerHTML = '<div class="error-text">Senaryo verileri yüklenirken hata oluştu.</div>';
        }
    }
}

// Calculate detailed disaster needs based on affected population and magnitude
function calculateDetailedNeeds(affectedPopulation, magnitude) {
    if (affectedPopulation === 0 || magnitude < 6.5) {
        return {
            tents: 0,
            blankets: 0,
            food: 0,
            water: 0,
            medical: 0,
            searchRescue: 0,
            medicalTeams: 0,
            vehicles: 0,
            personnel: 0,
            communication: 0
        };
    }
    
    // Büyüklüğe göre ihtiyaç katsayıları
    let coefficients = {};
    
    if (magnitude >= 7.5) {
        // 7.5+ - Çok yüksek şiddetli deprem
        coefficients = {
            tentsPerPerson: 4.0,        // Her 4 kişi için 1 çadır
            blanketsPerPerson: 2.0,      // Her kişi için 2 battaniye
            foodPerPerson: 2.5,          // Her kişi için 2.5 kg gıda (günlük)
            waterPerPerson: 5.0,         // Her kişi için 5 litre su (günlük)
            medicalPer1000: 50,          // Her 1000 kişi için 50 kutu tıbbi malzeme
            searchRescuePer1000: 15,     // Her 1000 kişi için 15 arama-kurtarma ekibi
            medicalTeamsPer1000: 8,       // Her 1000 kişi için 8 tıbbi ekip
            vehiclesPer1000: 25,          // Her 1000 kişi için 25 araç
            personnelPer1000: 200,        // Her 1000 kişi için 200 personel
            communicationPer1000: 10      // Her 1000 kişi için 10 iletişim cihazı
        };
    } else if (magnitude >= 7.0) {
        // 7.0 - 7.5 arası - Yüksek şiddetli deprem
        coefficients = {
            tentsPerPerson: 4.5,
            blanketsPerPerson: 1.8,
            foodPerPerson: 2.0,
            waterPerPerson: 4.0,
            medicalPer1000: 40,
            searchRescuePer1000: 12,
            medicalTeamsPer1000: 6,
            vehiclesPer1000: 20,
            personnelPer1000: 150,
            communicationPer1000: 8
        };
    } else {
        // 6.5 - 7.0 arası - Orta şiddetli deprem
        coefficients = {
            tentsPerPerson: 5.0,
            blanketsPerPerson: 1.5,
            foodPerPerson: 1.5,
            waterPerPerson: 3.0,
            medicalPer1000: 30,
            searchRescuePer1000: 10,
            medicalTeamsPer1000: 4,
            vehiclesPer1000: 15,
            personnelPer1000: 100,
            communicationPer1000: 6
        };
    }
    
    // 7 günlük ihtiyaç hesaplama (afet sonrası ilk hafta)
    const days = 7;
    
    // Evsiz sayısını hesapla (magnitude'a göre)
    let homelessRatio = 0.10; // Default for 6.5-7.0
    if (magnitude >= 8.0) {
        homelessRatio = 0.25;
    } else if (magnitude >= 7.5) {
        homelessRatio = 0.20;
    } else if (magnitude >= 7.0) {
        homelessRatio = 0.15;
    } else if (magnitude >= 6.5) {
        homelessRatio = 0.10;
    }
    const homelessCount = Math.ceil(affectedPopulation * homelessRatio);
    
    return {
        // Çadır: Her evsiz için 2 çadır (aile başına)
        tents: Math.ceil(homelessCount * 2),
        // Battaniye: Her çadır için 7.5 battaniye (ortalama)
        blankets: Math.ceil(homelessCount * 2 * 7.5),
        food: Math.ceil(affectedPopulation * coefficients.foodPerPerson * days), // 7 günlük gıda
        water: Math.ceil(affectedPopulation * coefficients.waterPerPerson * days), // 7 günlük su
        medical: Math.ceil((affectedPopulation / 1000) * coefficients.medicalPer1000),
        searchRescue: Math.ceil((affectedPopulation / 1000) * coefficients.searchRescuePer1000),
        medicalTeams: Math.ceil((affectedPopulation / 1000) * coefficients.medicalTeamsPer1000),
        vehicles: Math.ceil((affectedPopulation / 1000) * coefficients.vehiclesPer1000),
        personnel: Math.ceil((affectedPopulation / 1000) * coefficients.personnelPer1000),
        communication: Math.ceil((affectedPopulation / 1000) * coefficients.communicationPer1000)
    };
}

// loadEstimates fonksiyonu kaldırıldı - Estimates card kaldırıldı

// Transport Routes State
let transportRoutesMap = null;
let transportRouteLayers = [];

// Load Transport Routes
async function loadTransportRoutes(targetIlId) {
    try {
        const container = document.getElementById('transportRoutesContainer');
        const subtitle = document.getElementById('transportRoutesSubtitle');
        const routesList = document.getElementById('transportRoutesList');
        
        if (!container || !routesList) return;

        // Get target province name
        const provincesResponse = await fetch(`${API_BASE}/provinces`);
        const provincesResult = await provincesResponse.json();
        const targetProvince = provincesResult.data.find(p => p.id == targetIlId);
        
        if (!targetProvince) {
            container.style.display = 'none';
            return;
        }

        // Show container
        container.style.display = 'block';
        if (subtitle) {
            subtitle.textContent = `${targetProvince.il_adi} iline en kısa ulaşım rotaları`;
        }

        // Show loading
        routesList.innerHTML = '<div style="text-align: center; padding: 20px; color: #aaa;">Rotalar hesaplanıyor...</div>';

        // Fetch routes
        const response = await fetch(`${API_BASE}/provinces/${targetIlId}/routes`);
        const result = await response.json();

        if (!result.success || !result.data) {
            routesList.innerHTML = '<div style="text-align: center; padding: 20px; color: #f44;">Rota verileri yüklenemedi.</div>';
            return;
        }

        const routes = result.main || result.data || [];
        const allRoutes = result.all || result.data || [];

        // Render routes list
        renderTransportRoutesList(routes, allRoutes, targetProvince);

        // Initialize or update map
        await initTransportRoutesMap(routes, targetProvince);

    } catch (error) {
        console.error('Error loading transport routes:', error);
        const routesList = document.getElementById('transportRoutesList');
        if (routesList) {
            routesList.innerHTML = '<div style="text-align: center; padding: 20px; color: #f44;">Rota verileri yüklenirken hata oluştu.</div>';
        }
    }
}

// Render Transport Routes List
function renderTransportRoutesList(mainRoutes, allRoutes, targetProvince) {
    const routesList = document.getElementById('transportRoutesList');
    if (!routesList) return;

    if (!mainRoutes || mainRoutes.length === 0) {
        routesList.innerHTML = '<div style="text-align: center; padding: 20px; color: #aaa;">Rota bulunamadı.</div>';
        return;
    }

    // Group routes by province
    const routesByProvince = {};
    mainRoutes.forEach(route => {
        const provinceId = route.from.id;
        if (!routesByProvince[provinceId]) {
            routesByProvince[provinceId] = {
                main: route,
                alternatives: []
            };
        }
    });

    // Add alternatives
    if (allRoutes) {
        allRoutes.forEach(route => {
            if (route.isAlternative && routesByProvince[route.from.id]) {
                routesByProvince[route.from.id].alternatives.push(route);
            }
        });
    }

    let routeIndex = 0;
    
    routesList.innerHTML = Object.values(routesByProvince).map((provinceRoutes) => {
        const route = provinceRoutes.main;
        const alternatives = provinceRoutes.alternatives || [];
        
        const hours = Math.floor(route.estimatedTimeHours);
        const minutes = route.estimatedTimeMinutes % 60;
        const timeText = hours > 0 ? `${hours}s ${minutes}dk` : `${minutes}dk`;
        
        // Yol türü ikonu ve renk
        const roadTypeIcons = {
            'otoyol': { icon: '🛣️', color: '#10b981', label: 'Otoyol' },
            'devlet_yolu': { icon: '🛤️', color: '#3b82f6', label: 'Devlet Yolu' },
            'kombine': { icon: '🚢', color: '#8b5cf6', label: 'Kombine' }
        };
        const roadType = roadTypeIcons[route.roadType] || { icon: '🛣️', color: '#6b7280', label: 'Karayolu' };
        
        const currentIndex = routeIndex++;
        
        let html = `
            <div class="transport-route-item" data-route-index="${currentIndex}" data-province-id="${route.from.id}">
                <div class="route-rank" style="background: ${roadType.color}">${currentIndex + 1}</div>
                <div class="route-info">
                    <div class="route-path">
                        <span class="route-from">${route.from.name}</span>
                        <span class="route-arrow">→</span>
                        <span class="route-to">${route.to.name}</span>
                        ${route.isAlternative ? '<span class="route-alternative-badge">Alternatif</span>' : ''}
                    </div>
                    <div class="route-name">${route.routeName || 'Genel Karayolu'}</div>
                    <div class="route-details">
                        <span class="route-road-type" style="color: ${roadType.color}">
                            ${roadType.icon} ${roadType.label}
                            ${route.roadNumber !== '-' ? ` · ${route.roadNumber}` : ''}
                        </span>
                        ${route.via && route.via.length > 0 ? `
                            <span class="route-via">Geçiş: ${route.via.join(' → ')}</span>
                        ` : ''}
                    </div>
                    <div class="route-metrics">
                        <span class="route-distance">📏 ${route.distance} km</span>
                        <span class="route-time">⏱️ ${timeText}</span>
                        <span class="route-speed">🚗 ${route.speed || 80} km/h</span>
                        ${route.toll ? '<span class="route-toll">💳 Ücretli</span>' : '<span class="route-free">🆓 Ücretsiz</span>'}
                    </div>
                </div>
            </div>
        `;

        // Add alternatives if any
        if (alternatives.length > 0) {
            html += `<div class="route-alternatives" id="alternatives-${route.from.id}" style="display: none;">`;
            alternatives.forEach((altRoute, altIndex) => {
                const altHours = Math.floor(altRoute.estimatedTimeHours);
                const altMinutes = altRoute.estimatedTimeMinutes % 60;
                const altTimeText = altHours > 0 ? `${altHours}s ${altMinutes}dk` : `${altMinutes}dk`;
                const altRoadType = roadTypeIcons[altRoute.roadType] || { icon: '🛣️', color: '#6b7280', label: 'Karayolu' };
                
                html += `
                    <div class="transport-route-item route-alternative-item" data-route-index="${currentIndex}" data-alt-index="${altIndex}">
                        <div class="route-rank-alt" style="border-color: ${altRoadType.color}">Alt ${altIndex + 1}</div>
                        <div class="route-info">
                            <div class="route-path">
                                <span class="route-from">${altRoute.from.name}</span>
                                <span class="route-arrow">→</span>
                                <span class="route-to">${altRoute.to.name}</span>
                                <span class="route-alternative-badge">Alternatif</span>
                            </div>
                            <div class="route-name">${altRoute.routeName || 'Alternatif Rota'}</div>
                            <div class="route-details">
                                <span class="route-road-type" style="color: ${altRoadType.color}">
                                    ${altRoadType.icon} ${altRoadType.label}
                                    ${altRoute.roadNumber !== '-' ? ` · ${altRoute.roadNumber}` : ''}
                                </span>
                                ${altRoute.via && altRoute.via.length > 0 ? `
                                    <span class="route-via">Geçiş: ${altRoute.via.join(' → ')}</span>
                                ` : ''}
                            </div>
                            <div class="route-metrics">
                                <span class="route-distance">📏 ${altRoute.distance} km</span>
                                <span class="route-time">⏱️ ${altTimeText}</span>
                                <span class="route-speed">🚗 ${altRoute.speed || 80} km/h</span>
                                ${altRoute.toll ? '<span class="route-toll">💳 Ücretli</span>' : '<span class="route-free">🆓 Ücretsiz</span>'}
                            </div>
                        </div>
                    </div>
                `;
            });
            html += '</div>';
            
            // Add toggle button for alternatives
            html = html.replace(
                `data-province-id="${route.from.id}">`,
                `data-province-id="${route.from.id}">
                <button class="route-toggle-alternatives" onclick="toggleAlternatives(${route.from.id})" title="Alternatif rotaları göster/gizle">
                    ${alternatives.length} Alternatif ▼
                </button>`
            );
        }

        return html;
    }).join('');

    // Add click handlers
    routesList.querySelectorAll('.transport-route-item').forEach((item, index) => {
        item.addEventListener('click', (e) => {
            if (!e.target.closest('.route-toggle-alternatives')) {
                const routeIndex = parseInt(item.dataset.routeIndex);
                highlightRouteOnMap(routeIndex);
            }
        });
    });
}

// Toggle alternatives
window.toggleAlternatives = function(provinceId) {
    const altContainer = document.getElementById(`alternatives-${provinceId}`);
    const toggleBtn = event.target.closest('.route-toggle-alternatives');
    
    if (altContainer) {
        const isVisible = altContainer.style.display !== 'none';
        altContainer.style.display = isVisible ? 'none' : 'block';
        if (toggleBtn) {
            toggleBtn.textContent = toggleBtn.textContent.replace(/▼|▲/, isVisible ? '▼' : '▲');
        }
    }
};

// Initialize Transport Routes Map
async function initTransportRoutesMap(routes, targetProvince) {
    const mapContainer = document.getElementById('transportRoutesMap');
    if (!mapContainer) return;

    // Clear existing map
    if (transportRoutesMap) {
        transportRoutesMap.remove();
        transportRoutesMap = null;
        transportRouteLayers = [];
    }

    // Initialize map centered on target province
    transportRoutesMap = L.map('transportRoutesMap', {
        zoomControl: true,
        attributionControl: false
    }).setView([targetProvince.enlem, targetProvince.boylam], 8);

    // Dark tile layer
    L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
        attribution: '',
        maxZoom: 19
    }).addTo(transportRoutesMap);

    // Add target province marker (red)
    const targetMarker = L.marker([targetProvince.enlem, targetProvince.boylam], {
        icon: L.divIcon({
            className: 'transport-target-marker',
            html: `<div style="background: #ef4444; color: white; border-radius: 50%; width: 30px; height: 30px; display: flex; align-items: center; justify-content: center; font-weight: bold; border: 3px solid white; box-shadow: 0 2px 8px rgba(0,0,0,0.3);">🎯</div>`,
            iconSize: [30, 30],
            iconAnchor: [15, 15]
        })
    }).addTo(transportRoutesMap);
    targetMarker.bindPopup(`<strong>${targetProvince.il_adi}</strong><br>Hedef İl`);

    // Get all provinces for via lookup
    let allProvincesData = [];
    try {
        const provincesResponse = await fetch(`${API_BASE}/provinces`);
        const provincesResult = await provincesResponse.json();
        allProvincesData = provincesResult.data || [];
    } catch (error) {
        console.error('Error fetching provinces for via lookup:', error);
    }

    // Add route lines and markers
    const topRoutes = routes.slice(0, 10);
    const colors = ['#3b82f6', '#8b5cf6', '#10b981', '#f59e0b', '#ef4444', '#ec4899', '#06b6d4', '#84cc16', '#f97316', '#6366f1'];
    
    topRoutes.forEach((route, index) => {
        // Get road type color
        const roadTypeColors = {
            'otoyol': '#10b981',
            'devlet_yolu': '#3b82f6',
            'kombine': '#8b5cf6'
        };
        const routeColor = roadTypeColors[route.roadType] || colors[index % colors.length];
        
        // Build route path with via points
        const routePath = [[route.from.lat, route.from.lon]];
        
        // Add via points if they exist
        if (route.via && route.via.length > 0) {
            route.via.forEach(viaName => {
                const viaProvince = allProvincesData.find(p => p.il_adi === viaName);
                if (viaProvince && viaProvince.enlem && viaProvince.boylam) {
                    routePath.push([parseFloat(viaProvince.enlem), parseFloat(viaProvince.boylam)]);
                }
            });
        }
        routePath.push([route.to.lat, route.to.lon]);

        // Add from marker
        const fromMarker = L.marker([route.from.lat, route.from.lon], {
            icon: L.divIcon({
                className: 'transport-from-marker',
                html: `<div style="background: ${routeColor}; color: white; border-radius: 50%; width: 28px; height: 28px; display: flex; align-items: center; justify-content: center; font-weight: bold; border: 2px solid white; box-shadow: 0 2px 6px rgba(0,0,0,0.3);">${index + 1}</div>`,
                iconSize: [28, 28],
                iconAnchor: [14, 14]
            })
        }).addTo(transportRoutesMap);
        
        const hours = Math.floor(route.estimatedTimeHours);
        const minutes = route.estimatedTimeMinutes % 60;
        const timeText = hours > 0 ? `${hours}s ${minutes}dk` : `${minutes}dk`;
        
        let popupContent = `
            <strong>${route.from.name} → ${route.to.name}</strong><br>
            <span style="color: ${routeColor};">${route.routeName || 'Genel Karayolu'}</span><br>
            ${route.roadNumber !== '-' ? `<small>${route.roadNumber}</small><br>` : ''}
            📏 ${route.distance} km · ⏱️ ${timeText}<br>
            🚗 ${route.speed || 80} km/h
            ${route.toll ? ' · 💳 Ücretli' : ' · 🆓 Ücretsiz'}
        `;
        
        if (route.via && route.via.length > 0) {
            popupContent += `<br><small>Geçiş: ${route.via.join(' → ')}</small>`;
        }
        
        fromMarker.bindPopup(popupContent);

        // Add via markers
        const viaMarkers = [];
        if (route.via && route.via.length > 0) {
            route.via.forEach((viaName, viaIndex) => {
                const viaProvince = allProvincesData.find(p => p.il_adi === viaName);
                if (viaProvince && viaProvince.enlem && viaProvince.boylam) {
                    const viaMarker = L.marker([parseFloat(viaProvince.enlem), parseFloat(viaProvince.boylam)], {
                        icon: L.divIcon({
                            className: 'transport-via-marker',
                            html: `<div style="background: ${routeColor}; color: white; border-radius: 50%; width: 20px; height: 20px; display: flex; align-items: center; justify-content: center; font-weight: bold; border: 2px solid white; box-shadow: 0 2px 4px rgba(0,0,0,0.3); opacity: 0.8;">●</div>`,
                            iconSize: [20, 20],
                            iconAnchor: [10, 10]
                        })
                    }).addTo(transportRoutesMap);
                    viaMarker.bindPopup(`<strong>${viaName}</strong><br>Geçiş noktası`);
                    viaMarkers.push(viaMarker);
                }
            });
        }

        // Add route line with via points
        const routeLine = L.polyline(routePath, {
            color: routeColor,
            weight: route.isAlternative ? 2 : 4,
            opacity: route.isAlternative ? 0.5 : 0.7,
            dashArray: route.isAlternative ? '10, 5' : (index === 0 ? '0' : '8, 4')
        }).addTo(transportRoutesMap);

        transportRouteLayers.push({
            marker: fromMarker,
            viaMarkers: viaMarkers,
            line: routeLine,
            route: route
        });
    });

    // Fit bounds to show all routes
    if (topRoutes.length > 0) {
        const bounds = L.latLngBounds(
            [[targetProvince.enlem, targetProvince.boylam]],
            topRoutes.map(r => [[r.from.lat, r.from.lon]])
        );
        transportRoutesMap.fitBounds(bounds, { padding: [50, 50] });
    }
}

// Highlight Route on Map
function highlightRouteOnMap(index) {
    transportRouteLayers.forEach((layer, i) => {
        if (i === index) {
            // Highlight selected route
            layer.line.setStyle({
                weight: 5,
                opacity: 1
            });
            layer.marker.setZIndexOffset(1000);
        } else {
            // Dim other routes
            layer.line.setStyle({
                weight: 2,
                opacity: 0.3
            });
            layer.marker.setZIndexOffset(0);
        }
    });
}

