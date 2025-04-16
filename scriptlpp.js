"use strict";
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

var map, busVectorLayer, busStationLayer, animating, speed, now;
const parser = new DOMParser();

async function makeMap() {
  rasterLayer = new ol.layer.Tile({
    preload: Infinity,
    source: window.location.href.includes("127")
      ? new ol.source.OSM()
      : new ol.source.Google({
          styles: window.matchMedia("(prefers-color-scheme: dark)").matches
            ? darkMap
            : lightMap,
          key: "AIzaSyCGnbK8F2HvhjqRrKo3xogo4Co7bitNwYA",
          scale: "scaleFactor2x",
          highDpi: true,
          transition: 1000,
          tileLoadFunction: function (imageTile, src) {
            const img = imageTile.getImage();

            img.src = src;
          },
        }),
  });
  class GoogleLogoControl extends ol.control.Control {
    constructor() {
      const element = addElement("img", null, "googleLogo");
      element.src = window.matchMedia("(prefers-color-scheme: dark)").matches
        ? "https://developers.google.com/static/maps/documentation/images/google_on_non_white.png"
        : "https://developers.google.com/static/maps/documentation/images/google_on_white.png";
      super({
        element: element,
      });
    }
  }
  map = new ol.Map({
    style: {},
    interactions: ol.interaction.defaults.defaults().extend([
      new ol.interaction.DblClickDragZoom(),
      new ol.interaction.PinchZoom({
        constrainResolution: true,
      }),
    ]),
    layers: [rasterLayer],
    target: "map",
    controls: ol.control.defaults.defaults().extend([new GoogleLogoControl()]),
    loadTilesWhileInteracting: true,
    view: new ol.View({
      center: ol.proj.fromLonLat([14.5058, 46.0569]), // Default center (longitude, latitude)
      zoom: 13,
      loadTilesWhileAnimating: true,
      padding: [20, 30, 70, 30],
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
    const coordinatesa = geolocation.getPosition();
    positionFeature.setGeometry(
      coordinatesa ? new ol.geom.Point(coordinatesa) : null
    );
  });

  new ol.layer.Vector({
    map: map,
    source: new ol.source.Vector({
      features: [accuracyFeature, positionFeature],
    }),

    updateWhileInteracting: true,
  });

  var container = document.getElementById("popup");
  const content = document.getElementById("popup-content");
  var popup = new ol.Overlay({
    element: container,
    autoPan: true,
    autoPanAnimation: {
      duration: 250,
    },
  });
  map.addOverlay(popup);

  /* Add a pointermove handler to the map to render the popup.*/
  map.on("click", function (evt) {
    /*
    
        
        */
  });
  map.on("singleclick", function (evt) {
    var feature = map.forEachFeatureAtPixel(evt.pixel, function (feat, layer) {
      return feat;
    });

    if (feature && feature.get("name")) {
      var coordinate = evt.coordinate; //default projection is EPSG:3857 you may want to use ol.proj.transform

      container.style.background = "RGB(" + feature.get("color") + ")";
      container.style.display = "none";

      content.innerHTML =
        "<md-ripple></md-ripple><md-icon>directions_bus</md-icon>" +
        feature.get("name");
      popup.setPosition(coordinate);
      setTimeout(() => {
        container.style.display = "block";
        map.getView().animate({
          center: coordinate,
          duration: 500,
        });
      }, 1);
      container.onclick = async function () {
        clearInterval(interval);
        clearInterval(arrivalsUpdateInterval);
        clearInterval(busUpdateInterval);
        if (document.querySelector(".arrivalsHolder"))
          document.querySelector(".arrivalsHolder").remove();
        let aos = document.querySelector(".arrivalsOnStation");
        let lnt = document.querySelector(".lineTimes");
        if (aos) {
          aos.style.transform = "translateX(-100vw)";
        }
        if (lnt) {
          lnt.style.transform = "translateX(-100vw)";
        }

        setTimeout(() => {
          if (aos) {
            aos.remove();
          }
          if (lnt) {
            lnt.remove();
          }
          stationClick(
            stationList.findIndex((obj) => obj.name === feature.get("name")),
            0,
            1
          );
        }, 500);

        interval = setInterval(async () => {
          await stationClick(isArrivalsOpen, true);
        }, 10000);

        setTimeout(() => {
          let bottomSheet = document.querySelector(".bottomSheet");
          bottomSheet.style.transition =
            "all var(--transDur) cubic-bezier(0.05, 0.7, 0.1, 1)";
          setSheetHeight(98);
          setTimeout(() => {
            bottomSheet.style.transition = "";
            bottomSheet.style.willChange = "";
          }, 400);

          document.querySelector(".sheetContents").scrollTop = 0;
        }, 50);
        clearMap();
      };
    }

    popup.setPosition(coordinate);
  });
  map.once("postrender", function (event) {
    document.querySelector("#map").style.opacity = "1";
  });
  map.on("singleclick", function (evt) {
    const feature = map.forEachFeatureAtPixel(evt.pixel, function (feature) {
      return feature;
    });

    if (feature && feature.busId) {
      document.querySelector(".arrivalsOnStation").style.transform =
        "translateX(-100vw)";
      document.querySelector(".arrivalsOnStation").style.opacity = "0";
      console.log("clicked");

      getMyBusData(feature.busId);
    }
  });
}
async function centerMap() {
  await getLocation();
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
window.addEventListener("load", async function () {
  createBuses();

  let sht = makeBottomSheet(null, 98);

  let bava = "";
  sht.innerHTML = `
<div class="searchContain"> <md-filled-text-field class="search" value='${bava}' placeholder="Išči"><md-icon slot="leading-icon">search</md-icon></md-filled-text-field></div>
 <md-circular-progress indeterminate id="loader"></md-circular-progress>
 <md-tabs class=tabs id=tabsFav><md-primary-tab id="favTab" aria-controls="fav-panel">Priljubljeno</md-primary-tab><md-primary-tab id="locationTab" aria-controls="location-panel">V bližini</md-primary-tab></md-tabs>
  <md-list role="tabpanel" aria-labelledby="favTab" id="fav-panel" class="favouriteStations"></md-list>  
 <md-list role="tabpanel" aria-labelledby="locationTab" id="location-panel" class="listOfStations"></md-list>
   `;

  let search = this.document.querySelector(".search");
  search.addEventListener("input", delayedSearch);
  search.addEventListener("click", getAllLines);
  search.addEventListener(`focus`, () => search.select());
  busImageData = await fetch(
    "https://mestnipromet.cyou/tracker/js/json/images.json"
  );
  absoluteTime = localStorage.getItem("time") ? true : false;

  busImageData = await busImageData.json();
});
async function getAllLines() {
  if (agency == "LPP") {
    lines = await fetchData(
      "https://cors.proxy.prometko.si/https://data.lpp.si/api/route/routes"
    );
  }
}
var arrivalsMain = {};
var tripIds = [];
var stationList = {};
var latitude, longitude, lines;

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
  currentPanel = document.querySelector(".favouriteStations");
  await updateStations();
  var tabs = document.getElementById("tabsFav");

  tabs.addEventListener("change", changeTabs);
  let e = document.querySelector(".favouriteStations");
  e.style.display = "flex";
  setTimeout(() => {
    e.style.transform = "translateX(0px) translateY(0px)";
    e.style.opacity = "1";
  }, 10);

  setTimeout(async () => {
    await makeMap();
  }, 0);
}
const changeTabs = (event) => {
  let o =
    currentPanel.id == "location-panel"
      ? document.querySelector(".listOfStations")
      : document.querySelector(".favouriteStations");
  o.style.display = "none";
  o.style.transform = "translateX(0px) translateY(-20px)";
  o.style.opacity = "0";
  const panelId = event.target.activeTab?.getAttribute("aria-controls");
  const root = event.target.getRootNode();
  currentPanel = root.querySelector(`#${panelId}`);
  currentPanel.style.display = "flex";
  setTimeout(() => {
    currentPanel.style.transform = "translateX(0px) translateY(0px)";
    currentPanel.style.opacity = "1";
  }, 1);
};
async function updateStations() {
  console.log(agency);

  let stations = await fetchData(
    "https://cors.proxy.prometko.si/https://data.lpp.si/api/station/station-details?show-subroutes=1"
  );
  stationList = stations;
  createStationItems();
}
var isArrivalsOpen = false;
var currentPanel;
async function createStationItems(o) {
  var search = false;
  let query = document.querySelector(".search").value;
  if (query !== "") {
    search = true;
  }
  var loader = document.getElementById("loader");
  var list = document.querySelector(".listOfStations");
  await clearElementContent(list);
  list = document.querySelector(".listOfStations");
  var favList = document.querySelector(".favouriteStations");
  await clearElementContent(favList);
  favList = document.querySelector(".favouriteStations");
  createFavourite(favList, search, query);

  loader.style.display = "block";
  var nearby = {};

  if (navigator.geolocation) {
    if (latitude == 46.051467939339034)
      list.innerHTML +=
        "<p><md-icon>location_off</md-icon>Lokacija ni omogočena.</p>";
    for (const station in stationList) {
      if (
        search &&
        !normalizeText(stationList[station].name.toLowerCase()).includes(
          normalizeText(query.toLowerCase())
        )
      )
        continue;
      let item = addElement("div", null, "station");
      addElement("md-ripple", item);
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
          nearby[distance.toFixed(5)] = item;
        } else {
          textHolder.innerHTML +=
            cornot +
            "<span class=stationDistance>" +
            fav +
            Math.round(distance * 1000) +
            " m</span>";
          nearby[distance.toFixed(5)] = item;
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
        const openStation = async () => {
          await stationClick(station);
          interval = setInterval(async () => {
            await stationClick(null, true);
          }, 10000);
        };
        item.addEventListener("click", openStation);
        item = null;
        buses = null;
        textHolder = null;
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
    nearby = null;
  }
  if (search && agency == "LPP") {
    for (const line of lines) {
      if (
        normalizeText(line.route_name + line.route_number).includes(
          normalizeText(query.toLowerCase())
        )
      ) {
        let arrivalItem = addElement("div", list, "arrivalItem");
        arrivalItem.style.order = line.route_number.replace(/\D/g, "");
        let busNumberDiv = addElement("div", arrivalItem, "busNo2");

        busNumberDiv.style.background = lineColors(line.route_number);

        busNumberDiv.id = "bus_" + line.route_number;
        busNumberDiv.textContent = line.route_number;
        let arrivalDataDiv = addElement("div", arrivalItem, "arrivalData");
        addElement("md-ripple", arrivalItem);

        let tripNameSpan = addElement("span", arrivalDataDiv);
        tripNameSpan.textContent = line.route_name;
        arrivalItem.addEventListener("click", () => {
          let container = addElement(
            "div",
            document.querySelector(".mainSheet"),
            "arrivalsOnStation"
          );
          container.classList.add("arrivalsScroll");
          var stylesTransition = [
            document.querySelector(".searchContain").style,
            document.querySelector(".listOfStations").style,
            document.querySelector(".favouriteStations").style,
            document.getElementById("tabsFav").style,
          ];
          stylesTransition.forEach((style) => {
            style.transform = "translateX(-100vw)";
            style.opacity = "0";
          });
          let line2 = line;
          line2.route_name = line.route_number;

          minimizeSheet();
          // Call arrivalsOnStation and store its return value
          const arrivalsData = arrivalsOnStation(line2, 0);

          // Store intervals to allow cleanup later
          arrivalsUpdateInterval = setInterval(() => {
            arrivalsOnStation(line2, 0, container.scrollTop);
          }, 10000);

          // Pass the return value to loop
          loop(1, line, 60, arrivalsData);

          busUpdateInterval = setInterval(() => {
            loop(0, line, 60);
          }, 5000);
          setTimeout(() => {
            container.style.transform = "translateX(0px) translateY(0px)";
            container.style.opacity = "1";
          }, 100);
        });
        if (line.route_number[0] == "N") {
          arrivalItem.style.order = line.route_number.replace(/\D/g, "") + 100;
        }
        arrivalItem, busNumberDiv, arrivalDataDiv, (tripNameSpan = null);
      }
    }
  }
}
function minimizeSheet(h = 40) {
  let bottomSheet = document.querySelector(".bottomSheet");
  bottomSheet.style.transition =
    "all var(--transDur) cubic-bezier(0.05, 0.7, 0.1, 1)";
  setSheetHeight(h);
  setTimeout(() => {
    bottomSheet.style.transition = "";
    bottomSheet.style.willChange = "";
  }, 400);
}
async function refresh() {
  document.querySelector(".navigationBar").style.display = "flex";
  if (checkVisible(document.querySelector(".arrivalsOnStation"))) {
    console.log("nebi");
  } else if (checkVisible(document.querySelector("#arrivals-panel"))) {
    let arH = document.querySelector(".arrivalsScroll");
    arH.style.transform = "translateX(0px) translateY(-20px)";
    arH.style.opacity = "0";
    await stationClick(isArrivalsOpen, true);
    arH = document.querySelector(".arrivalsScroll");
    arH.style.transform = "translateX(0px) translateY(0px)";
    arH.style.opacity = "1";
  } else if (checkVisible(currentPanel)) {
    currentPanel.style.transform = "translateX(0px) translateY(-20px)";
    currentPanel.style.opacity = "0";
    await getLocation();
    await createStationItems();
    currentPanel.style.transform = "translateX(0px) translateY(0px)";
    currentPanel.style.opacity = "1";
  } else {
  }
}
function checkVisible(elm) {
  if (!elm) return false;
  var rect = elm.getBoundingClientRect();
  var viewHeight = Math.max(
    document.documentElement.clientHeight,
    window.innerHeight
  );
  return !(rect.bottom < 0 || rect.top - viewHeight >= 0);
}
function normalizeText(text) {
  return text
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}
function createFavourite(parent, search, query) {
  var nearby = {};
  if (latitude == 46.051467939339034)
    parent.innerHTML +=
      "<p><md-icon>location_off</md-icon>Lokacija ni omogočena.</p>";
  const favList = JSON.parse(localStorage.getItem("favouriteStations") || "[]");
  for (const station in stationList) {
    if (favList.length == 0 && !search) {
      let p = addElement("p", parent);
      p.innerHTML =
        "<p><md-icon>favorite</md-icon>Nimate priljubljenih postaj.</p>";
      break;
    }
    let item = addElement("div", null, "station");
    addElement("md-ripple", item);
    let textHolder = addElement("div", item, "textHolder");
    textHolder.innerHTML =
      '<span class="stationName">' + stationList[station].name + "</span>";

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
        nearby[distance.toFixed(5)] = item;
      } else {
        textHolder.innerHTML +=
          cornot +
          "<span class=stationDistance>" +
          fav +
          Math.round(distance * 1000) +
          " m</span>";
        nearby[distance.toFixed(5)] = item;
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
      const openStation = async () => {
        await stationClick(station);
        interval = setInterval(async () => {
          await stationClick(null, true);
        }, 10000);
      };
      item.addEventListener("click", openStation);
      item = null;
      buses = null;
      textHolder = null;
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
  if (search && agency == "LPP") {
    for (const line of lines) {
      if (
        normalizeText(line.route_name + line.route_number).includes(
          normalizeText(query.toLowerCase())
        )
      ) {
        let arrivalItem = addElement("div", parent, "arrivalItem");
        arrivalItem.style.order = line.route_number.replace(/\D/g, "");
        let busNumberDiv = addElement("div", arrivalItem, "busNo2");

        busNumberDiv.style.background = lineColors(line.route_number);

        busNumberDiv.id = "bus_" + line.route_number;
        busNumberDiv.textContent = line.route_number;
        let arrivalDataDiv = addElement("div", arrivalItem, "arrivalData");
        addElement("md-ripple", arrivalItem);

        let tripNameSpan = addElement("span", arrivalDataDiv);
        tripNameSpan.textContent = line.route_name;
        arrivalItem.addEventListener("click", () => {
          let container = addElement(
            "div",
            document.querySelector(".mainSheet"),
            "arrivalsOnStation"
          );
          container.classList.add("arrivalsScroll");
          var stylesTransition = [
            document.querySelector(".searchContain").style,
            document.querySelector(".listOfStations").style,
            document.querySelector(".favouriteStations").style,
            document.getElementById("tabsFav").style,
          ];
          stylesTransition.forEach((style) => {
            style.transform = "translateX(-100vw)";
            style.opacity = "0";
          });
          let line2 = line;
          line2.route_name = line.route_number;
          minimizeSheet();
          arrivalsOnStation(line2, 0);
          arrivalsUpdateInterval = setInterval(() => {
            arrivalsOnStation(line2, 0, container.scrollTop);
          }, 10000);
          loop(1, line, 60);
          busUpdateInterval = setInterval(() => {
            loop(0, line, 60);
          }, 5000);
          setTimeout(() => {
            container.style.transform = "translateX(0px) translateY(0px)";
            container.style.opacity = "1";
          }, 100);
        });
        if (line.route_number[0] == "N") {
          arrivalItem.style.order = line.route_number.replace(/\D/g, "") + 100;
        }
        arrivalItem, busNumberDiv, arrivalDataDiv, (tripNameSpan = null);
      }
    }
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
  let arS = document.getElementById("arrivals-panel");
  arS.style.transform = "translateX(0px) translateY(-20px)";
  arS.style.opacity = "0";
  setTimeout(async () => {
    let i = document.querySelector(".timeTScroll");
    i = clearElementContent(document.querySelector(".timeTScroll"));
    if (id % 2 === 0) {
      await stationClick(
        stationList.findIndex((obj) => obj.ref_id === String(parseInt(id) - 1)),
        1,
        1
      );
    } else {
      await stationClick(
        stationList.findIndex((obj) => obj.ref_id === String(parseInt(id) + 1)),
        1,
        1
      );
    }
    arS = document.getElementById("arrivals-panel");
    setTimeout(() => {
      arS.style.transform = "translateX(0px) translateY(0px)";
      arS.style.opacity = "1";
    }, 1);
  }, 300);
}
var arrivalsScroll;
async function stationClick(stationa, noAnimation, ia) {
  if (document.querySelector(".arrivalsOnStation")) return;
  let station = stationa ? stationa : isArrivalsOpen;

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
    if (ia) {
      document.querySelector(".arrivalsHolder").style.transform =
        "translateX(0)";
      document.querySelector(".arrivalsHolder").style.opacity = "1";
      showLines(document.querySelector(".timeTScroll"), stationList[station]);
    }
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
    window.history.pushState(
      null,
      document.title + " - " + stationList[station].name,
      "/" + encodeURIComponent(stationList[station].name)
    );
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
      style.opacity = "0";
    });
    setTimeout(() => {
      container.style.transform = "translateX(0)";
      container.style.opacity = "1";
    }, 0);

    const title = addElement("h1", container, "title");
    let holder = addElement("div", title);
    let iks = addElement("md-icon-button", holder, "iks");
    iks.innerHTML = "<md-icon>arrow_back_ios_new</md-icon>";
    iks.addEventListener("click", function () {
      window.history.replaceState(null, document.title, "/");
      container.style.transform = "translateX(100vw)";
      document.querySelector(".infoBar").style.transform = "translateY(100%)";
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
    let currentPanel2 = document.querySelector(".arrivalsScroll");
    if (document.querySelector(".timeTScroll"))
      document.querySelector(".timeTScroll").remove();
    var timeTScroll = addElement("div", container, "timeTScroll");
    timeTScroll.setAttribute("role", "tabpanel");
    timeTScroll.setAttribute("aria-labelledby", "timeTab");
    timeTScroll.setAttribute("id", "time-panel");
    timeTScroll.classList.add("arrivalsScroll");
    timeTScroll.style.display = "none";
    tabs.addEventListener("change", () => {
      let o =
        currentPanel2.id == "arrivals-panel"
          ? document.getElementById("arrivals-panel")
          : document.querySelector(".timeTScroll");
      o.style.display = "none";
      o.style.transform = "translateX(0px) translateY(-20px)";
      o.style.opacity = "0";

      const panelId = event.target.activeTab?.getAttribute("aria-controls");
      const root = event.target.getRootNode();
      currentPanel2 = root.querySelector(`#${panelId}`);
      currentPanel2.style.display = "flex";
      setTimeout(() => {
        currentPanel2.style.transform = "translateX(0px) translateY(0px)";
        currentPanel2.style.opacity = "1";
      }, 1);

      if (currentPanel2.id == "time-panel" && !notYet) {
        notYet = true;
        showLines(timeTScroll, stationList[station]);
      }
      getLocation();
    });
    data = await fetchData(
      "https://cors.proxy.prometko.si/https://lpp.ojpp.derp.si/api/station/arrival?station-code=" +
        stationList[station].ref_id
    );
    let getMyBus = addElement("md-filled-tonal-button", null, "getMyBus");
    container.insertBefore(getMyBus, arrivalsScroll);
    getMyBus.innerHTML = "Moja vožnja";
    getMyBus.style.display = "none";
    const clickedMyBus = () => {
      container.style.transform = "translateX(-100vw)";
      container.style.opacity = "0";
      getMyBusData();
    };
    getMyBus.addEventListener("click", clickedMyBus);
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

function showArrivals(arrivalsScroll2, data) {
  let arrivalsScroll = document.getElementById("arrivals-panel");
  clearElementContent(arrivalsScroll);
  arrivalsScroll = null;
  arrivalsScroll = document.getElementById("arrivals-panel");
  if (data.arrivals.length > 0) {
    let busTemplate = addElement("div", arrivalsScroll, "busTemplate");
    nextBusTemplate(data, busTemplate);
    let listOfArrivals = [];
    for (const arrival of data.arrivals) {
      if (listOfArrivals.includes(arrival.trip_id)) {
        let arrivalTimeSpan = addElement(
          "span",
          arrivalsScroll.querySelector("#eta_" + arrival.route_name),
          "arrivalTime"
        );
        if (arrival.type == 0) {
          arrivalTimeSpan.innerHTML =
            "<md-icon style='animation-delay:" +
            randomOneDecimal() +
            "s;'>near_me</md-icon>" +
            minToTime(arrival.eta_min);
          arrivalTimeSpan.classList.add("arrivalGreen");
        } else if (arrival.type == 1) {
          arrivalTimeSpan.innerHTML = minToTime(arrival.eta_min);
        } else if (arrival.type == 2) {
          arrivalTimeSpan.innerHTML = "PRIHOD";
          arrivalTimeSpan.classList.add("arrivalRed");
        } else if (arrival.type == 3) {
          arrivalTimeSpan.innerHTML = "OBVOZ";
          arrivalTimeSpan.classList.add("arrivalYellow");
        }
        if (arrival.depot) arrivalTimeSpan.innerHTML += "G";

        arrivalTimeSpan = null;
      } else {
        let arrivalItem = addElement("div", arrivalsScroll, "arrivalItem");
        arrivalItem.style.order = arrival.route_name.replace(/\D/g, "");
        let busNumberDiv = addElement("div", arrivalItem, "busNo2");

        busNumberDiv.style.background = lineColors(arrival.route_name);

        busNumberDiv.id = "bus_" + arrival.route_name;
        busNumberDiv.textContent = arrival.route_name;
        listOfArrivals.push(arrival.trip_id);
        let arrivalDataDiv = addElement("div", arrivalItem, "arrivalData");
        addElement("md-ripple", arrivalItem);

        let tripNameSpan = addElement("span", arrivalDataDiv);
        tripNameSpan.textContent = arrival.stations.arrival;

        let etaDiv = addElement("div", arrivalDataDiv, "eta");
        etaDiv.id = "eta_" + arrival.route_name;

        let arrivalTimeSpan = addElement("span", etaDiv, "arrivalTime");
        if (arrival.type == 0) {
          arrivalTimeSpan.innerHTML =
            "<md-icon style='animation-delay:" +
            randomOneDecimal() +
            "s;'>near_me</md-icon>" +
            minToTime(arrival.eta_min);
          arrivalTimeSpan.classList.add("arrivalGreen");
        } else if (arrival.type == 1) {
          arrivalTimeSpan.innerHTML = minToTime(arrival.eta_min);
        } else if (arrival.type == 2) {
          arrivalTimeSpan.innerHTML = "PRIHOD";
          arrivalTimeSpan.classList.add("arrivalRed");
        } else if (arrival.type == 3) {
          arrivalTimeSpan.innerHTML = "OBVOZ";
          arrivalTimeSpan.classList.add("arrivalYellow");
        }
        if (arrival.depot) arrivalTimeSpan.innerHTML += "G";
        arrivalItem.addEventListener("click", () => {
          showBusById(arrival, data.station.code_id, data.arrivals);
        });

        arrivalTimeSpan,
          arrivalItem,
          busNumberDiv,
          arrivalDataDiv,
          tripNameSpan,
          etaDiv,
          (arrivalTimeSpan = null);
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
  window.history.pushState(
    null,
    document.title,
    "/urnik-linije-" + encodeURIComponent(routeN)
  );
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
    window.history.replaceState(null, document.title, "/");
    container.style.transform = "translateX(100vw)";
    document.querySelector(".arrivalsHolder").style.transform =
      "translateX(0vw)";
    clearMap();
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

  let changeTime = addElement(
    "md-outlined-segmented-button-set",
    infoBar,
    "changeTime"
  );
  let absolut = addElement("md-outlined-segmented-button", changeTime, "");
  absolut.label = minToTime(3, 1);
  let relativ = addElement("md-outlined-segmented-button", changeTime, "");
  relativ.label = "3 min";
  localStorage.getItem("time") == "relativ"
    ? relativ.setAttribute("selected", "")
    : absolut.setAttribute("selected", "");
  relativ.addEventListener("click", function () {
    localStorage.removeItem("time");
    absoluteTime = false;
    refresh();
  });
  absolut.addEventListener("click", function () {
    localStorage.setItem("time", "absolute");
    absoluteTime = true;
    refresh();
  });
  if (info.length !== 0) {
    let infoTextC = addElement("div", infoBar, "infoTextContainer");
    let infoText = addElement("div", infoTextC, "infoText");
    infoText.innerHTML = decodeURIComponent(info.toString());
  }
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
    let busNumberDiv = addElement("div", arrivalItem, "busNo2");

    busNumberDiv.style.background = lineColors(arrival.route_name);

    busNumberDiv.id = "next_bus_" + arrival.route_name;
    busNumberDiv.textContent = arrival.route_name;
    addElement("md-ripple", busNumberDiv);
    let arrivalDataDiv = addElement("div", arrivalItem, "arrivalData");

    let tripNameSpan = addElement("span", arrivalDataDiv);
    tripNameSpan.textContent = arrival.stations.arrival;

    let etaDiv = addElement("div", arrivalDataDiv, "eta");
    etaDiv.id = "next_eta_" + arrival.route_name;

    let arrivalTimeSpan = addElement("span", etaDiv, "arrivalTime");

    if (arrival.type == 0) {
      arrivalTimeSpan.innerHTML =
        "<md-icon style='animation-delay:" +
        randomOneDecimal() +
        "s;'>near_me</md-icon>" +
        minToTime(arrival.eta_min);
      arrivalTimeSpan.classList.add("arrivalGreen");
    } else if (arrival.type == 1) {
      arrivalTimeSpan.innerHTML = minToTime(arrival.eta_min);
    } else if (arrival.type == 2) {
      arrivalTimeSpan.innerHTML = "PRIHOD";
      arrivalTimeSpan.classList.add("arrivalRed");
    }
    if (arrival.depot) arrivalTimeSpan.innerHTML += "G";
    arrivalItem.addEventListener("click", () => {
      showBusById(arrival, data.station.code_id, data.arrivals);
    });
    i++;
    arrivalTimeSpan,
      arrivalItem,
      busNumberDiv,
      arrivalDataDiv,
      tripNameSpan,
      etaDiv,
      (arrivalTimeSpan = null);
  }
};
var busUpdateInterval, arrivalsUpdateInterval, intervalBusk;
async function showBusById(arrival, station_id, arrivals) {
  window.history.pushState(null, document.title, "/bus-" + arrival.route_name);
  clearInterval(busUpdateInterval);
  document.querySelector(".bottomSheet").style.transform =
    "translate3d(-50%,60dvh, 0px)";
  minimizeSheet();

  await loop(1, arrival, station_id);
  busUpdateInterval = setInterval(async () => {
    loop(0, arrival, station_id);
  }, 5000);
  if (arrivals) {
    document.querySelector(".arrivalsHolder").style.transform =
      "translateX(-100vw)";
    document.querySelector(".arrivalsHolder").style.opacity = "0";
    console.log("clicked");

    getMyBusData(null, arrivals, arrival.trip_id);
  }
}
async function arrivalsOnStation(arrival, station_id, already) {
  let info = await fetchData(
    "https://cors.proxy.prometko.si/https://data.lpp.si/api/route/arrivals-on-route?trip-id=" +
      arrival.trip_id
  );
  let container = document.querySelector(".arrivalsOnStation");
  if (already) {
    await clearElementContent(container);
    container = document.querySelector(".arrivalsOnStation");
  }

  let iks = addElement("md-icon-button", container, "iks");
  iks.innerHTML = "<md-icon>arrow_back_ios_new</md-icon>";
  iks.addEventListener("click", function () {
    window.history.replaceState(null, document.title, "/");
    container.style.transform = "translateX(100vw)";
    if (document.querySelector(".arrivalsHolder")) {
      document.querySelector(".arrivalsHolder").style.transform =
        "translateX(0vw)";
    } else {
      var stylesTransition = [
        document.querySelector(".searchContain").style,
        document.querySelector(".listOfStations").style,
        document.querySelector(".favouriteStations").style,
        document.getElementById("tabsFav").style,
      ];
      stylesTransition.forEach((style) => {
        style.transform = "translateX(0vw)";
        style.opacity = "1";
      });
    }

    clearInterval(arrivalsUpdateInterval);
    clearInterval(busUpdateInterval);
    setTimeout(() => {
      container.remove();
    }, 500);
    clearMap();
  });
  let holder = addElement("div", container, "arFlex");
  holder.style.display = "flex";

  let arHolder = addElement("div", holder, "arOnRoute");
  var listArrivals = {};
  let sortIndex;
  let arrivalsColumns = addElement("div", holder, "arrivalsColumns");
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
        minToTime(ar["eta_min"]) +
        `<span style="display:none;">${ar["type"]}</span>`;
    }
    arDiv, lineStation, lnimg, (nameStation = null);
  });

  if (already !== undefined) loop(0, arrival, station_id, listArrivals);
  let sortedArrivals = sortArrivals(listArrivals, sortIndex);

  sortedArrivals = sortedArrivals.slice(0, 10);

  let long = sortedArrivals.length > 3 ? "" : "min";
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

        let border = "";

        if (item.includes("z")) {
          border =
            "border-top-left-radius: 20px;border-top-right-radius: 20px;";
          item = item.replace("z", "");
        }
        if (item.includes("m")) {
          border +=
            "border-bottom-left-radius: 20px;border-bottom-right-radius: 20px;";
          item = item.replace("m", "");
        }

        previousItem = item;
        if (spanText) {
          const typeValue = spanText[1]; // Extracts the content inside the span
          if (typeValue === "1") {
            // If spanText is empty, remove the background from etaStation
            stationHTML = item + `<sub>${long}</sub>`;
          } else if (typeValue === "0") {
            // If type is 0, add <md-icon>near_me</md-icon>
            stationHTML =
              item + `<sub>${long}</sub>` + "<md-icon>near_me</md-icon>";
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
    etaHolder = null;
  }

  try {
    const childRect = document
      .querySelector(".nameStation_" + station_id)
      .parentNode.getBoundingClientRect();
    const grandparentRect = container.getBoundingClientRect();
    const offsetTop = childRect.top - grandparentRect.top + container.scrollTop;
    container.scrollTo({
      top: already ? already - 25 : offsetTop - 15,
      behavior: already ? "instant" : "smooth",
    });
  } catch (error) {
    console.log(error);
  }

  listArrivals.stations = [];
  info.forEach((arrivalRoute, index) => {
    listArrivals.stations[index] = [
      arrivalRoute.latitude,
      arrivalRoute.longitude,
    ];
  });

  return listArrivals;
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
      if (
        (current[k - 1] == "" || current[k - 1] == null) &&
        current[k] !== ""
      ) {
        content = content + "z";
      }
      if (
        (current[k + 1] == "" || current[k + 1] == null) &&
        current[k] !== ""
      ) {
        content = content + "m";
      }
      combinedArrivals[i][1][k] = content;
    }
  }
  return combinedArrivals;
}
window.onpopstate = function (event) {
  document.querySelectorAll(".iks").forEach((iks) => {
    if (iks.getBoundingClientRect().left > 0) iks.click();
  });
};

async function getMyBusData(busId, arrivalsAll, tripId) {
  const arrivals = arrivalsAll
    ? arrivalsAll.filter((element) => element.trip_id == tripId)
    : null;
  clearInterval(intervalBusk);
  intervalBusk = null;
  if (document.querySelector(".myBusHolder")) {
    document.querySelector(".myBusHolder").remove();
  }
  var holder = addElement(
    "div",
    document.querySelector(".mainSheet"),
    "myBusHolder"
  );

  holder.classList.add("arrivalsScroll");
  let myEtaHolder = addElement("div", holder, "myEtaHolder");

  let iks = addElement("md-icon-button", myEtaHolder, "iks");
  let myEtaChips = addElement("div", myEtaHolder, "myEtaChips");
  if (arrivals && arrivals.length > 1) {
    for (const arrival of arrivals) {
      let arTime = addElement("div", myEtaChips, "arrivalTime");
      arTime.innerHTML = minToTime(arrival.eta_min);
      arTime.busId = arrival.vehicle_id;
      addElement("md-ripple", arTime);
      arTime.addEventListener("click", function () {
        myEtaChips.querySelector(".selected").classList.remove("selected");
        arTime.classList.add("selected");
        clearInterval(intervalBusk);
        intervalBusk = null;
        let busek = busObject.find(
          (el) => el.bus_unit_id == arrival.vehicle_id.toUpperCase()
        );
        document.querySelector(".myBusDiv").style.transform =
          "translateY(-20px)";
        document.querySelector(".myBusDiv").style.opacity = "0";
        clickedMyBus(busek, arrival.trip_id);
        intervalBusk = setInterval(() => {
          clickedMyBus(busek, arrival.trip_id);
        }, 10000);
      });
    }
    myEtaChips.firstElementChild.classList.add("selected");
  }

  let myBusDiv = document.querySelector(".myBusDiv")
    ? clearElementContent(document.querySelector(".myBusDiv"))
    : addElement("div", holder, "myBusDiv");
  myBusDiv = document.querySelector(".myBusDiv");

  iks.innerHTML = "<md-icon>arrow_back_ios_new</md-icon>";

  iks.addEventListener("click", function () {
    holder.style.transform = "translateX(100vw)";
    clearInterval(intervalBusk);
    document.querySelector(".arrivalsHolder").style.transform =
      "translateX(0vw)";
    document.querySelector(".arrivalsHolder").style.opacity = "1";
    clearMap();
    setTimeout(() => {
      clearElementContent(holder);
      setTimeout(() => {
        holder.remove();
      }, 100);
    }, 500);
  });
  setTimeout(() => {
    holder.style.opacity = "1";
    holder.style.transform = "translateX(0px) translateY(0px)";
  }, 10);
  if (arrivals || busId) {
    let bus = busObject.find(
      (el) =>
        el.bus_unit_id == (busId ? busId : arrivals[0].vehicle_id.toUpperCase())
    );
    console.log(arrivals);

    clickedMyBus(bus, arrivals ? arrivals[0].trip_id : bus.trip_id);
    intervalBusk = setInterval(() => {
      clickedMyBus(bus, arrivals ? arrivals[0].trip_id : bus.trip_id);
    }, 10000);
    return;
  }

  //get buse based on location (removed)
}
async function clickedMyBus(bus, tripId) {
  let arOnS = await fetchData(
    "https://cors.proxy.prometko.si/https://data.lpp.si/api/route/arrivals-on-route?trip-id=" +
      tripId
  );
  let busId = bus.bus_unit_id;
  let busData = busObject.find((el) => el.bus_unit_id === busId);

  let myBusDiv = document.querySelector(".myBusDiv");
  let scrollPosition = myBusDiv.scrollTop;

  clearElementContent(myBusDiv);
  myBusDiv = document.querySelector(".myBusDiv");

  let arrivalItem = addElement("div", myBusDiv, "arrivalItem");
  arrivalItem.style.margin = "10px 0";
  let busNumberDiv = addElement("div", arrivalItem, "busNo2");
  busNumberDiv.style.background = lineColors(busData.route_number);
  busNumberDiv.id = "bus_" + busData.route_number;
  busNumberDiv.textContent = busData.route_number;
  let tripNameSpan = addElement("span", arrivalItem);
  const tripName = arOnS.find((station) => station?.arrivals?.length > 0)
    ?.arrivals[0]?.trip_name;
  tripNameSpan.textContent = tripName;
  let busDataDiv = addElement("div", myBusDiv, "busDataDiv");
  await createBusData(busData, busDataDiv);
  let arrivalDataDiv = addElement("div", myBusDiv, "arrivalsOnStation");
  showArrivalsMyBus(arOnS, arrivalDataDiv, busData, busId);

  myBusDiv.scrollTop = scrollPosition ? scrollPosition : 0;
  myBusDiv.style.transform = "translateY(0px)";
  myBusDiv.style.opacity = "1";
}
function showArrivalsMyBus(info, container, arrival, busIdUp) {
  let holder = addElement("div", container, "arFlex");
  holder.style.display = "flex";

  let arHolder = addElement("div", holder, "arOnRoute");
  var listArrivals = {};
  let arrivalsColumns = addElement("div", holder, "arrivalsColumns");
  let isItYet = true;
  info.forEach((arrivalRoute, index) => {
    //vsaka postaja
    let arDiv = addElement("div", arHolder, "arrDiv");
    let lineStation = addElement("div", arDiv, "lineStation");

    lineStation.style.backgroundColor =
      "RGB(" +
      lineColorsObj[arrival.route_number.replace(/\D/g, "")].join(",") +
      ")";
    let lnimg = addElement("div", lineStation, "lineStationImg");

    if (index == 0 || index == info.length - 1) {
      index == 0
        ? lineStation.parentNode.classList.add("half-hidden-first")
        : lineStation.parentNode.classList.add("half-hidden");
      lnimg.style.backgroundColor =
        "RGB(" +
        lineColorsObj[arrival.route_number.replace(/\D/g, "")].join(",") +
        ")";
    } else {
      lnimg.style.backgroundColor =
        "RGB(" +
        darkenColor(
          lineColorsObj[arrival.route_number.replace(/\D/g, "")],
          50
        ).join(",") +
        ")";

      lnimg.style.borderColor =
        "RGB(" +
        lineColorsObj[arrival.route_number.replace(/\D/g, "")].join(",") +
        ")";
    }
    let nameStation = addElement("div", arDiv, "nameStation");
    nameStation.classList.add("nameStation_" + arrivalRoute.station_code);
    nameStation.innerHTML = arrivalRoute.name;

    let ar = arrivalRoute.arrivals.find(
      (el) => el.vehicle_id == busIdUp.toLowerCase()
    );

    try {
      if (!ar) {
        if (
          info[index + 1]?.arrivals?.find(
            (el) => el.vehicle_id == busIdUp.toLowerCase()
          ) &&
          isItYet
        ) {
          return;
        }

        if (
          !info[index + 1]?.arrivals?.find(
            (el) => el.vehicle_id == busIdUp.toLowerCase()
          ) &&
          isItYet
        ) {
          arDiv.style.display = "none";
          return;
        }
        if (!isItYet) {
          const moreThanAnHour = info
            .slice(index)
            .find((station) =>
              station?.arrivals?.some(
                (arrival) =>
                  arrival?.vehicle_id?.toLowerCase() === busIdUp.toLowerCase()
              )
            )?.arrivals;
          console.log(moreThanAnHour);

          if (!moreThanAnHour) return;
          console.log("no bus found");
          let indexOf = info.find(
            (station) => station?.arrivals?.length > 0
          )?.arrivals;
          ar = indexOf.find((el) => el.vehicle_id == busIdUp.toLowerCase());
          ar["eta_min"] = "/";
        }
      }
    } catch (e) {
      console.log(e);
    }

    isItYet = false;
    if (
      ar["type"] == 2 &&
      !lineStation.parentNode.classList.contains("half-hidden") &&
      !lineStation.parentNode.classList.contains("half-hidden-first")
    ) {
      lnimg.innerHTML =
        "<md-icon style='color:RGB(" +
        darkenColor(
          lineColorsObj[arrival.route_number.replace(/\D/g, "")],
          100
        ).join(",") +
        ")!important;background-color:RGB(" +
        lineColorsObj[arrival.route_number.replace(/\D/g, "")].join(",") +
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
            lineColorsObj[arrival.route_number.replace(/\D/g, "")],
            150
          ).join(",") +
          ")!important;background-color:RGB(" +
          lineColorsObj[arrival.route_number.replace(/\D/g, "")].join(",") +
          ")'>directions_bus</md-icon>";
        lnimg.classList.add("busBetween");
      }
    }
    listArrivals[ar["vehicle_id"]][index] =
      minToTime(ar["eta_min"]).replace(" min", "") +
      `<span style="display:none;">${ar["type"]}</span>`;

    arDiv, lineStation, lnimg, (nameStation = null);
  });

  let sortedArrivals = sortArrivals(listArrivals, 0);
  let long = absoluteTime ? "" : "min";
  for (let [key, element] of sortedArrivals) {
    let etaHolder = addElement("div", arrivalsColumns, "etaHoder");
    etaHolder.innerHTML = element
      .map((item, i) => {
        if (item === null) return "/";

        // Get the text content of the hidden <span>
        const spanText = item.match(
          /<span style="display:none;">(.*?)<\/span>/
        );
        if (!spanText && i !== 0) {
          //etaHolder.remove();
        } else {
          let stationHTML = item; // Default station HTML

          let border = "";

          if (item.includes("z")) {
            border =
              "border-top-left-radius: 15px;border-top-right-radius: 15px;";
            item = item.replace("z", "");
          }
          if (item.includes("m")) {
            border +=
              "border-bottom-left-radius: 15px;border-bottom-right-radius: 15px;";
            item = item.replace("m", "");
          }

          if (spanText) {
            const typeValue = spanText[1]; // Extracts the content inside the span
            if (typeValue === "1") {
              // If spanText is empty, remove the background from etaStation
              stationHTML = item + `<sub>${long}</sub>`;
            } else if (typeValue === "0") {
              // If type is 0, add <md-icon>near_me</md-icon>
              stationHTML =
                item + `<sub>${long}</sub>` + "<md-icon>near_me</md-icon>";
            } else if (typeValue === "2") {
              // If type is 2, replace the text with "P"
              stationHTML = item.replace(item, "PRIHOD");
            } else if (typeValue === "3") {
              // If type is 3, replace the text with "O"
              stationHTML = item.replace(item, "OBVOZ");
            }
          }

          stationHTML = stationHTML[0] == "/" ? "/" : stationHTML;
          // Return the formatted station HTML with the background removed if needed
          return `<div class="etaStation" style="${
            spanText ? "" : "background:none;"
          }${border ? border : ""}">${stationHTML}</div>`;
        }
      })
      .join("");
    etaHolder = null;
  }
}
async function createBusData(bus, busDataDiv) {
  let busAge = await (
    await fetch("https://teambusylj.github.io/slopromet/busAge.json")
  ).json();
  const findYearByGarageNumber = (garageNumber) => {
    for (const year in busAge) {
      if (busAge[year].includes(garageNumber)) {
        return year;
      }
    }
    return null; // če ni najdeno
  };

  busDataDiv.innerHTML = `<table class="busDataTable">
  <tr><td>Ime:</td><td>${bus.bus_name}</td></tr>
   <tr><td>Model:</td><td>${bus.model}</td></tr>
   <tr><td>Leto:</td><td>${findYearByGarageNumber(bus.no)}</td></tr>
   <tr><td>Vrsta:</td><td>${bus.type}</td></tr>
   <tr><td>Hitrost:</td><td>${bus.ground_speed} km/h</td></tr>
   <tr><td>Zabeležen:</td><td>${bus.bus_timestamp.toLocaleString("sl-SI", {
     timeZone: "Europe/Ljubljana",
   })}</td></tr>
  `;
  if (bus.hasImage) {
    let holder = addElement("div", busDataDiv, "busImgHolder");
    let img = addElement("img", holder, "busImgElement");
    let imageLoaded = new Promise((resolve, reject) => {
      img.onload = resolve;
      img.onerror = reject;
    });
    img.src =
      "https://mestnipromet.cyou/tracker/img/avtobusi/" + bus.no + ".jpg";
    holder.innerHTML += `<div class="busAuthor"><md-icon slot="trailing-icon">photo_camera</md-icon>${bus.author}</div>`;
    await imageLoaded;
  }
}
function getDirections() {
  "https://maps.googleapis.com/maps/api/directions/json?origin=Central+Park,NY&destination=Times+Square,NY&mode=transit&key=AIzaSyCGnbK8F2HvhjqRrKo3xogo4Co7bitNwYA";
  let container = addElement(
    "div",
    document.querySelector(".mainSheet"),
    "directions"
  );
  getLocation();
  container.classList.add("arrivalsScroll");
  var stylesTransition = [
    document.querySelector(".searchContain").style,
    document.querySelector(".listOfStations").style,
    document.querySelector(".favouriteStations").style,
    document.getElementById("tabsFav").style,
    document.querySelector(".refresh").style,
    document.querySelector(".directionsButton").style,
  ];
  stylesTransition.forEach((style) => {
    style.transform = "translateX(-100vw)";
    style.opacity = "0";
  });
  setTimeout(() => {
    container.style.transform = "translateX(0vw)";
    container.style.opacity = "1";
  }, 1);

  let iks = addElement("md-icon-button", container, "iks");
  iks.innerHTML = "<md-icon>arrow_back_ios_new</md-icon>";
  iks.addEventListener("click", function () {
    container.style.transform = "translateX(100vw)";
    var stylesTransition = [
      document.querySelector(".searchContain").style,
      document.querySelector(".listOfStations").style,
      document.querySelector(".favouriteStations").style,
      document.getElementById("tabsFav").style,
      document.querySelector(".refresh").style,
      document.querySelector(".directionsButton").style,
    ];
    stylesTransition.forEach((style) => {
      style.transform = "translateX(0vw)";
      style.opacity = "1";
    });
    setTimeout(() => {
      container.remove();
    }, 500);
    clearMap();
  });
  let depart = addElement("md-filled-text-field", container, "locationInput");
  depart.label = "Začetna lokacija";
  depart.addEventListener(`focus`, () => depart.select());
  depart.innerHTML = "<md-icon slot='trailing-icon'>adjust</md-icon>";
  var departLocation = new google.maps.LatLng(latitude, longitude);
  geocodeLatLng(latitude, longitude)
    .then((address) => {
      depart.value = address;
    })
    .catch((error) => {
      console.error(error);
    });
  const options = {
    componentRestrictions: { country: "si" },
    fields: ["address_components", "geometry.location", "name", "icon"],
    strictBounds: false,
  };
  const autocomplete = new google.maps.places.Autocomplete(depart, options);
  autocomplete.addListener("place_changed", () => {
    departLocation = autocomplete.getPlace().geometry.location;
  });

  let arrive = addElement("md-filled-text-field", container, "locationInput");
  arrive.addEventListener(`focus`, () => arrive.select());
  arrive.label = "Končna lokacija";
  arrive.innerHTML = "<md-icon slot='trailing-icon'>location_on</md-icon>";
  var arriveLocation;

  const autocomplete2 = new google.maps.places.Autocomplete(arrive, options);
  autocomplete2.addListener("place_changed", () => {
    arriveLocation = autocomplete2.getPlace().geometry.location;
  });

  var agencies =
    localStorage.agencije ||
    '{"Ljubljanski":true,"SŽ":true,"Arriva":true,"Nomago":true,"Marprom":true,"Murska Sobota":true}';

  agencies = JSON.parse(agencies);
  if (Object.keys(agencies).length < 6) {
    agencies = {
      Ljubljanski: true,
      SŽ: true,
      Arriva: true,
      Nomago: true,
      Marprom: true,
      "Murska Sobota": true,
    };
  }
  let chipsHolder = addElement("div", container, "chipsHolder");
  for (const key in agencies) {
    let lppChip = addElement("md-filter-chip", chipsHolder, "chip");
    lppChip.innerHTML = key;
    lppChip.selected = agencies[key];
    lppChip.addEventListener("click", () => {
      if (lppChip.selected == true) {
        agencies[key] = true;
      } else {
        agencies[key] = false;
      }
    });
  }
  let timeHolder = addElement("div", container, "timeHolder");
  var inputLeave = addElement("md-filled-text-field", timeHolder, "timeInput");
  inputLeave.type = "datetime-local";
  inputLeave.value = new Date(Date.now()).toISOString().split("T")[0];
  inputLeave.label = "Odhod";
  inputLeave.innerHTML += '<md-icon slot="leading-icon">logout</md-icon>';
  inputLeave.addEventListener("click", () => {
    inputLeave.shadowRoot
      .querySelector("span > md-filled-field > div.input-wrapper > input")
      .showPicker();
  });
  var inputArrive = addElement("md-filled-text-field", timeHolder, "timeInput");
  inputArrive.type = "datetime-local";
  inputArrive.label = "Prihod";
  inputArrive.innerHTML += '<md-icon slot="leading-icon">login</md-icon>';
  inputArrive.addEventListener("click", () => {
    inputArrive.shadowRoot
      .querySelector("span > md-filled-field > div.input-wrapper > input")
      .showPicker();
  });
  var goButton = addElement("md-filled-button", container, "goButton");
  goButton.innerHTML = "Pokaži pot";

  let panel = addElement("div", container, "panel");
  goButton.addEventListener("click", async () => {
    console.log(panel);
    panel = await clearElementContent(panel);

    if (depart.value !== "" && arrive.value !== "") {
      //goButton.style.display = "none";
      calcRoute(
        departLocation,
        arriveLocation,
        panel,
        agencies,
        new Date(inputLeave.value),
        new Date(inputArrive.value)
      );
      localStorage.agencije = JSON.stringify(agencies);
    } else {
      panel.innerHTML = "Izberite obe lokaciji.";
    }
  });
}
function calcRoute(start, end, panel, agencies, leave, arrive) {
  var directionsService = new google.maps.DirectionsService();
  var directionsRenderer = new google.maps.DirectionsRenderer();

  var directions;
  var request = {
    origin: start,
    destination: end,
    provideRouteAlternatives: true,
    travelMode: "TRANSIT",
    transitOptions: {
      departureTime: leave,
      arrivalTime: arrive,
      modes: ["BUS", "TRAIN"],
    },
  };
  directionsService.route(request, async function (result, status) {
    if (status == "OK") {
      directionsRenderer.setDirections(result);

      directions = directionsRenderer.getDirections().routes;

      directionsRenderer.setDirections(result);
      directions = directionsRenderer.getDirections().routes;

      // Generate allowedAgencies dynamically based on the agencies object
      const allowedAgencies = Object.keys(agencies).filter(
        (key) => agencies[key]
      ); // Keep only those that are true

      const validRoutes = directions.filter((route) => {
        const routeAgencies = route.legs[0].steps
          .filter((step) => step.transit)
          .map((step) => step.transit.line.agencies[0].name);

        return routeAgencies.every(
          (agency) =>
            allowedAgencies.some((allowed) => agency.includes(allowed)) // Partial match check or skip if no allowed agencies
        );
      });

      let routesHolder = document.querySelector(".stepDiv")
        ? document.querySelector(".stepDiv")
        : addElement("div", panel, "stepDiv");
      routesHolder = await clearElementContent(routesHolder);

      routesHolder.style.flexDirection = "column";
      routesHolder.style.overflow = "visible";

      document.querySelector(".directions").insertBefore(routesHolder, panel);
      for (const route of validRoutes) {
        let routeDiv = addElement("div", routesHolder, "routeDiv");
        addElement("md-ripple", routeDiv);
        console.log(route);

        for (const step of route.legs[0].steps) {
          console.log(step);
          if (step.travel_mode == "WALKING") {
            routeDiv.innerHTML +=
              "<div class=busHolder><md-icon>directions_walk</md-icon><span class=textMin>" +
              step.duration.text.replace(" min", "") +
              "</span></div><md-icon>chevron_right</md-icon>";
          } else if (step.travel_mode == "TRANSIT") {
            routeDiv.innerHTML +=
              "<div class=busHolder>" +
              (step.transit.line.short_name
                ? "<div class=busNo style=background:" +
                  lineColors(step.transit.line.short_name.replace(/^0+/, "")) +
                  ">" +
                  step.transit.line.short_name.replace(/^0+/, "") +
                  "</div>"
                : step.transit.line.agencies[0].name.includes("SŽ")
                ? getLogo(step.transit.line.agencies[0].name, 1)
                : getLogo(step.transit.line.agencies[0].name)) +
              "</div><md-icon>chevron_right</md-icon>";
          }
        }
        routeDiv.innerHTML +=
          "<span style='margin-left:auto;'>" +
          route.legs[0].duration.text +
          "</span>";
        routeDiv.addEventListener("click", async () => {
          panel = await clearElementContent(panel);
          displayRoute(panel, route);
        });
      }
      panel.style.opacity = "1";
      panel.style.transform = "translateY(0)";
    }
  });
}
function displayRoute(panel, dira) {
  var dir = dira
    ? dira.legs[0]
    : "<b>Pot ni bila najdena.</b><br><br>Verjetno ste izključili ponudnika, brez katerega ni mogoče priti do končne lokacije.";
  if (!dira) {
    panel.innerHTML = dir;

    return false;
  }
  if (dir.departure_time) {
    let startTime = addElement("div", panel, "stepDiv");
    startTime.innerHTML =
      "<md-icon>alarm</md-icon>Začnite ob " + dir.departure_time.text;
    startTime.setAttribute(
      "style",
      "margin-top: 0px;padding-top: 0px;padding-bottom: 0px;margin-bottom: 0px;"
    );
  }

  let startDuration = addElement("div", panel, "stepDiv");
  startDuration.innerHTML =
    "<md-icon>schedule</md-icon>Potovali boste " + dir.duration.text;
  startDuration.setAttribute(
    "style",
    "margin-top: 10px;padding-top: 0px;padding-bottom: 0px;margin-bottom: 0px;"
  );

  let transfersN = 0;

  dir.steps.forEach((step) => {
    if (step.transit) {
      // Increment for each transit step
      transfersN++;
    }
  });
  transfersN = transfersN - 1;
  if (transfersN > 0) {
    let transfers = addElement("div", panel, "stepDiv");
    transfers.innerHTML =
      "<md-icon>sync_alt</md-icon>Prestopili boste " + transfersN + "-krat";
    transfers.setAttribute(
      "style",
      "margin-top: 10px;padding-top: 0px;padding-bottom: 0px;margin-bottom: 0px;"
    );
  }
  let steps = addElement("div", panel, "stepsDir");
  for (const step of dir.steps) {
    let stepDiv = addElement("div", steps, "stepDiv");

    let icon = addElement("div", stepDiv, "stepIcon");
    let txtContent = addElement("div", stepDiv, "stepTextContent");
    if (step.travel_mode == "WALKING") {
      icon.innerHTML = "<md-icon>directions_walk</md-icon>";
      txtContent.innerHTML += `<span class='stepText'>${step.instructions
        .replace(
          "se do",
          step.instructions.includes(", Slovenija") ? "se do" : "se do postaje"
        )
        .replace(
          /(postaje\s*)(.*)/,
          "$1<b>$2</b>"
        )}</span><div><span class='stepText'><md-icon>schedule</md-icon>${
        step.duration.text
      }</span><span class='stepText'><md-icon>distance</md-icon>${
        step.distance.text
      }</span></div>`;
      addElement("md-ripple", txtContent);
      txtContent.addEventListener("click", () => {
        openRouteInGoogleMapsApp(
          step.start_location.lat(),
          step.start_location.lng(),
          step.end_location.lat(),
          step.end_location.lng()
        );
      });
    } else if (step.travel_mode == "TRANSIT") {
      icon.innerHTML = step.transit.line.short_name
        ? "<div class=busNo style=background:" +
          lineColors(step.transit.line.short_name.replace(/^0+/, "")) +
          ">" +
          step.transit.line.short_name.replace(/^0+/, "") +
          "</div>"
        : step.transit.line.agencies[0].name.includes("SŽ")
        ? getLogo(step.transit.line.agencies[0].name, 1)
        : getLogo(step.transit.line.agencies[0].name);

      txtContent.innerHTML += `<span class='stepText endStation'>${
        step.transit.departure_stop.name
      }<md-icon>chevron_right</md-icon>${
        step.transit.arrival_stop.name
      }</span><span class='stepText'>${
        step.transit.headsign +
        (step.transit.line.short_name
          ? ""
          : " (" + getCompany(step.transit.line.agencies[0].name) + ")")
      }</span><div><span class='stepText'><md-icon>schedule</md-icon>${
        step.transit.departure_time.text
      } - ${step.transit.arrival_time.text}&nbsp;<b>•</b>&nbsp;${
        step.duration.text
      }</span></div><div><span class='stepText'><md-icon>distance</md-icon>${
        step.distance.text
      }</span><span class='stepText'><md-icon>timeline</md-icon>${getPostaj(
        step.transit.num_stops
      )}</span></div>`;
    }
  }
  if (dir.arrival_time) {
    let endTime = addElement("div", panel, "stepDiv");
    endTime.innerHTML =
      "<md-icon>schedule</md-icon>Na cilju boste ob " + dir.arrival_time.text;
    endTime.setAttribute("style", "margin-top: 10px;padding-top: 0px;");
  }
  panel.style.opacity = "1";
  panel.style.transform = "translateY(0)";
  startDuration.scrollIntoView({ behavior: "smooth", block: "start" });
}
function openRouteInGoogleMapsApp(originLat, originLng, destLat, destLng) {
  // Construct the Google Maps URL scheme for the mobile app (with walking mode)
  const googleMapsAppURL = `google.maps://?daddr=${destLat},${destLng}&saddr=${originLat},${originLng}&directionsmode=walking`;

  // Try to open the route in the app
  window.location.href = googleMapsAppURL;

  // Fallback to the web version with walking mode if the app is not installed (opens in new tab)
  setTimeout(function () {
    const fallbackURL = `https://www.google.com/maps/dir/?api=1&origin=${originLat},${originLng}&destination=${destLat},${destLng}&travelmode=walking`;
    window.open(fallbackURL, "_blank"); // Open in a new tab
  }, 25);
}
function getCompany(company) {
  let cmp = company.replace(" d.o.o.", "");
  return cmp == "Ljubljanski potniški promet"
    ? ""
    : company.includes("Javno")
    ? "IJPP"
    : company.includes("Murska")
    ? "Murska Sobota"
    : company.includes("SŽ")
    ? "Slovenske železnice"
    : cmp;
}
function getLogo(agency, sz) {
  let a = sz ? "directions_railway" : "directions_bus";
  const firstWord = agency.split(" ")[0].toLowerCase();
  return (
    "<md-icon>" +
    a +
    "</md-icon><div class=connectingLine></div><img class=agencyLogo src='images/logos/" +
    firstWord +
    ".png'>"
  );
}
function getPostaj(number) {
  let skl =
    number == 1
      ? " postaja"
      : number == 2
      ? " postaji"
      : number == 3 || number == 4
      ? " postaje"
      : " postaj";
  return number + skl;
}
function geocodeLatLng(latitude, longitude) {
  return new Promise((resolve, reject) => {
    const latlng = {
      lat: latitude,
      lng: longitude,
    };

    const geocoder = new google.maps.Geocoder();

    geocoder.geocode({ location: latlng }, (results, status) => {
      if (status === google.maps.GeocoderStatus.OK && results[0]) {
        resolve(results[0].formatted_address); // Resolving with address
      } else {
        reject("Geocoder failed or no results found");
      }
    });
  });
}
var absoluteTime = false;

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
