var map = OpenLayers.map('mapid', {zoomControl: false}).setView([46.0517515, 14.5076515], 13);
var baselayers = {
  "Voyager": OpenLayers.tileLayer('https://basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}.png', {
		attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors, &copy; <a href="https://carto.com/attribution">CARTO</a>'
	}),
  "Svetli zemljevid": OpenLayers.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}.png', {
		attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors, &copy; <a href="https://carto.com/attribution">CARTO</a>'
	}),
  "Temni zemljevid": OpenLayers.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}.png', {
		attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors, &copy; <a href="https://carto.com/attribution">CARTO</a>'
	}),
  "OpenStreetMap": OpenLayers.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
	attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
	maxZoom: 23,
	crossOrigin: 'anonymous',
	id: 'osm'
  }),
  "Novi temni zemljevid": OpenLayers.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
	attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors, &copy; <a href="https://carto.com/attributions">CARTO</a>',
	maxZoom: 23,
	crossOrigin: 'anonymous',
	id: 'darkMatter'
 })
};
var overlays = {};
// BICIKELJ ICONS
// ACTIVE ICON
// Has free bikes 
var activeBicikeljStation = OpenLayers.icon({
  iconUrl: 'img/ico/bicikeljStation.png',
  shadowUrl: '',
  className: 'startEndStopIcon',

  iconSize:     [20, 23],
  iconAnchor:   [10, 12],
  popupAnchor:  [0, 0],
  tooltipAnchor: [0, 0]
});
// INACTIVE ICON
// Does not have free bikes
var inactiveBicikeljStation = OpenLayers.icon({
  iconUrl: 'img/ico/bicikeljStationInactive.png',
  shadowUrl: '',
  className: 'startEndStopIcon',

  iconSize:     [20, 23],
  iconAnchor:   [10, 12],
  popupAnchor:  [0, 0],
  tooltipAnchor: [0, 0]
});


// LPP ICONS
// ACTIVE ICON
// Buses which have line data

let ANCHOR_X = 0;
let ANCHOR_Y = 0;

var szIcon = OpenLayers.divIcon({
  className: 'szIcon',
  iconSize:     [120, 39],
  iconAnchor:   [60, 19],
  popupAnchor:  [0, 0],
  tooltipAnchor: [ANCHOR_X, ANCHOR_Y]
})

var activeIcon = OpenLayers.icon({
  iconUrl: 'img/ico/markerActive.png',
  shadowUrl: '',
  className: 'activeBusIcon',

  iconSize:     [25, 25],
  iconAnchor:   [13, 13],
  popupAnchor:  [0, 0],
  tooltipAnchor: [ANCHOR_X, ANCHOR_Y]
});
// HIDDEN ICON
// Buses which do not have line data, but have electric (and/or engine) on
var hiddenIcon = OpenLayers.icon({
  iconUrl: 'img/ico/markerHidden.png',
  shadowUrl: '',
  className: 'hiddenBusIcon',

  iconSize:     [25, 25],
  iconAnchor:   [13, 13],
  popupAnchor:  [0, 0],
  tooltipAnchor: [ANCHOR_X, ANCHOR_Y]
});
// INACTIVE ICON
// Buses which are inactive
var inactiveIcon = OpenLayers.icon({
  iconUrl: 'img/ico/markerInactive.png',
  shadowUrl: '',
  className: 'inactiveBusIcon',

  iconSize:     [25, 25],
  iconAnchor:   [13, 13],
  popupAnchor:  [0, 0],
  tooltipAnchor: [ANCHOR_X, ANCHOR_Y]
});
// SELECTED ICON
// Bus which is selected
var selectedIcon = OpenLayers.icon({
  iconUrl: 'img/ico/markerSelect.png',
  shadowUrl: '',
  className: 'inactiveBusIcon',

  iconSize:     [25, 25],
  iconAnchor:   [13, 13],
  popupAnchor:  [0, 0],
  tooltipAnchor: [ANCHOR_X, ANCHOR_Y]
});
// ACTIVE STATION

// ACTIVE END/START STATION

// INACTIVE STATION

// INACTIVE START STATION

var startEndStopIcon = OpenLayers.icon({
  iconUrl: 'img/ico/endStation.png',
  shadowUrl: '',
  className: 'startEndStopIcon',

  iconSize:     [20, 23],
  iconAnchor:   [10, 12],
  popupAnchor:  [0, 0],
  tooltipAnchor: [0, 0]
});
var middleStopIcon = OpenLayers.icon({
  iconUrl: 'img/ico/midStation.png',
  shadowUrl: '',
  className: 'middleStopIcon',

  iconSize:     [20, 23],
  iconAnchor:   [10, 12],
  popupAnchor:  [0, 0],
  tooltipAnchor: [0, 0]
});
var endStopIconPassed = OpenLayers.icon({
  iconUrl: 'img/ico/endStationPassed.png',
  shadowUrl: '',
  className: 'endStopIconPassed',

  iconSize:     [20, 23],
  iconAnchor:   [10, 12],
  popupAnchor:  [0, 0],
  tooltipAnchor: [0, 0]
});
var middleStopIconPassed = OpenLayers.icon({
  iconUrl: 'img/ico/midStationPassed.png',
  shadowUrl: '',
  className: 'middleStopIconPassed',

  iconSize:     [20, 23],
  iconAnchor:   [10, 12],
  popupAnchor:  [0, 0],
  tooltipAnchor: [0, 0]
});
//P+R ICON
var pprIcon = OpenLayers.icon({
  iconUrl: 'img/ico/parkPlusRide.png',
  shadowUrl: '',
  className: 'middleStopIconPassed',

  iconSize:     [20, 23],
  iconAnchor:   [10, 12],
  popupAnchor:  [0, 0],
  tooltipAnchor: [0, 0]
});
var inactivePprIcon = OpenLayers.icon({
  iconUrl: 'img/ico/parkPlusRideInactive.png',
  shadowUrl: '',
  className: 'middleStopIconPassed',

  iconSize:     [20, 23],
  iconAnchor:   [10, 12],
  popupAnchor:  [0, 0],
  tooltipAnchor: [0, 0]
});
//AVANT2GO ICON
var avantIcon = OpenLayers.icon({
  iconUrl: 'img/ico/avant2Go.png',
  shadowUrl: '',
  className: 'middleStopIconPassed',

  iconSize:     [20, 23],
  iconAnchor:   [10, 12],
  popupAnchor:  [0, 0],
  tooltipAnchor: [0, 0]
});
var inactiveAvantIcon = OpenLayers.icon({
  iconUrl: 'img/ico/avant2GoInactive.png',
  shadowUrl: '',
  className: 'middleStopIconPassed',

  iconSize:     [20, 23],
  iconAnchor:   [10, 12],
  popupAnchor:  [0, 0],
  tooltipAnchor: [0, 0]
});
//ELECTRIC CHARGER ICON
var chargerIcon = OpenLayers.icon({
  iconUrl: 'img/ico/electricCharger.png',
  shadowUrl: '',
  className: 'middleStopIconPassed',

  iconSize:     [20, 23],
  iconAnchor:   [10, 12],
  popupAnchor:  [0, 0],
  tooltipAnchor: [0, 0]
});
var inactiveChargerIcon = OpenLayers.icon({
  iconUrl: 'img/ico/electricChargerInactive.png',
  shadowUrl: '',
  className: 'middleStopIconPassed',

  iconSize:     [20, 23],
  iconAnchor:   [10, 12],
  popupAnchor:  [0, 0],
  tooltipAnchor: [0, 0]
});
//URBANOMAT ICON
var urbanomatIcon = OpenLayers.icon({
  iconUrl: 'img/ico/urbanomat.png',
  shadowUrl: '',
  className: 'middleStopIconPassed',

  iconSize:     [20, 23],
  iconAnchor:   [10, 12],
  popupAnchor:  [0, 0],
  tooltipAnchor: [0, 0]
});
//PARKING ICON
var parkingIcon = OpenLayers.icon({
  iconUrl: 'img/ico/parking.png',
  shadowUrl: '',
  className: 'middleStopIconPassed',

  iconSize:     [20, 23],
  iconAnchor:   [10, 12],
  popupAnchor:  [0, 0],
  tooltipAnchor: [0, 0]
});
var inactiveParkingIcon = OpenLayers.icon({
  iconUrl: 'img/ico/parkingInactive.png',
  shadowUrl: '',
  className: 'middleStopIconPassed',

  iconSize:     [20, 23],
  iconAnchor:   [10, 12],
  popupAnchor:  [0, 0],
  tooltipAnchor: [0, 0]
});
var parkingGarageIcon = OpenLayers.icon({
  iconUrl: 'img/ico/parkingGarage.png',
  shadowUrl: '',
  className: 'middleStopIconPassed',

  iconSize:     [20, 23],
  iconAnchor:   [10, 12],
  popupAnchor:  [0, 0],
  tooltipAnchor: [0, 0]
});
var inactiveParkingGarageIcon = OpenLayers.icon({
  iconUrl: 'img/ico/parkingGarageInactive.png',
  shadowUrl: '',
  className: 'middleStopIconPassed',

  iconSize:     [20, 23],
  iconAnchor:   [10, 12],
  popupAnchor:  [0, 0],
  tooltipAnchor: [0, 0]
});
//RAILWAY ICON
var szStation = OpenLayers.icon({
  iconUrl: 'img/ico/sz.png',
  shadowUrl: '',
  className: 'middleStopIconPassed',

  iconSize:     [20, 23],
  iconAnchor:   [20, 12],
  popupAnchor:  [0, 0],
  tooltipAnchor: [0, 0]
});
// layers
baselayers["Voyager"].addTo(map);  
OpenLayers.control.zoom({
  position:'topright'
}).addTo(map);
OpenLayers.control.layers(baselayers, overlays, {position: 'topright', class: 'labelstyle'}).addTo(map);
var popup = OpenLayers.popup();
if (navigator.userAgent.includes("Android") || navigator.userAgent.includes("iPhone") || navigator.userAgent.includes("iPad")) {
  var k = OpenLayers.control.locate({position: 'topright'}).addTo(map);
}

map.on('zoomend', function() {
  updateMapInformation();
})

map.on('dragend', function() {
  updateMapInformation();
})
