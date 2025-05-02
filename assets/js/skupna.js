var rasterLayer,
  coordinates,
  markers,
  stations,
  iconFeature,
  absoluteTime = false,
  iconStyle,
  tempMarkersSource,
  busPreviusPosition = {},
  buses = [],
  arrivalsMain = {},
  tripIds = [],
  stationList = {},
  latitude,
  longitude,
  lines,
  map,
  busVectorLayer,
  busStationLayer,
  animating,
  speed,
  now,
  currentBus = "",
  busObject,
  busMarker = [],
  busImageData,
  setSheetHeight;

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
window.addEventListener("load", async function () {
  await loadJS();
  console.log("loaded");

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
  search.addEventListener(`focus`, () => search.select());
  absoluteTime = localStorage.getItem("time") ? true : false;
  document
    .querySelector("#" + agency.toLocaleLowerCase() + "Tab > img")
    .classList.add("selected");
  document.body.classList.add(agency.toLocaleLowerCase());
  document.body.style.opacity = "1";
  if (agency == "LPP") {
    busImageData = await fetch(
      "https://mestnipromet.cyou/tracker/js/json/images.json"
    );
    absoluteTime = localStorage.getItem("time") ? true : false;

    busImageData = await busImageData.json();
  }
});
function loadJS() {
  return new Promise((resolve, reject) => {
    const script = document.createElement("script");
    const script2 = document.createElement("script");
    script.id = "script1";
    script2.id = "script2";
    script.type = "text/javascript";
    script2.type = "text/javascript";

    script.src =
      agency === "LPP" ? "assets/js/scriptlpp.js" : "assets/js/scriptBA.js";
    script2.src =
      agency === "LPP" ? "assets/js/helper.js" : "assets/js/helperBA.js";

    let loaded = 0;
    const onLoad = () => {
      loaded++;
      if (loaded === 2) resolve();
    };

    script.onload = onLoad;
    script2.onload = onLoad;
    script.onerror = reject;
    script2.onerror = reject;

    document.head.appendChild(script);
    document.head.appendChild(script2);
  });
}
function changeAgency(agencyClicked) {
  if (agency == agencyClicked) return;
  document.body.style.opacity = "0";
  if (agencyClicked !== "LPP") {
    agency = agencyClicked;
    localStorage.setItem("agency", agencyClicked);
  } else {
    agency = "LPP";
    localStorage.setItem("agency", "LPP");
  }
  setTimeout(() => {
    location.reload();
  }, 200);
}
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
function getDirections() {
  "https://maps.googleapis.com/maps/api/directions/json?origin=Central+Park,NY&destination=Times+Square,NY&mode=transit&key=AIzaSyCGnbK8F2HvhjqRrKo3xogo4Co7bitNwYA";
  let container = addElement(
    "div",
    document.querySelector(".mainSheet"),
    "directions"
  );
  getLocation();
  container.classList.add("arrivalsScroll");
  setTimeout(() => {
    container.style.transform = "translateX(0vw)";
    container.style.opacity = "1";
  }, 1);

  let iks = addElement("md-icon-button", container, "iks");
  iks.innerHTML = "<md-icon>arrow_back_ios_new</md-icon>";
  iks.addEventListener("click", function () {
    container.style.transform = "translateX(100vw)";
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
    "</md-icon><div class=connectingLine></div><img class=agencyLogo src='assets/images/logos/" +
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
function makeBottomSheet(title, height) {
  let bottomSheet = addElement("div", document.body, "bottomSheet");
  let sheetContents = addElement("div", bottomSheet, "sheetContents");
  let draggableArea = addElement("div", bottomSheet, "handleHolder");

  let handle = addElement("div", draggableArea, "bottomSheetHandle");
  var sheetHeight;
  setSheetHeight = (value) => {
    sheetHeight = Math.max(0, Math.min(100, value));

    bottomSheet.style.transform = `translate3d(-50%,${
      100 - sheetHeight
    }dvh, 0)`;
  };

  const touchPosition = (event) => (event.touches ? event.touches[0] : event);

  let dragPosition;

  var vh = Math.max(
    document.documentElement.clientHeight || 0,
    window.innerHeight || 0
  );
  var mouseDown = 0;
  window.onmousedown = function () {
    ++mouseDown;
  };
  window.onmouseup = function () {
    --mouseDown;
  };
  function formatNumber(num) {
    let str = num.toString().replace(".", ""); // Remove the decimal point for easier extraction
    let firstTwo = str.slice(0, 2); // Get first two digits
    let decimalPart = str[2] || "0"; // Get the third digit (first decimal), default to '0' if missing

    return `${firstTwo[0]}.${firstTwo[1]}`;
  }
  var canGo = true;
  const onDragStart = (event) => {
    if (!event.target.closest(".bottomSheet")) return;
    dragPosition = touchPosition(event).pageY;

    sheetContents.classList.add("not-selectable");
    vh = Math.max(
      document.documentElement.clientHeight || 0,
      window.innerHeight || 0
    );
    const scrollList = document.querySelector(".myBusDiv")
      ? document.querySelector(".myBusDiv")
      : document.querySelector(".arrivalsOnStation")
      ? document.querySelector(".arrivalsOnStation")
      : document.querySelector(".lineTimes")
      ? document.querySelector(".lineTimes")
      : document.querySelector(".arrivalsHolder")
      ? document.querySelector(".arrivalsHolder")
      : document.querySelector(".favouriteStations").style.display == "flex"
      ? document.querySelector(".favouriteStations")
      : document.querySelector(".listOfStations");

    if (sheetHeight !== 98) scrollList.style.overflow = "hidden";
    if (
      scrollList.scrollTop > 1 &&
      sheetHeight == 98 &&
      !event.target.closest(".handleHolder")
    )
      canGo = undefined;
    if (!event.target.closest(".bottomSheet")) canGo = undefined;
    bottomSheet.style.willChange = "transform";
  };
  const onDragMove = (event) => {
    if (!dragPosition) return;
    if (!canGo) return;
    const y = touchPosition(event).pageY;
    var deltaY = dragPosition - y;
    if (sheetHeight == 98 && deltaY > 0) return;
    if (sheetHeight < 40 && deltaY < 0) {
      deltaY = deltaY / formatNumber(y);
    }
    const deltaHeight = (deltaY / window.innerHeight) * 100;

    dragPosition = y;

    setSheetHeight(sheetHeight + deltaHeight);
  };
  const onDragEnd = () => {
    (document.querySelector(".myBusDiv")
      ? document.querySelector(".myBusDiv")
      : document.querySelector(".arrivalsOnStation")
      ? document.querySelector(".arrivalsOnStation")
      : document.querySelector(".lineTimes")
      ? document.querySelector(".lineTimes")
      : document.querySelector(".arrivalsHolder")
      ? document.querySelector(".arrivalsHolder")
      : document.querySelector(".favouriteStations").style.display == "flex"
      ? document.querySelector(".favouriteStations")
      : document.querySelector(".listOfStations")
    ).style.overflow = "scroll";
    dragPosition = undefined;
    sheetContents.classList.remove("not-selectable");
    canGo = true;
    var sheetHeight3;

    const mainContentHeight = Math.min(
      mainContent.clientHeight,
      mainContent.scrollHeight
    );
    sheetHeight3 = (mainContentHeight / vh) * 100;

    if (sheetHeight > 65) {
      setSheetHeight(98);
    } else {
      setSheetHeight(40);
    }
    if (sheetHeight > sheetHeight3 + (100 - sheetHeight3) / 2) {
      setSheetHeight(98);
    }

    bottomSheet.style.transition =
      "all var(--transDur) cubic-bezier(0.05, 0.7, 0.1, 1)";
    setTimeout(() => {
      bottomSheet.style.transition = "";
      bottomSheet.style.willChange = "";
    }, 400);
  };
  let lastMoveTime = 0;
  const throttleDragMove = (event) => {
    window.requestAnimationFrame(() => {
      onDragMove(event);
    });
  };
  window.addEventListener("mousedown", onDragStart);
  window.addEventListener("touchstart", onDragStart);

  window.addEventListener("mousemove", throttleDragMove);
  window.addEventListener("touchmove", throttleDragMove);

  window.addEventListener("mouseup", onDragEnd);
  window.addEventListener("touchend", onDragEnd);

  let mainContent = addElement("main", sheetContents, "mainSheet");
  bottomSheet.style.transition =
    "all var(--transDur) cubic-bezier(0.05, 0.7, 0.1, 1)";
  setTimeout(() => {
    bottomSheet.style.transition = "";
  }, 400);
  if (height) setSheetHeight(height);
  else {
    setSheetHeight(
      Math.min(sheetContents.offsetHeight, 50, (720 / window.innerHeight) * 100)
    );
  }
  sheetContents.appendChild(document.querySelector(".refresh"));
  sheetContents.appendChild(document.querySelector(".directionsButton"));
  return mainContent;
}
async function clearElementContent(element) {
  if (!(element instanceof Element)) {
    console.error("Provided argument is not a valid DOM element.");
    return;
  }

  while (element.firstChild) {
    element.firstChild.remove();
  }

  const clonedElement = element.cloneNode(false);
  element.replaceWith(clonedElement);

  // Clear innerHTML (after removing event listeners)

  return clonedElement; // Return the cleaned element
}
function clearMap() {
  busStationLayer
    .getSource()
    .getFeatures()
    .forEach((feature) => {
      busStationLayer.getSource().removeFeature(feature);
    });
  busVectorLayer
    .getSource()
    .getFeatures()
    .forEach((feature) => {
      busVectorLayer.getSource().removeFeature(feature);
    });
  markers
    .getSource()
    .getFeatures()
    .forEach((feature) => {
      markers.getSource().removeFeature(feature);
    });
  buses = [];
  document.getElementById("popup").style.display = "none";
}
const lineColorsObj = {
  1: [201, 51, 54],
  2: [140, 136, 65],
  3: [236, 89, 58],
  5: [159, 83, 158],
  6: [147, 149, 152],
  7: [28, 186, 220],
  8: [17, 106, 176],
  9: [134, 170, 205],
  11: [237, 194, 59],
  12: [33, 74, 160],
  13: [207, 211, 77],
  14: [239, 89, 161],
  15: [162, 35, 142],
  16: [88, 44, 129],
  18: [137, 87, 53],
  19: [234, 158, 180],
  20: [31, 135, 81],
  21: [82, 186, 80],
  22: [246, 167, 58],
  23: [64, 174, 73],
  24: [237, 2, 140],
  25: [15, 149, 202],
  26: [35, 31, 32],
  27: [87, 168, 151],
  30: [154, 210, 174],
  40: [73, 110, 109],
  42: [167, 139, 107],
  43: [78, 73, 122],
  44: [129, 126, 168],
  51: [108, 139, 198],
  52: [0, 86, 93],
  53: [199, 179, 202],
  56: [149, 51, 18],
  60: [172, 187, 113],
  61: [249, 166, 74],
  71: [108, 139, 198],
  72: [76, 163, 145],
  73: [254, 202, 10],
  78: [201, 109, 106],
  4: [242, 139, 48],
  10: [162, 191, 47],
  17: [184, 61, 69],
  28: [229, 140, 77],
  29: [178, 210, 138],
  31: [122, 86, 161],
  32: [218, 157, 86],
  33: [119, 168, 179],
  34: [227, 86, 146],
  35: [81, 77, 110],
  36: [212, 167, 71],
  37: [58, 124, 126],
  38: [230, 117, 39],
  39: [156, 110, 88],
  41: [214, 231, 163],
  45: [167, 66, 67],
  46: [143, 107, 142],
  47: [211, 149, 74],
  48: [114, 201, 182],
  49: [203, 69, 119],
  50: [106, 120, 154],
  54: [216, 175, 86],
  55: [67, 87, 123],
  57: [229, 142, 80],
  58: [144, 139, 158],
  59: [191, 210, 100],
  62: [158, 115, 82],
  63: [63, 157, 158],
  64: [239, 125, 80],
  65: [93, 92, 107],
  66: [211, 178, 87],
  67: [77, 145, 127],
  68: [226, 120, 81],
  69: [162, 117, 91],
  70: [168, 205, 181],
  74: [214, 82, 116],
  75: [184, 179, 213],
  76: [212, 177, 88],
  77: [97, 147, 127],
  79: [239, 130, 81],
  80: [117, 104, 92],
  81: [117, 104, 92],
  82: [117, 104, 92],
  83: [117, 104, 92],
  85: [117, 104, 92],
};
const darkMap = [
  {
    elementType: "geometry",
    stylers: [
      {
        color: "#242f3e",
      },
    ],
  },
  {
    elementType: "labels.text.fill",
    stylers: [
      {
        color: "#746855",
      },
    ],
  },
  {
    elementType: "labels.text.stroke",
    stylers: [
      {
        color: "#242f3e",
      },
    ],
  },
  {
    featureType: "administrative.land_parcel",
    elementType: "labels",
    stylers: [
      {
        visibility: "off",
      },
    ],
  },
  {
    featureType: "administrative.locality",
    elementType: "labels.text.fill",
    stylers: [
      {
        color: "#cddaf4",
      },
    ],
  },
  {
    featureType: "administrative.neighborhood",
    elementType: "labels.text.fill",
    stylers: [
      {
        color: "#9da5b5",
      },
    ],
  },
  {
    featureType: "poi",
    elementType: "labels.text",
    stylers: [
      {
        visibility: "off",
      },
    ],
  },
  {
    featureType: "poi",
    elementType: "labels.text.fill",
    stylers: [
      {
        color: "#d59563",
      },
    ],
  },
  {
    featureType: "poi.business",
    stylers: [
      {
        visibility: "off",
      },
    ],
  },
  {
    featureType: "poi.park",
    elementType: "geometry",
    stylers: [
      {
        color: "#263c3f",
      },
    ],
  },
  {
    featureType: "poi.park",
    elementType: "labels.text.fill",
    stylers: [
      {
        color: "#6b9a76",
      },
    ],
  },
  {
    featureType: "road",
    elementType: "geometry",
    stylers: [
      {
        color: "#38414e",
      },
    ],
  },
  {
    featureType: "road",
    elementType: "geometry.stroke",
    stylers: [
      {
        color: "#212a37",
      },
    ],
  },
  {
    featureType: "road",
    elementType: "labels.icon",
    stylers: [
      {
        visibility: "off",
      },
    ],
  },
  {
    featureType: "road",
    elementType: "labels.text.fill",
    stylers: [
      {
        color: "#9ca5b3",
      },
    ],
  },
  {
    featureType: "road.highway",
    elementType: "geometry",
    stylers: [
      {
        color: "#746855",
      },
    ],
  },
  {
    featureType: "road.highway",
    elementType: "geometry.fill",
    stylers: [
      {
        color: "#696d69",
      },
    ],
  },
  {
    featureType: "road.highway",
    elementType: "geometry.stroke",
    stylers: [
      {
        color: "#1f2835",
      },
    ],
  },
  {
    featureType: "road.highway",
    elementType: "labels.text.fill",
    stylers: [
      {
        color: "#f3d19c",
      },
    ],
  },
  {
    featureType: "road.local",
    elementType: "labels",
    stylers: [
      {
        visibility: "off",
      },
    ],
  },
  {
    featureType: "transit",
    stylers: [
      {
        visibility: "off",
      },
    ],
  },
  {
    featureType: "transit",
    elementType: "geometry",
    stylers: [
      {
        color: "#2f3948",
      },
    ],
  },
  {
    featureType: "transit.station",
    elementType: "labels.text.fill",
    stylers: [
      {
        color: "#d59563",
      },
    ],
  },
  {
    featureType: "transit.station.bus",
    stylers: [
      {
        visibility: "on",
      },
    ],
  },
  {
    featureType: "transit.station.bus",
    elementType: "geometry",
    stylers: [
      {
        visibility: "on",
      },
    ],
  },
  {
    featureType: "water",
    elementType: "geometry",
    stylers: [
      {
        color: "#17263c",
      },
    ],
  },
  {
    featureType: "water",
    elementType: "labels.text.fill",
    stylers: [
      {
        color: "#515c6d",
      },
    ],
  },
  {
    featureType: "water",
    elementType: "labels.text.stroke",
    stylers: [
      {
        color: "#17263c",
      },
    ],
  },
];
const lightMap = [
  {
    featureType: "administrative.land_parcel",
    elementType: "labels",
    stylers: [
      {
        visibility: "off",
      },
    ],
  },
  {
    featureType: "poi",
    elementType: "labels.text",
    stylers: [
      {
        visibility: "off",
      },
    ],
  },
  {
    featureType: "poi.business",
    stylers: [
      {
        visibility: "off",
      },
    ],
  },
  {
    featureType: "road",
    elementType: "labels.icon",
    stylers: [
      {
        visibility: "off",
      },
    ],
  },
  {
    featureType: "road.local",
    elementType: "labels",
    stylers: [
      {
        visibility: "off",
      },
    ],
  },
  {
    featureType: "transit",
    stylers: [
      {
        visibility: "off",
      },
    ],
  },
  {
    featureType: "transit.station.bus",
    stylers: [
      {
        visibility: "on",
      },
    ],
  },
  {
    featureType: "transit.station.bus",
    elementType: "geometry",
    stylers: [
      {
        visibility: "on",
      },
    ],
  },
  {
    featureType: "transit.station.bus",
    elementType: "geometry.fill",
    stylers: [
      {
        visibility: "on",
      },
    ],
  },
  {
    featureType: "transit.station.bus",
    elementType: "geometry.stroke",
    stylers: [
      {
        visibility: "on",
      },
    ],
  },
];
function minToTime(min, yes) {
  if (!absoluteTime && !yes) return min + " min";
  const now = new Date();
  now.setMinutes(now.getMinutes() + min);

  const hrs = now.getHours();
  const mins = now.getMinutes();

  return `${String(hrs).padStart(2, "0")}:${String(mins).padStart(2, "0")}`;
}
var agency = localStorage.getItem("agency") || "LPP";
async function fetchData(url, arrivaType) {
  let data;
  if (agency !== "LPP") {
    data = await (await fetch(url)).json();
  } else {
    data = await (await fetch(url)).json();
    data = data.data;
  }
  return data;
}

/**
 * Given a bus index (e.g. "201" or "N201"), returns a CSS gradient string
 * that represents the line color. The direction of the gradient is determined
 * by the "N" in the index.
 *
 * @param {string} i - Bus index
 * @returns {string} - CSS gradient string
 */
const lineColors = (i) => {
  let color = lineColorsObj[i.replace(/\D/g, "")]; // Example: [201, 51, 54]

  if (!color) color = [201, 51, 54]; // Return empty string if the index is not found
  if (/[a-zA-Z]/.test(i)) color = darkenColor(color, 40);

  let darkerColor = darkenColor(color, 70);

  return i.includes("N")
    ? `linear-gradient(320deg,rgb(0,0,0)10%,rgb(${color.join(",")})160%) `
    : `linear-gradient(165deg,rgb(${color.join(",")}),rgb(${darkerColor.join(
        ","
      )}))`;
};
const darkenColor = (rgbArray, amount) =>
  rgbArray.map((channel) => Math.max(0, channel - amount));
function moveMarker(marker, newCoord, dir) {
  const duration = 2000; // Duration of the animation in milliseconds
  const start = +new Date();
  const end = start + duration;

  const animateMove = function () {
    const now = +new Date();
    const elapsed = now - start;
    const fraction = Math.min(elapsed / duration, 1);
    const currentCoord = [
      marker.getGeometry().getCoordinates()[0] +
        (newCoord[0] - marker.getGeometry().getCoordinates()[0]) * fraction,
      marker.getGeometry().getCoordinates()[1] +
        (newCoord[1] - marker.getGeometry().getCoordinates()[1]) * fraction,
    ];
    marker.getGeometry().setCoordinates(currentCoord);

    if (elapsed < duration) {
      requestAnimationFrame(animateMove);
    }
  };
  const style = marker.getStyle();
  if (style && style.getImage) {
    const image = style.getImage();
    image.setRotation(dir); // Use the provided direction for rotation
  }
  animateMove();
}
function generateCustomSVG(fillColor, borderColor) {
  const svg = `
  <svg id="Layer_1" height="480px" width="480px" xmlns="http://www.w3.org/2000/svg" version="1.1" viewBox="0 0 1920 1080">
  <path fill="RGB(${fillColor})" class="st0" d="M1003,626c-21.9,0-42.5-8.5-58-24-32-32-32-84,0-116l58-58,58,58c32,32,32,84,0,116-15.5,15.5-36.1,24-58,24Z"/>
  <path fill="RGB(${borderColor})" d="M1003,456.3l43.8,43.8c24.2,24.2,24.2,63.5,0,87.7-11.7,11.7-27.3,18.2-43.8,18.2s-32.1-6.4-43.8-18.2c-11.7-11.7-18.2-27.3-18.2-43.8s6.4-32.1,18.2-43.8l43.8-43.8M1003,404.8c-3.1,0-6.3,1.2-8.7,3.6l-63.4,63.4c-39.8,39.8-39.8,104.4,0,144.2h0c19.9,19.9,46,29.9,72.1,29.9s52.2-10,72.1-29.9h0c39.8-39.8,39.8-104.4,0-144.2l-63.4-63.4c-2.4-2.4-5.5-3.6-8.7-3.6h0Z"/>
</svg>
  `;

  return `data:image/svg+xml;base64,${btoa(svg)}`;
}
function calculateDirection(prev, next) {
  const toRadians = (degrees) => degrees * (Math.PI / 180);
  const deltaLng = toRadians(next[0] - prev[0]);
  const prevLatRad = toRadians(prev[1]);
  const nextLatRad = toRadians(next[1]);

  const y = Math.sin(deltaLng) * Math.cos(nextLatRad);
  const x =
    Math.cos(prevLatRad) * Math.sin(nextLatRad) -
    Math.sin(prevLatRad) * Math.cos(nextLatRad) * Math.cos(deltaLng);

  return Math.atan2(y, x); // Direction in radians
}
function getDistance(coord1, coord2) {
  const R = 6371000; // Earth's radius in meters
  const lat1 = (coord1[1] * Math.PI) / 180;
  const lat2 = (coord2[1] * Math.PI) / 180;
  const deltaLat = ((coord2[1] - coord1[1]) * Math.PI) / 180;
  const deltaLon = ((coord2[0] - coord1[0]) * Math.PI) / 180;

  const a =
    Math.sin(deltaLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(deltaLon / 2) ** 2;

  return R * (2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))); // Distance in meters
}

function findClosestPoint(busCoord, routeCoords) {
  let minDist = Infinity,
    closestIndex = 0;

  routeCoords.forEach((coord, index) => {
    let dist = Math.hypot(coord[0] - busCoord[0], coord[1] - busCoord[1]);
    if (dist < minDist) {
      minDist = dist;
      closestIndex = index;
    }
  });
  return closestIndex;
}
