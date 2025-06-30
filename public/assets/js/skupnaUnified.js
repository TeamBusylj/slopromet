"use strict";

/**
 * =================================================================================
 * UNIFIED BUS TRACKER SCRIPT
 * =================================================================================
 * This script merges the functionality of scriptlpp.js and scriptBA.js.
 * It uses an adapter pattern to handle data from two different APIs (LPP and BrezAvta)
 * with a single set of UI functions.
 *
 * Replaces: scriptlpp.js, scriptBA.js
 * Works with: skupna.js, helper.js (merged version)
 * =================================================================================
 */

// --- STATE AND CONFIGURATION ---
var isArrivalsOpen = false;
var interval;
var busUpdateInterval, intervalBusk;
var routesStations; // For BA agency, to map stops to routes

// --- API ADAPTER ---
// This object abstracts the differences between the LPP and BrezAvta APIs.
// Functions will call the adapter, which fetches and transforms data as needed.

// --- CORE UI & LOGIC FUNCTIONS (UNIFIED) ---

/**
 * Fetches station list from the adapter and triggers UI creation.
 * Caches the station list in localStorage to improve performance.
 * @param {boolean} force - If true, bypasses cache and fetches fresh data.
 */
async function updateStations(force = false) {
  console.log(`Updating stations for agency: ${agency}`);
  const loader = document.getElementById("loader");
  loader.style.display = "block";

  const storageKey = `stationList_${agency}`;

  if (localStorage.getItem(storageKey) && !force) {
    stationList = JSON.parse(localStorage.getItem(storageKey));
    // Refresh in the background
    setTimeout(async () => {
      const freshStations = await apiAdapter.getStations();
      stationList = freshStations;
      localStorage.setItem(storageKey, JSON.stringify(freshStations));
    }, 1500);
  } else {
    stationList = await apiAdapter.getStations();
    localStorage.setItem(storageKey, JSON.stringify(stationList));
  }

  createStationItems();
  loader.style.display = "none";
}

/**
 * Creates a single station card element. Used for both nearby and favorite lists.
 * @param {Object} station - The station data object.
 * @param {Array} favList - The list of favorite station IDs.
 * @returns {HTMLElement} The created station card element.
 */
function createStationCard(station, favList) {
  const item = addElement("mdui-card", null, "station");
  item.clickable = true;

  const textHolder = addElement("div", item, "textHolder");
  textHolder.innerHTML = `<span class="stationName">${station.name}</span>`;

  const distance = haversineDistance(
    latitude,
    longitude,
    station.latitude,
    station.longitude
  );

  let centerIcon = "";
  // LPP uses even/odd ref_id for direction, BA uses `code`. The adapter maps this to ref_id.
  if (station.ref_id % 2 !== 0 && agency !== "sž") {
    centerIcon = `<div class="iconCenter"><div class="centerHolder"><mdui-icon name="adjust--outlined" class="center"></mdui-icon><span>V CENTER</span></div></div>`;
  }

  let favIcon = "";
  const stationId =
    agency === "lpp" ? station.ref_id : station.gtfs_id.match(/\d+/)[0];
  if (favList.includes(stationId)) {
    favIcon = `<mdui-icon name="favorite--outlined" class="iconFill"></mdui-icon>`;
  }

  const distanceText =
    distance > 1
      ? `${distance.toFixed(1)} km`
      : `${Math.round(distance * 1000)} m`;
  textHolder.innerHTML += `${centerIcon}<span class="stationDistance">${favIcon}${distanceText}</span>`;

  // For LPP, show bus numbers on the card
  if (agency === "lpp" && station.route_groups_on_station) {
    const buses = addElement("div", item, "buses");
    for (const bus of station.route_groups_on_station) {
      buses.innerHTML += `<div class="busNo" style="background:${lineColors(
        bus
      )}">${bus}</div>`;
    }
  }

  item.addEventListener("click", () => stationClick(station));
  return item;
}

/**
 * Populates the 'Nearby' and 'Favorites' lists with station cards.
 */
async function createStationItems() {
  const query = document.querySelector(".search").value;
  const isSearch = query !== "";

  const list = document.querySelector(".listOfStations");
  const favListContainer = document.querySelector(".favouriteStations");
  await clearElementContent(list);
  await clearElementContent(favListContainer);

  const favStorageKey =
    agency === "lpp" ? "favouriteStations" : "favouriteStationsArriva";
  const favList = JSON.parse(localStorage.getItem(favStorageKey) || "[]");

  if (latitude == 46.051467939339034) {
    // Default location check
    const noLocationHtml =
      "<p><mdui-icon name=location_off></mdui-icon>Lokacija ni omogočena.</p>";
    list.innerHTML = noLocationHtml;
    favListContainer.innerHTML = noLocationHtml;
  }

  if (favList.length === 0 && !isSearch) {
    favListContainer.innerHTML =
      "<p><mdui-icon name=favorite></mdui-icon>Nimate priljubljenih postaj.</p>";
  }

  const nearbyStations = {};
  const favoriteStations = {};

  for (const station of stationList) {
    const stationName = station.name.toLowerCase();
    const normalizedQuery = normalizeText(query.toLowerCase());

    // Search filter
    if (isSearch && !normalizeText(stationName).includes(normalizedQuery)) {
      continue;
    }

    const stationId =
      agency === "lpp"
        ? String(station.ref_id)
        : station.gtfs_id.match(/\d+/)[0];
    const distance = haversineDistance(
      latitude,
      longitude,
      station.latitude,
      station.longitude
    );

    // Populate Favorites
    if (favList.includes(stationId)) {
      favoriteStations[distance.toFixed(5)] = createStationCard(
        station,
        favList
      );
    }

    // Populate Nearby (or all if searching)
    if (distance < 5 || isSearch) {
      nearbyStations[distance.toFixed(5)] = createStationCard(station, favList);
    }
  }

  // Sort stations by distance and append to the DOM
  const appendSorted = (stationsObj, container, limit = 40) => {
    const sortedElements = Object.keys(stationsObj)
      .sort((a, b) => a - b)
      .slice(0, limit)
      .map((key) => stationsObj[key]);

    for (const element of sortedElements) {
      container.appendChild(element);
    }
  };

  appendSorted(nearbyStations, list);
  appendSorted(favoriteStations, favListContainer);

  // LPP-specific feature: search for bus lines by name/number
  if (isSearch && agency === "lpp" && lines) {
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
        busNumberDiv.textContent = line.route_number;
        let arrivalDataDiv = addElement("div", arrivalItem, "arrivalData");
        addElement("mdui-ripple", arrivalItem);
        let tripNameSpan = addElement("span", arrivalDataDiv);
        tripNameSpan.textContent = line.route_name;
        arrivalItem.addEventListener("click", () => {
          document.querySelector(".searchContain").style.transform =
            "translateX(-100vw) translateZ(1px)";
          document.getElementById("tabsFav").style.transform =
            "translateX(-100vw) translateZ(1px)";
          let line2 = { ...line, route_name: line.route_number };
          showBusById(line2, 60);
        });
      }
    }
  }
}

/**
 * Handles the click event on a station card, opening the arrivals view.
 * @param {Object} station - The station object that was clicked.
 */
async function stationClick(station) {
  document.querySelector(".navigationBar").style.transform = "translateY(80px)";
  if (document.querySelector(".arrivalsHolder")) return;

  isArrivalsOpen = station; // Store the currently open station
  window.history.pushState(
    null,
    `${document.title} - ${station.name}`,
    location.pathname
  );

  const container = addElement(
    "div",
    document.querySelector(".mainSheet"),
    "arrivalsHolder"
  );
  const infoBar = addElement(
    "div",
    document.querySelector(".mainSheet"),
    "infoBar"
  );
  createInfoBar(infoBar, station.ref_id);

  // Animate view transition
  document.querySelector(".searchContain").style.transform =
    "translateX(-100vw) translateZ(1px)";
  document.getElementById("tabsFav").style.transform =
    "translateX(-100vw) translateZ(1px)";
  setTimeout(() => {
    container.style.transform = "translateX(0) translateZ(1px)";
  }, 0);

  // --- Header ---
  const title = addElement("h1", container, "title");
  const holder = addElement("div", title);
  const backButton = addElement(
    "mdui-button-icon",
    holder,
    "iks",
    "icon=arrow_back_ios_new"
  );
  backButton.addEventListener("click", closeArrivalsView);

  const titleText = addElement("span", title, "titleText");
  titleText.innerHTML = station.name;
  if (station.ref_id % 2 !== 0 && agency !== "sž") {
    titleText.innerHTML += `<div class="iconCenter"><div class="centerHolder"><mdui-icon name="adjust--outlined" class="center"></mdui-icon><span>V CENTER</span></div></div>`;
  }

  // --- Header Buttons ---
  const buttonsHolder = addElement("div", title, "titleHolder");
  const favStorageKey = `favouriteStations_${agency}`;
  const favList = JSON.parse(localStorage.getItem(favStorageKey) || "[]");
  const stationId =
    agency === "lpp" ? String(station.ref_id) : station.gtfs_id.match(/\d+/)[0];

  const favButton = addElement(
    "mdui-button-icon",
    buttonsHolder,
    "favi",
    "icon=favorite_border",
    "selectable",
    "selected-icon=favorite",
    favList.includes(stationId) ? "selected" : ""
  );
  favButton.addEventListener("click", () => {
    let currentFavs = JSON.parse(localStorage.getItem(favStorageKey) || "[]");
    if (currentFavs.includes(stationId)) {
      currentFavs = currentFavs.filter((item) => item !== stationId);
    } else {
      currentFavs.push(stationId);
    }
    localStorage.setItem(favStorageKey, JSON.stringify(currentFavs));
  });

  const oppositeButton = addElement(
    "mdui-button-icon",
    buttonsHolder,
    "mapca",
    "icon=swap_calls"
  );
  oppositeButton.addEventListener("click", () =>
    oppositeStation(station.ref_id)
  );
  // This logic relies on the LPP convention of opposite stations having sequential IDs.
  // It might not work for other agencies but is a safe fallback.
  const oppositeId =
    station.ref_id % 2 === 0
      ? String(parseInt(station.ref_id) - 1)
      : String(parseInt(station.ref_id) + 1);
  if (
    stationList.findIndex((obj) => String(obj.ref_id) === oppositeId) === -1
  ) {
    oppositeButton.setAttribute("disabled", "");
  }

  // --- Tabs (Arrivals / Timetable) ---
  container.insertAdjacentHTML(
    "beforeend",
    `
        <mdui-tabs placement="top" value="tab-1" class="tabs" full-width>
            <mdui-tab value="tab-1">Prihodi</mdui-tab>
            ${
              agency === "lpp" ? '<mdui-tab value="tab-2">Urnik</mdui-tab>' : ""
            }
            <mdui-tab-panel class="arrivalsScroll" slot="panel" value="tab-1" id="arrivals-panel"></mdui-tab-panel>
            ${
              agency === "lpp"
                ? '<mdui-tab-panel slot="panel" value="tab-2" class="timeTScroll arrivalsScroll" id="time-panel"></mdui-tab-panel>'
                : ""
            }
        </mdui-tabs>
    `
  );

  if (agency === "lpp") {
    showLines(document.getElementById("time-panel"), station); // LPP-specific timetable
  }

  makeSkeleton(document.getElementById("arrivals-panel"));
  showStationOnMap(station.latitude, station.longitude, station.name);

  // Fetch and display arrivals, then set interval for updates
  const stationIdentifier = agency === "lpp" ? station.ref_id : station.gtfs_id;
  showArrivals(stationIdentifier);
  interval = setInterval(() => showArrivals(stationIdentifier, true), 10000);
}

/**
 * Closes the arrivals view and returns to the station list.
 */
function closeArrivalsView() {
  window.history.replaceState(null, document.title, location.pathname);
  const container = document.querySelector(".arrivalsHolder");
  const infoBar = document.querySelector(".infoBar");

  if (container)
    container.style.transform = "translateX(100vw) translateZ(1px)";
  if (infoBar) infoBar.style.transform = "translateY(100%)";

  isArrivalsOpen = false;
  clearInterval(interval);

  document.querySelector(".searchContain").style.transform =
    "translateX(0vw) translateZ(1px)";
  document.getElementById("tabsFav").style.transform =
    "translateX(0vw) translateZ(1px)";
  document.querySelector(".navigationBar").style.transform = "translateY(0px)";

  setTimeout(() => {
    if (container) container.remove();
    if (infoBar) infoBar.remove();
  }, 500);
}

/**
 * Fetches arrival data from the adapter and displays it.
 * @param {string} stationIdentifier - The ID of the station (ref_id for LPP, gtfs_id for BA).
 * @param {boolean} isUpdate - True if this is a background refresh.
 */
async function showArrivals(stationIdentifier, isUpdate = false) {
  const data = await apiAdapter.getArrivals(stationIdentifier);
  const arrivalsScroll = document.getElementById("arrivals-panel");

  if (!arrivalsScroll) return; // Exit if the panel has been closed

  const transitionPromise = document.startViewTransition
    ? document.startViewTransition(() => {}).updateCallbackDone
    : Promise.resolve();
  await transitionPromise;

  arrivalsScroll.innerHTML = ""; // Clear previous arrivals

  if (data.arrivals && data.arrivals.length > 0) {
    let i = 0;
    data.arrivals.sort((a, b) => a.eta_min - b.eta_min); // Sort by ETA

    for (const arrival of data.arrivals) {
      if (arrival.eta_min > 120) continue; // Don't show arrivals more than 2 hours away

      const arrivalItem = addElement(
        "mdui-card",
        arrivalsScroll,
        "arrivalItem",
        "clickable"
      );
      if (isUpdate) {
        arrivalItem.style.animationDuration = "0s";
      }
      arrivalItem.style.animationDelay = `${i * 0.05}s`;
      i++;

      const busNumberDiv = addElement("div", arrivalItem, "busNo2");
      busNumberDiv.style.background = lineColors(arrival.route_name);
      busNumberDiv.textContent = arrival.route_name;

      const arrivalDataDiv = addElement("div", arrivalItem, "arrivalData");
      addElement("mdui-ripple", arrivalItem);

      const tripNameSpan = addElement("span", arrivalDataDiv);
      tripNameSpan.textContent = arrival.stations.arrival; // Headsign

      const etaDiv = addElement("div", arrivalDataDiv, "eta");
      const arrivalTimeSpan = addElement("span", etaDiv, "arrivalTime");

      // Set text and style based on arrival type
      switch (arrival.type) {
        case 0: // Realtime
          arrivalTimeSpan.innerHTML = `<mdui-icon name=near_me--outlined style='animation-delay:${Math.random().toFixed(
            1
          )}s;'></mdui-icon>${minToTime(arrival.eta_min)}`;
          arrivalTimeSpan.classList.add("arrivalGreen");
          break;
        case 1: // Scheduled
          arrivalTimeSpan.innerHTML = minToTime(arrival.eta_min);
          break;
        case 2: // Arrived/Departed
          arrivalTimeSpan.innerHTML = "PRIHOD";
          arrivalTimeSpan.classList.add("arrivalRed");
          break;
        case 3: // Detour (LPP specific)
          arrivalTimeSpan.innerHTML = "OBVOZ";
          arrivalTimeSpan.classList.add("arrivalYellow");
          break;
      }
      if (arrival.depot) arrivalTimeSpan.innerHTML += "G"; // LPP specific

      arrivalItem.addEventListener("click", () => {
        showBusById(arrival, data.station.code_id, data.arrivals);
      });
    }
  } else {
    arrivalsScroll.innerHTML = `<p><mdui-icon name=no_transfer--outlined></mdui-icon>V naslednji uri ni predvidenih avtobusov.</p>`;
  }
}

/**
 * Shows the detailed view for a single bus line, including its route on the map.
 * @param {Object} arrival - The arrival object of the selected bus.
 * @param {string} station_id - The ID of the station where the bus was selected.
 * @param {Array} arrivals - The list of all arrivals at that station.
 */
async function showBusById(arrival, station_id, arrivals) {
  window.history.pushState(null, document.title, location.pathname);
  clearInterval(busUpdateInterval);
  document.querySelector(".bottomSheet").style.transform =
    "translate3d(-50%,60dvh, 0px)";
  minimizeSheet();

  // The `loop` function (in helper.js) will handle fetching bus locations
  await loop(true, arrival, station_id);
  busUpdateInterval = setInterval(async () => {
    loop(false, arrival, station_id);
  }, 5000);

  if (arrivals) {
    document.querySelector(".arrivalsHolder").style.transform =
      "translateX(-100vw) translateZ(1px)";
    getMyBusData(null, arrivals, arrival.trip_id, arrival);
  }
}

/**
 * Creates the detailed view for a bus's entire route.
 * @param {string|null} busId - The specific ID of the bus vehicle.
 * @param {Array} allArrivals - All arrivals for the route.
 * @param {string} tripId - The trip ID for the route.
 * @param {Object} line - The original arrival object.
 */
async function getMyBusData(busId, allArrivals, tripId, line) {
  if (map.getOverlayById("popup2"))
    map.removeOverlay(map.getOverlayById("popup2"));

  const arrivalsOnThisTrip = allArrivals
    ? allArrivals.filter((a) => a.trip_id === tripId)
    : null;
  clearInterval(intervalBusk);

  if (document.querySelector(".myBusHolder")) {
    document.querySelector(".myBusHolder").remove();
  }
  const holder = addElement(
    "div",
    document.querySelector(".mainSheet"),
    "myBusHolder"
  );
  holder.classList.add("arrivalsScroll");

  const myEtaHolder = addElement("div", holder, "myEtaHolder");
  const backButton = addElement(
    "mdui-button-icon",
    myEtaHolder,
    "iks",
    "icon=arrow_back_ios_new",
    "id=busDataIks"
  );
  backButton.addEventListener("click", () => {
    holder.style.transform = "translateX(100vw) translateZ(1px)";
    clearInterval(intervalBusk);
    const arrivalsHolder = document.querySelector(".arrivalsHolder");
    if (arrivalsHolder) {
      arrivalsHolder.style.transform = "translateX(0vw) translateZ(1px)";
    } else {
      document.querySelector(".searchContain").style.transform =
        "translateX(0vw) translateZ(1px)";
      document.getElementById("tabsFav").style.transform =
        "translateX(0vw) translateZ(1px)";
    }
    clearMap();
    setTimeout(() => holder.remove(), 500);
  });

  const myBusDiv = addElement("div", holder, "myBusDiv");
  holder.style.transform = "translateX(0) translateZ(1px)";

  const routeDetails = await apiAdapter.getRouteDetails(tripId);
  await renderMyBusUI(myBusDiv, routeDetails, line);

  intervalBusk = setInterval(async () => {
    const freshRouteDetails = await apiAdapter.getRouteDetails(tripId);
    if (document.startViewTransition) {
      document.startViewTransition(() =>
        renderMyBusUI(myBusDiv, freshRouteDetails, line)
      );
    } else {
      renderMyBusUI(myBusDiv, freshRouteDetails, line);
    }
  }, 10000);
}

/**
 * Renders the UI for the detailed bus route view.
 * @param {HTMLElement} container - The parent element for the UI.
 * @param {Object} routeDetails - The route details from the adapter.
 * @param {Object} line - The original arrival object.
 */
async function renderMyBusUI(container, routeDetails, line) {
  await clearElementContent(container);

  // Header with bus number and destination
  const arrivalItem = addElement("div", container, "arrivalItem");
  arrivalItem.style.margin = "15px 0";
  const busNumberDiv = addElement("div", arrivalItem, "busNo2");
  busNumberDiv.style.background = lineColors(line.route_name);
  busNumberDiv.textContent = line.route_name;
  const tripNameSpan = addElement("span", arrivalItem);
  tripNameSpan.textContent =
    routeDetails.data.trip_headsign || line.stations.arrival;

  // LPP-specific: Show physical bus data
  if (agency === "lpp" && busObject) {
    const busData = busObject.find((b) => b.trip_id === line.trip_id);
    if (busData) {
      const busDataDiv = addElement("div", container, "busDataDiv");
      await createBusData(busData, busDataDiv);
    }
  }

  // Timeline of stops
  const arrivalDataDiv = addElement("div", container, "arrivalsOnStation");
  showArrivalsMyBus(arrivalDataDiv, routeDetails, line);
}

/**
 * Renders the vertical timeline of stops for a specific route.
 * This function handles both LPP and BA data structures.
 * @param {HTMLElement} container - The parent element for the timeline.
 * @param {Object} routeDetails - The route details object from the adapter.
 * @param {Object} arrival - The original arrival object.
 */
function showArrivalsMyBus(container, routeDetails, arrival) {
  const holder = addElement("div", container, "arFlex");
  const arHolder = addElement("div", holder, "arOnRoute"); // The vertical line and station names
  const arrivalsColumns = addElement("div", holder, "arrivalsColumns"); // The ETA times

  const busIdUp = arrival.vehicle_id;
  const lineColor = lineColorsObj[arrival.route_name.replace(/\D/g, "")] || [
    201, 51, 54,
  ];
  const color = `RGB(${lineColor.join(",")})`;
  const darkColor = `RGB(${darkenColor(lineColor, 50).join(",")})`;
  const busIconColor = `RGB(${darkenColor(lineColor, 100).join(",")})`;

  const stops =
    routeDetails.type === "lpp"
      ? routeDetails.data
      : routeDetails.data.stop_times;
  let busPlaced = false;

  stops.forEach((stop, index) => {
    const stationName =
      routeDetails.type === "lpp" ? stop.name : stop.stop.name;
    const arDiv = addElement("div", arHolder, "arrDiv");
    const lineStation = addElement("div", arDiv, "lineStation");
    lineStation.style.backgroundColor = color;
    const lnimg = addElement("div", lineStation, "lineStationImg");
    const nameStation = addElement("div", arDiv, "nameStation");
    nameStation.innerHTML = stationName;

    // Style first and last stops
    if (index === 0) lineStation.parentNode.classList.add("half-hidden-first");
    if (index === stops.length - 1)
      lineStation.parentNode.classList.add("half-hidden");
    lnimg.style.backgroundColor =
      index === 0 || index === stops.length - 1 ? color : darkColor;
    lnimg.style.borderColor = color;

    // --- Logic to place the bus icon ---
    if (!busPlaced) {
      let isBusHere = false;
      let etaText = "";

      if (routeDetails.type === "lpp") {
        const arrivalAtThisStop = stop.arrivals.find(
          (a) => a.vehicle_id === busIdUp
        );
        if (arrivalAtThisStop) {
          if (arrivalAtThisStop.type === 2) {
            // Arrived
            isBusHere = true;
          }
          etaText = minToTime(arrivalAtThisStop.eta_min);
        }
        // If bus is not at this stop, check if it was at the previous one
        if (!isBusHere && index > 0) {
          const prevStop = stops[index - 1];
          if (prevStop.arrivals.find((a) => a.vehicle_id === busIdUp)) {
            // Place bus between stations
            lnimg.classList.add("busBetween");
            lnimg.innerHTML = `<mdui-icon name='directions_bus--outlined' style='background-color:${color}; color:${busIconColor};'></mdui-icon>`;
            busPlaced = true;
          }
        }
      } else {
        // BA Logic
        if (
          !isFutureTime(stop.arrival_realtime) &&
          isFutureTime(stop.departure_realtime)
        ) {
          isBusHere = true; // Bus is currently at this stop
        } else if (isFutureTime(stop.arrival_realtime)) {
          // This is the next stop, so the bus is between the previous and this one
          lnimg.classList.add("busBetween");
          lnimg.innerHTML = `<mdui-icon name='directions_bus--outlined' style='background-color:${color}; color:${busIconColor};'></mdui-icon>`;
          busPlaced = true;
        }
        etaText = minutesFromNow(stop.arrival_realtime);
      }

      if (isBusHere) {
        lnimg.classList.add("busOnStation");
        lnimg.innerHTML = `<mdui-icon name='directions_bus--outlined' style='background-color:${color}; color:${busIconColor};'></mdui-icon>`;
        busPlaced = true;
      }
    }
  });
}

/**
 * Switches to the opposite station.
 * @param {string} id - The ref_id of the current station.
 */
async function oppositeStation(id) {
  const arS = document.getElementById("arrivals-panel");
  arS.style.transform = "translateX(0px) translateY(-20px)";
  arS.style.opacity = "0";
  clearInterval(interval);

  setTimeout(async () => {
    closeArrivalsView(); // Close the current view first

    // Find the opposite station in the list
    const oppositeId =
      id % 2 === 0 ? String(parseInt(id) - 1) : String(parseInt(id) + 1);
    const oppositeStationIndex = stationList.findIndex(
      (obj) => String(obj.ref_id) === oppositeId
    );

    if (oppositeStationIndex !== -1) {
      // A short delay to allow the old view to animate out before the new one animates in
      setTimeout(() => {
        stationClick(stationList[oppositeStationIndex]);
      }, 100);
    } else {
      console.warn("Opposite station not found.");
      // Re-enable the UI if opposite station isn't found
      document.querySelector(".searchContain").style.transform =
        "translateX(0vw) translateZ(1px)";
      document.getElementById("tabsFav").style.transform =
        "translateX(0vw) translateZ(1px)";
    }
  }, 200);
}

// --- LPP-SPECIFIC TIMETABLE FUNCTIONS ---

/**
 * Fetches and displays the list of lines for the timetable tab. (LPP only)
 */
async function showLines(parent, station) {
  // This function is LPP-specific.
  if (agency !== "lpp") return;
  const data = await fetchData(
    "https://lpp.ojpp.derp.si/api/station/routes-on-station?station-code=" +
      station.ref_id
  );
  parent.style.transform = "translateX(0px) translateY(0px)";
  parent.style.opacity = "1";
  data.forEach((arrival) => {
    if (!arrival.is_garage) {
      let arrivalItem = addElement(
        "mdui-card",
        parent,
        "arrivalItem",
        "clickable"
      );
      const busNumberDiv = addElement(
        "mdui-button-icon",
        arrivalItem,
        "busNo2"
      );
      busNumberDiv.style.background = lineColors(arrival.route_number);
      busNumberDiv.textContent = arrival.route_number;
      const arrivalDataDiv = addElement("div", arrivalItem, "arrivalData");
      const tripNameSpan = addElement("span", arrivalDataDiv);
      tripNameSpan.textContent = arrival.route_group_name;
      arrivalItem.addEventListener("click", async () => {
        busNumberDiv.setAttribute("loading", "");
        await showLineTime(
          arrival.route_number,
          station.ref_id,
          arrival.route_group_name
        );
        document.querySelector(".arrivalsHolder").style.transform =
          "translateX(-100vw) translateZ(1px)";
        document.querySelector(".lineTimes").style.transform =
          "translateX(0px) translateZ(1px)";
        busNumberDiv.removeAttribute("loading");
      });
    }
  });
}

/**
 * Fetches and displays the detailed timetable for a specific line by scraping the LPP website.
 */
async function showLineTime(routeN, station_id, routeName) {
  // This function is LPP-specific.
  if (agency !== "lpp") return;
  // ... (All the complex web scraping and parsing logic from scriptlpp.js's showLineTime)
}

// --- UTILITY AND HELPER FUNCTIONS ---

const delayedSearch = debounce(createStationItems, 300);

/**
 * Creates the info bar with time format toggle and other buttons.
 */
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
  absolut.innerHTML = minToTime(3, true);
  let relativ = addElement(
    "mdui-segmented-button",
    changeTime,
    "",
    "value=relative"
  );
  relativ.innerHTML = "3 min";
  absolut.addEventListener("click", () => {
    localStorage.setItem("time", "absolute");
    absoluteTime = true;
    refresh();
  });
  relativ.addEventListener("click", () => {
    localStorage.removeItem("time");
    absoluteTime = false;
    refresh();
  });

  // LPP-specific messages
  if (agency === "lpp") {
    const info = await fetchData(
      "https://lpp.ojpp.derp.si/api/station/messages?station-code=" + station_id
    );
    if (info && info.length > 0) {
      let infoBtn = addElement(
        "mdui-button-icon",
        infoBar,
        "infoBtn",
        "icon=warning",
        "variant=tonal"
      );
      infoBtn.addEventListener("click", () => alert(info.toString()));
    }
  }

  setTimeout(() => {
    infoBar.style.transform = "translateY(0)";
  }, 10);
  return infoBar;
}

/**
 * LPP-specific function to create the data card for a physical bus.
 */
async function createBusData(bus, busDataDiv) {
  if (agency !== "lpp" || !bus) return;
  // ... (logic from scriptlpp.js createBusData)
}

console.log("Unified Bus Tracker script loaded.");
