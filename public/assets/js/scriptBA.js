"use strict";

async function oppositeStation(id) {
  let arS = document.getElementById("arrivals-panel");
  arS.style.transform = "translateX(0px) translateY(-20px)";
  arS.style.opacity = "0";
  setTimeout(async () => {
    let i = document.querySelector(".timeTScroll");
    i = clearElementContent(document.querySelector(".timeTScroll"));
    if (id % 2 === 0) {
      await stationClick(
        stationList.find((obj) => obj.code === String(parseInt(id) + 1)),
        1,
        1
      );
    } else {
      await stationClick(
        stationList.find((obj) => obj.code === String(parseInt(id) - 1)),
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
async function stationClickBA(stationa, noAnimation, ia) {
  if (document.querySelector(".arrivalsOnStation")) return;
  let station = stationa ? stationa : isArrivalsOpen;

  var container;

  var favList = JSON.parse(
    localStorage.getItem("favouriteStationsArriva") || "[]"
  );

  document.querySelector(".navigationBar").style.transform = "translateY(80px)";

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
  createInfoBar(infoBar, station.code);

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
    document.querySelector(".navigationBar").style.transform =
      "translateY(0px)";

    document.querySelector(".searchContain").style.transform =
      "translateX(0vw) translateZ(1px)";
    document.getElementById("tabsFav").style.transform =
      "translateX(0vw) translateZ(1px)";
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

  let ttl = addElement("span", title);
  let cornot = "";
  if (station.code && station.code.match(/\d+/)[0] % 2 !== 0)
    cornot = '<mdui-icon name=adjust--outlined class="center"></mdui-icon>';
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
    showStreetView(station.lat, station.lon, streetView);
  });
  var fav = addElement(
    "mdui-button-icon",
    hh,
    "favi",
    "icon=favorite_border",
    "selectable",
    "selected-icon=favorite",
    favList.includes(station.gtfs_id.match(/\d+/)[0]) ? "selected" : ""
  );

  fav.addEventListener("click", function () {
    if (favList.includes(station.gtfs_id.match(/\d+/)[0])) {
      favList = favList.filter(
        (item) => item !== station.gtfs_id.match(/\d+/)[0]
      );
    } else {
      favList.push(station.gtfs_id.match(/\d+/)[0]);
    }
    localStorage.setItem("favouriteStations", JSON.stringify(favList));
  });
  var mapca = addElement("mdui-button-icon", hh, "mapca", "icon=swap_calls");
  mapca.addEventListener("click", function () {
    oppositeStation(station.gtfs_id.match(/\d+/)[0]);
  });
  if (station.gtfs_id.match(/\d+/)[0] % 2 !== 0) {
    if (
      stationList.findIndex(
        (obj) =>
          obj.gtfs_id.match(/\d+/)[0] ===
          String(parseInt(station.gtfs_id.match(/\d+/)[0]) + 1)
      ) === -1
    ) {
      mapca.setAttribute("disabled", "");
    }
  } else {
    if (
      stationList.findIndex(
        (obj) =>
          obj.gtfs_id.match(/\d+/)[0] ===
          String(parseInt(station.gtfs_id.match(/\d+/)[0]) - 1)
      ) === -1
    ) {
      mapca.setAttribute("disabled", "");
    }
  }
  let data = await fetchData(
    `https://api.beta.brezavta.si/stops/${encodeURIComponent(
      station.gtfs_id
    )}/arrivals?current=true`
  );
  createSearchBar(container, data, station.gtfs_id);
  var tabs = addElement("mdui-tabs", container, "tabs");
  tabs.outerHTML = `<mdui-tabs
  placement="top"
  value="tab-1"
  class="tabs"
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
  showStationOnMap(stationa.lat, stationa.lon, stationa.name);

  isArrivalsOpen = station;

  let searchInput = document.querySelector("#searchRoutes");
  console.log(searchInput.value);
  console.log(searchInput.value);
  showArrivals(data, station.gtfs_id, noAnimation);
  interval = setInterval(async () => {
    data = await fetchData(
      `https://api.beta.brezavta.si/stops/${encodeURIComponent(
        station.gtfs_id
      )}/arrivals?current=true`
    );
    if (searchInput.value !== "") {
      showFilteredArrivals(searchInput.value, station.gtfs_id, data, true);
    } else {
      showArrivals(data, station.gtfs_id, true);
    }
  }, 10000);
  /*cvvvvvv*/
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

async function showArrivalBA(data, station_id, noAnimation, stationRoute) {
  data = !data
    ? await fetchData(
        `https://api.beta.brezavta.si/stops/${encodeURIComponent(
          isArrivalsOpen.gtfs_id
        )}/arrivals?current=true`
      )
    : data;
  let arrivalsScroll = document.getElementById("arrivals-panel");
  clearElementContent(arrivalsScroll);
  arrivalsScroll = null;
  arrivalsScroll = document.getElementById("arrivals-panel");
  let arrivalsList = [];
  function makeIdFriendly(text) {
    return text
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-") // replace non-alphanumeric with dashes
      .replace(/^-+|-+$/g, ""); // remove leading/trailing dashes
  }
  if (Object.keys(data).length > 0) {
    let i = 0;
    const getDelayFromNumber = (n, scale = 10) =>
      Math.min(Math.pow(n / scale, 2) * 0.1, 5);
    let favos = localStorage.getItem("favoriteBuses") || "[]";
    for (const arrival of data) {
      let etaDiv;
      if (!arrivalsList.includes(arrival.route_short_name)) {
        if (minutesFromNow(arrival.arrival_realtime, 1) > 120) continue;
        arrivalsList.push(arrival.route_short_name);
        let arrivalItem = addElement("div", null, "arrivalItem");
        if (noAnimation) {
          arrivalItem.style.opacity = "1";
          arrivalItem.style.transform = "translateX(0)";
          arrivalItem.style.animationDuration = "0s";
        }
        if (favos.includes(arrival.route_short_name.split(" ")[0])) {
          arrivalItem.style.animationDelay = "0s";
        } else {
          arrivalItem.style.animationDelay = "0." + (i + 1) + "s";
        }

        createBusNumber(arrival, arrivalItem, "0." + i + "5", noAnimation);
        addElement("mdui-ripple", arrivalItem);
        let arrivalDataDiv = addElement("div", arrivalItem, "arrivalData");
        let queryHeadSign;
        if (stationRoute) {
          queryHeadSign = `${
            stationRoute[arrival.route_id.split(":")[1]]
          }<mdui-icon name=arrow_right--outlined class=arrow></mdui-icon>`;
        } else {
          queryHeadSign = "";
        }
        let tripNameSpan = addElement("span", arrivalDataDiv, "tripName");
        tripNameSpan.innerHTML = arrival.trip_headsign.replace(
          /(.+?)[-–]/g,
          (_, word) =>
            `${word}<mdui-icon name=arrow_right--outlined class=arrow></mdui-icon>` +
            queryHeadSign
        );
        if (arrival.alerts.length > 0) {
          addElement("mdui-icon", tripNameSpan, "alert", "name=warning_amber");
        }
        arrivalItem.addEventListener("click", () => {
          showBusById(arrival, station_id, data);
        });
        arrivalsScroll.appendChild(arrivalItem);
        etaDiv = addElement(
          "div",
          arrivalItem.querySelector(".arrivalData"),
          "eta"
        );
        etaDiv.id = "arrival_" + makeIdFriendly(arrival.trip_headsign);
        let favorite = addElement(
          "mdui-button-icon",
          arrivalItem,
          "favorite",
          "selectable",
          "icon=star_border",
          "selected-icon=star"
        );

        favoriteLine(
          arrival.route_short_name.split(" ")[0],
          favorite,
          arrivalItem,
          favos
        );
      } else {
        etaDiv = document.querySelector(
          "#arrival_" + makeIdFriendly(arrival.trip_headsign)
        );
      }

      let arrivalTimeRealtime = arrival.arrival_realtime;

      let order = minutesFromNow(arrivalTimeRealtime, 1);

      if (order > 120) continue;

      let arrivalTimeSpan = addElement("span", etaDiv, "arrivalTime");

      if (arrival.realtime) {
        arrivalTimeSpan.innerHTML =
          "<mdui-icon name=near_me--outlined style='animation-delay:" +
          randomOneDecimal() +
          "s;'></mdui-icon>";
        arrivalTimeSpan.classList.add("arrivalGreen");
      }
      if (
        isLessThanMinutes(
          minutesFromNow(arrivalTimeRealtime, 1),
          getFormattedDate(),
          1
        )
      ) {
        arrivalTimeSpan.innerHTML = arrival.stopIndex == 0 ? "ODHOD" : "PRIHOD";
        arrivalTimeSpan.classList.add(
          arrival.sequence == 0 ? "arrivalBlue" : "arrivalRed"
        );
      } else {
        arrivalTimeSpan.innerHTML += minutesFromNow(arrivalTimeRealtime);
      }
      if (!isFutureTime(arrivalTimeRealtime)) {
        arrivalTimeSpan.innerHTML = "NA POSTAJI";
        arrivalTimeSpan.classList.add(
          arrival.sequence == 0 ? "arrivalBlue" : "arrivalRed"
        );
      }
      arrivalTimeSpan = null;
      i++;
    }
  } else {
    arrivalsScroll.innerHTML +=
      "<p><mdui-icon name=no_transfer--outlined></mdui-icon>V naslednji uri ni predvidenih avtobusov.</p>";
  }
}
function createSearchBarBA(parent, data, station) {
  let searchInput = addElement(
    "mdui-text-field",
    parent,
    "search",
    "icon=search--outlined"
  );
  searchInput.placeholder = "Išči izstopno postajo";
  searchInput.id = "searchRoutes";
  const debouncedShowArrivals = debounce(showFilteredArrivals, 500);

  searchInput.addEventListener("input", () => {
    debouncedShowArrivals(searchInput.value, station, data);
  });
}
function showFilteredArrivalsBA(value, station, data, noAnimation) {
  console.log("Filtering arrivals with value:", value);

  const query = value.trim().toLowerCase();
  if (!query) return;

  // 1. Find all matching stations by name
  const matchingStops = stationList.filter((s) =>
    s.name.toLowerCase().includes(query)
  );

  // 2. Map of route_id → first matching station name
  const routeToStationName = {};

  for (const stop of matchingStops) {
    const stopId = stop.gtfs_id.split(":")[1];
    const routes = routesStations[stopId];
    if (!routes) continue;

    for (const routeId of routes) {
      if (!routeToStationName[routeId]) {
        routeToStationName[routeId] = stop.name; // first match only
      }
    }
  }

  // 3. Filter data based on route_id (normalized), and attach station name
  const filtered = data.filter((entry) => {
    const plainRouteId = entry.route_id.split(":")[1];
    return routeToStationName.hasOwnProperty(plainRouteId);
  });

  // 4. Call showArrivals with the route→station mapping
  showArrivals(filtered, station, noAnimation, routeToStationName);
}
function favoriteLine(lineName, button, arrivalItem, favos = []) {
  if (!localStorage.getItem("favoriteBuses"))
    localStorage.setItem("favoriteBuses", "[]");
  if (favos.includes(lineName)) {
    button.selected = true;
    const order =
      JSON.parse(favos).indexOf(lineName) - JSON.parse(favos).length;
    arrivalItem.style.order = order;
  }

  button.addEventListener("click", (e) => {
    e.stopPropagation();
    let order = JSON.parse(localStorage.getItem("favoriteBuses")).length + 1;
    if (localStorage.favoriteBuses.includes(lineName)) {
      localStorage.setItem(
        "favoriteBuses",
        JSON.stringify(
          JSON.parse(localStorage.getItem("favoriteBuses")).filter(
            (bus) => bus !== lineName
          )
        )
      );

      return;
    } else {
      localStorage.setItem(
        "favoriteBuses",
        JSON.stringify([
          ...JSON.parse(localStorage.getItem("favoriteBuses")),
          lineName,
        ])
      );

      arrivalItem.style.order = order;
    }
  });
}

function getFormattedDate() {
  const date = new Date();

  // Convert to ISO string (which gives you the format YYYY-MM-DDTHH:MM:SS.sssZ)
  const isoString = date.toISOString();

  // Modify it to remove milliseconds and add the timezone offset (e.g., +0000)
  const formattedDate = isoString.replace("Z", "+0000").slice(0, 19);

  return formattedDate + "+0000";
}

function isLessThanMinutes(minutes, timestamp2, min) {
  const secSinceMidnight = Math.floor(
    (Date.now() - new Date().setHours(0, 0, 0, 0)) / 1000
  );

  // Calculate the difference in milliseconds
  let diff = Math.abs(secSinceMidnight - minutes) / 60;
  return diff < min;
}

async function createInfoBarBA(infoBar, station_id) {
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

  setTimeout(() => {
    infoBar.style.transform = "translateY(0)";
  }, 10);
  return infoBar;
}

var busUpdateInterval, arrivalsUpdateInterval, intervalBusk;
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
      "translateX(-100vw)";
    document.querySelector(".arrivalsHolder").style.opacity = "0";
    console.log("clicked");

    getMyBusData(null, arrivals, arrival.trip_headsign);
  }
}

window.onpopstate = function (event) {
  document.querySelectorAll(".iks").forEach((iks) => {
    if (iks.getBoundingClientRect().left > 0) iks.click();
  });
};

async function getMyBusData(busId, arrivalsAll, routeId) {
  map.removeOverlay(popup2);
  const arrivals = arrivalsAll
    ? arrivalsAll.filter((element) => element.trip_headsign == routeId)
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
  console.log("ia", arrivals);
  if (arrivals && arrivals.length > 1) {
    for (const arrival of arrivals) {
      if (!isLessThanMinutes(arrival.arrival_realtime, getFormattedDate(), 120))
        continue;
      let arTime = addElement("div", myEtaChips, "arrivalTime");
      arTime.innerHTML = minutesFromNow(arrival.arrival_realtime);
      arTime.busId = arrival.trip_id;
      addElement("mdui-ripple", arTime);
      arTime.addEventListener("click", function () {
        myEtaChips.querySelector(".selected").classList.remove("selected");
        arTime.classList.add("selected");
        clearInterval(intervalBusk);
        intervalBusk = null;
        let busek = busObject.find((el) => el.trip_id == arrival.trip_id);
        document.querySelector(".myBusDiv").style.transform =
          "translateY(-20px)";
        document.querySelector(".myBusDiv").style.opacity = "0";
        clickedMyBus(busek, arrival.trip_id, arrival);
        intervalBusk = setInterval(() => {
          updateMyBus(busek, arrival.trip_id, arrival);
        }, 10000);
        window.refreshMyBus = async () => {
          await updateMyBus(busek, arrival.trip_id, arrival);
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
    let bus = arrivals.find((arrival) =>
      busObject.some((bus) => bus.trip_id === arrival.trip_id)
    );

    intervalBusk = setInterval(() => {
      updateMyBus(bus, bus ? bus.trip_id : arrivals[0].trip_id, arrivals[0]);
    }, 10000);
    window.refreshMyBus = async () => {};
    return;
  }

  //get buse based on location (removed)
}
async function clickedMyBus(bus, tripId, arrival) {
  console.log(arrival);

  let arOnS1 = await fetchData(
    `https://api.beta.brezavta.si/trips/${encodeURIComponent(
      tripId
    )}?date=${new Date().toISOString().slice(0, 10).replace(/-/g, "")}`
  );
  let arOnS = arOnS1.stop_times;

  let myBusDiv = document.querySelector(".myBusDiv");
  let scrollPosition = myBusDiv.scrollTop;

  clearElementContent(myBusDiv);
  myBusDiv = document.querySelector(".myBusDiv");

  let arrivalItem = addElement("div", myBusDiv, "arrivalItem");
  arrivalItem.style.margin = "10px 0";
  createBusNumber(arrival, arrivalItem, 0);
  let tripNameSpan = addElement("span", arrivalItem);
  tripNameSpan.innerHTML = arOnS1.trip_headsign.replace(
    /(.+?)[-–]/g,
    (_, word) =>
      `<span style="white-space: nowrap;">${word}<mdui-icon name=arrow_right--outlined class=arrow></mdui-icon></span>`
  );
  if (arrival.alerts.length > 0) {
    let warning = addElement("div", myBusDiv, "arrivalItem");
    warning.style.margin = "10px 0";
    for (const alert of arrival.alerts) {
      if (alert.language !== "sl" || alert.id == "SZ-DELAY") continue;
      let alertDiv = addElement("div", warning, "alert");
      alertDiv.innerHTML = `<span class="title"><mdui-icon name=warning_amber></mdui-icon>${alert.header}</span><span class="body">${alert.description}</span>`;
    }
    if (warning.childElementCount == 0) {
      warning.remove();
    }
  }
  if (arrival.arrival_delay !== 0) {
    let delay = addElement("div", myBusDiv, "arrivalItem");
    delay.style.margin = "10px 0";
    let alertDiv = addElement("div", delay, "alert");
    alertDiv.innerHTML = `<span class="title"><mdui-icon name=warning_amber></mdui-icon>ZAMUDA : ${Math.round(
      arrival.arrival_delay / 60
    )} min</span>`;
  }
  let arrivalDataDiv = addElement("div", myBusDiv, "arrivalsOnStation");
  showArrivalsMyBus(arOnS, arrivalDataDiv, arrival);

  myBusDiv.scrollTop = scrollPosition ? scrollPosition : 0;
  myBusDiv.style.transform = "translateY(0px)";
  myBusDiv.style.opacity = "1";
}
async function updateMyBus(bus, tripId, arrival) {
  let arOnS1 = await fetchData(
    `https://api.beta.brezavta.si/trips/${encodeURIComponent(
      tripId
    )}?date=${new Date().toISOString().slice(0, 10).replace(/-/g, "")}`
  );
  let arOnS = arOnS1.stop_times;
  let arrivalDataDiv = document.querySelector(".arrivalsOnStation");
  if (document.startViewTransition) {
    document.startViewTransition(() => {
      clearElementContent(arrivalDataDiv);
      arrivalDataDiv = document.querySelector(".arrivalsOnStation");
      showArrivalsMyBus(arOnS, arrivalDataDiv, arrival);
    });
  } else {
    clearElementContent(arrivalDataDiv);
    arrivalDataDiv = document.querySelector(".arrivalsOnStation");
    showArrivalsMyBus(arOnS, arrivalDataDiv, arrival);
  }
}
function showArrivalsMyBus(info, container, arrival) {
  let holder = addElement("div", container, "arFlex");
  holder.style.display = "flex";
  let color =
    "RGB(" +
    lineToColor(
      parseInt(Math.max(...arrival.route_short_name.match(/\d+/g).map(Number))),
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
            parseInt(
              Math.max(...arrival.route_short_name.match(/\d+/g).map(Number))
            ),
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

    if (bus && bus.stop.id == ar.stop.id && bus.stop_status == "STOPPED_AT") {
      lnimg.innerHTML =
        "<mdui-icon name='directions_bus--outlined' style='color:RGB(" +
        darkenColor(
          lineToColor(
            parseInt(
              arrival.route_short_name.split(" ")[0].replace(/[^\d]/g, "")
            ),
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
            parseInt(
              arrival.route_short_name.split(" ")[0].replace(/[^\d]/g, "")
            ),
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
              parseInt(
                arrival.route_short_name.split(" ")[0].replace(/[^\d]/g, "")
              ),
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
