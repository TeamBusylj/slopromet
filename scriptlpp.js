function debounce(func, delay) {
  let timeoutId;
  return function () {
    const context = this;
    const args = arguments;
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => {
      func.apply(context, args);
    }, delay);
  };
}
function moveFeature(feature, newCoordinates, dir) {
  const currentGeometry = feature.getGeometry();

  // Check if the feature has a geometry to update
  if (currentGeometry && currentGeometry instanceof ol.geom.Point) {
    // Smooth transition logic
    const currentCoordinates = currentGeometry.getCoordinates();

    // Interpolate coordinates for smooth movement
    const x =
      currentCoordinates[0] + (newCoordinates[0] - currentCoordinates[0]) * 0.1;
    const y =
      currentCoordinates[1] + (newCoordinates[1] - currentCoordinates[1]) * 0.1;

    // Update the feature's geometry
    feature.setGeometry(new ol.geom.Point([x, y]));

    // Apply the predefined direction (rotation) to the feature's style
    const style = feature.getStyle();
    if (style && style.getImage) {
      const image = style.getImage();
      image.setRotation(dir); // Use the provided direction for rotation
    }

    // Check if the marker is close enough to the target to stop
    if (
      Math.abs(newCoordinates[0] - x) < 0.0001 &&
      Math.abs(newCoordinates[1] - y) < 0.0001
    ) {
      feature.setGeometry(new ol.geom.Point(newCoordinates));
      return false; // Stop animation
    }
    return true; // Continue animation
  }
  return false;
}

var map, busVectorLayer, busLayer, busStationLayer, animating, speed, now;
const parser = new DOMParser();

async function makeMap() {
  iconFeature = new ol.Feature({
    geometry: new ol.geom.MultiPoint([
      [-90, 0],
      [-45, 45],
      [0, 0],
      [45, -45],
      [90, 0],
    ]).transform("EPSG:4326", "EPSG:3857"),
    name: "Null Islands",
    population: 4000,
    rainfall: 500,
  });

  vectorSource = new ol.source.Vector({
    // VectorSource({
    features: [iconFeature],
  });

  vectorLayer = new ol.layer.Vector({
    // VectorLayer({
    source: vectorSource,
  });

  rasterLayer = new ol.layer.Tile({
    source: new ol.source.OSM({
      url: "https://basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}.png",
      crossOrigin: null,
    }),
  });

  map = new ol.Map({
    layers: [rasterLayer, vectorLayer],
    target: "map",
    view: new ol.View({
      center: ol.proj.fromLonLat([14.5058, 46.0569]), // Default center (longitude, latitude)
      zoom: 13,
      loadTilesWhileAnimating: true,
      padding: [10, 10, 100, 10],
    
    }),
  });
  const geolocation = new ol.Geolocation({
    // enableHighAccuracy must be set to true to have the heading value.
    trackingOptions: {
      enableHighAccuracy: true,
    },
    projection: "EPSG:3857",
  });
  geolocation.setTracking(true);
  const accuracyFeature = new ol.Feature();
  accuracyFeature.setGeometry(geolocation.getAccuracyGeometry());

geolocation.on('change:accuracyGeometry', function () {
  accuracyFeature.setGeometry(geolocation.getAccuracyGeometry());
});

const positionFeature = new ol.Feature();
positionFeature.setStyle(
  new ol.style.Style({
    image: new ol.style.Circle({
      radius: 6,
      fill: new ol.style.Fill({
        color: '#3399CC',
      }),
      stroke: new ol.style.Stroke({
        color: '#fff',
        width: 2,
      }),
    }),
  }),
);

geolocation.on('change:position', function () {
  const coordinates = geolocation.getPosition();
  positionFeature.setGeometry(coordinates ? new ol.geom.Point(coordinates) : null);
});

new ol.layer.Vector({
  map: map,
  source: new ol.source.Vector({
    features: [accuracyFeature, positionFeature],
  }),
});
  const busSource = new ol.source.Vector(); // Contains bus markers
  const busStationSource = new ol.source.Vector(); // Contains station locations
  const busVectorSource = new ol.source.Vector(); // Contains vector graphics or routes

  // Create vector layers for each source
  busLayer = new ol.layer.Vector({
    source: busSource,
  });

  busStationLayer = new ol.layer.Vector({
    source: busStationSource,
  });

  busVectorLayer = new ol.layer.Vector({
    source: busVectorSource,
  });

  // Add the layers to the map
  map.addLayer(busLayer);
  map.addLayer(busStationLayer);
  map.addLayer(busVectorLayer);
}
const delayedSearch = debounce(searchRefresh, 300);
window.addEventListener("DOMContentLoaded", async function () {
  createBuses();
  let sht = makeBottomheet(null, 98);
  sht.innerHTML = `
<div class="searchContain"> <md-filled-text-field value=bava class="search" placeholder="Išči"><md-icon slot="leading-icon">search</md-icon></md-filled-text-field></div>
 <md-circular-progress indeterminate id="loader"></md-circular-progress>
    <md-list id="listOfStations"></md-list>`;
  this.document
    .querySelector(".search")
    .addEventListener("input", delayedSearch);
});

window.addEventListener("load", async function () {
  const pullToRefresh = document.querySelector(".pull-to-refresh");

  let touchstartY = 0;

  var list;
  var touchDiff = 0;
  document.addEventListener("touchstart", (e) => {
    loadingC.removeAttribute("indeterminate");

    touchDiff = 0;
    loadingC.setAttribute("value", "0");
    touchstartY = e.touches[0].clientY;
  });
  var bottomSheet;
  var loadingC = this.document.querySelector(".pll-loader");
  setTimeout(() => {
    bottomSheet = document.querySelector(".sheetContents");
    list = this.document.getElementById("listOfStations");
  }, 400);

  document.addEventListener("touchmove", (e) => {
    if (bottomSheet.style.height == "98dvh") {
      if (document.querySelector(".sheetContents").scrollTop == 0) {
        const touchY = e.touches[0].clientY;
        touchDiff = touchY - touchstartY;
        if (touchDiff > 0 && window.scrollY === 0) {
          pullToRefresh.style.top = touchDiff / (touchY / 250) + "px";
          loadingC.setAttribute(
            "value",
            Math.min(touchDiff / 150, 1).toString()
          );
        }
      } else {
        touchDiff = 0;
        touchstartY = e.touches[0].clientY;
      }
    }
  });
  document.addEventListener("touchend", async () => {
    loadingC.setAttribute("indeterminate", "");
    if (touchDiff > 150) {
      pullToRefresh.style.transition = "all .3s";
      pullToRefresh.style.top = "150px";
      setTimeout(() => {
        pullToRefresh.style.transition = "all 0s";
      }, 400);
      if (isArrivalsOpen) {
        await refreshArrivals();
        pullToRefresh.style.top = "0";
      } else {
        await createBuses();
        pullToRefresh.style.top = "0";
      }
    } else {
      pullToRefresh.style.transition = "all .3s";
      pullToRefresh.style.top = "0";
      setTimeout(() => {
        pullToRefresh.style.transition = "all 0s";
      }, 400);
    }
  });
});
var arrivalsMain = {};
var tripIds = [];
var stationList = {};
var latitude;
var longitude;
async function getLocation() {
  try {
    const position = await new Promise((resolve, reject) => {
      navigator.geolocation.getCurrentPosition(resolve, reject, {
        timeout: 10000,
        maximumAge: 60000,
        enableHighAccuracy: true,
      });
    });
    latitude = position.coords.latitude;
    longitude = position.coords.longitude;
  } catch {}
}

setInterval(getLocation, 10000);
async function createBuses() {
  await getLocation();
  stationList = JSON.parse(stationDetails).data;
  makeMap();

  createStationItems();
}

var isArrivalsOpen = false;

function createStationItems() {
  var search = false;
  var query = "";
  if (document.querySelector(".search").value !== "") {
    search = true;
    query = document.querySelector(".search").value;
  }
  var loader = document.getElementById("loader");
  var list = document.getElementById("listOfStations");
  list.innerHTML = "";
  list.style.display = "none";
  loader.style.display = "block";
  var nearby = {};
  if (navigator.geolocation) {
    let centertation = [];
    for (const station in stationList) {
      let item2 = addElement("md-list-item", null, "stationItem");
      item2.setAttribute("interactive", "");
      addElement("md-ripple", item2);
      let item = addElement("div", item2, "station");
      item.innerHTML = '<span class="stationName">' + stationList[station].n;
      +"</span>";

      const distance = haversineDistance(
        latitude,
        longitude,
        stationList[station].l,
        stationList[station].j
      );
      if (distance < 3 || search) {
        let cornot = "";
        if (!centertation.includes(stationList[station].n)) {
          centertation.push(stationList[station].n);
          cornot = '<span class="center">CENTER</span>';
        }

        if (distance > 1) {
          item.innerHTML +=
            cornot +
            "<span class=stationDistance>" +
            distance.toFixed(1) +
            " km</span>";
          nearby[distance.toFixed(5)] = item2;
        } else {
          item.innerHTML +=
            cornot +
            "<span class=stationDistance>" +
            Math.round(distance * 1000) +
            " m</span>";
          nearby[distance.toFixed(5)] = item2;
        }
        let buses = addElement("div", item, "buses");
        for (const bus of stationList[station].g) {
          buses.innerHTML +=
            "<div class=busNo style=background-color:" +
            "RGB(" +
            lineColors[bus.replace(/\D/g, "")].toString() +
            ")" +
            " id=bus2_" +
            bus +
            ">" +
            bus +
            "</div>";
        }
        item.appendChild(buses);
        item.addEventListener("click", async () => {
         
            await stationClick(station);
            interval = setInterval(async () => {
              let i = document.querySelector(".sheetContents").scrollTop;
              await stationClick(isArrivalsOpen, true);
              document.querySelector(".sheetContents").scrollTop = i;
            }, 10000);
          
        });
      }
    }

    const sortedArray = Object.keys(nearby)
      .map((key) => parseFloat(key).toFixed(5))
      .sort((a, b) => a - b)
      .map((key) => nearby[key]);

    for (const stationDistance of sortedArray) {
      if (search) {
        if (
          stationDistance.innerText.toLowerCase().includes(query.toLowerCase())
        ) {
          list.appendChild(stationDistance);
        }
      } else {
        list.appendChild(stationDistance);
      }
    }
    list.style.display = "block";
    /* const pullToRefresh = document.querySelector('.pull-to-refresh');
    
     pullToRefresh.classList.add('hideLoad')
     setTimeout(() => {
       pullToRefresh.style.top = '0px' ;
       pullToRefresh.classList.remove('hideLoad')
     }, 300);     
     */
    loader.style.display = "none";
  }
}
function searchRefresh() {
  let query = document.querySelector(".search").value;
  createStationItems(true, query);
}
var interval;
function haversineDistance(lat1, lon1, lat2, lon2) {
  const R = 6371; // Radius of the Earth in kilometers
  const dLat = ((lat2 - lat1) * Math.PI) / 180; // Convert degrees to radians
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const distance = R * c; // Distance in kilometers
  return distance;
}
async function refreshArrivals() {
  await stationClick(isArrivalsOpen, true);
}
function showOnMap(lnga, lata) {
  map.setCenter({ lat: lata, lng: lnga });
  map.setZoom(18);
  setTimeout(() => {
    document
      .querySelector(".mainSheet")
      .appendChild(document.createElement("ajokyxw"));
  }, 300);
}
var arrivalsScroll
async function stationClick(station, noAnimation) {
  var notYet = false;
  var container 
  setTimeout(() => {
    container.style.transform = "translateX(0)";
    document.querySelector(".searchContain").style.transform = "translateX(-100vw)";
    document.getElementById("listOfStations").style.transform = "translateX(-100vw)";
  }, 1);
  var data;
 

  if (noAnimation) {
    let response = await fetch(
      " https://cors.proxy.prometko.si/https://lpp.ojpp.derp.si/api/station/arrival?station-code=" +
        stationList[station].id
    );
    data = await response.json();
  } else {
    container = addElement("div", document.querySelector(".mainSheet"), "arrivalsHolder");
    const title = addElement("h1",container, "title");
    title.innerHTML = stationList[station].n;
    
   var tabs = addElement("md-tabs", container, "tabs");
  tabs.innerHTML = `<md-primary-tab id="arrivalsTab" aria-controls="arrivals-panel">Prihodi</md-primary-tab>
   <md-primary-tab id="timeTab" aria-controls="time-panel">Urnik</md-primary-tab>`;
   arrivalsScroll = addElement(
    "div",
    container,
    "arrivalsScroll"
  );
    

    arrivalsScroll.setAttribute("role", "tabpanel");
    arrivalsScroll.setAttribute("aria-labelledby", "arrivalsTab");
    arrivalsScroll.setAttribute("id", "arrivals-panel");
    let currentPanel = document.querySelector(".arrivalsScroll");
    
 
    var timeTScroll = addElement(
      "div",
      container,
      "timeTScroll"
    );
    timeTScroll.setAttribute("role", "tabpanel");
    timeTScroll.setAttribute("aria-labelledby", "timeTab");
    timeTScroll.setAttribute("id", "time-panel");
    timeTScroll.classList.add("arrivalsScroll")
    timeTScroll.style.display = "none";
    let response = await fetch(
      "https://cors.proxy.prometko.si/https://lpp.ojpp.derp.si/api/station/arrival?station-code=" +
        stationList[station].id
    );
    data = await response.json();
    tabs.addEventListener("change", () => {
      console.log(tabs.activeTab);

      if (currentPanel) {
        currentPanel.style.display = "none";
      }

      const panelId = tabs.activeTab?.getAttribute("aria-controls");
      const root = tabs.getRootNode();
      currentPanel = root.querySelector(`#${panelId}`);
      if (currentPanel) {
        currentPanel.style.display = "flex";
      }
      if(currentPanel == timeTScroll && !notYet){
        notYet = true
        showLines(timeTScroll, stationList[station]);
      }
      
    });
    let iks = addElement("md-icon-button", title, "iks");
    iks.innerHTML = "<md-icon>arrow_back_ios</md-icon>";
    iks.addEventListener("click", function () {
      container.style.transform = "translateX(100vw)";
      document.getElementById("listOfStations").style.transform = "translateX(0vw)";
      isArrivalsOpen = false;
      document.querySelector(".searchContain").style.transform = "translateX(0vw)";

      clearInterval(interval);
      setTimeout(() => {
       container.remove()
       document.getElementById("listOfStations").classList.remove("hideStations")

      }, 500);
      
    });

    let mapca = addElement("md-icon-button", title, "mapca");
    mapca.innerHTML = "<md-icon>map</md-icon>";
    mapca.addEventListener("click", function () {
      showOnMap(stationList[station].j, stationList[station].l);
    });
    
  }
  isArrivalsOpen = station;
  showArrivals(arrivalsScroll, data);
 
}
function showArrivals(arrivalsScroll, data) {
  arrivalsScroll.innerHTML = "";
  if (data.data.arrivals.length > 0) {
    let busTemplate = addElement("div", arrivalsScroll, "busTemplate");
    nextBusTemplate(data.data.arrivals, busTemplate);
    for (const arrival of data.data.arrivals) {
      if (arrivalsScroll.querySelector("#bus_" + arrival.route_name)) {
        arrivalsScroll.querySelector("#eta_" + arrival.route_name).innerHTML +=
          "<span class=arrivalTime>" +
          (arrival.type == 0 ? "<md-icon>near_me</md-icon>" : "") +
          arrival.eta_min +
          " min" +
          "</span>";
      } else {
        let arrivalItem = addElement("div", arrivalsScroll, "arrivalItem");
        arrivalItem.style.order = arrival.route_name.replace(/\D/g, "");
        const busNumberDiv = addElement("div", arrivalItem, "busNo2");

        busNumberDiv.style.backgroundColor =
          "RGB(" +
          lineColors[arrival.route_name.replace(/\D/g, "")].toString() +
          ")";
        busNumberDiv.id = "bus_" + arrival.route_name;
        busNumberDiv.textContent = arrival.route_name;
        const arrivalDataDiv = addElement("div", arrivalItem, "arrivalData");
        addElement("md-ripple", arrivalItem);

        const tripNameSpan = addElement("span", arrivalDataDiv);
        tripNameSpan.textContent = arrival.trip_name.split(" - ").at(-1);

        const etaDiv = addElement("div", arrivalDataDiv, "eta");
        etaDiv.id = "eta_" + arrival.route_name;

        const arrivalTimeSpan = addElement("span", etaDiv, "arrivalTime");
        if (arrival.type == 0) {
          arrivalTimeSpan.innerHTML =
            "<md-icon style='animation-delay:" +
            randomOneDecimal() +
            "s;'>near_me</md-icon>" +
            arrival.eta_min +
            " min";
          arrivalTimeSpan.classList.add("arrivalGreen");
        } else if (arrival.type == 1) {
          arrivalTimeSpan.innerHTML = arrival.eta_min + " min";
        } else if (arrival.type == 2) {
          arrivalTimeSpan.innerHTML = "PRIHOD";
          arrivalTimeSpan.classList.add("arrivalRed");
        }
        arrivalItem.addEventListener("click", () => {
          showBusById(arrival.route_name, arrival.stations.arrival);
        });
      }
    }
  } else {
    arrivalsScroll.innerHTML += "Trenutno ni na sporedu nobenega avtobusa";
  }
}
async function showLines(parent, station) {
  let response = await fetch(
    "https://cors.proxy.prometko.si/https://data.lpp.si/api/station/routes-on-station?station-code=" +
      station.id
  );
  let data = await response.json();
  data.data.forEach(arrival => {
    if(!arrival.is_garage){

   
    let arrivalItem = addElement("div", parent, "arrivalItem");
    arrivalItem.style.order = arrival.route_number[0] == "N" ? arrival.route_number.replace(/\D/g, "")+100:arrival.route_number.replace(/\D/g, "");
    const busNumberDiv = addElement("div", arrivalItem, "busNo2");

    busNumberDiv.style.backgroundColor =
      "RGB(" +
      lineColors[arrival.route_number.replace(/\D/g, "")].toString() +
      ")";
    busNumberDiv.id = "bus_" + arrival.route_number;
    busNumberDiv.textContent = arrival.route_number;
    const arrivalDataDiv = addElement("div", arrivalItem, "arrivalData");
    addElement("md-ripple", arrivalItem);

    const tripNameSpan = addElement("span", arrivalDataDiv);
    tripNameSpan.textContent = arrival.route_group_name;
    arrivalItem.addEventListener("click", () => {
      console.log(arrival);
      
      showLineTime(arrival.route_number, station.id);
    });
  }
  });
}
async function showLineTime(routeN, station_id) {
  let response = await fetch(`https://cors.proxy.prometko.si/https://data.lpp.si/api/station/timetable?station-code=${station_id}&route-group-number=${routeN.replace(/\D/g, "")}&previous-hours=${hoursDay(0)}&next-hours=${hoursDay(1)}`);
    let data1 = await response.json();    
    data1 = data1.data.route_groups[0].routes
  document.querySelector(".sheetContents").scrollTop = 0;
  let container = addElement("div", document.querySelector(".mainSheet"), "lineTimes");
  container.classList.add("arrivalsScroll");
  document.querySelector(".arrivalsHolder").style.transform = "translateX(-100vw)";
  let iks = addElement("md-icon-button", container, "iks");
    iks.innerHTML = "<md-icon>arrow_back_ios</md-icon>";
    iks.addEventListener("click", function () {
   container.style.transform = "translateX(100vw)";
   document.querySelector(".arrivalsHolder").style.transform = "translateX(0vw)";

   setTimeout(() => {
    container.remove();
   }, 500);
    });
    
    data1.forEach(route => {
      
      if(route.group_name+route.route_number_suffix==routeN){
        route.timetable.forEach(time => {
        let arrivalItem = addElement("div", container, "arrivalItem");
        const busNumberDiv = addElement("div", arrivalItem, "busNo2");
        busNumberDiv.id = "bus_" + time.route_number;
        busNumberDiv.innerHTML = time.hour+"<sub>h</sub>";
        const arrivalDataDiv = addElement("div", arrivalItem, "arrivalData");
        const etaDiv = addElement("div", arrivalDataDiv, "eta");
        const arrivalTimeSpan = addElement("span", etaDiv, "arrivalTime");
        arrivalTimeSpan.innerHTML = "<span class=timet>"+time.minutes.toString().replace(/,/g, "<sub>min</sub>&nbsp;&nbsp;</span><span class=timet>").replace(/\b\d\b/g, match => "0" + match)+"<sub>min</sub>";
      if(time.is_current)arrivalItem.classList.add("currentTime"); 
      })
      };
      
    })
}
function hoursDay(what) {
  const now = new Date();
  const hoursFromMidnight = now.getHours() + now.getMinutes() / 60;
  const hoursToMidnight = 24 - hoursFromMidnight;
  return what ? Math.ceil(hoursToMidnight) : Math.ceil(hoursFromMidnight);
}
const randomOneDecimal = () => +(Math.random() * 2).toFixed(1);

const nextBusTemplate = (arrivals, parent) => {
  var isNextbus = false;
  let i = 0;
  for (const arrival of arrivals) {
    if (arrival.eta_min > 1) {
      if (!isNextbus) {
        isNextbus = true;
      } else {
        return;
      }
    }

    let arrivalItem = addElement("div", parent, "arrivalItem");
    i == 0
      ? arrivalItem.classList.add("nextBus")
      : (arrivalItem.style.background = "transparent");
    let icon = i == 0 ? "arrow_circle_right" : "";
    //arrivalItem.innerHTML = `<md-icon>${icon}</md-icon>`;
    arrivalItem.style.order = arrival.type === 2 ? 0 : arrival.eta_min;
    const busNumberDiv = addElement("div", arrivalItem, "busNo2");

    busNumberDiv.style.backgroundColor =
      "RGB(" +
      lineColors[arrival.route_name.replace(/\D/g, "")].toString() +
      ")";
    busNumberDiv.id = "next_bus_" + arrival.route_name;
    busNumberDiv.textContent = arrival.route_name;
    addElement("md-ripple", busNumberDiv);
    const arrivalDataDiv = addElement("div", arrivalItem, "arrivalData");

    const tripNameSpan = addElement("span", arrivalDataDiv);
    tripNameSpan.textContent = arrival.trip_name.split(" - ").at(-1);

    const etaDiv = addElement("div", arrivalDataDiv, "eta");
    etaDiv.id = "next_eta_" + arrival.route_name;

    const arrivalTimeSpan = addElement("span", etaDiv, "arrivalTime");

    if (arrival.type == 0) {
      arrivalTimeSpan.innerHTML =
        "<md-icon style='animation-delay:" +
        randomOneDecimal() +
        "s;'>near_me</md-icon>" +
        arrival.eta_min +
        " min";
      arrivalTimeSpan.classList.add("arrivalGreen");
    } else if (arrival.type == 1) {
      arrivalTimeSpan.innerHTML = arrival.eta_min + " min";
    } else if (arrival.type == 2) {
      arrivalTimeSpan.innerHTML = "PRIHOD";
      arrivalTimeSpan.classList.add("arrivalRed");
    }
    busNumberDiv.addEventListener("click", () => {
      showBusById(arrival.route_name, arrival.stations.arrival);
    });
    i++;
  }
};
var busUpdateInterval;
function showBusById(line, trip) {
  clearInterval(busUpdateInterval);
  setTimeout(() => {
    document.querySelector(".sheetContents").style.height = "30dvh";
    sheetHeight = 30;
  }, 50);

  loop(1, line, trip);
  busUpdateInterval = setInterval(() => {
    loop(0, line, trip);
  }, 5000);
}

function addElement(tag, parent, className) {
  var element = document.createElement(tag);
  if (className) {
    element.classList.add(className);
  }
  if (parent) {
    parent.appendChild(element);
  }
  return element;
}
