var rasterLayer,
  coordinates,
  markers,
  stations,
  absoluteTime = false,
  tempMarkersSource,
  stationList = {},
  latitude,
  longitude,
  lines,
  map,
  busVectorLayer,
  busStationLayer,
  busObject,
  busMarker = [],
  busImageData,
  setSheetHeight,
  busAge,
  routesStations,
  isArrivalsOpen = false,
  interval,
  busUpdateInterval,
  arrivalsUpdateInterval,
  intervalBusk;

window.onerror = errorReturn;
window.addEventListener("unhandledrejection", errorReturn);
function errorReturn(message, source, lineno, colno, error) {
  let errorBar = document.querySelector(".errorMessage");
  if (!errorBar) errorBar = addElement("div", document.body, "errorMessage");
  errorBar.innerHTML = `
    <mdui-icon>error</mdui-icon>
    <div><span>Zgodila se je napaka.</span>
    <span class="errorDetails">Napako so povzročili napačni podatki na LPP / IJPP.</span></div>
  `;
  setTimeout(() => {
    errorBar.style.top = "20px";
  }, 100);
  console.error(error);
  setTimeout(() => {
    errorBar.style.top = "-150px";
    setTimeout(() => {
      errorBar.remove();
    }, 800);
  }, 5000);
  return true; // return true to suppress default browser error alert
}
function addElement(tag, parent, className, ...attrs) {
  const element = document.createElement(tag);

  if (className) {
    element.classList.add(className);
  }

  // Set additional attributes
  for (const attr of attrs) {
    const [key, ...rest] = attr.split("=");
    const value = rest.join("=").trim();
    if (key && value !== undefined) {
      element.setAttribute(key.trim(), value);
    }
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
      const extractText = (htmlString) => {
        return htmlString
          .replace(/<span style="display:none;">.*?<\/span>/g, "")
          .replace(/<[^>]*>/g, "");
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

  map.on("click", function (evt) {
    var feature = map.forEachFeatureAtPixel(evt.pixel, function (feat, layer) {
      return feat;
    });

    if (feature && feature.get("name")) {
      var coordinate = feature.getGeometry().getCoordinates(); //default projection is EPSG:3857 you may want to use ol.proj.transform

      let prevPopup = document.querySelector("#popup");
      if (prevPopup) {
        prevPopup.remove();
      }
      const container = addElement("div", document.body, "ol-popup");
      container.id = "popup";

      const pop = addElement("div", container);
      pop.id = "pop";

      const content = addElement("div", pop);
      content.id = "popup-content";

      const bubbleImg = addElement("div", container, "bubbleImg");
      bubbleImg.id = "bubbleImg";

      var popup = new ol.Overlay({
        element: container,
        positioning: "bottom-left", // controls anchor position+
        autoPanAnimation: {
          duration: 250,
        },
      });
      map.addOverlay(popup);
      fetch("assets/images/bubble.svg")
        .then((r) => r.text())
        .then((svg) => {
          bubbleImg.innerHTML = svg;
          bubbleImg.querySelectorAll(".st0")[0].style.fill =
            "RGB(" + feature.get("color") + ")";
          bubbleImg.querySelectorAll(".st0")[1].style.fill =
            "RGB(" + feature.get("color") + ")";
        });

      pop.style.background = "RGB(" + feature.get("color") + ")";
      container.style.display = "none";
      content.innerHTML =
        "<mdui-icon name=directions_bus--outlined></mdui-icon>" +
        feature.get("name");
      content.style.color = "RGB(" + feature.get("txtColor") + ")";
      popup.setPosition(coordinate);

      container.style.display = "block";
      map.getView().animate({
        center: coordinate,
        duration: 500,
      });

      container.onclick = async function () {
        clearInterval(interval);
        clearInterval(arrivalsUpdateInterval);
        clearInterval(busUpdateInterval);
        document.querySelector("#busDataIks").click();
        if (document.querySelector(".arrivalsHolder"))
          document.querySelector(".arrivalsHolder").remove();
        let aos = document.querySelector(".arrivalsOnStation");
        let lnt = document.querySelector(".lineTimes");
        if (aos) {
          aos.style.transform = "translateX(-100vw) translateZ(1px)";
        }
        if (lnt) {
          lnt.style.transform = "translateX(-100vw) translateZ(1px)";
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
  });
  map.once("postrender", function (event) {
    document.querySelector("#map").style.opacity = "1";
  });
  map.on("click", function (evt) {
    const feature = map.forEachFeatureAtPixel(evt.pixel, function (feature) {
      return feature;
    });

    if (feature && feature.busId) {
      document.querySelector(".arrivalsOnStation").style.transform =
        "translateX(-100vw) translateZ(1px)";
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
  loadFromGuthub();

  let sht = makeBottomSheet(null, 98);

  let bava = "";
  sht.innerHTML = `
<div class="searchContain">
  <mdui-text-field clearable class="search" value="${bava}" placeholder="Išči"
    ><mdui-symbol>search</mdui-symbol></mdui-text-field
  >
</div>
</mdui-circular-progress>
<mdui-tabs
full-width
  placement="top"
  value="tab-1"
  class="tabs"
  id="tabsFav"
  ><mdui-tab value="tab-1">Priljubljeno</mdui-tab
  ><mdui-tab value="tab-2">V bližini</mdui-tab>
  <mdui-tab-panel
    slot="panel"
    value="tab-1"
    class="favouriteStations"
  ></mdui-tab-panel>
  <mdui-tab-panel
    slot="panel"
    value="tab-2"
    class="listOfStations"
  ></mdui-tab-panel
></mdui-tabs>
   `;

  let search = this.document.querySelector(".search");
  search.addEventListener("input", delayedSearch);
  search.addEventListener(`focus`, () => search.select());
  absoluteTime = localStorage.getItem("time") ? true : false;
  document.querySelector(".navigationBar").value = agency;
  document.body.classList.add(agency);
  document.documentElement.classList.add(agency);

  createBuses();
  const script = document.createElement("script");
  script.src = "https://cdn.jsdelivr.net/npm/ol@v10.5.0/dist/ol.js";
  script.onload = makeMap;
  document.head.appendChild(script);
  const script2 = document.createElement("script");
  script2.async = true; // load asynchronously
  script2.src =
    "https://maps.googleapis.com/maps/api/js?key=AIzaSyCGnbK8F2HvhjqRrKo3xogo4Co7bitNwYA&libraries=places&region=SI&language=sl&apiOptions=MCYJ5E517XR2JC";

  document.head.appendChild(script2);
});
function loadFromGuthub() {
  function getQueryParam(name) {
    const params = new URLSearchParams(window.location.search);
    return params.get(name);
  }

  const migratedDataStr = getQueryParam("migratedData");

  if (migratedDataStr && !localStorage.getItem("agency")) {
    console.log("Loading migrated data from URL query parameter");

    try {
      const dataObj = JSON.parse(decodeURIComponent(migratedDataStr));
      // Restore each key to localStorage
      Object.entries(dataObj).forEach(([key, value]) => {
        localStorage.setItem(key, value);
      });
      // Optionally clean URL to remove query params after loading
      history.replaceState(null, "", window.location.pathname);
    } catch (e) {
      console.error("Failed to parse migrated data", e);
    }
  }
}

async function changeAgency(agencyClicked) {
  document.documentElement.classList.remove(agency);
  if (agency == agencyClicked) return;
  agency = agencyClicked;
  localStorage.setItem("agency", agencyClicked);

  document.querySelector(".favouriteStations").innerHTML = "";
  document.querySelector(".listOfStations").innerHTML = "";
  document.documentElement.classList.add(agency);
  createBuses();
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
let popup2;
function showStationOnMap(latitude, longitude, name) {
  let coordinate = ol.proj.fromLonLat([longitude, latitude]);

  map.getView().animate({
    center: ol.proj.fromLonLat([longitude, latitude]),
    duration: 0,
    zoom: 16,
  });
  const container = addElement("div", document.body, "ol-popup");
  container.id = "popup";

  const pop = addElement("div", container);
  pop.id = "pop";

  const content = addElement("div", pop);
  content.id = "popup-content";

  const bubbleImg = addElement("div", container, "bubbleImg");
  bubbleImg.id = "bubbleImg";

  popup2 = new ol.Overlay({
    element: container,
    positioning: "bottom-left", // controls anchor position+
    autoPanAnimation: {
      duration: 1000,
    },
  });
  let color =
    "RGB(" +
    getComputedStyle(document.documentElement).getPropertyValue(
      "--mdui-color-primary"
    ) +
    ")";
  map.addOverlay(popup2);
  fetch("assets/images/bubble.svg")
    .then((r) => r.text())
    .then((svg) => {
      bubbleImg.innerHTML = svg;
      bubbleImg.querySelectorAll(".st0")[0].style.fill = color;
      bubbleImg.querySelectorAll(".st0")[1].style.fill = color;
    });
  pop.style.background = color;
  container.style.display = "none";

  content.innerHTML =
    "<mdui-icon name=directions_bus--outlined></mdui-icon>" + name;
  popup2.setPosition(coordinate);
  setTimeout(() => {
    container.style.display = "block";
    map.getView().animate({
      center: coordinate,
      duration: 500,
    });
  }, 1000);
}
async function createBuses() {
  await getLocation();
  makeSkeleton(document.querySelector(".favouriteStations"), "65");
  await updateStations();
  if (agency == "lpp") {
    busImageData = await fetch(
      "https://mestnipromet.cyou/tracker/js/json/images.json"
    );
    absoluteTime = localStorage.getItem("time") ? true : false;

    busImageData = await busImageData.json();
    lines = await fetchData("https://lpp.ojpp.derp.si/api/route/routes");
    busAge = await (await fetch("assets/js/busAge.json")).json();
  }
}
async function showStreetView(latitude, longitude, btn) {
  if (btn) btn.setAttribute("loading", "");
  let apiKey = "AIzaSyCGnbK8F2HvhjqRrKo3xogo4Co7bitNwYA";
  const camera = await getStreetViewCameraLocation(latitude, longitude, apiKey);

  if (!camera) {
    alert("Street View not available for this station.");
    return;
  }

  const heading = computeHeading(camera.lat, camera.lng, latitude, longitude);

  var iframe = addElement("iframe", document.body, "streetView");
  iframe.src = `https://www.google.com/maps/embed/v1/streetview?key=${apiKey}&location=${camera.lat},${camera.lng}&heading=${heading}&pitch=0&fov=90`;

  let iks = addElement("mdui-button-icon", null, "iks", "icon=close");
  iks.classList.add("closeStreetView");
  iks.addEventListener("click", function (event) {
    event.stopPropagation();
    iframe.remove();
    iks.remove();
  });
  iframe.addEventListener("load", function () {
    setTimeout(() => {
      document.body.appendChild(iks);
      iframe.style.animation = "show 0.4s forwards";
      if (btn) btn.removeAttribute("loading");
    }, 400);
  });
}
function computeHeading(lat1, lng1, lat2, lng2) {
  const dLon = ((lng2 - lng1) * Math.PI) / 180;
  const y = Math.sin(dLon) * Math.cos((lat2 * Math.PI) / 180);
  const x =
    Math.cos((lat1 * Math.PI) / 180) * Math.sin((lat2 * Math.PI) / 180) -
    Math.sin((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.cos(dLon);
  const brng = (Math.atan2(y, x) * 180) / Math.PI;
  return (brng + 360) % 360;
}
async function getStreetViewCameraLocation(stopLat, stopLng, apiKey) {
  const url = `https://maps.googleapis.com/maps/api/streetview/metadata?location=${stopLat},${stopLng}&key=${apiKey}`;
  const res = await fetch(url);
  const data = await res.json();

  if (data.status === "OK") {
    return { lat: data.location.lat, lng: data.location.lng };
  } else {
    console.warn("No Street View found at this location.");
    return null;
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
async function refresh(btn) {
  if (btn) btn.setAttribute("loading", "");
  if (checkVisible(document.querySelector(".arrivalsOnStation"))) {
    await refreshMyBus();
  } else if (checkVisible(document.querySelector("#arrivals-panel"))) {
    let arH = document.querySelector(".arrivalsScroll");
    arH.style.transform = "translateX(0px) translateY(-20px)";
    arH.style.opacity = "0";
    await showArrivals(null, isArrivalsOpen.ref_id);
    arH = document.querySelector(".arrivalsScroll");
    arH.style.transform = "translateX(0px) translateY(0px)";
    arH.style.opacity = "1";
  } else if (checkVisible(document.querySelector("#tabsFav"))) {
    let tabsFav = document.querySelector("#tabsFav > mdui-tab-panel[active]");

    tabsFav.innerHTML = "";
    makeSkeleton(tabsFav, "130");

    await getLocation();
    await updateStations(true);
    await createStationItems();
  } else {
  }
  if (btn) btn.removeAttribute("loading");
}
function makeSkeleton(container, height = 100) {
  for (let i = 0; i < 10; i++) {
    let arrivalItem = addElement(
      "div",
      container,
      "",
      "class=arrivalItem skeleton"
    );
    arrivalItem.style.height = height + "px";
    arrivalItem.style.animationDelay = "0.3" + i + "s";
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
async function getDirections() {
  let container = addElement(
    "div",
    document.querySelector(".mainSheet"),
    "directions"
  );
  getLocation();
  container.classList.add("arrivalsScroll");
  setTimeout(() => {
    container.style.transform = "translateX(0vw) translateZ(1px)";
    container.style.opacity = "1";
  }, 1);

  let iks = addElement(
    "mdui-button-icon",
    container,
    "iks",
    "icon=arrow_back_ios_new"
  );
  iks.addEventListener("click", function () {
    container.style.transform = "translateX(100vw) translateZ(1px)";
    setTimeout(() => {
      container.remove();
    }, 500);
  });
  const resultsElement = addElement("div", container, "placeResults");
  const debouncedShowPlaceDebounce = debounce(debouncedShowPlace, 200);
  let depart = addElement(
    "mdui-text-field",
    container,
    "locationInput",
    "end-icon=adjust",
    "id=departLocation",
    "label=Začetna lokacija"
  );
  depart.addEventListener(`focus`, () => depart.select());
  var departLocation = new google.maps.LatLng(latitude, longitude);
  geocodeLatLng(latitude, longitude)
    .then((result) => {
      depart.value = result[0];
      departLocation = { place: { location: result[1] } };
    })
    .catch((error) => {
      console.error(error);
    });
  depart.addEventListener("input", () => {
    debouncedShowPlaceDebounce(depart);
  });
  let arrive = addElement(
    "mdui-text-field",
    container,
    "locationInput",
    "end-icon=place--outlined",
    "id=arriveLocation",
    "label=Končna lokacija"
  );
  arrive.addEventListener(`focus`, () => arrive.select());
  var arriveLocation;
  arrive.addEventListener("input", async () => {});

  arrive.addEventListener("input", () => {
    debouncedShowPlaceDebounce(arrive);
  });
  const request = {
    region: "sl",
    input: "",
    sessionToken: new google.maps.places.AutocompleteSessionToken(),
    language: "sl-SI",
    includedRegionCodes: ["SI"],
    locationBias: new google.maps.LatLng(latitude, longitude),
    origin: { lat: latitude, lng: longitude },
  };
  container.addEventListener("click", (e) => {
    if (!e.target.classList.contains("placeResult")) {
      resultsElement.style.opacity = "0";
      resultsElement.style.scale = ".9";
    }
  });
  async function debouncedShowPlace(element) {
    resultsElement.innerHTML = "";

    resultsElement.style.top = element.offsetTop + element.offsetHeight + "px";
    resultsElement.style.opacity = "0";
    resultsElement.style.scale = ".9";

    request.input = element.value;
    if (element.value.includes("post")) {
      request.includedPrimaryTypes = ["bus_station", "bus_stop"];
      request.input = element.value
        .replace(/\bpostaja\w*|\bpost\w*/gi, "")
        .replace(/\s+/g, " ")
        .trim();
    } else {
      request.includedPrimaryTypes = null;
    }
    const { suggestions } =
      await google.maps.places.AutocompleteSuggestion.fetchAutocompleteSuggestions(
        request
      );

    suggestions.forEach((suggestion, i) => {
      const placePrediction = suggestion.placePrediction;
      const listItem = addElement("li", resultsElement, "placeResult");
      let scndTxt = placePrediction.secondaryText
        .toString()
        .replace(", Slovenija", "")
        .replace("Slovenija", "");
      let iconHtml;

      if (placePrediction.types.toString().includes("bus")) {
        iconHtml = "<mdui-icon name=directions_bus--outlined></mdui-icon>";
      } else if (placePrediction.types.includes("lodging")) {
        iconHtml = "<mdui-icon name=hotel--outlined></mdui-icon>";
      } else if (placePrediction.types.includes("store")) {
        iconHtml = "<mdui-icon name=shopping_bag--outlined></mdui-icon>";
      } else if (placePrediction.types.includes("food")) {
        iconHtml = "<mdui-icon name=restaurant--outlined></mdui-icon>";
      } else if (placePrediction.types.includes("bar")) {
        iconHtml = "<mdui-icon name=local_bar--outlined></mdui-icon>";
      } else {
        iconHtml = "<mdui-icon name=place--outlined></mdui-icon>";
      }

      listItem.innerHTML = `
    ${iconHtml}
        <span class="placeName">${placePrediction.mainText}</span>
        ${scndTxt == "" ? "" : `<span class="placeAddress">${scndTxt}</span>`}
        
      `;
      addElement("mdui-ripple", listItem);
      if (i !== suggestions.length - 1) {
        addElement("mdui-divider", resultsElement);
      }
      listItem.addEventListener("click", async () => {
        element.value = placePrediction.text.text;
        let place = placePrediction.toPlace();
        place = await place.fetchFields({
          fields: ["location"],
        });
        if (element.id == "departLocation") {
          departLocation = place;
        } else {
          arriveLocation = place;
        }

        resultsElement.style.opacity = "0";
        resultsElement.style.scale = ".9";
        setTimeout(() => {
          resultsElement.innerHTML = "";
        }, 300);
      });
    });
    resultsElement.style.opacity = "1";
    resultsElement.style.scale = "1";
  }
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
    let lppChip = addElement("mdui-chip", chipsHolder, "chip", "selectable");
    lppChip.innerHTML = key;
    lppChip.selected = agencies[key];
    lppChip.addEventListener("change", () => {
      if (lppChip.selected == true) {
        agencies[key] = true;
      } else {
        agencies[key] = false;
      }
    });
  }
  let timeHolder = addElement("div", container, "timeHolder");
  var inputLeave = addElement(
    "mdui-text-field",
    timeHolder,
    "timeInput",
    "type=datetime-local",
    "label=Odhod",
    "end-icon=logout"
  );
  inputLeave.value = new Date(Date.now()).toISOString().split("T")[0];
  inputLeave.addEventListener("click", () => {
    inputLeave.shadowRoot.querySelector("div > div > input").showPicker();
  });
  var inputArrive = addElement(
    "mdui-text-field",
    timeHolder,
    "timeInput",
    "type=datetime-local",
    "label=Prihod",
    "end-icon=login"
  );
  inputArrive.value = new Date(Date.now()).toISOString().split("T")[0];
  inputArrive.addEventListener("click", () => {
    inputArrive.shadowRoot.querySelector("div > div > input").showPicker();
  });
  var goButton = addElement("mdui-button", container, "goButton");
  goButton.innerHTML = "Pokaži pot";

  let panel = addElement("div", container, "panel");
  goButton.addEventListener("click", async () => {
    console.log(panel);
    panel = await clearElementContent(panel);

    if (depart.value !== "" && arrive.value !== "") {
      console.log(departLocation, arriveLocation);

      calcRoute(
        departLocation,
        arriveLocation,
        panel,
        agencies,
        new Date(inputLeave.value),
        new Date(inputArrive.value)
      );
      localStorage.agencije = JSON.stringify(agencies);
      console.log(agencies);
    } else {
      panel.innerHTML = "Izberite obe lokaciji.";
    }
  });
}
function calcRoute(start, end, panel, agencies, leave, arrive) {
  var directionsService = new google.maps.DirectionsService();
  var directionsRenderer = new google.maps.DirectionsRenderer();
  console.log(start.location, end.place.location);

  var directions;
  var request = {
    origin: start.place.location,
    destination: end.place.location,
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
        addElement("mdui-ripple", routeDiv);
        console.log(route);

        for (const step of route.legs[0].steps) {
          console.log(step);
          if (step.travel_mode == "WALKING") {
            routeDiv.innerHTML +=
              "<div class=busHolder><mdui-icon name=directions_walk></mdui-icon><span class=textMin>" +
              step.duration.text.replace(" min", "") +
              "</span></div><mdui-icon name=chevron_right></mdui-icon>";
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
              "</div><mdui-icon name=chevron_right></mdui-icon>";
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
  let d = addElement("mdui-divider", panel);
  d.style.marginBottom = "15px";
  if (dir.departure_time) {
    let startTime = addElement(
      "div",
      panel,
      "stepDiv",
      "style=margin-top: 0px;padding-top: 0px;padding-bottom: 0px;margin-bottom: 0px;"
    );
    startTime.innerHTML =
      "<mdui-icon name=alarm></mdui-icon>Začnite ob " + dir.departure_time.text;
  }

  let startDuration = addElement(
    "div",
    panel,
    "stepDiv",
    "style=margin-top: 10px;padding-top: 0px;padding-bottom: 0px;margin-bottom: 0px"
  );
  startDuration.innerHTML =
    "<mdui-icon name=schedule></mdui-icon>Potovali boste " + dir.duration.text;

  let transfersN = 0;

  dir.steps.forEach((step) => {
    if (step.transit) {
      // Increment for each transit step
      transfersN++;
    }
  });
  transfersN = transfersN - 1;
  if (transfersN > 0) {
    let transfers = addElement(
      "div",
      panel,
      "stepDiv",
      "style=margin-top: 10px;padding-top: 0px;padding-bottom: 0px;margin-bottom: 0px"
    );
    transfers.innerHTML =
      "<mdui-icon name=sync_alt></mdui-icon>Prestopili boste " +
      transfersN +
      "-krat";
  }
  let steps = addElement("div", panel, "stepsDir");
  for (const step of dir.steps) {
    let stepDiv = addElement("div", steps, "stepDiv");

    let icon = addElement("div", stepDiv, "stepIcon");
    let txtContent = addElement("div", stepDiv, "stepTextContent");
    if (step.travel_mode == "WALKING") {
      icon.innerHTML = "<mdui-icon name=directions_walk></mdui-icon>";
      txtContent.innerHTML += `<span class='stepText'>${step.instructions
        .replace(
          "se do",
          step.instructions.includes(", Slovenija") ? "se do" : "se do postaje"
        )
        .replace(
          /(postaje\s*)(.*)/,
          "$1<b>$2</b>"
        )}</span><div><span class='stepText'><mdui-icon name=schedule></mdui-icon>${
        step.duration.text
      }</span><span class='stepText'><mdui-icon name=distance></mdui-icon>${
        step.distance.text
      }</span></div>`;
      addElement("mdui-ripple", txtContent);
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
      }<mdui-icon name=chevron_right></mdui-icon>${
        step.transit.arrival_stop.name
      }</span><span class='stepText'>${
        step.transit.headsign +
        (step.transit.line.short_name
          ? ""
          : " (" + getCompany(step.transit.line.agencies[0].name) + ")")
      }</span><div><span class='stepText'><mdui-icon name=schedule></mdui-icon>${
        step.transit.departure_time.text
      } - ${step.transit.arrival_time.text}&nbsp;<b>•</b>&nbsp;${
        step.duration.text
      }</span></div><div><span class='stepText'><mdui-icon name=distance></mdui-icon>${
        step.distance.text
      }</span><span class='stepText'><mdui-icon name=timeline></mdui-icon>${getPostaj(
        step.transit.num_stops
      )}</span></div>`;
    }
  }
  if (dir.arrival_time) {
    let endTime = addElement(
      "div",
      panel,
      "stepDiv",
      "style=margin-top: 10px;padding-top: 0px;"
    );
    endTime.innerHTML =
      "<mdui-icon name=schedule></mdui-icon>Na cilju boste ob " +
      dir.arrival_time.text;
  }
  panel.style.opacity = "1";
  panel.style.transform = "translateY(0)";
  d.scrollIntoView({ behavior: "smooth", block: "start" });
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
  let a = sz ? "directions_railway" : "directions_bus--outlined";
  let agenc = adaptColorsDir(agency);
  const firstWord = agenc[0];
  return `<mdui-icon name=${a}></mdui-icon>
<div class="connectingLine"></div>
<img class="agencyLogo" style="background:${agenc[1]};" src="assets/images/logos_brezavta/${firstWord}">`;
}
function adaptColorsDir(agency) {
  switch (agency) {
    case "Javno podjetje Ljubljanski potniški promet d.o.o.":
      return ["IJPP:1118.svg", "rgb(32, 124, 76)"];
      break;
    case "Arriva d.o.o.":
      return ["IJPP:1123.svg", "rgb(36, 183, 199)"];
      break;
    case "Nomago d.o.o.":
      return ["IJPP:1119.svg", "rgb(0, 72, 154)"];
      break;
    case "Avtobusni promet Murska Sobota d.d.":
      return ["IJPP:1121.svg", "rgb(255, 255, 255)"];
      break;
    case "SŽ - Potniški promet, d.o.o.":
      return ["IJPP:1161.svg", "rgb(41, 172, 226)"];
      break;
    default:
      return ["IJPP:1118.svg", "rgb(32, 124, 76)"];
  }
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
        resolve([results[0].formatted_address, results[0].geometry.location]); // Resolving with address
      } else {
        reject("Geocoder failed or no results found");
      }
    });
  });
}
function makeBottomSheet() {
  let bottomSheet = addElement("div", document.body, "bottomSheet");
  let sheetContents = addElement("div", bottomSheet, "sheetContents");
  let draggableArea = addElement("div", bottomSheet, "handleHolder");

  addElement("div", draggableArea, "bottomSheetHandle");
  var sheetHeight;
  setSheetHeight = (value) => {
    sheetHeight = Math.max(0, Math.min(100, value));

    bottomSheet.style.transform = `translate3d(-50%,${
      100 - sheetHeight
    }dvh, 1px)`;
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
    const scrollList = document.querySelector(".directions")
      ? document.querySelector(".directions")
      : document.querySelector(".myBusDiv")
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
    if (sheetHeight < 35 && deltaY < 0) {
      deltaY = deltaY / formatNumber(y);
    }
    const deltaHeight = (deltaY / window.innerHeight) * 100;

    dragPosition = y;

    setSheetHeight(sheetHeight + deltaHeight);
  };
  const onDragEnd = () => {
    (document.querySelector(".directions")
      ? document.querySelector(".directions")
      : document.querySelector(".myBusDiv")
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
    bottomSheet.style.transition =
      "transform var(--transDur) cubic-bezier(0.41, 1.33, 0.22, 1)";
    if (sheetHeight > 65) {
      setSheetHeight(98);
    } else {
      setSheetHeight(40);
    }
    if (sheetHeight > sheetHeight3 + (100 - sheetHeight3) / 2) {
      setSheetHeight(98);
    }

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
    "all var(--transDur) cubic-bezier(0.38, 1.21, 0.22, 1)";
  setTimeout(() => {
    bottomSheet.style.transition = "";
  }, 400);

  minimizeSheet(98);

  sheetContents.appendChild(document.querySelector(".refresh"));
  sheetContents.appendChild(document.querySelector(".directionsButton"));
  return mainContent;
}
async function clearElementContent(element) {
  if (!(element instanceof Element)) {
    console.error("Provided argument is not a valid DOM element.");
    return element;
  }

  while (element.firstChild) {
    element.firstChild.remove();
  }
  element.innerHTML = "";
  // Replacing the element with a clone is expensive and often unnecessary.
  // This simpler version is much more performant.
  return element; // Return the original, now empty, element
}
function clearMap() {
  console.log("halo");

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
  try {
    document.getElementById("popup").remove();
  } catch {}
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
var agency = localStorage.getItem("agency")?.toLowerCase() || "lpp";
async function fetchData(url, arrivaType) {
  let data;
  if (agency !== "lpp") {
    data = await (await fetch(url)).json();
  } else {
    data = await (await fetch(url)).json();
    data = data.data;
  }
  return data;
}
const darkMode =
  window.matchMedia &&
  window.matchMedia("(prefers-color-scheme: dark)").matches;
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
  if (/[a-zA-Z]/.test(i)) color = darkenColor(color, 50);
  color = darkenColor(color, darkMode ? 0 : -50);
  let darkerColor = darkenColor(color, 70);

  return i.includes("N")
    ? `linear-gradient(320deg,rgb(0,0,0)15%,rgb(${color.join(",")})80%) `
    : `linear-gradient(165deg,rgb(${(darkMode ? color : darkerColor).join(
        ","
      )}),rgb(${(darkMode ? darkerColor : color).join(",")}))`;
};
const darkenColor = (rgbArray, amount) =>
  rgbArray.map((channel) =>
    Math.max(0, channel - (darkMode ? amount : amount * -0.7))
  );
function hexToRgb(hex) {
  const [, r, g, b] = hex
    .match(/^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i)
    .map((x) => parseInt(x, 16));
  return [r, g, b];
}
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
const apiAdapter = {
  /**
   * Fetches and adapts station data for the current agency.
   * @returns {Promise<Array>} A promise that resolves to an array of station objects in a unified format.
   */
  async getStations() {
    if (agency === "lpp") {
      const url =
        "https://lpp.ojpp.derp.si/api/station/station-details?show-subroutes=1";
      const data = await fetchData(url);
      // LPP data is already in the target format, just convert from object to array
      return Object.values(data);
    } else {
      // BrezAvta (BA) and other agencies
      const stopsUrl = "https://api.beta.brezavta.si/stops";
      const stops = await fetchData(stopsUrl);

      // The BA script pre-fetches a mapping of stops to routes, we do the same.
      if (!routesStations) {
        routesStations = await (
          await fetch("assets/js/stop_to_routes.json")
        ).json();
      }

      const filteredStops = stops.filter(
        (station) =>
          (station.gtfs_id.includes(agency.toUpperCase()) &&
            station.type === "BUS") ||
          (station.type === "RAIL" && agency === "sž")
      );

      // Adapt BA station data to the LPP format
      return filteredStops.map((station) => ({
        type: station.type,
        ref_id: station.gtfs_id,
        name: station.name,
        latitude: station.lat,
        longitude: station.lon,
        // Attempt to find associated routes for the station icon display
        route_groups_on_station: routesStations
          ? routesStations[station.gtfs_id.split(":")[1]] || []
          : [],
        gtfs_id: station.gtfs_id, // Keep original GTFS ID for BA-specific calls
      }));
    }
  },

  /**
   * Fetches and adapts arrival data for a specific station.
   * @param {string} stationId - The unique identifier for the station.
   * @returns {Promise<Object>} A promise that resolves to an object containing arrivals.
   */
  async getArrivals(stationId) {
    // The stationId for BA is the full gtfs_id, for LPP it's the numeric code.
    // The stationClick function passes the correct ID based on the agency.
    const id = stationId;

    if (agency === "lpp") {
      const url = `https://lpp.ojpp.derp.si/api/station/arrival?station-code=${id}`;
      const data = await fetchData(url);
      return data;
    } else {
      const url = `https://api.beta.brezavta.si/stops/${encodeURIComponent(
        id
      )}/arrivals?current=true`;
      const baArrivals = await fetchData(url);
      if (!baArrivals) return { arrivals: [], station: { code_id: id } };

      // Adapt BA arrival data to LPP format
      const adaptedArrivals = baArrivals.map((arrival) => {
        const eta = minutesFromNow(arrival.arrival_realtime, true);
        let type = 1; // 1 = Scheduled
        if (arrival.realtime) type = 0; // 0 = Realtime
        if (eta <= 0) type = 2; // 2 = Arrived/Departed

        return {
          route_name: arrival.route_short_name,
          trip_id: arrival.trip_id,
          eta_min: eta,
          type: type,
          depot: false, // BA API doesn't provide this
          stations: { arrival: arrival.trip_headsign },
          vehicle_id: arrival.vehicle_id,
          route_id: arrival.route_id,
          // Keep original BA data for extended functionality if needed
          _originalBA: arrival,
        };
      });
      return { arrivals: adaptedArrivals, station: { code_id: id } };
    }
  },

  /**
   * Fetches the full details for a specific trip/route.
   * @param {string} tripId - The ID of the trip.
   * @returns {Promise<Object>} A promise resolving to the route details.
   */
  async getRouteDetails(tripId) {
    if (agency === "lpp") {
      const url = `https://lpp.ojpp.derp.si/api/route/arrivals-on-route?trip-id=${tripId}`;
      const data = await fetchData(url);
      return data;
    } else {
      const url = `https://api.beta.brezavta.si/trips/${encodeURIComponent(
        tripId
      )}?date=${new Date().toISOString().slice(0, 10).replace(/-/g, "")}`;
      console.log(url);

      const data = await fetchData(url);
      console.log(data);
      /*const adaptedTrip = data.stop_times.map((arrival) => {
        return {
          bus_id: arrival.vehicle.id,
          latitude: arrival.lat,
          longitude: arrival.lon,
          trip_id: arrival.trip_id,
          direction: arrival.heading,
          // Keep original BA data for extended functionality if needed
          _originalBA: arrival,
        };
      });*/
      return data;
    }
  },

  /**
   * Fetches live vehicle locations for a given arrival.
   * @param {Object} arrival - The arrival object.
   * @returns {Promise<Array>} A promise resolving to an array of bus objects.
   */
  async getVehicleLocations(arrival) {
    if (agency === "lpp") {
      let response = await fetchData(
        "https://mestnipromet.cyou/api/v1/resources/buses/info"
      );
      let tempBusObject = response.filter(
        (bus) => bus.line_number == arrival.route_name
      );
      for (const i in tempBusObject) {
        for (const j in busImageData) {
          if (tempBusObject[i].bus_name.includes(busImageData[j].no)) {
            tempBusObject[i] = { ...tempBusObject[i], ...busImageData[j] };
          }
        }
      }
      return tempBusObject;
    } else {
      const url = `https://api.beta.brezavta.si/trips/${encodeURIComponent(
        arrival.trip_id
      )}/vehicles`;
      let data = await fetchData(url);
      const adaptedBuses = data.map((arrival) => {
        return {
          bus_id: arrival.vehicle.id,
          latitude: arrival.lat,
          longitude: arrival.lon,
          trip_id: arrival.trip_id,
          direction: arrival.heading,
          // Keep original BA data for extended functionality if needed
          _originalBA: arrival,
        };
      });
      return adaptedBuses;
    }
  },

  /**
   * Fetches the geometry (coordinates) for a given trip.
   * @param {Object} arrival - The arrival object.
   * @param {Array} stationsOnRoute - The list of stations on the route (for LPP fallback).
   * @returns {Promise<Array>} A promise resolving to an array of coordinates.
   */
  async getRouteGeometry(arrival, stationsOnRoute) {
    if (agency === "lpp") {
      let coordinates = await fetchData(
        `https://mestnipromet.cyou/api/v1/resources/buses/shape?trip_id=${arrival.trip_id}`
      );
      if (!coordinates || coordinates.length === 0) {
        let coords = "";
        for (const i in stationsOnRoute) {
          coords += `${stationsOnRoute[i].longitude},${stationsOnRoute[i].latitude};`;
        }
        const osrmUrl = `https://cors.proxy.prometko.si/https://router.project-osrm.org/route/v1/driving/${coords.slice(
          0,
          -1
        )}?overview=full&geometries=geojson`;
        const osrmResponse = await (await fetch(osrmUrl)).json();
        coordinates = osrmResponse.routes
          ? osrmResponse?.routes[0]?.geometry?.coordinates
          : null;
      }
      return coordinates;
    } else {
      const url = `https://api.beta.brezavta.si/trips/${encodeURIComponent(
        arrival.trip_id
      )}/geometry`;
      const geometryData = await fetchData(url);
      return geometryData.coordinates;
    }
  },

  /**
   * Fetches the list of stations for a given trip.
   * @param {Object} arrival - The arrival object.
   * @returns {Promise<Array>} A promise resolving to an array of station objects for the route.
   */
  async getStationsOnRoute(arrival) {
    if (agency === "lpp") {
      const url = `https://lpp.ojpp.derp.si/api/route/stations-on-route?trip-id=${arrival.trip_id}`;
      return await fetchData(url);
    } else {
      const url = `https://api.beta.brezavta.si/trips/${encodeURIComponent(
        arrival.trip_id
      )}?date=${new Date().toISOString().slice(0, 10).replace(/-/g, "")}`;
      const tripData = await fetchData(url);
      const adaptedBuses = tripData.stop_times.map((stop) => {
        return {
          name: stop.stop.name,
          station_code: stop.stop.gtfs_id,
          latitude: stop.stop.lat,
          longitude: stop.stop.lon,

          // Keep original BA data for extended functionality if needed
          _originalBA: stop,
        };
      });
      return adaptedBuses;
    }
  },
};
/**
 * Renders a list of stations based on various criteria.
 * @param {HTMLElement} parentElement - The DOM element to append the station items to.
 * @param {string} query - The search query string.
 * @param {boolean} filterByFavorites - If true, only shows stations from the user's favorites.
 */
function renderStationList(parentElement, query, filterByFavorites) {
  const search = query !== "";
  const favList = JSON.parse(localStorage.getItem("favouriteStations") || "[]");

  const nearby = {};

  if (latitude === 46.051467939339034) {
    parentElement.innerHTML =
      "<p><mdui-icon name=location_off></mdui-icon>Lokacija ni omogočena.</p>";
    // If filtering for favorites and there are none, show a message.
  }

  for (const stationId in stationList) {
    const station = stationList[stationId];
    const isFavorite = favList.includes(station.ref_id);

    // Continue to next station if it doesn't meet filter criteria
    if (
      search &&
      !normalizeText(station.name.toLowerCase()).includes(
        normalizeText(query.toLowerCase())
      )
    )
      continue;
    if (filterByFavorites && !isFavorite && !search) continue;
    if (!filterByFavorites && !search) {
      const distance = haversineDistance(
        latitude,
        longitude,
        station.latitude,
        station.longitude
      );
      if (distance >= 3) continue;
    }

    let item = addElement("mdui-card", null, "station", "clickable");
    let textHolder = addElement("div", item, "textHolder");
    textHolder.innerHTML = `<span class="stationName">${station.name}</span>`;

    const distance = haversineDistance(
      latitude,
      longitude,
      station.latitude,
      station.longitude
    );
    let cornot =
      station.ref_id % 2 !== 0
        ? '<div class=iconCenter><div class="centerHolder"><mdui-icon name=adjust--outlined class="center"></mdui-icon><span>V CENTER</span></div></div>'
        : "";
    let favIcon = isFavorite
      ? '<mdui-icon name=favorite--outlined class="iconFill"></mdui-icon>'
      : "";

    let distanceString =
      distance > 1
        ? `${distance.toFixed(1)} km`
        : `${Math.round(distance * 1000)} m`;

    textHolder.innerHTML += `${cornot}<span class="stationDistance">${favIcon}${distanceString}</span>`;
    nearby[distance.toFixed(5)] = item;
    if (agency === "lpp") {
      let buses = addElement("div", item, "buses");
      for (const bus of station.route_groups_on_station) {
        buses.innerHTML += `<div class=busNo style="background:${lineColors(
          bus
        )}" id="bus2_${bus}">${bus}</div>`;
      }
      item.appendChild(buses);
    }

    item.addEventListener("click", () => stationClick(stationId));
  }

  const sortedItems = Object.keys(nearby)
    .sort((a, b) => a - b)
    .map((key) => nearby[key]);

  if (sortedItems.length > 40) sortedItems.length = 40; // More efficient than splice

  for (const stationItem of sortedItems) {
    parentElement.appendChild(stationItem);
  }

  // Handle line search results
  if (search && agency === "lpp") {
    for (const line of lines) {
      console.log(line);

      if (
        normalizeText(line.route_name + line.route_number).includes(
          normalizeText(query.toLowerCase())
        )
      ) {
        let arrivalItem = addElement("div", parentElement, "arrivalItem");
        arrivalItem.style.order = line.route_number.replace(/\D/g, "") || "0";
        if (line.route_number.startsWith("N")) {
          arrivalItem.style.order = (
            parseInt(arrivalItem.style.order, 10) + 100
          ).toString();
        }

        let busNumberDiv = addElement("div", arrivalItem, "busNo2");
        busNumberDiv.style.background = lineColors(line.route_number);
        busNumberDiv.id = "bus_" + line.route_number;
        busNumberDiv.textContent = line.route_number;

        let arrivalDataDiv = addElement("div", arrivalItem, "arrivalData");
        addElement("span", arrivalDataDiv).textContent = line.route_name;
        addElement("mdui-ripple", arrivalItem);

        arrivalItem.addEventListener("click", () => {
          document.querySelector(".searchContain").style.transform =
            "translateX(-100vw) translateZ(1px)";
          document.getElementById("tabsFav").style.transform =
            "translateX(-100vw) translateZ(1px)";

          let line2 = { ...line, route_name: line.route_number };
          showBusById(line2, 60);
          setTimeout(() => {
            let busObject2 = busObject
              .map((obj) => ({ ...obj, vehicle_id: obj.bus_id }))
              .filter((element) => element.trip_id === line2.trip_id);
            getMyBusData(
              null,
              busObject2.length ? busObject2 : null,
              line2.trip_id,
              line2
            );
          }, 100);
        });
      }
    }
  }
  if (parentElement.childNodes.length === 0) {
    parentElement.innerHTML =
      "<p><mdui-icon name=favorite></mdui-icon>Nimate priljubljenih postaj.</p>";
    return; // Exit the function
  }
}

/**
 * Main function to create and update station lists.
 */
async function createStationItems() {
  const query = document.querySelector(".search").value;
  const search = query !== "";

  const list = document.querySelector(".listOfStations");
  const favList = document.querySelector(".favouriteStations");

  // Clear previous content
  await clearElementContent(list);
  await clearElementContent(favList);

  if (navigator.geolocation) {
    // Render favorites list
    renderStationList(favList, query, true);
    // Render nearby/search list
    if (!search) {
      renderStationList(list, query, false);
    } else {
      list.innerHTML = favList.innerHTML;
    }
  }
}
async function updateStations(t) {
  console.log(agency);
  if (agency == "lpp") {
    if (localStorage.getItem("stationList") && !t) {
      stationList = JSON.parse(localStorage.getItem("stationList"));
      setTimeout(async () => {
        stationList = await apiAdapter.getStations();
        localStorage.setItem("stationList", JSON.stringify(stationList));
      }, 1000);
    } else {
      stationList = await apiAdapter.getStations();
      localStorage.setItem("stationList", JSON.stringify(stationList));
    }
  } else {
    let stations = await apiAdapter.getStations();

    stationList = stations.filter((station) => {
      return (
        (station.gtfs_id.includes(agency.toUpperCase()) &&
          station.type == "BUS") ||
        (station.type == "RAIL" && agency == "sž")
      );
    });
  }

  createStationItems();
}
async function stationClick(stationa) {
  document.querySelector(".navigationBar").style.transform = "translateY(80px)";
  if (document.querySelector(".arrivalsOnStation")) return;
  let station = stationa ? stationList[stationa] : isArrivalsOpen;

  var container;

  var favList = JSON.parse(localStorage.getItem("favouriteStations") || "[]");
  console.log(stationa, station);
  window.history.pushState(
    null,
    document.title + " - " + station.name,
    location.pathname
  );
  container = addElement(
    "div",
    document.querySelector(".mainSheet"),
    "arrivalsHolder"
  );
  let infoBar = addElement(
    "div",
    document.querySelector(".mainSheet"),
    "infoBar"
  );
  createInfoBar(infoBar, station.ref_id);

  document.querySelector(".searchContain").style.transform =
    "translateX(-100vw) translateZ(1px)";
  document.getElementById("tabsFav").style.transform =
    "translateX(-100vw) translateZ(1px)";
  setTimeout(() => {
    container.style.transform = "translateX(0) translateZ(1px)";
  }, 0);

  const title = addElement("h1", container, "title");
  let holder = addElement("div", title);
  let iks = addElement(
    "mdui-button-icon",
    holder,
    "iks",
    "icon=arrow_back_ios_new"
  );
  iks.addEventListener("click", function () {
    window.history.replaceState(null, document.title, location.pathname);
    container.style.transform = "translateX(100vw) translateZ(1px)";
    document.querySelector(".infoBar").style.transform = "translateY(100%)";
    isArrivalsOpen = false;
    document.querySelector(".searchContain").style.transform =
      "translateX(0vw) translateZ(1px)";
    document.getElementById("tabsFav").style.transform =
      "translateX(0vw) translateZ(1px)";
    document.querySelector(".navigationBar").style.transform =
      "translateY(0px)";
    clearInterval(interval);
    setTimeout(() => {
      container.remove();
      document
        .querySelector(".listOfStations")
        .classList.remove("hideStations");
      document.querySelector(".infoBar").remove();
    }, 500);
    try {
      document.getElementById("popup").remove();
    } catch {}
  });

  let ttl = addElement("span", title, "titleText");
  let cornot = "";
  if (station.ref_id % 2 !== 0)
    cornot =
      '<div class=iconCenter><div class="centerHolder"><mdui-icon name=adjust--outlined class="center"></mdui-icon><span>V CENTER</span></div></div>';
  ttl.innerHTML = station.name + cornot;
  let hh = addElement("div", title, "titleHolder");
  var streetView = addElement(
    "mdui-button",
    infoBar,
    "streetViewBtn",
    "icon=360",
    "variant=tonal"
  );
  streetView.innerHTML = "Slika postaje";
  streetView.addEventListener("click", function () {
    showStreetView(station.latitude, station.longitude, streetView);
  });
  var fav = addElement(
    "mdui-button-icon",
    hh,
    "favi",
    "icon=favorite_border",
    "selectable",
    "selected-icon=favorite",
    favList.includes(station.ref_id) ? "selected" : ""
  );

  fav.addEventListener("click", function () {
    if (favList.includes(station.ref_id)) {
      favList = favList.filter((item) => item !== station.ref_id);
    } else {
      favList.push(station.ref_id);
    }
    localStorage.setItem("favouriteStations", JSON.stringify(favList));
  });
  var mapca = addElement("mdui-button-icon", hh, "mapca", "icon=swap_calls");
  mapca.addEventListener("click", function () {
    oppositeStation(station.ref_id);
  });

  if (station.ref_id % 2 === 0) {
    if (
      stationList.findIndex(
        (obj) => obj.ref_id === String(parseInt(station.ref_id) - 1)
      ) === -1
    ) {
      mapca.setAttribute("disabled", "");
    }
  } else {
    if (
      stationList.findIndex(
        (obj) => obj.ref_id === String(parseInt(station.ref_id) + 1)
      ) === -1
    ) {
      mapca.setAttribute("disabled", "");
    }
  }
  console.log(station.ref_id);

  var tabs = addElement("mdui-tabs", container, "tabs");
  tabs.outerHTML = `<mdui-tabs
  placement="top"
  value="tab-1"
  class="tabs"
  id="tabsStation"
  full-width
  ><mdui-tab value="tab-1">Prihodi</mdui-tab
  ><mdui-tab value="tab-2">Urnik</mdui-tab>
  <mdui-tab-panel
  class="arrivalsScroll"
    slot="panel"
    value="tab-1"
    
    id=arrivals-panel
  ></mdui-tab-panel>
  <mdui-tab-panel
    slot="panel"
    value="tab-2"
    class="timeTScroll arrivalsScroll"
    id=time-panel
  ></mdui-tab-panel
></mdui-tabs>`;
  let arrivalsScroll = document.getElementById("arrivals-panel");
  makeSkeleton(arrivalsScroll);
  let data = await apiAdapter.getArrivals(station.ref_id);

  let searchInput;
  if (agency === "lpp")
    showLines(document.getElementById("time-panel"), station);
  else searchInput = createSearchBar(container, data, station.ref_id);
  console.log(searchInput);

  showStationOnMap(station.latitude, station.longitude, station.name);

  isArrivalsOpen = station;

  showArrivals(data, station.ref_id, false);
  interval = setInterval(async () => {
    if (!document.querySelector(".myBusDiv")) {
      data = await apiAdapter.getArrivals(station.ref_id);
      if (searchInput && searchInput.value !== "") {
        showFilteredArrivals(searchInput.value, station.ref_id, data, true);
      } else {
        showArrivals(data, station.ref_id, true);
      }
    }
  }, 10000);
}
async function showArrivals(data, ref_id, repeated, stationRoute) {
  data = !data
    ? (await apiAdapter.getArrivals(ref_id)).arrivals
    : data.arrivals;
  let arrivalsScroll = document.getElementById("arrivals-panel");
  arrivalsScroll.innerHTML = "";
  console.log(data);

  if (data.length > 0) {
    let busTemplate = addElement("div", arrivalsScroll, "busTemplate");

    let listOfArrivals = [];
    if (agency === "lpp") nextBusTemplate(data, busTemplate, ref_id);
    data.sort((a, b) => {
      return parseInt(a.route_name) - parseInt(b.route_name);
    });
    let i = 0;
    for (const arrival of data) {
      if (arrival.eta_min > 120) continue;

      if (listOfArrivals.includes(arrival.route_name.replace(/ /g, ""))) {
        let arrivalTimeSpan = addElement(
          "span",
          arrivalsScroll.querySelector(
            "#eta_" + arrival.route_name.replace(/ /g, "")
          ),
          "arrivalTime"
        );
        if (arrival.type == 0) {
          arrivalTimeSpan.innerHTML =
            "<mdui-icon name=near_me--outlined style='animation-delay:" +
            randomOneDecimal() +
            "s;'></mdui-icon>" +
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
        if (arrival.depot)
          arrivalTimeSpan.innerHTML += "<span class=garaza>G</span>";

        arrivalTimeSpan = null;
      } else {
        let arrivalItem = addElement(
          "mdui-card",
          arrivalsScroll,
          "arrivalItem",
          "clickable"
        );
        if (repeated) {
          arrivalItem.style.opacity = "1";
          arrivalItem.style.transform = "translateX(0)";
          arrivalItem.style.animationDuration = "0s";
        }
        arrivalItem.style.animationDelay = "0." + i + "s";
        i++;
        if (agency == "lpp") {
          let busNumberDiv = addElement("div", arrivalItem, "busNo2");

          busNumberDiv.style.background = lineColors(arrival.route_name);

          busNumberDiv.id = "bus_" + arrival.route_name;
          busNumberDiv.textContent = arrival.route_name;
        } else {
          createBusNumber(arrival, arrivalItem, "0." + i + "5", repeated);
        }

        listOfArrivals.push(arrival.route_name.replace(/ /g, ""));
        let arrivalDataDiv = addElement("div", arrivalItem, "arrivalData");
        addElement("mdui-ripple", arrivalItem);
        let queryHeadSign;

        if (stationRoute) {
          queryHeadSign = `${
            stationRoute[
              agency == "lpp"
                ? arrival.route_name
                : arrival.route_id.split(":")[1]
            ]
          }<mdui-icon name=arrow_right--outlined class=arrow></mdui-icon>`;
        } else {
          queryHeadSign = "";
        }
        let tripNameSpan = addElement("span", arrivalDataDiv);
        tripNameSpan.innerHTML = queryHeadSign + arrival.stations.arrival;

        let etaDiv = addElement("div", arrivalDataDiv, "eta");
        etaDiv.id = "eta_" + arrival.route_name.replace(/ /g, "");

        let arrivalTimeSpan = addElement("span", etaDiv, "arrivalTime");
        if (arrival.type == 0) {
          arrivalTimeSpan.innerHTML =
            "<mdui-icon name=near_me--outlined style='animation-delay:" +
            randomOneDecimal() +
            "s;'></mdui-icon>" +
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
        if (arrival.depot)
          arrivalTimeSpan.innerHTML += "<span class=garaza>G</span>";
        arrivalItem.addEventListener("click", () => {
          showBusById(arrival, ref_id, data);
        });
      }
    }
  } else {
    arrivalsScroll.innerHTML +=
      "<p><mdui-icon name=no_transfer--outlined></mdui-icon>V naslednji uri ni predvidenih avtobusov.</p>";
  }
}
function createSearchBar(parent, data, station) {
  let searchInput = addElement(
    "mdui-text-field",
    null,
    "search",
    "icon=search--outlined"
  );
  searchInput.placeholder = "Išči izstopno postajo";
  searchInput.id = "searchRoutes";
  const debouncedShowArrivals = debounce(showFilteredArrivals, 500);

  searchInput.addEventListener("input", () => {
    debouncedShowArrivals(searchInput.value, station, data);
  });
  parent.insertBefore(searchInput, document.querySelector("#tabsStation"));
  return searchInput;
}
/**
 * Filters and displays arrivals based on a search query for station names.
 * This modern version uses the 'route_groups_on_station' array directly on station objects.
 *
 * @param {string} value - The search query for the station name.
 * @param {object} station - The primary station context (passed through to showArrivals).
 * @param {Array<object>} data - The complete list of arrival data to be filtered.
 * @param {boolean} noAnimation - Flag to disable animations in showArrivals.
 */
function showFilteredArrivals(value, station, data, noAnimation) {
  const query = value.trim().toLowerCase();

  // Exit if the query is empty
  if (!query) {
    // It might be useful to show all arrivals again if the query is cleared
    // showArrivals(data, station, noAnimation);
    return;
  }

  // 1. Find all stations that match the search query.
  const matchingStations = stationList.filter((s) =>
    s.name.toLowerCase().includes(query)
  );

  // 2. From these stations, create a map of which route number corresponds to which station name.
  //    This also gives us a unique set of all relevant route numbers.
  const routeToStationNameMap = {};
  for (const s of matchingStations) {
    for (const routeNumber of s.route_groups_on_station) {
      // We only store the name of the *first* station we find for a given route
      // to maintain consistency with the old function's behavior.
      if (!routeToStationNameMap[routeNumber]) {
        routeToStationNameMap[routeNumber] = s.name;
      }
    }
  }

  // Get a list of all unique route numbers from the map keys.
  const relevantRouteNumbers = Object.keys(routeToStationNameMap);

  // 3. Filter the main arrival data. An arrival is kept if its route number
  //    is in our list of routes from the matching stations.
  const filteredArrivals = data.arrivals.filter(
    (arrival) =>
      relevantRouteNumbers.includes(
        agency == "lpp" ? arrival.route_name : arrival.route_id.split(":")[1]
      ) // Assumes arrival objects have a 'route_number' property.
  );
  console.log(filteredArrivals, relevantRouteNumbers);
  // 4. Call the display function with the filtered data and the route-to-station mapping.
  showArrivals(
    { arrivals: filteredArrivals },
    station,
    noAnimation,
    routeToStationNameMap
  );
}
function minutesFromNow(dateOrSeconds, nothours) {
  const currentTime = new Date();

  // Determine if input is a number (assumed to be seconds since midnight)
  // Create a Date for today at midnight
  const midnight = new Date(currentTime);
  midnight.setHours(0, 0, 0, 0);

  // Add the seconds to get the target time
  let targetDate = new Date(midnight.getTime() + dateOrSeconds * 1000);

  const diff = targetDate - currentTime;
  const diffInMinutes = Math.round(diff / (1000 * 60));

  if (nothours) return diffInMinutes;

  if (diffInMinutes >= 60) {
    const hours = Math.floor(diffInMinutes / 60);
    const minutes = diffInMinutes % 60;
    return `${hours} h ${minutes} min`;
  }

  return minToTime(diffInMinutes);
}
const nextBusTemplate = (arrivals, parent, station_id) => {
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

    let arrivalItem = addElement(
      "mdui-card",
      parent,
      "arrivalItem",
      "clickable"
    );
    addElement("mdui-ripple", arrivalItem);
    arrivalItem.style.animationDelay = "0";
    arrivalItem.style.order = arrival.type === 2 ? 0 : arrival.eta_min;
    let busNumberDiv = addElement("div", arrivalItem, "busNo2");

    busNumberDiv.style.background = lineColors(arrival.route_name);

    busNumberDiv.id = "next_bus_" + arrival.route_name;
    busNumberDiv.textContent = arrival.route_name;
    addElement("mdui-ripple", busNumberDiv);
    let arrivalDataDiv = addElement("div", arrivalItem, "arrivalData");

    let tripNameSpan = addElement("span", arrivalDataDiv);
    tripNameSpan.textContent = arrival.stations.arrival;

    let etaDiv = addElement("div", arrivalDataDiv, "eta");
    etaDiv.id = "next_eta_" + arrival.route_name;

    let arrivalTimeSpan = addElement("span", etaDiv, "arrivalTime");

    if (arrival.type == 0) {
      arrivalTimeSpan.innerHTML =
        "<mdui-icon name=near_me--outlined style='animation-delay:" +
        randomOneDecimal() +
        "s;'></mdui-icon>" +
        minToTime(arrival.eta_min);
      arrivalTimeSpan.classList.add("arrivalGreen");
    } else if (arrival.type == 1) {
      arrivalTimeSpan.innerHTML = minToTime(arrival.eta_min);
    } else if (arrival.type == 2) {
      arrivalTimeSpan.innerHTML = "PRIHOD";
      arrivalTimeSpan.classList.add("arrivalRed");
    }
    if (arrival.depot)
      arrivalTimeSpan.innerHTML += "<span class=garaza>G</span>";
    arrivalItem.addEventListener("click", () => {
      showBusById(arrival, station_id, arrivals);
    });
    i++;
  }
};
function createBusNumber(arrival, arrivalItem, delay, noAnimation) {
  let routeName = arrival.route_name;
  if (agency !== "ijpp" && agency !== "sž") {
    let busNumberDiv = addElement("div", arrivalItem, "busNo2");

    busNumberDiv.style.background = lineToColor(
      parseInt(routeName.split(" ")[0].replace(/[^\d]/g, ""))
    );

    busNumberDiv.id = "bus_" + routeName;
    busNumberDiv.textContent = routeName;
    return;
  }
  let busHolder = addElement("div", arrivalItem, "busGoeey");
  let gooeyHolder = addElement("div", busHolder, "stepIcon");

  let imgHolder = addElement("div", gooeyHolder, "agencyLogo");
  let imgLogo = addElement("img", imgHolder, "agenImg");
  imgLogo.src =
    "assets/images/logos_brezavta/" + arrival._originalBA.agency_id + ".svg";
  imgHolder.style.background =
    "#" + adaptColors(arrival._originalBA.route_color_background);
  let busNumberDiv = addElement("div", gooeyHolder, "busNo2");

  busNumberDiv.style.background = lineToColor(
    parseInt(Math.max(...routeName.match(/\d+/g).map(Number)))
  );
  busNumberDiv.innerHTML += routeName;
}
function adaptColors(color) {
  return color.replace("0077BE", "fff").replace("FBB900", "00489a");
}
function lineToColor(i, no) {
  const primeJump = 137;
  const hue = (parseInt(i) * primeJump) % 360;

  // Base color in HSL
  const saturation = 70;
  const lightness = 55;
  let h = hue,
    s = saturation,
    l = lightness;

  // Convert HSL to RGB
  let color = hslToRgb(h, s, l);

  // Make a darker version for gradient end
  const darkerColor = darkenColor(color, 70);

  // Format RGB for CSS
  const rgb = color.join(",");
  const rgbDark = darkerColor.join(",");

  return no
    ? rgb.split(",")
    : `linear-gradient(165deg, rgb(${rgb}), rgb(${rgbDark}))`;
}
function hslToRgb(h, s, l) {
  s /= 100;
  l /= 100;

  const k = (n) => (n + h / 30) % 12;
  const a = s * Math.min(l, 1 - l);
  const f = (n) =>
    Math.round(
      255 * (l - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1))))
    );

  return [f(0), f(8), f(4)];
}
async function showLines(parent, station) {
  let data = await fetchData(
    "https://lpp.ojpp.derp.si/api/station/routes-on-station?station-code=" +
      station.ref_id
  );

  parent.style.transform = "translateX(0px) translateY(0px)";
  parent.style.opacity = "1";

  let i = 0;

  data.forEach((arrival) => {
    if (
      !parent.querySelector(
        "#bus_" + arrival.route_id + arrival.route_name?.replace(/\W/g, "_")
      ) &&
      !arrival.is_garage
    ) {
      let arrivalItem = addElement(
        "mdui-card",
        parent,
        "arrivalItem",
        "clickable",
        "id=bus_" + arrival.route_id + arrival.route_name?.replace(/\W/g, "_")
      );

      arrivalItem.style.animationDelay = "0." + i + "s";
      /* arrivalItem.style.order =
        arrival.route_number[0] == "N"
          ? arrival.route_number.replace(/\D/g, "") + 100
          : arrival.route_number.replace(/\D/g, "");*/
      const busNumberDiv = addElement(
        "mdui-button-icon",
        arrivalItem,
        "busNo2"
      );

      busNumberDiv.style.background = lineColors(arrival.route_number);

      busNumberDiv.id = "bus_" + arrival.route_number;
      busNumberDiv.textContent = arrival.route_number;
      const arrivalDataDiv = addElement("div", arrivalItem, "arrivalData");

      const tripNameSpan = addElement("span", arrivalDataDiv);
      tripNameSpan.textContent = arrival.route_group_name;
      arrivalItem.addEventListener("click", async () => {
        busNumberDiv.setAttribute("loading", "");
        await showLineTime(
          arrival.route_number,
          station.ref_id,
          arrival.route_group_name,
          arrival
        );
        document.querySelector(".arrivalsHolder").style.transform =
          "translateX(-100vw) translateZ(1px)";

        document.querySelector(".lineTimes").style.transform =
          "translateX(0px) translateZ(1px)";
        busNumberDiv.removeAttribute("loading");
      });
      i++;
    }
  });
}
async function showLineTime(routeN, station_id, routeName, arrival) {
  let container = addElement(
    "div",
    document.querySelector(".mainSheet"),
    "lineTimes"
  );
  let dir12 = station_id % 2 === 0 ? "1" : "2";

  container.classList.add("arrivalsScroll");

  let iks = addElement(
    "mdui-button-icon",
    null,
    "iks",
    "icon=arrow_back_ios_new"
  );

  iks.addEventListener("click", function () {
    window.history.replaceState(null, document.title, location.pathname);
    setTimeout(() => {
      container.remove();
    }, 500);
    container.style.transform = "translateX(100vw) translateZ(1px)";
    document.querySelector(".arrivalsHolder").style.transform =
      "translateX(0vw) translateZ(1px)";
  });

  let html = await (
    await fetch(
      "https://cors.proxy.prometko.si/https://www.lpp.si/sites/default/files/lpp_vozniredi/iskalnik/index.php?stop=" +
        station_id +
        "&lref=" +
        routeN
    )
  ).text();
  const doc = new DOMParser().parseFromString(html, "text/html");
  let matchedLineId = null;
  let stationId = null;
  let dir = null;
  let directionName;
  const wrappers = doc.querySelectorAll(".lineWrapper");

  wrappers.forEach((wrapper) => {
    const lineIdFromWrapper = wrapper.id.replace("line", "");
    const dirBlocks = wrapper.querySelectorAll(".line-dir-wrapper");

    dirBlocks.forEach((block) => {
      const lineFiles = block.querySelector(".lineFiles");
      if (!lineFiles) return;

      const stopCodeEl = lineFiles.querySelector(".stop-code");
      const lineNoEl = block.querySelector(".line-no");

      // Match by stop code and route number
      if (
        stopCodeEl?.textContent.trim() === station_id &&
        lineNoEl?.textContent.trim() === routeN
      ) {
        matchedLineId = lineIdFromWrapper;

        // ✅ Extract the direction name (e.g., "STANEŽIČE P+R")
        const directionStrong = block.querySelector("h3 strong:last-of-type");
        directionName = directionStrong?.textContent.trim() || "";

        const departuresBtn = block.querySelector(".btn.times");
        if (departuresBtn) {
          const onclick = departuresBtn.getAttribute("onclick");
          const match = onclick.match(
            /changeLineNavTab\(.*?,\s*'departures',\s*(\d+),\s*(\d+),\s*(\d+)\)/
          );
          if (match) {
            dir = match[1];
            matchedLineId = match[2]; // override from onclick if needed
            stationId = match[3];
          }
        }
      }
    });
  });

  await fetch(
    "https://cors.proxy.prometko.si/https://www.lpp.si/sites/default/files/lpp_vozniredi/iskalnik/js/departures.php",
    {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        lineId: matchedLineId,
        stopId: stationId,
        dir: dir,
      }),
    }
  )
    .then((response) => response.text()) // or .json() if the response is JSON
    .then(async (data) => {
      let tabs = addElement(
        "mdui-tabs",
        container,
        "tabs",
        "full-width",
        "value=tab-Del",
        "variant=secondary",
        "id=tabsTimes",
        "placement=top"
      );

      const parsedDoc = new DOMParser().parseFromString(data, "text/html");

      // Transform departures and get updated HTML string
      var dataObject = parseDepartures(parsedDoc.querySelector(".departures"));

      console.log(dataObject);
      if (Object.keys(dataObject).length == 0) {
        dataObject = await fetchData(
          `https://lpp.ojpp.derp.si/api/station/timetable?station-code=${station_id}&route-group-number=${routeN}&previous-hours=${hoursDay(
            0
          )}&next-hours=168`
        );

        dataObject = await dataObject.route_groups[0].routes.find(
          (route) => route.parent_name == routeName
        );
        dataObject = transformToDelavnikTimes(dataObject.timetable);
        console.log(dataObject);
      }
      for (const key in dataObject) {
        const day = dataObject[key];
        const onclicktab = directionName ? "" : "id=clickTab";
        tabs.innerHTML += `<mdui-tab ${onclicktab} value="tab-${key.slice(
          0,
          3
        )}">${key.replace(" ", "&nbsp;")}</mdui-tab>`;
        let tabPanel = addElement(
          "mdui-tab-panel",
          tabs,
          "mdui-tab-panel",
          "slot=panel",
          `value=tab-${key.slice(0, 3)}`
        );
        let arrivalItem = addElement(
          "div",
          tabPanel,
          "arrivalItem",
          "id=lineTimeIndicator"
        );
        arrivalItem.style.margin = "15px 0";
        let busNumberDiv = addElement("div", arrivalItem, "busNo2");
        busNumberDiv.style.background = lineColors(routeN);
        busNumberDiv.textContent = routeN;
        let tripNameSpan = addElement("span", arrivalItem);

        tripNameSpan.textContent = !directionName ? routeName : directionName;
        for (const times of day.times) {
          let arrivalItem = addElement("div", tabPanel, "arrivalItem");
          const busNumberDiv = addElement("div", arrivalItem, "busNo2");
          busNumberDiv.innerHTML = times[0][0].split(":")[0] + "<sub>h</sub>";
          const arrivalDataDiv = addElement("div", arrivalItem, "arrivalData");
          const etaDiv = addElement("div", arrivalDataDiv, "eta");
          const arrivalTimeSpan = addElement("span", etaDiv, "arrivalTime");

          times.forEach((time) => {
            arrivalTimeSpan.innerHTML += `<div><span class=timet>${time[0]}</span>${time[1]}</div>`;
          });
        }
        if (day.times.length == 0) {
          tabPanel.innerHTML += `<p><mdui-icon name=no_transfer--outlined></mdui-icon>V tem dnevu ni odhodov.</p>`;
        }
        for (const info of day.info) {
          let arrivalItem = addElement(
            "div",
            tabPanel,
            "arrivalItem",
            "id=infoItem"
          );
          const suffix = addElement(
            "span",
            arrivalItem,
            "timeSuffix",
            info[0] == "" ? "style=background:none;" : ""
          );
          suffix.innerHTML = info[0] == "" ? "!" : info[0];

          const infoSpan = addElement("span", arrivalItem, "arrivalTime");
          infoSpan.innerHTML = info[1];
        }
      }
      tabs.insertBefore(iks, tabs.firstChild);
      if (!directionName) {
        document.querySelector("#clickTab").click();
      }
    })
    .catch((error) => {
      console.error("Error:", error);
      tabs.innerHTML =
        "Zgodila se je napaka med pridobivanjem podatkov o odhodih.";
    });
}
async function createInfoBar(infoBar, station_id) {
  let changeTime = addElement(
    "mdui-segmented-button-group",
    infoBar,
    "changeTime",
    "selects=single",
    "value=" + (localStorage.getItem("time") ? "absolute" : "relative")
  );
  let absolut = addElement(
    "mdui-segmented-button",
    changeTime,
    "",
    "value=absolute"
  );
  absolut.innerHTML = minToTime(3, 1);
  let relativ = addElement(
    "mdui-segmented-button",
    changeTime,
    "",
    "value=relative"
  );
  relativ.innerHTML = "3 min";
  localStorage.getItem("time") == "relativ" || !localStorage.getItem("time")
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
  if (agency == "lpp") {
    let info = await fetchData(
      "https://lpp.ojpp.derp.si/api/station/messages?station-code=" + station_id
    );
    if (info.length !== 0) {
      let infoBtn = addElement(
        "mdui-button-icon",
        infoBar,
        "infoBtn",
        "icon=warning",
        "variant=tonal"
      );
      infoBtn.addEventListener("click", () => {
        alert(info.toString());
      });
    }
  }
  setTimeout(() => {
    infoBar.style.transform = "translateY(0)";
  }, 10);
  return infoBar;
}

function transformToDelavnikTimes(data) {
  const result = {
    Urnik: {
      times: [],
      info: [],
    },
  };

  const hoursMap = new Map();

  data.forEach((entry) => {
    const hourStr = String(entry.hour).padStart(2, "0");

    if (!hoursMap.has(hourStr)) {
      hoursMap.set(hourStr, []);
    }

    const group = hoursMap.get(hourStr);

    entry.minutes.forEach((minute) => {
      const minStr = String(minute).padStart(2, "0");
      group.push([`${hourStr}:${minStr}`, ""]);
    });
  });

  // Convert map values to ordered array
  result.Urnik.times = Array.from(hoursMap.values());

  return result;
}

function parseDepartures(departuresElement) {
  const tabLabels = ["Delavnik", "Sobota", "Nedelja, praznik"];
  const keys = ["Delavnik", "Sobota", "Nedelja, praznik"];
  const output = {};

  const allTabs = departuresElement.querySelectorAll("ul > li");
  let tabIndex = 0;

  allTabs.forEach((li) => {
    const btn = li.querySelector("button");
    if (!btn) return;

    const tabName = btn.textContent.trim();
    if (!tabLabels.includes(tabName)) return;

    const key = keys[tabIndex++];
    const hourBuckets = new Map();
    const info = [];

    const innerLis = li.querySelectorAll("ul > li");
    innerLis.forEach((innerLi) => {
      innerLi.querySelectorAll("span.time").forEach((span) => {
        const fullTime = span.querySelector("time")?.textContent.trim();
        if (fullTime) {
          const hourMatch = fullTime.match(/^(\d{2})/);
          if (hourMatch) {
            const hour = hourMatch[1];

            // Get all <i> tag contents and wrap each in <span class="timeSuffix">
            const iElements = span.querySelectorAll("i");
            const suffixHTML = Array.from(iElements)
              .map((i) => i.textContent.trim())
              .filter(Boolean)
              .map((text) => `<span class="timeSuffix">${text}</span>`)
              .join("");

            if (!hourBuckets.has(hour)) hourBuckets.set(hour, []);
            hourBuckets.get(hour).push([fullTime, suffixHTML]);
          }
        }
      });

      // Legend info
      const dl = innerLi.querySelector("dl.notes-legend");
      if (dl) {
        const dtList = dl.querySelectorAll("dt");
        const ddList = dl.querySelectorAll("dd");
        dtList.forEach((dt, i) => {
          const dtText = dt.textContent.trim();
          const ddText = ddList[i]?.textContent.trim();
          if (dtText || ddText) {
            info.push([dtText, ddText]);
          }
        });
      }
    });

    // Convert Map to sorted array of time arrays
    const times = [...hourBuckets.entries()]
      .sort((a, b) => Number(a[0]) - Number(b[0]))
      .map(([, timeList]) => timeList);

    output[key] = { times, info };
  });

  return output;
}

const delayedSearch = debounce(searchRefresh, 300);
function searchRefresh() {
  let query = document.querySelector(".search").value;
  if (query.includes("migrated")) {
    window.location.href = query;
    return;
  }
  createStationItems();
}
function hoursDay(what) {
  const now = new Date();
  const hoursFromMidnight = now.getHours() + now.getMinutes() / 60;
  const hoursToMidnight = 168;
  return what ? hoursToMidnight.toFixed(2) : hoursFromMidnight.toFixed(2);
}

const randomOneDecimal = () => +(Math.random() * 2).toFixed(1);

async function showBusById(arrival, station_id, arrivals) {
  window.history.pushState(null, document.title, location.pathname);
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
      "translateX(-100vw) translateZ(1px)";

    getMyBusData(null, arrivals, arrival.trip_id);
  }
}
async function getMyBusData(busId, arrivalsAll, tripId, line) {
  map.removeOverlay(popup2);

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

  let iks = addElement(
    "mdui-button-icon",
    myEtaHolder,
    "iks",
    "icon=arrow_back_ios_new",
    "id=busDataIks"
  );
  let myEtaChips = addElement("div", myEtaHolder, "myEtaChips");
  if (arrivals && arrivals.length > 1) {
    let i = 1;
    for (const arrival of arrivals) {
      let arTime = addElement(
        "mdui-button",
        myEtaChips,
        "arrivalTime",
        "variant=elevated"
      );
      arTime.innerHTML = arrival.eta_min
        ? minToTime(arrival.eta_min)
        : "Bus " + i;
      i++;
      arTime.busId = arrival.vehicle_id;
      addElement("mdui-ripple", arTime);
      arTime.addEventListener("click", function () {
        myEtaChips.querySelector(".selected").classList.remove("selected");
        arTime.classList.add("selected");

        clearInterval(intervalBusk);
        intervalBusk = null;
        let busek = busObject.find(
          (el) => el.bus_id == arrival.vehicle_id.toUpperCase()
        );
        document.querySelector(".myBusDiv").style.transform =
          "translateY(-20px)";
        document.querySelector(".myBusDiv").style.opacity = "0";
        clickedMyBus(busek, arrival.trip_id);
        intervalBusk = setInterval(() => {
          updateMyBus(busek, arrival.trip_id);
        }, 10000);
        window.refreshMyBus = async () => {
          await updateMyBus(busek, arrival.trip_id);
        };
      });
    }
    myEtaChips.firstElementChild.classList.add("selected");
  }
  let myBusDiv = document.querySelector(".myBusDiv")
    ? clearElementContent(document.querySelector(".myBusDiv"))
    : addElement("div", holder, "myBusDiv");
  myBusDiv = document.querySelector(".myBusDiv");

  iks.addEventListener("click", function () {
    holder.style.transform = "translateX(100vw) translateZ(1px)";
    clearInterval(intervalBusk);
    if (document.querySelector(".arrivalsHolder")) {
      document.querySelector(".arrivalsHolder").style.transform =
        "translateX(0vw) translateZ(1px)";
    } else {
      document.querySelector(".searchContain").style.transform =
        "translateX(0vw) translateZ(1px)";
      document.getElementById("tabsFav").style.transform =
        "translateX(0vw) translateZ(1px)";
    }
    clearMap();
    setTimeout(() => {
      clearElementContent(holder);
      setTimeout(() => {
        holder.remove();
      }, 100);
    }, 500);
  });

  if (arrivals || busId) {
    let bus =
      agency == "lpp"
        ? busObject.find(
            (el) =>
              el.bus_id ==
              (busId ? busId : arrivals[0].vehicle_id.toUpperCase())
          )
        : arrivals.find((arrival) =>
            busObject.some((bus) => bus.trip_id === arrival.trip_id)
          );

    if (agency == "lpp") {
      await clickedMyBus(bus, arrivals ? arrivals[0].trip_id : bus.trip_id);
    } else {
      await clickedMyBus(
        bus,
        bus ? bus.trip_id : arrivals[0].trip_id,
        arrivals[0]
      );
    }

    intervalBusk = setInterval(async () => {
      if (agency == "lpp") {
        await updateMyBus(bus, arrivals ? arrivals[0].trip_id : bus.trip_id);
      } else {
        await updateMyBus(
          bus,
          bus ? bus.trip_id : arrivals[0].trip_id,
          arrivals[0]
        );
      }
    }, 10000);
    window.refreshMyBus = async () => {
      if (agency == "lpp") {
        await updateMyBus(bus, arrivals ? arrivals[0].trip_id : bus.trip_id);
      } else {
        await updateMyBus(
          bus,
          bus ? bus.trip_id : arrivals[0].trip_id,
          arrivals[0]
        );
      }
    };

    return;
  } else {
    console.log("bus not found");

    stationsOnRoute(line, myBusDiv);
  }

  //get buse based on location (removed)
}
async function updateMyBus(bus, tripId) {
  let arOnS = await apiAdapter.getRouteDetails(tripId);
  let arrivalDataDiv = document.querySelector(".arrivalsOnStation");
  if (agency == "lpp") {
    let busData = busObject.find((el) => el.bus_id === bus.bus_id);

    if (document.startViewTransition) {
      document.startViewTransition(() => {
        clearElementContent(arrivalDataDiv);
        arrivalDataDiv = document.querySelector(".arrivalsOnStation");
        showArrivalsMyBus(arOnS, arrivalDataDiv, busData, bus.bus_id, 1);
      });
    } else {
      clearElementContent(arrivalDataDiv);
      arrivalDataDiv = document.querySelector(".arrivalsOnStation");
      showArrivalsMyBus(arOnS, arrivalDataDiv, busData, bus.bus_id, 1);
    }
  } else {
    arOnS = arOnS.stop_times;
    if (document.startViewTransition) {
      document.startViewTransition(() => {
        clearElementContent(arrivalDataDiv);
        arrivalDataDiv = document.querySelector(".arrivalsOnStation");
        showArrivalsMyBusBA(arOnS, arrivalDataDiv, arrival);
      });
    } else {
      clearElementContent(arrivalDataDiv);
      arrivalDataDiv = document.querySelector(".arrivalsOnStation");
      showArrivalsMyBusBA(arOnS, arrivalDataDiv, arrival);
    }
  }
}
async function clickedMyBus(bus, tripId, arrival) {
  console.log(bus);

  let busId = bus?.bus_id;
  let busData = busObject.find((el) => el.bus_id === busId);

  let myBusDiv = document.querySelector(".myBusDiv");
  let scrollPosition = myBusDiv.scrollTop;

  clearElementContent(myBusDiv);
  myBusDiv = document.querySelector(".myBusDiv");

  let arrivalItem = addElement("div", myBusDiv, "arrivalItem");
  arrivalItem.style.margin = "15px 0";
  if (agency == "lpp") {
    let busNumberDiv = addElement("div", arrivalItem, "busNo2");
    busNumberDiv.style.background = lineColors(busData.line_number);
    busNumberDiv.id = "bus_" + busData.line_number;
    busNumberDiv.textContent = busData.line_number;
  } else {
    createBusNumber(arrival, arrivalItem, 0);
  }

  let busDataDiv = addElement("div", myBusDiv, "busDataDiv");
  if (agency == "lpp") await createBusData(busData, busDataDiv);

  document.querySelector(".myBusHolder").style.opacity = "1";
  document.querySelector(".myBusHolder").style.transform =
    "translateX(0px) translateY(0px)";
  myBusDiv.scrollTop = scrollPosition ? scrollPosition : 0;
  myBusDiv.style.transform = "translateY(0px)";
  myBusDiv.style.opacity = "1";
  let arOnS = await apiAdapter.getRouteDetails(tripId);
  console.timeEnd("Execution Time");
  let tripName = arOnS.trip_headsign;
  if (agency != "lpp") {
    arOnS = arOnS.stop_times;
  } else {
    tripName = arOnS.find((station) => station?.arrivals?.length > 0)
      ?.arrivals[0]?.trip_name;
  }
  console.log(arOnS);
  let tripNameSpan = addElement("span", arrivalItem);
  tripNameSpan.textContent = tripName;
  let arrivalDataDiv = addElement("div", myBusDiv, "arrivalsOnStation");
  if (agency == "lpp") {
    showArrivalsMyBus(
      arOnS,
      arrivalDataDiv,
      agency == "lpp" ? busData : arrival,
      busId
    );
  } else {
    showArrivalsMyBusBA(arOnS, arrivalDataDiv, arrival);
  }

  try {
    markers
      .getSource()
      .getFeatures()
      .forEach((feature) => {
        const icon = feature.getStyle().getImage();

        let newIcon;

        if (feature.busId == busId) {
          newIcon = new ol.style.Icon({
            rotateWithView: true,
            anchor: [0.52, 0.5],
            anchorXUnits: "fraction",
            anchorYUnits: "fraction",
            src: "assets/images/bus_urb_sel.png",
            scale: 0.5,
            rotation: icon.getRotation(),
          });
        } else {
          newIcon = newIcon = new ol.style.Icon({
            rotateWithView: true,
            anchor: [0.52, 0.5],
            anchorXUnits: "fraction",
            anchorYUnits: "fraction",
            src: "assets/images/bus_urb.png",
            scale: 0.5,
            rotation: icon.getRotation(),
          });
        }
        feature.setStyle(new ol.style.Style({ image: newIcon }));
      });
  } catch (error) {
    console.error(error);
  }
}
let previusStation = 0;
function showArrivalsMyBus(info, container, arrival, busIdUp, update) {
  let holder = addElement("div", container, "arFlex");
  holder.style.display = "flex";
  console.log(arrival);

  let arHolder = addElement("div", holder, "arOnRoute");
  var listArrivals = {};
  let arrivalsColumns = addElement("div", holder, "arrivalsColumns");
  let isItYet = true;
  let o = 0;
  console.log(info);

  info.forEach((arrivalRoute, index) => {
    //vsaka postaja
    let arDiv = addElement("div", arHolder, "arrDiv");
    let lineStation = addElement("div", arDiv, "lineStation");

    lineStation.style.backgroundColor =
      "RGB(" +
      lineColorsObj[arrival.line_number.replace(/\D/g, "")].join(",") +
      ")";
    let lnimg = addElement("div", lineStation, "lineStationImg");

    if (index == 0 || index == info.length - 1) {
      index == 0
        ? lineStation.parentNode.classList.add("half-hidden-first")
        : lineStation.parentNode.classList.add("half-hidden");
      lnimg.style.backgroundColor =
        "RGB(" +
        lineColorsObj[arrival.line_number.replace(/\D/g, "")].join(",") +
        ")";
    } else {
      lnimg.style.backgroundColor =
        "RGB(" +
        darkenColor(
          lineColorsObj[arrival.line_number.replace(/\D/g, "")],
          50
        ).join(",") +
        ")";

      lnimg.style.borderColor =
        "RGB(" +
        lineColorsObj[arrival.line_number.replace(/\D/g, "")].join(",") +
        ")";
    }
    let nameStation = addElement("div", arDiv, "nameStation");
    nameStation.classList.add("nameStation_" + arrivalRoute.station_code);

    nameStation.innerHTML = arrivalRoute.name;

    arDiv.style.viewTransitionName = (arrivalRoute.name + arrivalRoute.order_no)
      .toLowerCase()
      .replace(/ /g, "_");
    let ar = arrivalRoute.arrivals.find(
      (el) => el.vehicle_id == busIdUp.toLowerCase()
    );

    try {
      if (!ar) {
        if (
          info[index - 1]?.arrivals?.find(
            (el) => el.vehicle_id == busIdUp.toLowerCase() && el.depot == 1
          ) &&
          !info[index]?.arrivals?.find(
            (el) => el.vehicle_id == busIdUp.toLowerCase()
          )
        ) {
          info[index] = info[index - 1];
          nameStation.innerHTML = "GARAŽA";
          lineStation.parentNode.classList.add("half-hidden");

          if (info.length !== index + 1) {
            isItYet = false;
            arDiv.style.display = "none";

            return;
          }
        }
        if (
          !info[index - 2]?.arrivals?.find(
            (el) => el.vehicle_id == busIdUp.toLowerCase()
          ) &&
          !info[index + 1]?.arrivals?.find(
            (el) => el.vehicle_id == busIdUp.toLowerCase()
          ) &&
          info[index + 2]?.arrivals?.find(
            (el) => el.vehicle_id == busIdUp.toLowerCase()
          ) &&
          isItYet
        ) {
          arDiv.style.top = "-50px";
          arDiv.style.position = "absolute";
          arDiv.style.opacity = "0";

          return;
        }
        if (
          info[index + 1]?.arrivals?.find(
            (el) => el.vehicle_id == busIdUp.toLowerCase()
          ) &&
          isItYet
        ) {
          nameStation.style.opacity = ".5";
          let col =
            lineColorsObj[arrival.line_number.replace(/\D/g, "")].join(",");
          lineStation.style.background = `linear-gradient(to top,RGB(${col}),transparent)`;
          lnimg.style.opacity = "0";
          lineStation.style.margin = "0";
          lineStation.style.borderRadius = "0";
          return;
        }

        if (
          !info[index + 1]?.arrivals?.find(
            (el) => el.vehicle_id == busIdUp.toLowerCase()
          ) &&
          isItYet &&
          nameStation.innerHTML !== "GARAŽA"
        ) {
          arDiv.style.display = "none";

          return;
        }
        if (
          !info[index + 1]?.arrivals?.find((el) => el.eta_min == "/") &&
          nameStation.innerHTML !== "GARAŽA"
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

          if (!moreThanAnHour) return;

          let indexOf = info.find(
            (station) => station?.arrivals?.length > 0
          )?.arrivals;
          console.log(nameStation.innerHTML);

          ar =
            indexOf.find((el) => el.vehicle_id == busIdUp.toLowerCase()) ?? {};
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
      //view-transition-name:busIcon;
      lnimg.innerHTML =
        "<mdui-icon name='directions_bus--outlined' style='color:RGB(" +
        darkenColor(
          lineColorsObj[arrival.line_number.replace(/\D/g, "")],
          100
        ).join(",") +
        ")!important;background-color:RGB(" +
        lineColorsObj[arrival.line_number.replace(/\D/g, "")].join(",") +
        ")'></mdui-icon>";
      lnimg.classList.add("busOnStation");
      arDiv.classList.add("lineStationNoMargin");
    }

    if (isItYet) previusStation = index;
    if (!listArrivals[ar["vehicle_id"]]) {
      listArrivals[ar["vehicle_id"]] = [];
      if (
        !lineStation.parentNode.classList.contains("half-hidden") &&
        !lineStation.parentNode.classList.contains("half-hidden-first") &&
        ar["type"] !== 2
      ) {
        //view-transition-name:busIcon;
        lnimg.innerHTML = `<mdui-icon name="directions_bus--outlined" style="color:RGB(${darkenColor(
          lineColorsObj[arrival.line_number.replace(/\D/g, "")],
          100
        ).join(",")})!important;background-color:RGB(${lineColorsObj[
          arrival.line_number.replace(/\D/g, "")
        ].join(",")})"></mdui-icon>`;

        lnimg.classList.add("busBetween");
        console.log(ar);
      }
    }
    if (ar["type"] == 3) arDiv.style.opacity = ".5";
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
              stationHTML =
                item +
                `<sub>${long}</sub>` +
                "<mdui-icon name=near_me--outlined></mdui-icon>";
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
          return `<div class="etaStation"  style="view-transition-name:eta_${i};${
            spanText ? "" : "background:none;"
          }${border ? border : ""}">${stationHTML}</div>`;
        }
      })
      .join("");
    etaHolder = null;
  }
  let bus = busObject.find((el) => el.bus_id == busIdUp);
  console.log(bus.bus_name);
  let date = new Intl.DateTimeFormat("sl-SI", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    timeZone: "Europe/Ljubljana",
  }).format(new Date(bus.timestamp));
  document.querySelector("#busDataSpeed > span").innerHTML = Math.round(
    bus.speed
  );
  document.querySelector("#busDataTime > span").innerHTML = date;
}
async function createBusData(bus, busDataDiv) {
  const findYearByGarageNumber = (garageNumber) => {
    for (const year in busAge) {
      if (busAge[year].includes(garageNumber)) {
        return year;
      }
    }
    return null; // če ni najdeno
  };
  let date = new Intl.DateTimeFormat("sl-SI", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    timeZone: "Europe/Ljubljana",
  }).format(new Date(bus.timestamp));
  let imgHtml = addElement("div", busDataDiv, "busImgHolder");
  if (bus.hasImage) {
    let img = addElement("img", imgHtml, "busImgElement");

    img.src =
      "https://mestnipromet.cyou/tracker/img/avtobusi/" + bus.no + ".jpg";
  }
  busDataDiv.innerHTML = `
   <div class=busDataTable>
    <div class=busDataText>
      <span class=busDataName>${bus.bus_name.slice(3).replace("-", " ")}</span>
      <span class=busDataModel>${bus.model}</span>
      <div class=busDataPillHolder>
       <div class=busDataPill id=busDataSpeed><mdui-icon name=speed></mdui-icon><span>${Math.round(
         bus.speed
       )}</span> km/h</div>
        <div class=busDataPill id=busDataTime><mdui-icon name=access_time></mdui-icon><span>${date}</span></div>
        <div class=busDataPill><mdui-icon name=photo_camera--outlined></mdui-icon>${
          bus.author
        }</div>
      </div>
    </div>
    <div class=busDataInfo>
      <span class=busDataAge>${findYearByGarageNumber(bus.no)}</span>
     ${imgHtml.outerHTML}
   </div>
   `;
}
function showArrivalsMyBusBA(info, container, arrival) {
  let holder = addElement("div", container, "arFlex");
  holder.style.display = "flex";
  let color =
    "RGB(" +
    lineToColor(
      parseInt(Math.max(...arrival.route_name.match(/\d+/g).map(Number))),
      1
    ).join(",") +
    ")";
  let arHolder = addElement("div", holder, "arOnRoute");
  var listArrivals = {};
  let arrivalsColumns = addElement("div", holder, "arrivalsColumns");
  let tripId = arrival.trip_id;
  let bus = busObject.find((el) => el.trip_id == tripId);
  info.forEach((ar, index) => {
    let arDiv = addElement("div", arHolder, "arrDiv");
    let lineStation = addElement("div", arDiv, "lineStation");

    lineStation.style.backgroundColor = color;
    let lnimg = addElement("div", lineStation, "lineStationImg");

    if (index == 0 || index == info.length - 1) {
      index == 0
        ? lineStation.parentNode.classList.add("half-hidden-first")
        : lineStation.parentNode.classList.add("half-hidden");
      lnimg.style.backgroundColor = color;
    } else {
      lnimg.style.backgroundColor =
        "RGB(" +
        darkenColor(
          lineToColor(
            parseInt(Math.max(...arrival.route_name.match(/\d+/g).map(Number))),
            1
          ),
          50
        ).join(",") +
        ")";

      lnimg.style.borderColor = color;
    }
    let nameStation = addElement("div", arDiv, "nameStation");
    nameStation.classList.add("nameStation_" + ar.stop.id);
    nameStation.innerHTML = ar.stop.name;

    try {
      let oneAfter = info[index + 1] ? info[index + 1].passed : false;
      let oneAfter2 = info[index + 1]
        ? !isFutureTime(info[index + 1].departure_realtime)
        : false;
      if (!isFutureTime(ar.arrival_realtime) && oneAfter && oneAfter2) {
        arDiv.style.display = "none";
        return;
      }
    } catch (e) {
      console.log(e);
    }

    let arrivalTimeRealtime = ar.arrival_realtime;
    console.log(bus);

    if (
      bus &&
      bus._originalBA.stop.id == ar.stop.id &&
      bus._originalBA.stop_status == "STOPPED_AT"
    ) {
      lnimg.innerHTML =
        "<mdui-icon name='directions_bus--outlined' style='color:RGB(" +
        darkenColor(
          lineToColor(
            parseInt(arrival.route_name.split(" ")[0].replace(/[^\d]/g, "")),
            1
          ),
          100
        ).join(",") +
        ")!important;background-color:" +
        color +
        "'></mdui-icon>";
      lnimg.classList.add("busOnStation");
      listArrivals[tripId] = [];

      listArrivals[tripId][index] =
        (ar["sequence"] == 1 ? "ODHOD" : "PRIHOD") +
        `<span style="display:none;">${ar["realtime"]}</span>`;
      return;
    }
    if (
      !isFutureTime(arrivalTimeRealtime) &&
      isFutureTime(ar.departure_realtime)
    ) {
      lnimg.innerHTML =
        "<mdui-icon name='directions_bus--outlined' style='color:RGB(" +
        darkenColor(
          lineToColor(
            parseInt(arrival.route_name.split(" ")[0].replace(/[^\d]/g, "")),
            1
          ),
          100
        ).join(",") +
        ")!important;background-color:" +
        color +
        "'></mdui-icon>";
      lnimg.classList.add("busOnStation");
      listArrivals[tripId] = [];
      listArrivals[tripId][index] =
        "NA POSTAJI" + `<span style="display:none;">${ar["realtime"]}</span>`;
      return;
    }

    if (isFutureTime(arrivalTimeRealtime)) {
      if (!listArrivals[tripId]) {
        listArrivals[tripId] = [];
        lnimg.innerHTML =
          "<mdui-icon name='directions_bus--outlined' style='color:RGB(" +
          darkenColor(
            lineToColor(
              parseInt(arrival.route_name.split(" ")[0].replace(/[^\d]/g, "")),
              1
            ),
            150
          ).join(",") +
          ")!important;background-color:" +
          color +
          "'>directions_bus</mdui-icon>";
        lnimg.classList.add("busBetween");

        listArrivals[tripId][index] =
          minutesFromNow(arrivalTimeRealtime).replace("min", "") +
          `<span style="display:none;">${ar["realtime"]}</span>`;
      } else {
        listArrivals[tripId][index] =
          minutesFromNow(arrivalTimeRealtime).replace("min", "") +
          `<span style="display:none;">${ar["realtime"]}</span>`;
      }
    }
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

            if (item.at(0) == "0" || item.includes("PRIHOD")) {
              // If type is 2, replace the text with "P"
              stationHTML = item.replace(item, "PRIHOD");
            } else if (item.includes("NA POSTAJI")) {
              stationHTML = item.replace(item, "NA POSTAJI");
            } else if (typeValue == "false") {
              stationHTML = item + `<sub>${long}</sub>`;
            } else if (typeValue == "true") {
              stationHTML =
                item +
                `<sub>${long}</sub>` +
                "<mdui-icon name=near_me--outlined></mdui-icon>";
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
function isFutureTime(dateString) {
  const secSinceMidnight = Math.floor(
    (Date.now() - new Date().setHours(0, 0, 0, 0)) / 1000
  );
  return secSinceMidnight < dateString;
}
async function stationsOnRoute(arrival, container) {
  let info = await fetchData(
    "https://lpp.ojpp.derp.si/api/route/stations-on-route?trip-id=" +
      arrival.trip_id
  );
  let holder = addElement("div", container, "arFlex");
  holder.style.display = "flex";
  holder.style.paddingBottom = "100px";

  let arHolder = addElement("div", holder, "arOnRoute");
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
    nameStation.innerHTML = arrivalRoute.name;
  });
}

window.onpopstate = function (event) {
  document.querySelectorAll(".iks").forEach((iks) => {
    if (iks.getBoundingClientRect().left > 0) iks.click();
  });
};
async function oppositeStation(id) {
  if (agency !== "lpp") id = id.split(":")[1];
  let arS = document.getElementById("arrivals-panel");
  arS.style.transform = "translateX(0px) translateY(-20px)";
  arS.style.opacity = "0";
  clearInterval(interval);
  setTimeout(async () => {
    document.querySelector(".arrivalsHolder").remove();
    document.querySelector(".infoBar").remove();
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
  }, 100);
}
