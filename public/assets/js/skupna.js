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
  setSheetHeight,
  busAge;
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
        "<mdui-icon>directions_bus--outlined</mdui-icon>" + feature.get("name");
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
  await loadJS();
  loadFromGuthub();

  let sht = makeBottomSheet(null, 98);

  let bava = "";
  sht.innerHTML = `
<div class="searchContain">
  <mdui-text-field clearable class="search" value="${bava}" placeholder="Išči"
    ><mdui-symbol>search</mdui-symbol></mdui-text-field
  >
</div>
<mdui-circular-progress id="loader"></mdui-circular-progress>
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
function loadJS() {
  return new Promise((resolve, reject) => {
    const script = document.createElement("script");
    const script2 = document.createElement("script");
    script.id = "script1";
    script2.id = "script2";
    script.type = "text/javascript";
    script2.type = "text/javascript";

    script.src =
      agency === "lpp" ? "assets/js/scriptlpp.js" : "assets/js/scriptBA.js";
    script2.src =
      agency === "lpp" ? "assets/js/helper.js" : "assets/js/helperBA.js";
    script.id = "mainScript";
    script2.id = "helperScript";
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
async function changeAgency(agencyClicked) {
  let joj = agencyClicked + agency;
  document.documentElement.classList.remove(agency);
  if (agency == agencyClicked) return;
  if (agencyClicked !== "lpp") {
    agency = agencyClicked;
    localStorage.setItem("agency", agencyClicked);
  } else {
    agency = "lpp";
    localStorage.setItem("agency", "lpp");
  }

  if (joj.includes("lpp")) {
    setTimeout(() => {
      location.reload();
    }, 200);
  } else {
    document.querySelector(".favouriteStations").innerHTML = "";
    document.querySelector(".listOfStations").innerHTML = "";
    document.documentElement.classList.add(agency);
    createBuses();
  }
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
    await showArrivals(isArrivalsOpen.ref_id);
    arH = document.querySelector(".arrivalsScroll");
    arH.style.transform = "translateX(0px) translateY(0px)";
    arH.style.opacity = "1";
  } else if (checkVisible(document.querySelector("#tabsFav"))) {
    let tabsFav = document.querySelector("#tabsFav > mdui-tab-panel[active]");
    tabsFav.style.transform = "translateX(0px) translateY(-20px)";
    tabsFav.style.opacity = "0";
    await getLocation();
    await updateStations(true);
    await createStationItems();
    tabsFav = document.querySelector("#tabsFav > mdui-tab-panel[active]");
    tabsFav.style.transform = "translateX(0px) translateY(0px)";
    tabsFav.style.opacity = "1";
  } else {
  }
  if (btn) btn.removeAttribute("loading");
}
function makeSkeleton(container) {
  for (let i = 0; i < 10; i++) {
    let arrivalItem = addElement("div", container, "arrivalItem");
    arrivalItem.style.height = "100px";
    arrivalItem.style.animationDelay = "0.2" + i * 2 + "s";
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
  const debouncedShowPlaceDebounce = debounce(debouncedShowPlace, 500);
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

    if (sheetHeight > 65) {
      setSheetHeight(98);
    } else {
      setSheetHeight(40);
    }
    if (sheetHeight > sheetHeight3 + (100 - sheetHeight3) / 2) {
      setSheetHeight(98);
    }

    bottomSheet.style.transition =
      "all var(--transDur) cubic-bezier(0.38, 1.21, 0.22, 1)";
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
class MduiSymbol extends HTMLElement {
  connectedCallback() {
    requestAnimationFrame(() => {
      const iconName = Array.from(this.childNodes)
        .filter((n) => n.nodeType === Node.TEXT_NODE)
        .map((n) => n.textContent.trim())
        .join("");

      if (!iconName) return;

      const wrapper = document.createElement("mdui-icon");

      const slotAttr = this.getAttribute("slot");
      if (slotAttr === null) {
        // No slot attribute: default to "icon"
        wrapper.setAttribute("slot", "icon");
      } else if (slotAttr) {
        // Slot attribute with value: use it
        wrapper.setAttribute("slot", slotAttr);
      }
      // else: slot attribute exists but empty — do not set slot

      const span = document.createElement("span");
      span.textContent = iconName;

      // Copy all other attributes to <span>, excluding "slot"
      for (const attr of this.attributes) {
        if (attr.name !== "slot") {
          span.setAttribute(attr.name, attr.value);
        }
      }
      span.classList.add("material-symbols-outlined");
      wrapper.appendChild(span);
      this.replaceWith(wrapper);
    });
  }
}

customElements.define("mdui-symbol", MduiSymbol);
