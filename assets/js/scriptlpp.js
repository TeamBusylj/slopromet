"use strict";

async function updateStations() {
  console.log(agency);
  let url =
    "https://lpp.ojpp.derp.si/api/station/station-details?show-subroutes=1";

  if (localStorage.getItem("stationList")) {
    stationList = JSON.parse(localStorage.getItem("stationList"));
    setTimeout(async () => {
      stationList = await fetchData(url);
      localStorage.setItem("stationList", JSON.stringify(stationList));
    }, 1000);
  } else {
    stationList = await fetchData(url);
    localStorage.setItem("stationList", JSON.stringify(stationList));
  }
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
            await stationClick(null, true, null, true);
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
            style.transform = "translateX(-100vw) translateZ(1px)";
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
          await stationClick(null, true, null, true);
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
            style.transform = "translateX(-100vw) translateZ(1px)";
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
          }, 10);
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

const delayedSearch = debounce(searchRefresh, 300);
async function stationClick(stationa, noAnimation, ia, repeated) {
  if (document.querySelector(".arrivalsOnStation")) return;
  var arrivalsScroll;
  moveFAB();
  let station = stationa ? stationList[stationa] : isArrivalsOpen;
  var stylesTransition = [
    document.querySelector(".searchContain").style,
    document.querySelector(".listOfStations").style,
    document.querySelector(".favouriteStations").style,
    document.getElementById("tabsFav").style,
  ];

  var notYet = false;
  var container;

  var data;
  var favList = JSON.parse(localStorage.getItem("favouriteStations") || "[]");
  var mapca;
  var fav;
  console.log(stationa);

  if (noAnimation) {
    data = await fetchData(
      "https://cors.proxy.prometko.si/https://lpp.ojpp.derp.si/api/station/arrival?station-code=" +
        station.ref_id
    );
    if (ia) {
      document.querySelector(".arrivalsHolder").style.transform =
        "translateX(0) translateZ(1px)";
      document.querySelector(".arrivalsHolder").style.opacity = "1";
      showLines(document.querySelector(".timeTScroll"), station);
    }
    let cornot = "";
    if (station.ref_id % 2 !== 0)
      cornot = '<md-icon class="center">adjust</md-icon>';
    document.querySelector(".title span").innerHTML = station.name + cornot;
    document.querySelector(".titleHolder").innerHTML +=
      "<div class=none></div>";
    document.querySelector(".mapca").addEventListener("click", function () {
      oppositeStation(station.ref_id);
    });
    let favi = document.querySelector(".favi");
    favi.innerHTML = favList.includes(station.ref_id)
      ? "<md-icon class=iconFill>favorite</md-icon>"
      : "<md-icon>favorite</md-icon>";

    favi.addEventListener("click", function () {
      if (favList.includes(station.ref_id)) {
        favList = favList.filter((item) => item !== station.ref_id);
        favi.innerHTML = "<md-icon>favorite</md-icon>";
      } else {
        favList.push(station.ref_id);

        favi.innerHTML = "<md-icon class=iconFill>favorite</md-icon>";
      }

      localStorage.setItem("favouriteStations", JSON.stringify(favList));
    });
  } else {
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
    createInfoBar(document.querySelector(".mainSheet"), station.ref_id);
    stylesTransition.forEach((style) => {
      style.transform = "translateX(-100vw) translateZ(1px)";
    });
    setTimeout(() => {
      container.style.transform = "translateX(0) translateZ(1px)";
    }, 0);

    const title = addElement("h1", container, "title");
    let holder = addElement("div", title);
    let iks = addElement("md-icon-button", holder, "iks");
    iks.innerHTML = "<md-icon>arrow_back_ios_new</md-icon>";
    iks.addEventListener("click", function () {
      window.history.replaceState(null, document.title, location.pathname);
      container.style.transform = "translateX(100vw) translateZ(1px)";
      document.querySelector(".infoBar").style.transform = "translateY(100%)";
      isArrivalsOpen = false;
      stylesTransition.forEach((style) => {
        style.transform = "translateX(0vw) translateZ(1px)";
      });
      clearInterval(interval);
      setTimeout(() => {
        container.remove();
        document
          .querySelector(".listOfStations")
          .classList.remove("hideStations");
        document.querySelector(".infoBar").remove();
      }, 500);
      moveFAB(0);
      try {
        document.getElementById("popup").remove();
      } catch {}
    });

    let ttl = addElement("span", title);
    let cornot = "";
    if (station.ref_id % 2 !== 0)
      cornot = '<md-icon class="center">adjust</md-icon>';
    ttl.innerHTML = station.name + cornot;
    let hh = addElement("div", title, "titleHolder");
    fav = addElement("md-icon-button", hh, "favi");
    fav.innerHTML = favList.includes(station.ref_id)
      ? "<md-icon class=iconFill>favorite</md-icon>"
      : "<md-icon>favorite</md-icon>";
    fav.addEventListener("click", function () {
      if (favList.includes(station.ref_id)) {
        favList = favList.filter((item) => item !== station.ref_id);
        fav.innerHTML = "<md-icon>favorite</md-icon>";
      } else {
        favList.push(station.ref_id);

        fav.innerHTML = "<md-icon class=iconFill>favorite</md-icon>";
      }

      localStorage.setItem("favouriteStations", JSON.stringify(favList));
    });
    mapca = addElement("md-icon-button", hh, "mapca");
    mapca.innerHTML = "<md-icon>swap_calls</md-icon>";
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

    var tabs = addElement("md-tabs", container, "tabs");
    tabs.innerHTML = `<md-primary-tab id="arrivalsTab" aria-controls="arrivals-panel">Prihodi</md-primary-tab>
   <md-primary-tab id="timeTab" aria-controls="time-panel">Urnik</md-primary-tab>`;
    arrivalsScroll = addElement("div", container, "arrivalsScroll");
    makeSkeleton(arrivalsScroll);
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

      currentPanel2.style.transform = "translateX(0px) translateY(0px)";
      currentPanel2.style.opacity = "1";

      if (currentPanel2.id == "time-panel" && !notYet) {
        notYet = true;
        showLines(timeTScroll, station);
      }
      getLocation();
    });
    data = await fetchData(
      "https://lpp.ojpp.derp.si/api/station/arrival?station-code=" +
        station.ref_id
    );
    let getMyBus = addElement("md-filled-tonal-button", null, "getMyBus");
    container.insertBefore(getMyBus, arrivalsScroll);
    getMyBus.innerHTML = "Moja vožnja";
    getMyBus.style.display = "none";
    const clickedMyBus = () => {
      container.style.transform = "translateX(-100vw) translateZ(1px)";
      getMyBusData();
    };
    getMyBus.addEventListener("click", clickedMyBus);

    showStationOnMap(station.latitude, station.longitude, station.name);
  }
  isArrivalsOpen = station;

  showArrivals(data, repeated);
}
function makeSkeleton(container) {
  for (let i = 0; i < 5; i++) {
    let arrivalItem = addElement("div", container, "arrivalItem");
    arrivalItem.style.height = "100px";
    arrivalItem.style.animationDelay = "0.2" + i * 2 + "s";
  }
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

function showArrivals(data, repeated) {
  let arrivalsScroll = document.getElementById("arrivals-panel");
  clearElementContent(arrivalsScroll);
  arrivalsScroll = null;
  arrivalsScroll = document.getElementById("arrivals-panel");
  if (data.arrivals.length > 0) {
    let busTemplate = addElement("div", arrivalsScroll, "busTemplate");

    let listOfArrivals = [];
    nextBusTemplate(data, busTemplate);
    data.arrivals.sort((a, b) => {
      return parseInt(a.route_name) - parseInt(b.route_name);
    });
    let i = 0;
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
        if (repeated) {
          arrivalItem.style.opacity = "1";
          arrivalItem.style.transform = "translateX(0)";
          arrivalItem.style.animationDuration = "0s";
        }
        arrivalItem.style.animationDelay = "0." + i + "s";
        i++;

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
    "https://lpp.ojpp.derp.si/api/station/routes-on-station?station-code=" +
      station.ref_id
  );

  parent.style.transform = "translateX(0px) translateY(0px)";
  parent.style.opacity = "1";

  data.forEach((arrival, i) => {
    if (!arrival.is_garage) {
      let arrivalItem = addElement("div", parent, "arrivalItem");
      arrivalItem.style.animationDelay = "0." + i + "s";
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
  window.history.pushState(null, document.title, location.pathname);
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
    "translateX(-100vw) translateZ(1px)";
  let iks = addElement("md-icon-button", container, "iks");
  iks.innerHTML = "<md-icon>arrow_back_ios_new</md-icon>";
  iks.addEventListener("click", function () {
    window.history.replaceState(null, document.title, location.pathname);
    container.style.transform = "translateX(100vw) translateZ(1px)";
    document.querySelector(".arrivalsHolder").style.transform =
      "translateX(0vw) translateZ(1px)";
    clearMap();
    setTimeout(() => {
      container.remove();
    }, 500);
  });
  let data1 = await fetchData(
    `https://lpp.ojpp.derp.si/api/station/timetable?station-code=${station_id}&route-group-number=${routeN.replace(
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
    "https://lpp.ojpp.derp.si/api/station/messages?station-code=" + station_id
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
    arrivalItem.style.animationDelay = "0";
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
    console.log("clicked");

    getMyBusData(null, arrivals, arrival.trip_id);
  }
}
async function arrivalsOnStation(arrival, station_id, already) {
  let info = await fetchData(
    "https://lpp.ojpp.derp.si/api/route/arrivals-on-route?trip-id=" +
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
    window.history.replaceState(null, document.title, location.pathname);
    container.style.transform = "translateX(100vw) translateZ(1px)";
    if (document.querySelector(".arrivalsHolder")) {
      document.querySelector(".arrivalsHolder").style.transform =
        "translateX(0vw) translateZ(1px)";
    } else {
      var stylesTransition = [
        document.querySelector(".searchContain").style,
        document.querySelector(".listOfStations").style,
        document.querySelector(".favouriteStations").style,
        document.getElementById("tabsFav").style,
      ];
      stylesTransition.forEach((style) => {
        style.transform = "translateX(0vw) translateZ(1px)";
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

window.onpopstate = function (event) {
  document.querySelectorAll(".iks").forEach((iks) => {
    if (iks.getBoundingClientRect().left > 0) iks.click();
  });
};

async function getMyBusData(busId, arrivalsAll, tripId) {
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
          (el) => el.bus_id == arrival.vehicle_id.toUpperCase()
        );
        document.querySelector(".myBusDiv").style.transform =
          "translateY(-20px)";
        document.querySelector(".myBusDiv").style.opacity = "0";
        clickedMyBus(busek, arrival.trip_id);
        intervalBusk = setInterval(() => {
          updateMyBus(busek, arrival.trip_id);
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
  iks.id = "busDataIks";
  iks.addEventListener("click", function () {
    holder.style.transform = "translateX(100vw) translateZ(1px)";
    clearInterval(intervalBusk);
    document.querySelector(".arrivalsHolder").style.transform =
      "translateX(0vw) translateZ(1px)";
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
    console.log(busId ? busId : arrivals[0].vehicle_id.toUpperCase());

    let bus = busObject.find(
      (el) =>
        el.bus_id == (busId ? busId : arrivals[0].vehicle_id.toUpperCase())
    );
    console.log(arrivals);

    clickedMyBus(bus, arrivals ? arrivals[0].trip_id : bus.trip_id);
    intervalBusk = setInterval(() => {
      updateMyBus(bus, arrivals ? arrivals[0].trip_id : bus.trip_id);
    }, 10000);
    return;
  }

  //get buse based on location (removed)
}
async function updateMyBus(bus, tripId) {
  let arOnS = await fetchData(
    "https://lpp.ojpp.derp.si/api/route/arrivals-on-route?trip-id=" + tripId
  );

  let busData = busObject.find((el) => el.bus_id === bus.bus_id);
  let arrivalDataDiv = document.querySelector(".arrivalsOnStation");
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
}
async function clickedMyBus(bus, tripId) {
  let arOnS = await fetchData(
    "https://lpp.ojpp.derp.si/api/route/arrivals-on-route?trip-id=" + tripId
  );

  let busId = bus.bus_id;
  let busData = busObject.find((el) => el.bus_id === busId);

  let myBusDiv = document.querySelector(".myBusDiv");
  let scrollPosition = myBusDiv.scrollTop;

  clearElementContent(myBusDiv);
  myBusDiv = document.querySelector(".myBusDiv");

  let arrivalItem = addElement("div", myBusDiv, "arrivalItem");
  arrivalItem.style.margin = "10px 0";
  let busNumberDiv = addElement("div", arrivalItem, "busNo2");
  busNumberDiv.style.background = lineColors(busData.line_number);
  busNumberDiv.id = "bus_" + busData.line_number;
  busNumberDiv.textContent = busData.line_number;
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
function showArrivalsMyBus(info, container, arrival, busIdUp, update) {
  let holder = addElement("div", container, "arFlex");
  holder.style.display = "flex";

  let arHolder = addElement("div", holder, "arOnRoute");
  var listArrivals = {};
  let arrivalsColumns = addElement("div", holder, "arrivalsColumns");
  let isItYet = true;
  let o = 0;
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
    arDiv.style.viewTransitionName = arrivalRoute.name
      .toLowerCase()
      .replace(/ /g, "_");
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

          if (!moreThanAnHour) return;

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
        "<md-icon style='view-transition-name:busIcon;color:RGB(" +
        darkenColor(
          lineColorsObj[arrival.line_number.replace(/\D/g, "")],
          100
        ).join(",") +
        ")!important;background-color:RGB(" +
        lineColorsObj[arrival.line_number.replace(/\D/g, "")].join(",") +
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
          "<md-icon style='view-transition-name:busIcon;color:RGB(" +
          darkenColor(
            lineColorsObj[arrival.line_number.replace(/\D/g, "")],
            100
          ).join(",") +
          ")!important;background-color:RGB(" +
          lineColorsObj[arrival.line_number.replace(/\D/g, "")].join(",") +
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
          return `<div class="etaStation"  style="view-transition-name:eta_${i};${
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
    await fetch("https://teambusylj.github.io/slopromet/assets/js/busAge.json")
  ).json();
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

  busDataDiv.innerHTML = `<table class="busDataTable">
  <tr><td>Ime:</td><td>${bus.bus_name}</td></tr>
   <tr><td>Model:</td><td>${bus.model}</td></tr>
   <tr><td>Leto:</td><td>${findYearByGarageNumber(bus.no)}</td></tr>
   <tr><td>Vrsta:</td><td>${bus.type}</td></tr>
   <tr><td>Odometer:</td><td>${Math.floor(bus.odometer)} km</td></tr>
   <tr><td>Hitrost:</td><td>${bus.speed} km/h</td></tr>
   <tr><td>Zabeležen:</td><td>ob ${date}</td></tr>
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
