mapboxgl.accessToken = 'pk.eyJ1IjoiMjk2NzcyNXoiLCJhIjoiY202dXAzOXBnMDFnODJsczl1OTh0amVxOSJ9.qJmHXEZIL4wLKlcgmTf3-Q';

const map = new mapboxgl.Map({
    container: 'map',
    style: 'mapbox://styles/2967725z/cm6v6q93a001s01sd0koe2xjv',
    center: [-0.1278, 51.5074],
    zoom: 3
});

const locations = {};
let markers = [];

d3.csv('source.csv').then(data => {
    data.forEach(d => {
        locations[d.country.toLowerCase()] = {
            coordinates: [parseFloat(d.longitude), parseFloat(d.latitude)],
            energyConsumption: parseFloat(d.energyConsumption),
            energyLevel: d.energyLevel.toLowerCase()
        };
    });
});

function filterByEnergyLevel() {
    const filterValue = document.getElementById('energy-level-filter').value;

    markers.forEach(marker => marker.remove());
    markers = [];

    if (filterValue !== 'all') {
        for (const country in locations) {
            if (locations[country].energyLevel === filterValue) {
                const marker = new mapboxgl.Marker()
                    .setLngLat(locations[country].coordinates)
                    .addTo(map);
                markers.push(marker);
            }
        }
    }
}

function showDataAnalysis() {
    const modal = document.getElementById('data-analysis-modal');
    modal.style.display = 'block';

    const data = Object.keys(locations).map(country => ({
        country: country.charAt(0).toUpperCase() + country.slice(1),
        energyConsumption: locations[country].energyConsumption
    }));

    data.sort((a, b) => b.energyConsumption - a.energyConsumption);
    const top10 = data.slice(0, 10);
    const bottom10 = data.slice(-10);

    const top10Chart = echarts.init(document.getElementById('top10-chart'));
    const top10Option = {
        title: {
            text: 'Top 10 Countries by Energy Consumption',
            left: 'center'
        },
        tooltip: {
            trigger: 'axis',
            axisPointer: {
                type: 'shadow'
            }
        },
        xAxis: {
            type: 'category',
            data: top10.map(item => item.country),
            axisLabel: {
                rotate: 45,
                interval: 0
            }
        },
        yAxis: {
            type: 'value',
            name: 'Consumption'
        },
        series: [
            {
                name: 'Energy Consumption',
                type: 'bar',
                data: top10.map(item => item.energyConsumption),
                itemStyle: {
                    color: '#ff0000'
                }
            }
        ]
    };
    top10Chart.setOption(top10Option);

    const bottom10Chart = echarts.init(document.getElementById('bottom10-chart'));
    const bottom10Option = {
        title: {
            text: 'Bottom 10 Countries by Energy Consumption',
            left: 'center'
        },
        tooltip: {
            trigger: 'axis',
            axisPointer: {
                type: 'shadow'
            }
        },
        xAxis: {
            type: 'category',
            data: bottom10.map(item => item.country),
            axisLabel: {
                rotate: 45,
                interval: 0
            }
        },
        yAxis: {
            type: 'value',
            name: 'Consumption',
        },
        series: [
            {
                name: 'Energy Consumption',
                type: 'bar',
                data: bottom10.map(item => item.energyConsumption),
                itemStyle: {
                    color: '#ffff00'
                }
            },
        ]
    };
    bottom10Chart.setOption(bottom10Option);
}

function closeDataAnalysis() {
    const modal = document.getElementById('data-analysis-modal');
    modal.style.display = 'none';
}

map.on('load', () => {
    map.addSource('countries', {
        type: 'geojson',
        data: 'https://raw.githubusercontent.com/datasets/geo-countries/master/data/countries.geojson'
    });

    map.addLayer({
        id: 'country-borders',
        type: 'line',
        source: 'countries',
        paint: {
            'line-color': '#888',
            'line-width': 1
        }
    });

    map.addLayer({
        id: 'country-fills',
        type: 'fill',
        source: 'countries',
        layout: {},
        paint: {
            'fill-color': '#627BC1',
            'fill-opacity': 0
        }
    });

    map.addLayer({
        id: 'country-fills-highlighted',
        type: 'fill',
        source: 'countries',
        layout: {},
        paint: {
            'fill-color': '#627BC1',
            'fill-opacity': 0.75
        },
        filter: ['in', 'ISO_A3', '']
    });
});

map.on('click', (e) => {
    const features = map.queryRenderedFeatures(e.point, {
        layers: ['country-fills']
    });

    if (features.length) {
        const feature = features[0];

        map.setFilter('country-fills-highlighted', ['in', 'ISO_A3', feature.properties.ISO_A3]);

        const country = feature.properties.ADMIN.toLowerCase();
        const energyConsumption = locations[country] ? locations[country].energyConsumption : 'Unknown';
        const energyLevel = locations[country] ? locations[country].energyLevel : 'Unknown';

        const popupContent = document.createElement('div');
        popupContent.style.width = '400px';
        popupContent.style.height = '200px';
        popupContent.innerHTML = `<div id="popup-chart" style="width: 100%; height: 100%;"></div>`;

        const popup = new mapboxgl.Popup()
            .setLngLat(e.lngLat)
            .setDOMContent(popupContent)
            .addTo(map);

        const chart = echarts.init(document.getElementById('popup-chart'));
        const option = {
            title: {
                text: `${feature.properties.ADMIN} Energy Consumption`,
                subtext: `Energy Level: ${energyLevel}`,
                left: 'center',
                textStyle: {
                    fontSize: 14
                }
            },
            tooltip: {
                trigger: 'item'
            },
            series: [
                {
                    name: 'Energy Consumption',
                    type: 'pie',
                    radius: '50%',
                    data: [
                        { value: parseInt(energyConsumption), name: 'Consumption' },
                        { value: 26170, name: 'World Average' }
                    ],
                    emphasis: {
                        itemStyle: {
                            shadowBlur: 10,
                            shadowOffsetX: 0,
                            shadowColor: 'rgba(0, 0, 0, 0.5)'
                        }
                    },
                    label: {
                        fontSize: 12
                    }
                }
            ]
        };
        chart.setOption(option);
        
        popup.on('close', () => {
            map.setFilter('country-fills-highlighted', ['in', 'ISO_A3', '']);
        });
    }
});

const legend = document.createElement('div');
legend.id = 'legend';
legend.innerHTML = `
    <h3 style="color: #000000;">Electricity Consumption per Capita</h3>
    <ul style="color: #000000;">
        <li><span style="background-color: #ff0000;"></span> High</li>
        <li><span style="background-color: #ff5500;"></span> Medium-High</li>
        <li><span style="background-color: #ffaa00;"></span> Medium</li>
        <li><span style="background-color: #ffdf00;"></span> Medium-Low</li>
        <li><span style="background-color: #ffff00;"></span> Low</li>
        <li><span style="background-color: #000000;"></span> No Data</li>
    </ul>
`;
document.body.appendChild(legend);

const style = document.createElement('style');
style.innerHTML = `
    #legend {
        background: white;
        padding: 10px;
        position: absolute;
        bottom: 30px;
        right: 10px;
        z-index: 1;
        border-radius: 3px;
        box-shadow: 0 0 15px rgba(0, 0, 0, 0.2);
    }
    #legend h3 {
        margin: 0 0 10px;
    }
    #legend ul {
        list-style: none;
        padding: 0;
        margin: 0;
    }
    #legend li {
        display: flex;
        align-items: center;
        margin-bottom: 5px;
    }
    #legend span {
        display: inline-block;
        width: 20px;
        height: 20px;
        margin-right: 10px;
    }
    .mapboxgl-ctrl-geocoder {
        width: 100px;
    }
    .mapboxgl-ctrl-geocoder--input {
        border-radius: 5px;
        padding: 10px;
        font-size: 10px;
        font-color: rgba(0, 0, 0, 0.1);
    }
    .mapboxgl-ctrl-geocoder--suggestions {
        border-radius: 5px;
        box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
    }
`;
document.head.appendChild(style);

map.addControl(new mapboxgl.NavigationControl({ showCompass: true }));

map.addControl(new mapboxgl.GeolocateControl({
    positionOptions: {
        enableHighAccuracy: true
    },
    trackUserLocation: true
}));

map.addControl(new mapboxgl.ScaleControl({
    maxWidth: 180,
    unit: 'metric',
    language: 'en',
    color: 'white'
}));

const geocoder = new MapboxGeocoder({
    accessToken: mapboxgl.accessToken,
    mapboxgl: mapboxgl,
    language: 'en',
    color: 'red',
    draggable: true,
});
document.getElementById('geocoder').appendChild(geocoder.onAdd(map));



