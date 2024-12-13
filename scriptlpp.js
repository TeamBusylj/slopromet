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
var map;
const parser = new DOMParser();
async function makeMap() {
  iconFeature = new ol.Feature({
    geometry: new ol.geom.MultiPoint([[-90, 0], [-45, 45], [0, 0], [45, -45], [90, 0]]).transform('EPSG:4326','EPSG:3857'),
    name: 'Null Islands',
    population: 4000,
    rainfall: 500
  });
 iconStyle = new ol.style.Style({
    image: new ol.style.Icon(/** @type {module:ol/style/Icon~Options} */ ({
      anchor: [0.5, 46],
      anchorXUnits: 'pixels',
      anchorYUnits: 'pixels',
      src: 'https://raw.githubusercontent.com/TeamBusylj/slopromet/refs/heads/main/images/bus.svg',
      scale: 0.5
    }))
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
      zoom: 15,
  }),
});

}

const delayedSearch = debounce(searchRefresh, 300);
window.addEventListener("DOMContentLoaded", async function () {
  createBuses();
  let sht = makeBottomheet(null, 98);
  sht.innerHTML = `
<div class="searchContain"> <md-filled-text-field class="search" placeholder="Išči"><md-icon slot="leading-icon">search</md-icon></md-filled-text-field></div>
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
            "<div class=busNo style=background-color:#" +
            lineColors[bus.replace(/\D/g, "")] +
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

        busNumberDiv.style.backgroundColor =
          "#" + lineColors[arrival.route_name.replace(/\D/g, "")];
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
          showBusById(arrival.trip_id, iks);
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

  busNumberDiv.style.backgroundColor =
    "#" + lineColors[arrival.route_name.replace(/\D/g, "")];
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
    showBusById(arrival.trip_id, iks);
  });
  i++
}
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

const lineColors = {
  1: "C93336",
  2: "8C8841",
  3: "EC593A",
  5: "9F539E",
  6: "939598",
  7: "1CBADC",
  8: "116AB0",
  9: "86AACD",
  11: "EDC23B",
  12: "214AA0",
  13: "CFD34D",
  14: "EF59A1",
  15: "A2238E",
  16: "582C81",
  18: "895735",
  19: "EA9EB4",
  20: "1F8751",
  21: "52BA50",
  22: "F6A73A",
  23: "40AE49",
  24: "ED028C",
  25: "0F95CA",
  26: "231F20",
  27: "57A897",
  30: "9AD2AE",
  40: "496E6D",
  42: "A78B6B",
  43: "4E497A",
  44: "817EA8",
  51: "6C8BC6",
  52: "00565D",
  53: "C7B3CA",
  56: "953312",
  60: "ACBB71",
  61: "F9A64A",
  71: "6C8BC6",
  72: "4CA391",
  73: "FECA0A",
  78: "C96D6A",
  4: "F28B30",
  10: "A2BF2F",
  17: "B83D45",
  28: "E58C4D",
  29: "B2D28A",
  31: "7A56A1",
  32: "DA9D56",
  33: "77A8B3",
  34: "E35692",
  35: "514D6E",
  36: "D4A747",
  37: "3A7C7E",
  38: "E67527",
  39: "9C6E58",
  41: "D6E7A3",
  45: "A74243",
  46: "8F6B8E",
  47: "D3954A",
  48: "72C9B6",
  49: "CB4577",
  50: "6A789A",
  54: "D8AF56",
  55: "43577B",
  57: "E58E50",
  58: "908B9E",
  59: "BFD264",
  62: "9E7352",
  63: "3F9D9E",
  64: "EF7D50",
  65: "5D5C6B",
  66: "D3B257",
  67: "4D917F",
  68: "E27851",
  69: "A2755B",
  70: "A8CDB5",
  74: "D65274",
  75: "B8B3D5",
  76: "D4B158",
  77: "61937F",
  79: "EF8251",
  80: "75685C",
};
