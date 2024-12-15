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
      const x = currentCoordinates[0] + (newCoordinates[0] - currentCoordinates[0]) * 0.1;
      const y = currentCoordinates[1] + (newCoordinates[1] - currentCoordinates[1]) * 0.1;

      // Update the feature's geometry
      feature.setGeometry(new ol.geom.Point([x, y]));

      // Apply the predefined direction (rotation) to the feature's style
      const style = feature.getStyle();
      if (style && style.getImage) {
          const image = style.getImage();
          image.setRotation(dir); // Use the provided direction for rotation
      }

      // Check if the marker is close enough to the target to stop
      if (Math.abs(newCoordinates[0] - x) < 0.0001 && Math.abs(newCoordinates[1] - y) < 0.0001) {
          feature.setGeometry(new ol.geom.Point(newCoordinates));
          return false; // Stop animation
      }
      return true; // Continue animation
  }
  return false;
}

var map, busVectorLayer, busLayer, busStationLayer, animating,speed, now;
const parser = new DOMParser();
  
async function makeMap() {
  iconFeature = new ol.Feature({
    geometry: new ol.geom.MultiPoint([[-90, 0], [-45, 45], [0, 0], [45, -45], [90, 0]]).transform('EPSG:4326','EPSG:3857'),
    name: 'Null Islands',
    population: 4000,
    rainfall: 500
  });

  vectorSource = new ol.source.Vector({ // VectorSource({
    features: [iconFeature]
  });

   vectorLayer = new ol.layer.Vector({ // VectorLayer({
    source: vectorSource
  });

    rasterLayer = new ol.layer.Tile({
        source: new ol.source.OSM({
          url: 'https://basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}.png',
          crossOrigin: null
        })
      })

 map = new ol.Map({
  layers: [rasterLayer, vectorLayer],
  target: 'map',
  view: new ol.View({
      center: ol.proj.fromLonLat([14.5058, 46.0569]), // Default center (longitude, latitude)
      zoom: 13,
      loadTilesWhileAnimating: true,
      padding: [10,10,100,10]
     
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

setInterval(getLocation, 60000);
async function createBuses() {
  await getLocation();
  stationList = JSON.parse(stationDetails).data;
 makeMap()

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
            "RGB(" + lineColors[bus.replace(/\D/g, "")].toString() + ")" +
            " id=bus2_" +
            bus +
            ">" +
            bus +
            "</div>";
        }
        item.appendChild(buses);
        item.addEventListener("click", () => {
          item2.style.viewTransitionName = "stitm";

          document.startViewTransition(async () => {
            item2.style.viewTransitionName = "";

            stationClick(station);
            interval = setInterval(async () => {
              let i = document.querySelector(".sheetContents").scrollTop
              await stationClick(isArrivalsOpen, true);
              document.querySelector(".sheetContents").scrollTop = i
            }, 10000);
          });
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
var interval
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
async function stationClick(station, noAnimation) {
  
  
  var response;
  var movies;
  if (noAnimation) {
    response = await fetch(
      " https://cors.proxy.prometko.si/https://lpp.ojpp.derp.si/api/station/arrival?station-code=" +
        stationList[station].id
    );
    movies = await response.json();
    try {
      document.querySelector(".title").remove();
      document.querySelector(".arrivalsScroll").remove();
    } catch (e) {
      console.log(e);
      
    }
  }
  let title = addElement("h1", document.querySelector(".mainSheet"), "title");
  title.innerHTML = stationList[station].n;
  let iks = addElement("md-icon-button", title, "iks");
  iks.innerHTML = "<md-icon>arrow_back_ios</md-icon>";

  let mapca = addElement("md-icon-button", title, "mapca");
  mapca.innerHTML = "<md-icon>map</md-icon>";
  mapca.addEventListener("click", function () {
    showOnMap(stationList[station].j, stationList[station].l);
  });
console.log("refresh");

  var arrivalsScroll = addElement(
    "div",
    document.querySelector(".mainSheet"),
    "arrivalsScroll"
  );
 
  document.querySelector(".sheetContents").scrollTop = 0;
  isArrivalsOpen = station;

    document.getElementById("listOfStations").style.display = "none";

  if (noAnimation) {
    arrivalsScroll.style.transition = "all 0s";
  } else {
    response = await fetch(
      " https://cors.proxy.prometko.si/https://lpp.ojpp.derp.si/api/station/arrival?station-code=" +
        stationList[station].id
    );
    movies = await response.json();
  }

  if (movies.data.arrivals.length > 0) {
    let busTemplate = addElement("div", arrivalsScroll, "busTemplate");
    nextBusTemplate(movies.data.arrivals, busTemplate);
    for (const arrival of movies.data.arrivals) {
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

        busNumberDiv.style.backgroundColor ="RGB(" + lineColors[arrival.route_name.replace(/\D/g, "")].toString() + ")"; 
               busNumberDiv.id = "bus_" + arrival.route_name;
        busNumberDiv.textContent = arrival.route_name;
        addElement("md-ripple", busNumberDiv);
        const arrivalDataDiv = addElement("div", arrivalItem, "arrivalData");

        const tripNameSpan = addElement("span", arrivalDataDiv);
        tripNameSpan.textContent = arrival.trip_name.split(" - ").at(-1);

        const etaDiv = addElement("div", arrivalDataDiv, "eta");
        etaDiv.id = "eta_" + arrival.route_name;

        const arrivalTimeSpan = addElement("span", etaDiv, "arrivalTime");
        if (arrival.type == 0) {
          arrivalTimeSpan.innerHTML =
        "<md-icon style='animation-delay:"+randomOneDecimal()+"s;'>near_me</md-icon>"+ arrival.eta_min + " min";
          arrivalTimeSpan.classList.add("arrivalGreen");
        } else if (arrival.type == 1) {
          arrivalTimeSpan.innerHTML = arrival.eta_min + " min";
        }
      else if(arrival.type == 2) {
        arrivalTimeSpan.innerHTML = "PRIHOD";
        arrivalTimeSpan.classList.add("arrivalRed");
      }
        busNumberDiv.addEventListener("click", () => {
          showBusById(arrival.route_name, arrival.stations.arrival);
        });
      }
    }
  } else {
    arrivalsScroll.innerHTML += "Trenutno ni na sporedu nobenega avtobusa";
  }
  
  iks.addEventListener("click", function () {
    document.getElementById("listOfStations").style.display = "block";
    arrivalsScroll.style.transform = "translateX(30px)";
    arrivalsScroll.style.opacity = "0";
    title.style.transform = "translateX(30px)";
    title.style.opacity = "0";
    isArrivalsOpen = false;
   
    clearInterval(interval);
    setTimeout(() => {
      arrivalsScroll.remove();
      title.remove();
    }, 400);
  });
  
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
  i == 0 ? arrivalItem.classList.add("nextBus") : arrivalItem.style.background = "transparent";
  let icon = i == 0 ? "arrow_circle_right" : "";
  //arrivalItem.innerHTML = `<md-icon>${icon}</md-icon>`;
  arrivalItem.style.order = arrival.type === 2 ? 0 : arrival.eta_min;
  const busNumberDiv = addElement("div", arrivalItem, "busNo2");

  busNumberDiv.style.backgroundColor ="RGB(" + lineColors[arrival.route_name.replace(/\D/g, "")].toString() + ")";
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
        "<md-icon style='animation-delay:"+randomOneDecimal()+"s;'>near_me</md-icon>" + arrival.eta_min + " min";
      arrivalTimeSpan.classList.add("arrivalGreen");
    } else if (arrival.type == 1) {
      arrivalTimeSpan.innerHTML = arrival.eta_min + " min";
    }
  else if(arrival.type == 2) {
    arrivalTimeSpan.innerHTML = "PRIHOD";
    arrivalTimeSpan.classList.add("arrivalRed");
  }
  busNumberDiv.addEventListener("click", () => {
    
    showBusById(arrival.route_name, arrival.stations.arrival);
  });
  i++
}
}
var busUpdateInterval;
function showBusById(line, trip) {
  clearInterval(busUpdateInterval);
  setTimeout(() => {
    document.querySelector(".sheetContents").style.height = "30dvh";
sheetHeight = 30;
  }, 50);

  loop(1, line, trip)
  busUpdateInterval = setInterval(() => {
     loop(0, line, trip)
  }, 5000)
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


