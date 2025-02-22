

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
  vectorSource = new ol.source.Vector({
    updateWhileAnimating: true, // Ensures updates while map is in motion
    updateWhileInteracting: true,
  });

  vectorLayer = new ol.layer.Vector({
    updateWhileAnimating: true, // Ensures updates while map is in motion
    updateWhileInteracting: true,
    source: vectorSource,
  });

  (rasterLayer = new ol.layer.Tile({
    preload: Infinity,
    transition: 1000,
    source: !window.matchMedia("(prefers-color-scheme: dark)").matches
      ? new ol.source.XYZ({
          url: "https://basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}.png",
          transition: 1000,
        })
      : new ol.source.StadiaMaps({
          layer: "alidade_smooth_dark",
          retina: true,
          transition: 1000,
        }),
  })),
    (map = new ol.Map({
      interactions: ol.interaction.defaults.defaults().extend([
        new ol.interaction.DblClickDragZoom(),
        new ol.interaction.PinchZoom({
          constrainResolution: true,
        }),
      ]),
      layers: [rasterLayer, vectorLayer],
      target: "map",
      loadTilesWhileAnimating: true,
      loadTilesWhileInteracting: true,
      view: new ol.View({
        center: ol.proj.fromLonLat([14.5058, 46.0569]), // Default center (longitude, latitude)
        zoom: 13,
        loadTilesWhileAnimating: true,
        padding: [20, 30, 70, 30],
      }),
    }));
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

  geolocation.on("change:accuracyGeometry", function () {
    accuracyFeature.setGeometry(geolocation.getAccuracyGeometry());
  });

  const positionFeature = new ol.Feature();
  positionFeature.setStyle(
    new ol.style.Style({
      image: new ol.style.Circle({
        radius: 6,
        fill: new ol.style.Fill({
          color: "#3399CC",
        }),
        stroke: new ol.style.Stroke({
          color: "#fff",
          width: 2,
        }),
      }),
    })
  );

  geolocation.on("change:position", function () {
    const coordinates = geolocation.getPosition();
    positionFeature.setGeometry(
      coordinates ? new ol.geom.Point(coordinates) : null
    );
  });

  new ol.layer.Vector({
    map: map,
    source: new ol.source.Vector({
      features: [accuracyFeature, positionFeature],
      updateWhileAnimating: true, // Ensures updates while map is in motion
      updateWhileInteracting: true,
    }),
    updateWhileAnimating: true, // Ensures updates while map is in motion
    updateWhileInteracting: true,
  });
  const busSource = new ol.source.Vector(); // Contains bus markers
  const busStationSource = new ol.source.Vector(); // Contains station locations
  const busVectorSource = new ol.source.Vector(); // Contains vector graphics or routes

  // Create vector layers for each source
  busLayer = new ol.layer.Vector({
    source: busSource,
    updateWhileAnimating: true, // Ensures updates while map is in motion
    updateWhileInteracting: true,
  });

  busStationLayer = new ol.layer.Vector({
    source: busStationSource,
    updateWhileAnimating: true, // Ensures updates while map is in motion
    updateWhileInteracting: true,
  });

  busVectorLayer = new ol.layer.Vector({
    source: busVectorSource,
    updateWhileAnimating: true, // Ensures updates while map is in motion
    updateWhileInteracting: true,
  });

  // Add the layers to the map
  map.addLayer(busLayer);
  map.addLayer(busStationLayer);
  map.addLayer(busVectorLayer);
}
function centerMap() {
  const view = map.getView();
  var center = ol.proj.fromLonLat([longitude, latitude]);
  var duration = 1000;
  view.animate({
    center: center,
    duration: duration,
  });
  view.animate({
    zoom: 16,
    duration: duration,
  });
}
const delayedSearch = debounce(searchRefresh, 300);
window.addEventListener("DOMContentLoaded", async function () {
  createBuses();
  let sht = makeBottomheet(null, 98);
  let bava = "";
  sht.innerHTML = `
<div class="searchContain"> <md-filled-text-field class="search" value='${bava}' placeholder="Išči"><md-icon slot="leading-icon">search</md-icon></md-filled-text-field></div>
 <md-circular-progress indeterminate id="loader"></md-circular-progress>
 <md-tabs class=tabs id=tabsFav><md-primary-tab id="favTab" aria-controls="fav-panel">Priljubljeno</md-primary-tab><md-primary-tab id="locationTab" aria-controls="location-panel">V bližini</md-primary-tab></md-tabs>
    <md-list role="tabpanel" aria-labelledby="locationTab" id="location-panel" class="listOfStations"></md-list>
    <md-list role="tabpanel" aria-labelledby="favTab" id="fav-panel" class="favouriteStations"></md-list>`;
  let search = this.document.querySelector(".search");
  search.addEventListener("input", delayedSearch);
  search.addEventListener(`focus`, () => search.select());
  busImageData = await fetch(
    "https://mestnipromet.cyou/tracker/js/json/images.json"
  );
  busImageData = await busImageData.json();
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
  } catch (e) {
    console.log(e);

    latitude = 46.051467939339034;
    longitude = 14.506053031033623;
  }
}


async function createBuses() {
  await getLocation();
  stationList = JSON.parse(stationDetails).data;
  currentPanel = document.querySelector(".favouriteStations");
  createStationItems();
  currentPanel.style.transform = "translateX(0px) translateY(0px)";
  currentPanel.style.opacity = "1";
  makeMap();
  updateStations();
}
async function updateStations() {
  let stations = await fetchData(
    "https://cors.proxy.prometko.si/https://data.lpp.si/api/station/station-details?show-subroutes=1"
  );
  stationList = stations;
  createStationItems();
}
var isArrivalsOpen = false;
var currentPanel;
function createStationItems(o) {
  var search = false;
  let query = document.querySelector(".search").value;
  if (query !== "") {
    search = true;
  }
  var loader = document.getElementById("loader");
  var list = document.querySelector(".listOfStations");
  list.innerHTML = "";
  var favList = document.querySelector(".favouriteStations");
  favList.innerHTML = "";
  createFavourite(favList, search, query);
  if (!o) {
    favList.style.transform = "translateX(0px) translateY(0px)";
    favList.style.opacity = "1";
  }

  loader.style.display = "block";
  var nearby = {};
  var tabs = document.getElementById("tabsFav");
  if (currentPanel == favList) {
    list.style.display = "none";
  } else {
    favList.style.display = "none";
  }
  tabs.addEventListener("change", () => {
    if (currentPanel) {
      currentPanel.style.display = "none";
      currentPanel.style.transform = "translateX(0px) translateY(-20px)";
      currentPanel.style.opacity = "0";
    }

    const panelId = tabs.activeTab?.getAttribute("aria-controls");
    const root = tabs.getRootNode();
    currentPanel = root.querySelector(`#${panelId}`);
    if (currentPanel) {
      currentPanel.style.display = "flex";
      setTimeout(() => {
        currentPanel.style.transform = "translateX(0px) translateY(0px)";
        currentPanel.style.opacity = "1";
      }, 1);
    }
  });
  if (navigator.geolocation) {
    if (latitude == 46.051467939339034)
      list.innerHTML +=
        "<p><md-icon>location_off</md-icon>Lokacija ni omogočena.</p>";
    for (const station in stationList) {
      let item2 = addElement("md-list-item", null, "stationItem");
      item2.setAttribute("interactive", "");
      addElement("md-ripple", item2);
      let item = addElement("div", item2, "station");

      let textHolder = addElement("div", item, "textHolder");
      textHolder.innerHTML =
        '<span class="stationName">' + stationList[station].name + "</span>";
      const distance = haversineDistance(
        latitude,
        longitude,
        stationList[station].latitude,
        stationList[station].longitude
      );
      const favList = JSON.parse(
        localStorage.getItem("favouriteStations") || "[]"
      );
      if (
        search &&
        !normalizeText(stationList[station].name.toLowerCase()).includes(
          normalizeText(query.toLowerCase())
        )
      )
        continue;
      if (distance < 3 || search) {
        let cornot = "";
        if (stationList[station].ref_id % 2 !== 0) {
          cornot = '<md-icon class="center">adjust</md-icon>';
        }
        let fav = "";
        if (favList.includes(stationList[station].ref_id)) {
          fav = '<md-icon class="iconFill">favorite</md-icon>';
        }
        if (distance > 1) {
          textHolder.innerHTML +=
            cornot +
            "<span class=stationDistance>" +
            fav +
            distance.toFixed(1) +
            " km</span>";
          nearby[distance.toFixed(5)] = item2;
        } else {
          textHolder.innerHTML +=
            cornot +
            "<span class=stationDistance>" +
            fav +
            Math.round(distance * 1000) +
            " m</span>";
          nearby[distance.toFixed(5)] = item2;
        }
        let buses = addElement("div", item, "buses");
        for (const bus of stationList[station].route_groups_on_station) {
          buses.innerHTML +=
            "<div class=busNo style=background:" +
            lineColors(bus) +
            " id=bus2_" +
            bus +
            ">" +
            bus +
            "</div>";
        }
        item.appendChild(buses);
        item2.addEventListener("click", async () => {
          await stationClick(station);
          interval = setInterval(async () => {
            await stationClick(isArrivalsOpen, true);
          }, 10000);
        });
      }
    }

    const sortedArray = Object.keys(nearby)
      .map((key) => parseFloat(key).toFixed(5))
      .sort((a, b) => a - b)
      .map((key) => nearby[key]);
    if (sortedArray.length > 40) sortedArray.splice(40);

    for (const stationDistance of sortedArray) {
      list.appendChild(stationDistance);
    }
    loader.style.display = "none";
  }
}
async function refresh() {
  if(checkVisible(document.querySelector(".arrivalsOnStation"))) {
    console.log("nebi");
    
  } else if(checkVisible(document.querySelector(".busTemplate"))){ 
    let arH = document.querySelector(".arrivalsScroll");
    arH.style.transform = "translateX(0px) translateY(-20px)";
    arH.style.opacity = "0";
    await stationClick(isArrivalsOpen, true);
    arH.style.transform = "translateX(0px) translateY(0px)";
    arH.style.opacity = "1";
  } else if(checkVisible(currentPanel)){
    currentPanel.style.transform = "translateX(0px) translateY(-20px)";
    currentPanel.style.opacity = "0";
    await getLocation();
    await createStationItems(1);
    currentPanel.style.transform = "translateX(0px) translateY(0px)";
    currentPanel.style.opacity = "1";
   
  } else{

  }
}
function checkVisible(elm) {
  if(!elm) return false;
  var rect = elm.getBoundingClientRect();
  var viewHeight = Math.max(document.documentElement.clientHeight, window.innerHeight);
  return !(rect.bottom < 0 || rect.top - viewHeight >= 0);
}
function normalizeText(text) {
  return text.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}
function createFavourite(parent, search, query) {
  var nearby = {};
  if (latitude == 46.051467939339034)
    parent.innerHTML +=
      "<p><md-icon>location_off</md-icon>Lokacija ni omogočena.</p>";
  for (const station in stationList) {
    let item2 = addElement("md-list-item", null, "stationItem");
    item2.setAttribute("interactive", "");
    addElement("md-ripple", item2);
    let item = addElement("div", item2, "station");

    let textHolder = addElement("div", item, "textHolder");
    textHolder.innerHTML =
      '<span class="stationName">' + stationList[station].name + "</span>";
    const favList = JSON.parse(
      localStorage.getItem("favouriteStations") || "[]"
    );
    if (
      search &&
      !normalizeText(stationList[station].name.toLowerCase()).includes(
        normalizeText(query.toLowerCase())
      )
    )
      continue;
    if (favList.includes(stationList[station].ref_id) || search) {
      const distance = haversineDistance(
        latitude,
        longitude,
        stationList[station].latitude,
        stationList[station].longitude
      );
      let cornot = "";
      if (stationList[station].ref_id % 2 !== 0) {
        cornot = '<md-icon class="center">adjust</md-icon>';
      }
      let fav = "";
      if (favList.includes(stationList[station].ref_id)) {
        fav = '<md-icon class="iconFill">favorite</md-icon>';
      }
      if (distance > 1) {
        textHolder.innerHTML +=
          cornot +
          "<span class=stationDistance>" +
          fav +
          distance.toFixed(1) +
          " km</span>";
        nearby[distance.toFixed(5)] = item2;
      } else {
        textHolder.innerHTML +=
          cornot +
          "<span class=stationDistance>" +
          fav +
          Math.round(distance * 1000) +
          " m</span>";
        nearby[distance.toFixed(5)] = item2;
      }
      let buses = addElement("div", item, "buses");
      for (const bus of stationList[station].route_groups_on_station) {
        buses.innerHTML +=
          "<div class=busNo style=background:" +
          lineColors(bus) +
          " id=bus2_" +
          bus +
          ">" +
          bus +
          "</div>";
      }

      item.appendChild(buses);
      item2.addEventListener("click", async () => {
        await stationClick(station);
        interval = setInterval(async () => {
          await stationClick(isArrivalsOpen, true);
        }, 10000);
      });
    }
  }
  const sortedArray = Object.keys(nearby)
    .map((key) => parseFloat(key).toFixed(5))
    .sort((a, b) => a - b)
    .map((key) => nearby[key]);

  if (sortedArray.length > 40) sortedArray.splice(40);

  for (const stationDistance of sortedArray) {
    parent.appendChild(stationDistance);
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
async function oppositeStation(id) {
  let arS = document.querySelector(".arrivalsScroll");
  arS.style.transform = "translateX(0px) translateY(-20px)";
  arS.style.opacity = "0";
  setTimeout(async () => {
    if (id % 2 === 0) {
      await stationClick(
        stationList.findIndex((obj) => obj.ref_id === String(parseInt(id) - 1)),
        true
      );
    } else {
      await stationClick(
        stationList.findIndex((obj) => obj.ref_id === String(parseInt(id) + 1)),
        true
      );
    }
    arS.style.transform = "translateX(0px) translateY(0px)";
    arS.style.opacity = "1";
  }, 300);
}
var arrivalsScroll;
async function stationClick(station, noAnimation) {
  if (document.querySelector(".arrivalsOnStation")) return;
  var stylesTransition = [
    document.querySelector(".searchContain").style,
    document.querySelector(".listOfStations").style,
    document.querySelector(".favouriteStations").style,
    document.getElementById("tabsFav").style,
  ];
  setTimeout(() => {
    document.querySelector(".sheetContents").scrollTop = 0;
  }, 250);
  var notYet = false;
  var container;

  var data;
  var favList = JSON.parse(localStorage.getItem("favouriteStations") || "[]");
  var mapca;
  var fav;
  if (noAnimation) {
    data = await fetchData(
      "https://cors.proxy.prometko.si/https://lpp.ojpp.derp.si/api/station/arrival?station-code=" +
        stationList[station].ref_id
    );
    let cornot = "";
    if (stationList[station].ref_id % 2 !== 0)
      cornot = '<md-icon class="center">adjust</md-icon>';
    document.querySelector(".title span").innerHTML =
      stationList[station].name + cornot;
    document.querySelector(".titleHolder").innerHTML +=
      "<div class=none></div>";
    document.querySelector(".mapca").addEventListener("click", function () {
      oppositeStation(stationList[station].ref_id);
    });
    let favi = document.querySelector(".favi");
    favi.innerHTML = favList.includes(stationList[station].ref_id)
      ? "<md-icon class=iconFill>favorite</md-icon>"
      : "<md-icon>favorite</md-icon>";

    favi.addEventListener("click", function () {
      if (favList.includes(stationList[station].ref_id)) {
        favList = favList.filter(
          (item) => item !== stationList[station].ref_id
        );
        favi.innerHTML = "<md-icon>favorite</md-icon>";
      } else {
        favList.push(stationList[station].ref_id);

        favi.innerHTML = "<md-icon class=iconFill>favorite</md-icon>";
      }

      localStorage.setItem("favouriteStations", JSON.stringify(favList));
    });
  } else {
    container = addElement(
      "div",
      document.querySelector(".mainSheet"),
      "arrivalsHolder"
    );
    createInfoBar(
      document.querySelector(".mainSheet"),
      stationList[station].ref_id
    );
    stylesTransition.forEach((style) => {
      style.transform = "translateX(-100vw)";
    });
    stylesTransition.forEach((style) => {
      style.opacity = "0";
    });
    setTimeout(() => {
      container.style.transform = "translateX(0)";
    }, 1);
    setTimeout(() => {
      container.style.opacity = "1";
    }, 100);

    const title = addElement("h1", container, "title");
    let holder = addElement("div", title);
    let iks = addElement("md-icon-button", holder, "iks");
    iks.innerHTML = "<md-icon>arrow_back_ios_new</md-icon>";
    iks.addEventListener("click", function () {
      container.style.transform = "translateX(100vw)";
      document.querySelector(".infoBar").style.transform = "translateY(30px)";
      container.style.opacity = "0";
      isArrivalsOpen = false;
      stylesTransition.forEach((style) => {
        style.transform = "translateX(0vw)";
      });
      stylesTransition.forEach((style) => {
        style.opacity = "1";
      });
      clearInterval(interval);
      setTimeout(() => {
        container.remove();
        document
          .querySelector(".listOfStations")
          .classList.remove("hideStations");
        document.querySelector(".infoBar").remove();
      }, 500);
    });

    let ttl = addElement("span", title);
    let cornot = "";
    if (stationList[station].ref_id % 2 !== 0)
      cornot = '<md-icon class="center">adjust</md-icon>';
    ttl.innerHTML = stationList[station].name + cornot;
    let hh = addElement("div", title, "titleHolder");
    fav = addElement("md-icon-button", hh, "favi");
    fav.innerHTML = favList.includes(stationList[station].ref_id)
      ? "<md-icon class=iconFill>favorite</md-icon>"
      : "<md-icon>favorite</md-icon>";
    fav.addEventListener("click", function () {
      if (favList.includes(stationList[station].ref_id)) {
        favList = favList.filter(
          (item) => item !== stationList[station].ref_id
        );
        fav.innerHTML = "<md-icon>favorite</md-icon>";
      } else {
        favList.push(stationList[station].ref_id);

        fav.innerHTML = "<md-icon class=iconFill>favorite</md-icon>";
      }

      localStorage.setItem("favouriteStations", JSON.stringify(favList));
    });
    mapca = addElement("md-icon-button", hh, "mapca");
    mapca.innerHTML = "<md-icon>swap_calls</md-icon>";
    mapca.addEventListener("click", function () {
      oppositeStation(stationList[station].ref_id);
    });
    if (stationList[station].ref_id % 2 === 0) {
      if (
        stationList.findIndex(
          (obj) =>
            obj.ref_id === String(parseInt(stationList[station].ref_id) - 1)
        ) === -1
      ) {
        mapca.setAttribute("disabled", "");
      }
    } else {
      if (
        stationList.findIndex(
          (obj) =>
            obj.ref_id === String(parseInt(stationList[station].ref_id) + 1)
        ) === -1
      ) {
        mapca.setAttribute("disabled", "");
      }
    }

    var tabs = addElement("md-tabs", container, "tabs");
    tabs.innerHTML = `<md-primary-tab id="arrivalsTab" aria-controls="arrivals-panel">Prihodi</md-primary-tab>
   <md-primary-tab id="timeTab" aria-controls="time-panel">Urnik</md-primary-tab>`;
    arrivalsScroll = addElement("div", container, "arrivalsScroll");

    arrivalsScroll.setAttribute("role", "tabpanel");
    arrivalsScroll.setAttribute("aria-labelledby", "arrivalsTab");
    arrivalsScroll.setAttribute("id", "arrivals-panel");
    let currentPanel = document.querySelector(".arrivalsScroll");

    var timeTScroll = addElement("div", container, "timeTScroll");
    timeTScroll.setAttribute("role", "tabpanel");
    timeTScroll.setAttribute("aria-labelledby", "timeTab");
    timeTScroll.setAttribute("id", "time-panel");
    timeTScroll.classList.add("arrivalsScroll");
    timeTScroll.style.display = "none";
    tabs.addEventListener("change", () => {
      if (currentPanel) {
        currentPanel.style.display = "none";
        currentPanel.style.transform = "translateX(0px) translateY(-20px)";
        currentPanel.style.opacity = "0";
      }

      const panelId = tabs.activeTab?.getAttribute("aria-controls");
      const root = tabs.getRootNode();
      currentPanel = root.querySelector(`#${panelId}`);
      if (currentPanel) {
        currentPanel.style.display = "flex";
        setTimeout(() => {
          currentPanel.style.transform = "translateX(0px) translateY(0px)";
          currentPanel.style.opacity = "1";
        }, 1);
      }
      if (currentPanel == timeTScroll && !notYet) {
        notYet = true;
        showLines(timeTScroll, stationList[station]);
      }
    });
    data = await fetchData(
      "https://cors.proxy.prometko.si/https://lpp.ojpp.derp.si/api/station/arrival?station-code=" +
        stationList[station].ref_id
    );

    arrivalsScroll.style.transform = "translateX(0px) translateY(0px)";
    arrivalsScroll.style.opacity = "1";
  }
  isArrivalsOpen = station;

  showArrivals(arrivalsScroll, data);
}
/**
 * Displays the arrivals of buses on the provided element.
 *
 * This function clears the content of the `arrivalsScroll` element and populates it
 * with information about upcoming bus arrivals. For each arrival, it checks if the
 * bus route is already displayed. If not, it creates new elements to display the
 * bus number, trip name, and estimated time of arrival (ETA). It applies different
 * styles based on the type of arrival.
 *
 * @param {HTMLElement} arrivalsScroll - The DOM element where the arrivals will be displayed.
 * @param {Object} data - The data object containing bus arrival information.
 * @param {Array} data.data.arrivals - An array of bus arrival objects.
 */

function showArrivals(arrivalsScroll, data) {
  arrivalsScroll.innerHTML = "";
  if (data.arrivals.length > 0) {
    let busTemplate = addElement("div", arrivalsScroll, "busTemplate");
    nextBusTemplate(data, busTemplate);
    let listOfArrivals = [];
    for (const arrival of data.arrivals) {
      if (listOfArrivals.includes(arrival.trip_id)) {
        const arrivalTimeSpan = addElement(
          "span",
          arrivalsScroll.querySelector("#eta_" + arrival.route_name),
          "arrivalTime"
        );
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
        } else if (arrival.type == 3) {
          arrivalTimeSpan.innerHTML = "OBVOZ";
          arrivalTimeSpan.classList.add("arrivalYellow");
        }
      } else {
        let arrivalItem = addElement("div", arrivalsScroll, "arrivalItem");
        arrivalItem.style.order = arrival.route_name.replace(/\D/g, "");
        const busNumberDiv = addElement("div", arrivalItem, "busNo2");

        busNumberDiv.style.background = lineColors(arrival.route_name);

        busNumberDiv.id = "bus_" + arrival.route_name;
        busNumberDiv.textContent = arrival.route_name;
        listOfArrivals.push(arrival.trip_id);
        const arrivalDataDiv = addElement("div", arrivalItem, "arrivalData");
        addElement("md-ripple", arrivalItem);

        const tripNameSpan = addElement("span", arrivalDataDiv);
        tripNameSpan.textContent = arrival.stations.arrival;

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
        } else if (arrival.type == 3) {
          arrivalTimeSpan.innerHTML = "OBVOZ";
          arrivalTimeSpan.classList.add("arrivalYellow");
        }
        arrivalItem.addEventListener("click", () => {
          showBusById(arrival, arrivalsScroll, data.station.code_id);
        });
      }
    }
  } else {
    arrivalsScroll.innerHTML +=
      "<p><md-icon>no_transfer</md-icon>V naslednji uri ni predvidenih avtobusov.</p>";
  }
}
async function showLines(parent, station) {
  let data = await fetchData(
    "https://cors.proxy.prometko.si/https://data.lpp.si/api/station/routes-on-station?station-code=" +
      station.ref_id
  );

  parent.style.transform = "translateX(0px) translateY(0px)";
  parent.style.opacity = "1";

  data.forEach((arrival) => {
    if (!arrival.is_garage) {
      let arrivalItem = addElement("div", parent, "arrivalItem");
      arrivalItem.style.order =
        arrival.route_number[0] == "N"
          ? arrival.route_number.replace(/\D/g, "") + 100
          : arrival.route_number.replace(/\D/g, "");
      const busNumberDiv = addElement("div", arrivalItem, "busNo2");

      busNumberDiv.style.background = lineColors(arrival.route_number);

      busNumberDiv.id = "bus_" + arrival.route_number;
      busNumberDiv.textContent = arrival.route_number;
      const arrivalDataDiv = addElement("div", arrivalItem, "arrivalData");
      addElement("md-ripple", arrivalItem);

      const tripNameSpan = addElement("span", arrivalDataDiv);
      tripNameSpan.textContent = arrival.route_group_name;
      arrivalItem.addEventListener("click", () => {
        showLineTime(
          arrival.route_number,
          station.ref_id,
          arrival.route_group_name,
          arrival
        );
      });
    }
  });
}
async function showLineTime(routeN, station_id, routeName, arrival) {
  let arrival2 = arrival;
  arrival2.route_name = routeN;
  showBusById(arrival2);
  let container = addElement(
    "div",
    document.querySelector(".mainSheet"),
    "lineTimes"
  );
  container.style.transform = "translateX(0px) translateY(0px)";
  container.style.opacity = "1";
  container.classList.add("arrivalsScroll");
  document.querySelector(".arrivalsHolder").style.transform =
    "translateX(-100vw)";
  let iks = addElement("md-icon-button", container, "iks");
  iks.innerHTML = "<md-icon>arrow_back_ios_new</md-icon>";
  iks.addEventListener("click", function () {
    container.style.transform = "translateX(100vw)";
    document.querySelector(".arrivalsHolder").style.transform =
      "translateX(0vw)";

    setTimeout(() => {
      container.remove();
    }, 500);
  });
  let data1 = await fetchData(
    `https://cors.proxy.prometko.si/https://data.lpp.si/api/station/timetable?station-code=${station_id}&route-group-number=${routeN.replace(
      /\D/g,
      ""
    )}&previous-hours=${hoursDay(0)}&next-hours=${hoursDay(1)}`
  );

  data1 = data1.route_groups[0].routes;
  data1.forEach((route) => {
    if (route.parent_name !== routeName) return;
    if (route.group_name + route.route_number_suffix == routeN) {
      route.timetable.forEach((time) => {
        let arrivalItem = addElement("div", container, "arrivalItem");
        const busNumberDiv = addElement("div", arrivalItem, "busNo2");
        busNumberDiv.id = "bus_" + time.route_number;
        busNumberDiv.innerHTML = time.hour + "<sub>h</sub>";
        const arrivalDataDiv = addElement("div", arrivalItem, "arrivalData");
        const etaDiv = addElement("div", arrivalDataDiv, "eta");
        const arrivalTimeSpan = addElement("span", etaDiv, "arrivalTime");
        arrivalTimeSpan.innerHTML =
          "<span class=timet>" +
          time.minutes
            .toString()
            .replace(
              /,/g,
              "<sub>min</sub>&nbsp;&nbsp;</span><span class=timet>"
            )
            .replace(/\b\d\b/g, (match) => "0" + match) +
          "<sub>min</sub>";
        if (time.is_current) arrivalItem.classList.add("currentTime");
      });
    }
  });
}
function hoursDay(what) {
  const now = new Date();
  const hoursFromMidnight = now.getHours() + now.getMinutes() / 60;
  const hoursToMidnight = 24 - hoursFromMidnight;
  return what ? hoursToMidnight.toFixed(2) : hoursFromMidnight.toFixed(2);
}
const randomOneDecimal = () => +(Math.random() * 2).toFixed(1);

/**
 * Populates the parent element with bus arrival information, specifically for the next bus.
 * Adds a new element for each arrival in the list if its ETA is greater than 1 minute.
 * The first valid arrival is marked as the next bus, and further arrivals are skipped.
 *
 * @param {Array} arrivals - The list of arrival objects containing bus information.
 * @param {HTMLElement} parent - The parent element to which the arrival items will be appended.
 */
async function createInfoBar(parent, station_id) {
  let info = await fetchData(
    "https://cors.proxy.prometko.si/https://data.lpp.si/api/station/messages?station-code=" +
      station_id
  );

  let infoBar = addElement("div", parent, "infoBar");
  if (info.length === 0) infoBar.style.display = "none";
  let infoText = addElement("div", infoBar, "infoText");
  infoText.innerHTML = decodeURIComponent(info.toString());
  setTimeout(() => {
    infoBar.style.transform = "translateY(0)";
  }, 10);
}
const nextBusTemplate = (data, parent) => {
  let arrivals = data.arrivals;
  var isNextbus = false;
  let i = 0;
  for (const arrival of arrivals) {
    if (arrival.type == 3) continue;
    if (arrival.eta_min > 1) {
      if (!isNextbus) {
        isNextbus = true;
      } else {
        return;
      }
    }

    let arrivalItem = addElement("div", parent, "arrivalItem");
    addElement("md-ripple", arrivalItem);

    //arrivalItem.innerHTML = `<md-icon>${icon}</md-icon>`;
    arrivalItem.style.order = arrival.type === 2 ? 0 : arrival.eta_min;
    const busNumberDiv = addElement("div", arrivalItem, "busNo2");

    busNumberDiv.style.background = lineColors(arrival.route_name);

    busNumberDiv.id = "next_bus_" + arrival.route_name;
    busNumberDiv.textContent = arrival.route_name;
    addElement("md-ripple", busNumberDiv);
    const arrivalDataDiv = addElement("div", arrivalItem, "arrivalData");

    const tripNameSpan = addElement("span", arrivalDataDiv);
    tripNameSpan.textContent = arrival.stations.arrival;

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
    arrivalItem.addEventListener("click", () => {
      showBusById(arrival, arrivalsScroll, data.station.code_id);
    });
    i++;
  }
};
var busUpdateInterval, arrivalsUpdateInterval;
function showBusById(arrival, parent, station_id) {
  clearInterval(busUpdateInterval);
  document.querySelector(".bottomSheet").style.transform =
    "translate3d(-50%,60dvh, 0px)";
  sheetHeight = 40;
  if (parent) {
    let container = addElement(
      "div",
      document.querySelector(".mainSheet"),
      "arrivalsOnStation"
    );

    container.classList.add("arrivalsScroll");
    document.querySelector(".arrivalsHolder").style.transform =
      "translateX(-100vw)";
    arrivalsOnStation(container, arrival, station_id);
    arrivalsUpdateInterval= setInterval(() => {
      arrivalsOnStation(container, arrival, station_id, container.scrollTop);
    }, 10000);
   setTimeout(() => {
      container.style.transform = "translateX(0px) translateY(0px)";
      container.style.opacity = "1";
    }, 100);
  }
  try {
    loop(1, arrival, station_id);
    busUpdateInterval = setInterval(() => {
      loop(0, arrival, station_id);
    }, 5000);
  } catch (error) {
    console.log(error);
    document.querySelector(".loader").style.backgroundSize = "0% 0%";
    setTimeout(() => {
      document.querySelector(".loader").style.display = "none";
      document.querySelector(".loader").style.backgroundSize = "40% 40%";
    }, 300);
  }
}
async function arrivalsOnStation(container, arrival, station_id, already) {
  let info = await fetchData(
    "https://cors.proxy.prometko.si/https://data.lpp.si/api/route/arrivals-on-route?trip-id=" +
      arrival.trip_id
  );
  if (already || already !== 0) container.innerHTML = "";
  let iks = addElement("md-icon-button", container, "iks");
  iks.innerHTML = "<md-icon>arrow_back_ios_new</md-icon>";
  iks.addEventListener("click", function () {
    container.style.transform = "translateX(100vw)";
    document.querySelector(".arrivalsHolder").style.transform =
      "translateX(0vw)";
      clearInterval(arrivalsUpdateInterval)
      clearInterval(busUpdateInterval)
    setTimeout(() => {
      container.remove();
    }, 500);
    clearMap()
  });
  let arHolder = addElement("div", container, "arOnRoute");
  var listArrivals = {};
  let sortIndex;
  let arrivalsColumns = addElement("div", container, "arrivalsColumns");
  info.forEach((arrivalRoute, index) => {
    //vsaka postaja
    let arDiv = addElement("div", arHolder, "arrDiv");
    let lineStation = addElement("div", arDiv, "lineStation");

    lineStation.style.backgroundColor =
      "RGB(" +
      lineColorsObj[arrival.route_name.replace(/\D/g, "")].join(",") +
      ")";
    let lnimg = addElement("div", lineStation, "lineStationImg");

    if (index == 0 || index == info.length - 1) {
      index == 0
        ? lineStation.parentNode.classList.add("half-hidden-first")
        : lineStation.parentNode.classList.add("half-hidden");
      lnimg.style.backgroundColor =
        "RGB(" +
        lineColorsObj[arrival.route_name.replace(/\D/g, "")].join(",") +
        ")";
    } else {
      lnimg.style.backgroundColor =
        "RGB(" +
        darkenColor(
          lineColorsObj[arrival.route_name.replace(/\D/g, "")],
          50
        ).join(",") +
        ")";

      lnimg.style.borderColor =
        "RGB(" +
        lineColorsObj[arrival.route_name.replace(/\D/g, "")].join(",") +
        ")";
    }
    let nameStation = addElement("div", arDiv, "nameStation");
    nameStation.classList.add("nameStation_" + arrivalRoute.station_code);
    nameStation.innerHTML = arrivalRoute.name;
    if (arrivalRoute.station_code == station_id) sortIndex = index;

    for (let i = 0; i < arrivalRoute.arrivals.length; i++) {
      const ar = arrivalRoute.arrivals[i];

      // Handle empty array slot

      if (
        ar["type"] == 2 &&
        !lineStation.parentNode.classList.contains("half-hidden") &&
        !lineStation.parentNode.classList.contains("half-hidden-first")
      ) {
        lnimg.innerHTML =
          "<md-icon style='color:RGB(" +
          darkenColor(
            lineColorsObj[arrival.route_name.replace(/\D/g, "")],
            50
          ).join(",") +
          ")!important;background-color:RGB(" +
          darkenColor(
            lineColorsObj[arrival.route_name.replace(/\D/g, "")],
            -60
          ).join(",") +
          ")'>directions_bus</md-icon>";
        lnimg.classList.add("busOnStation");
      }
      if (!listArrivals[ar["vehicle_id"]]) {
        listArrivals[ar["vehicle_id"]] = [];
        if (
          !lineStation.parentNode.classList.contains("half-hidden") &&
          !lineStation.parentNode.classList.contains("half-hidden-first") &&
          ar["type"] !== 2
        ) {
          lnimg.innerHTML =
            "<md-icon style='color:RGB(" +
            darkenColor(
              lineColorsObj[arrival.route_name.replace(/\D/g, "")],
              50
            ).join(",") +
            ")!important;background-color:RGB(" +
            darkenColor(
              lineColorsObj[arrival.route_name.replace(/\D/g, "")],
              -60
            ).join(",") +
            ")'>directions_bus</md-icon>";
          lnimg.classList.add("busBetween");
        }
      }
      listArrivals[ar["vehicle_id"]][index] =
        ar["eta_min"] + `<span style="display:none;">${ar["type"]}</span>`;
    }
  });

  let sortedArrivals = sortArrivals(listArrivals, sortIndex);


  sortedArrivals = sortedArrivals.slice(0, 10);

  for (let [key, element] of sortedArrivals) {
    let etaHolder = addElement("div", arrivalsColumns, "etaHoder");
    let previousItem = null;
    etaHolder.innerHTML = element
      .map((item, i) => {
        if (item === null) return "/";

        // Get the text content of the hidden <span>
        const spanText = item.match(
          /<span style="display:none;">(.*?)<\/span>/
        );

        let stationHTML = item; // Default station HTML

        let border="";
     

        if (item.includes("z")) {
          border = "border-top-left-radius: 20px;border-top-right-radius: 20px;";
          item = item.replace("z", "");
        }
        if (item.includes("m")) {
          border += "border-bottom-left-radius: 20px;border-bottom-right-radius: 20px;";
          item = item.replace("m", "");
        }

        previousItem = item;
        if (spanText) {
          const typeValue = spanText[1]; // Extracts the content inside the span
          if (typeValue === "1") {
            // If spanText is empty, remove the background from etaStation
            stationHTML = item + "<sub>min</sub>";
          } else if (typeValue === "0") {
            // If type is 0, add <md-icon>near_me</md-icon>
            stationHTML =
              item + "<sub>min</sub>" + "<md-icon>near_me</md-icon>";
          } else if (typeValue === "2") {
            // If type is 2, replace the text with "P"
            stationHTML = item.replace(item, "P");
          } else if (typeValue === "3") {
            // If type is 3, replace the text with "O"
            stationHTML = item.replace(item, "O");
          }
        }
        // Return the formatted station HTML with the background removed if needed
        return `<div class="etaStation" style="${
          spanText ? "" : "background:none;"
        }${border ? border : ""}">${stationHTML}</div>`;
      })
      .join("");
  }

  const childRect = document
    .querySelector(".nameStation_" + station_id)
    .parentNode.getBoundingClientRect();
  const grandparentRect = container.getBoundingClientRect();

  // Calculate how much we need to scroll
  const offsetTop = childRect.top - grandparentRect.top + container.scrollTop;
  container.scrollTo({
    top: already ? already : offsetTop,
    behavior: already ? "instant" : "smooth",
  });
}
function sortArrivals(listArrivals, sortIndex) {
  let combinedArrivals = [];

  // Sort the arrivals as before
  let sortedArrivals = Object.entries(listArrivals)
    .sort((a, b) => {
      const extractText = (text) => {
        const tempDiv = document.createElement("div");
        tempDiv.innerHTML = text;
        const hiddenSpans = tempDiv.querySelectorAll(
          'span[style="display:none;"]'
        );
        hiddenSpans.forEach((span) => span.remove());
        return tempDiv.textContent || tempDiv.innerText || "";
      };

      let aValue =
        a[1][sortIndex] === undefined || a[1][sortIndex] === ""
          ? 61
          : extractText(a[1][sortIndex]);

      let bValue =
        b[1][sortIndex] === undefined || b[1][sortIndex] === ""
          ? 61
          : extractText(b[1][sortIndex]);

      return aValue - bValue;
    })
    .map(([busId, arrivals]) => [
      busId,
      arrivals.map((val) => (val === undefined || val === null ? "" : val)),
    ]);

  // Function to check if two arrays can be combined without overlap
  function canCombine(arr1, arr2) {
    let hasEmpty = false;

    for (let i = 0; i < Math.max(arr1.length, arr2.length); i++) {
        const arr1Val = arr1[i] || "";
        const arr2Val = arr2[i] || "";

        if (arr1Val === "" || arr2Val === "") {
            hasEmpty = true;
        } else if (arr1Val !== arr2Val) {
            return false;
        }
    }

    return hasEmpty;
}

  // Combine arrivals if they don't overlap
  for (let i = 0; i < sortedArrivals.length; i++) {
    let [busId, current] = sortedArrivals[i];
    let combined = false;

    for (let j = 0; j < combinedArrivals.length; j++) {
      if (canCombine(combinedArrivals[j][1], current)) {
        // Merge the arrays, filling empty spots with the other array's values

        for (let k = 0; k < current.length; k++) {
          if (current[k] === undefined || current[k] === null) {
            current[k] = "";
          }
          let content = "";
          if (current[k] !== "") {
           
            content = current[k];
          }
      
          
         
          combinedArrivals[j][1][k] = content;
        }
        combined = true;
        break;
      }
    }

    if (!combined) {
      // Ensure no `undefined` or `null` values are added during push
      let updatedArray = [];
      for (let val of current) {
        updatedArray.push(val === undefined || val === null ? "" : val);
      }
      combinedArrivals.push([busId, updatedArray]);
    }
  }

  // Sort combined arrays if needed
  combinedArrivals.sort((a, b) => {
    let aValue = a[1].find((val) => val !== "") || 61;
    let bValue = b[1].find((val) => val !== "") || 61;
    return aValue - bValue;
  });
    // Combine arrivals if they don't overlap
    for (let i = 0; i < combinedArrivals.length; i++) {
      let [busId, current] = combinedArrivals[i];
     
  
     
        for (let k = 0; k < current.length; k++) {
          let content = current[k];
          if ((current[k - 1] == "" || current[k - 1] == null) && current[k] !== "")  {
            content = content + "z";
          } 
          if ((current[k + 1] == "" || current[k + 1] == null)&& current[k] !== "") {
            content = content + "m";
          }
          combinedArrivals[i][1][k] = content;
        }
        
      
  
      
    }
  return combinedArrivals;
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
