const { useState, useMemo, useEffect, useRef } = React;

// Chart.js bileşenlerini kaydet (global Chart kullanılıyor)
if (typeof Chart !== 'undefined') {
    Chart.register(
        Chart.registerables || []
    );
}

const AfetIhtiyacGrafik = ({ 
    city = 'İstanbul', 
    earthquakeMagnitude = 7.0, 
    injuredCount = 0, 
    homelessCount = 0 
}) => {
    const chartRef = useRef(null);
    const chartInstanceRef = useRef(null);

    // Günlük ihtiyaçları hesapla
    const dailyNeeds = useMemo(() => {
        const su = (injuredCount + homelessCount) * 3;
        const gida = (injuredCount + homelessCount) * 1.5;
        const ilac = injuredCount * 0.4;
        const cadir = homelessCount * 0.2;

        return { su, gida, ilac, cadir };
    }, [injuredCount, homelessCount]);

    // 7 günlük kümülatif verileri hesapla
    const chartData = useMemo(() => {
        const days = ['Gün 1', 'Gün 2', 'Gün 3', 'Gün 4', 'Gün 5', 'Gün 6', 'Gün 7'];
        
        // Kümülatif değerleri hesapla
        const suData = [];
        const gidaData = [];
        const ilacData = [];
        const cadirData = [];

        let cumulativeSu = 0;
        let cumulativeGida = 0;
        let cumulativeIlac = 0;
        let cumulativeCadir = 0;

        for (let i = 0; i < 7; i++) {
            cumulativeSu += dailyNeeds.su;
            cumulativeGida += dailyNeeds.gida;
            cumulativeIlac += dailyNeeds.ilac;
            cumulativeCadir += dailyNeeds.cadir;

            suData.push(Math.round(cumulativeSu));
            gidaData.push(Math.round(cumulativeGida));
            ilacData.push(Math.round(cumulativeIlac));
            cadirData.push(Math.round(cumulativeCadir));
        }

        return {
            labels: days,
            datasets: [
                {
                    label: 'Su (Litre)',
                    data: suData,
                    borderColor: '#FBC02D', // Sarı
                    backgroundColor: 'rgba(251, 192, 45, 0.1)',
                    borderWidth: 2,
                    fill: true,
                    tension: 0.4, // Yumuşak çizgiler
                    pointRadius: 4,
                    pointHoverRadius: 6,
                    pointBackgroundColor: '#FBC02D',
                    pointBorderColor: '#fff',
                    pointBorderWidth: 2
                },
                {
                    label: 'Gıda (kg)',
                    data: gidaData,
                    borderColor: '#9C27B0', // Mor
                    backgroundColor: 'rgba(156, 39, 176, 0.1)',
                    borderWidth: 2,
                    fill: true,
                    tension: 0.4,
                    pointRadius: 4,
                    pointHoverRadius: 6,
                    pointBackgroundColor: '#9C27B0',
                    pointBorderColor: '#fff',
                    pointBorderWidth: 2
                },
                {
                    label: 'İlaç (Kutu)',
                    data: ilacData,
                    borderColor: '#D32F2F', // Kırmızı
                    backgroundColor: 'rgba(211, 47, 47, 0.1)',
                    borderWidth: 2,
                    fill: true,
                    tension: 0.4,
                    pointRadius: 4,
                    pointHoverRadius: 6,
                    pointBackgroundColor: '#D32F2F',
                    pointBorderColor: '#fff',
                    pointBorderWidth: 2
                },
                {
                    label: 'Çadır (Adet)',
                    data: cadirData,
                    borderColor: '#388E3C', // Yeşil
                    backgroundColor: 'rgba(56, 142, 60, 0.1)',
                    borderWidth: 2,
                    fill: true,
                    tension: 0.4,
                    pointRadius: 4,
                    pointHoverRadius: 6,
                    pointBackgroundColor: '#388E3C',
                    pointBorderColor: '#fff',
                    pointBorderWidth: 2
                }
            ]
        };
    }, [dailyNeeds]);

    // Chart seçenekleri
    const chartOptions = useMemo(() => ({
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
            legend: {
                position: 'bottom',
                labels: {
                    color: '#e0e0e0',
                    font: {
                        size: 12,
                        weight: '500'
                    },
                    padding: 15,
                    usePointStyle: true,
                    pointStyle: 'circle'
                }
            },
            tooltip: {
                backgroundColor: 'rgba(0, 0, 0, 0.8)',
                titleColor: '#fff',
                bodyColor: '#e0e0e0',
                borderColor: 'rgba(255, 255, 255, 0.1)',
                borderWidth: 1,
                padding: 12,
                displayColors: true,
                callbacks: {
                    label: function(context) {
                        const label = context.dataset.label || '';
                        const value = context.parsed.y;
                        return `${label}: ${value.toLocaleString('tr-TR')}`;
                    }
                }
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
                beginAtZero: true,
                ticks: {
                    color: '#aaa',
                    font: {
                        size: 11
                    },
                    callback: function(value) {
                        if (value >= 1000000) return (value / 1000000).toFixed(1) + 'M';
                        if (value >= 1000) return (value / 1000).toFixed(1) + 'K';
                        return value;
                    }
                },
                grid: {
                    color: 'rgba(255, 255, 255, 0.05)',
                    drawBorder: false
                }
            }
        },
        interaction: {
            intersect: false,
            mode: 'index'
        }
    }), []);

    // Chart'ı oluştur ve güncelle
    useEffect(() => {
        if (!chartRef.current || typeof Chart === 'undefined') return;

        const ctx = chartRef.current.getContext('2d');
        
        // Önceki chart'ı temizle
        if (chartInstanceRef.current) {
            chartInstanceRef.current.destroy();
        }

        // Yeni chart oluştur
        chartInstanceRef.current = new Chart(ctx, {
            type: 'line',
            data: chartData,
            options: chartOptions
        });

        // Cleanup
        return () => {
            if (chartInstanceRef.current) {
                chartInstanceRef.current.destroy();
                chartInstanceRef.current = null;
            }
        };
    }, [chartData, chartOptions]);

    return (
        <div style={{
            width: '100%',
            height: '300px',
            padding: '15px',
            backgroundColor: 'rgba(255, 255, 255, 0.03)',
            borderRadius: '8px',
            border: '1px solid rgba(255, 255, 255, 0.1)'
        }}>
            <h3 style={{
                color: '#fff',
                fontSize: '16px',
                fontWeight: '700',
                margin: '0 0 15px 0',
                textAlign: 'center'
            }}>
                📦 Afet Bölgesi İhtiyaç Bilgileri
            </h3>
            <div style={{ height: '240px' }}>
                <canvas ref={chartRef}></canvas>
            </div>
        </div>
    );
};

// Global olarak export et
window.AfetIhtiyacGrafik = AfetIhtiyacGrafik;
