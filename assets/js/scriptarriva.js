"use strict";
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
  search.addEventListener(`focus`, () => search.select());
  absoluteTime = localStorage.getItem("time") ? true : false;
});

async function updateStations() {
  console.log(agency);

  let stations = await fetchData("https://api.beta.brezavta.si/stops");

  stationList = stations.filter((station) => {
    return station.background_color == "#004E96";
  });
  createStationItems();
}
var isArrivalsOpen = false;
var currentPanel;
async function createStationItems() {
  var search = false;
  var query = document.querySelector(".search").value;
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

    for (const station of stationList) {
      let item = addElement("div", null, "station");
      addElement("md-ripple", item);
      let textHolder = addElement("div", item, "textHolder");
      textHolder.innerHTML =
        '<span class="stationName">' + station.name + "</span>";
      const distance = haversineDistance(
        latitude,
        longitude,
        station.lat,
        station.lon
      );
      const favList = JSON.parse(
        localStorage.getItem("favouriteStationsArriva") || "[]"
      );

      if (distance < 5 || search) {
        if (
          search &&
          !normalizeText(station.name.toLowerCase()).includes(
            normalizeText(query.toLowerCase())
          )
        )
          continue;
        let cornot = "";
        if (station.gtfs_id.match(/\d+/)[0] % 2 == 0) {
          cornot = '<md-icon class="center">adjust</md-icon>';
        }
        let fav = "";
        if (favList.includes(station.gtfs_id.match(/\d+/)[0])) {
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
        const openStation = async () => {
          await stationClick(station);
          interval = setInterval(async () => {
            await stationClick(null, true);
          }, 10000);
        };
        item.addEventListener("click", openStation);
        item = null;

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
}

function createFavourite(parent, search, query) {
  var nearby = {};
  if (latitude == 46.051467939339034)
    parent.innerHTML +=
      "<p><md-icon>location_off</md-icon>Lokacija ni omogočena.</p>";
  const favList = JSON.parse(
    localStorage.getItem("favouriteStationsArriva") || "[]"
  );
  for (const station of stationList) {
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
      '<span class="stationName">' + station.name + "</span>";

    if (favList.includes(station.gtfs_id.match(/\d+/)[0]) || search) {
      if (
        search &&
        !normalizeText(station.name.toLowerCase()).includes(
          normalizeText(query.toLowerCase())
        )
      )
        continue;
      const distance = haversineDistance(
        latitude,
        longitude,
        station.lat,
        station.lon
      );
      let cornot = "";
      if (station.gtfs_id.match(/\d+/)[0] % 2 == 0) {
        cornot = '<md-icon class="center">adjust</md-icon>';
      }
      let fav = "";
      if (favList.includes(station.gtfs_id.match(/\d+/)[0])) {
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

      const openStation = async () => {
        await stationClick(station);
        interval = setInterval(async () => {
          await stationClick(null, true);
        }, 10000);
      };
      item.addEventListener("click", openStation);
      item = null;

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
}
async function searchRefresh() {
  let query = document.querySelector(".search").value;
  createStationItems();
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
var arrivalsScroll;
async function stationClick(stationa, noAnimation, ia) {
  if (document.querySelector(".arrivalsOnStation")) return;

  let station = stationa ? stationa : isArrivalsOpen;
  console.log(stationa);
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
  var favList = JSON.parse(
    localStorage.getItem("favouriteStationsArriva") || "[]"
  );
  var mapca;
  var fav;
  if (noAnimation) {
    data = await fetchData(
      `https://api.beta.brezavta.si/stops/${encodeURIComponent(
        station.gtfs_id
      )}/arrivals?current=true`
    );
    if (ia) {
      document.querySelector(".arrivalsHolder").style.transform =
        "translateX(0)";
      document.querySelector(".arrivalsHolder").style.opacity = "1";
      //showLines(document.querySelector(".timeTScroll"), station);
    }
    let cornot = "";
    if (station.code % 2 == 0)
      cornot = '<md-icon class="center">adjust</md-icon>';
    //document.querySelector(".title span").innerHTML = station.name + cornot;
    document.querySelector(".titleHolder").innerHTML +=
      "<div class=none></div>";
    document.querySelector(".mapca").addEventListener("click", function () {
      oppositeStation(station.code);
    });
    let favi = document.querySelector(".favi");
    favi.innerHTML = favList.includes(station.code)
      ? "<md-icon class=iconFill>favorite</md-icon>"
      : "<md-icon>favorite</md-icon>";

    favi.addEventListener("click", function () {
      if (favList.includes(station.code)) {
        favList = favList.filter((item) => item !== station.code);
        favi.innerHTML = "<md-icon>favorite</md-icon>";
      } else {
        favList.push(station.code);

        favi.innerHTML = "<md-icon class=iconFill>favorite</md-icon>";
      }

      localStorage.setItem("favouriteStationsArriva", JSON.stringify(favList));
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
    createInfoBar(document.querySelector(".mainSheet"), station.code);
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
      window.history.replaceState(null, document.title, location.pathname);
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

    let ttl = addElement("div", title);
    let cornot = "";
    if (station.code % 2 == 0)
      cornot = '<md-icon class="center">adjust</md-icon>';
    ttl.innerHTML = station.name + cornot;
    let hh = addElement("div", title, "titleHolder");
    fav = addElement("md-icon-button", hh, "favi");
    fav.innerHTML = favList.includes(station.code)
      ? "<md-icon class=iconFill>favorite</md-icon>"
      : "<md-icon>favorite</md-icon>";
    fav.addEventListener("click", function () {
      if (favList.includes(station.code)) {
        favList = favList.filter((item) => item !== station.code);
        fav.innerHTML = "<md-icon>favorite</md-icon>";
      } else {
        favList.push(station.code);

        fav.innerHTML = "<md-icon class=iconFill>favorite</md-icon>";
      }

      localStorage.setItem("favouriteStationsArriva", JSON.stringify(favList));
    });
    mapca = addElement("md-icon-button", hh, "mapca");
    mapca.innerHTML = "<md-icon>swap_calls</md-icon>";
    mapca.addEventListener("click", function () {
      oppositeStation(station.code);
    });
    if (station.code % 2 === 0) {
      if (
        stationList.findIndex(
          (obj) => obj.code === String(parseInt(station.code) + 1)
        ) === -1
      ) {
        mapca.setAttribute("disabled", "");
      }
    } else {
      if (
        stationList.findIndex(
          (obj) => obj.code === String(parseInt(station.code) - 1)
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
        //showLines(timeTScroll, station);
      }
      getLocation();
    });
    data = await fetchData(
      `https://api.beta.brezavta.si/stops/${encodeURIComponent(
        station.gtfs_id
      )}/arrivals?current=true`
    );
    arrivalsScroll.style.transform = "translateX(0px) translateY(0px)";
    arrivalsScroll.style.opacity = "1";
  }
  isArrivalsOpen = station;

  showArrivals(data, station.gtfs_id);
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

function showArrivals(data, station_id) {
  let arrivalsScroll = document.getElementById("arrivals-panel");
  clearElementContent(arrivalsScroll);
  arrivalsScroll = null;
  arrivalsScroll = document.getElementById("arrivals-panel");
  let arrivalsList = [];
  if (Object.keys(data).length > 0) {
    for (const arrival of data) {
      let etaDiv;
      if (!arrivalsList.includes(arrival.route_id)) {
        if (minutesFromNow(arrival.arrival_realtime, 1) > 120) continue;
        arrivalsList.push(arrival.route_id);
        let arrivalItem = addElement("div", null, "arrivalItem");
        let busHolder = addElement("div", arrivalItem, "stepIcon");
        let busNumberDiv = addElement("div", busHolder, "busNo2");

        busNumberDiv.style.background = lineToColor(
          parseInt(arrival.route_short_name.split(" ")[0])
        );

        busNumberDiv.textContent = arrival.route_short_name.split(" ")[0];
        let curve = addElement("div", busHolder, "connectingLine");
        curve.style.background =
          " linear-gradient(to bottom, #" +
          adaptColors(arrival.route_color_background) +
          " 15%,RGB(" +
          darkenColor(
            lineToColor(parseInt(arrival.route_short_name.split(" ")[0]), 1),
            5
          ).join(",") +
          ") 100%)";

        let imgHolder = addElement("div", busHolder, "agencyLogo");
        let imgLogo = addElement("img", imgHolder, "");
        imgLogo.src =
          "assets/images/logos_brezavta/" + arrival.agency_id + ".svg";
        imgHolder.style.background =
          "#" + adaptColors(arrival.route_color_background);
        addElement("md-ripple", arrivalItem);
        let arrivalDataDiv = addElement("div", arrivalItem, "arrivalData");

        let tripNameSpan = addElement("span", arrivalDataDiv);
        tripNameSpan.innerHTML = arrival.trip_headsign.replace(
          /(.+?)[-–]/g,
          (_, word) =>
            `<span style="white-space: nowrap;">${word}<md-icon>arrow_right</md-icon></span>`
        );
        arrivalItem.addEventListener("click", () => {
          showBusById(arrival, station_id, data);
        });
        arrivalsScroll.appendChild(arrivalItem);
        etaDiv = addElement(
          "div",
          arrivalItem.querySelector(".arrivalData"),
          "eta"
        );
        etaDiv.id = "arrival_" + arrival.route_short_name.split(" ")[0];
      } else {
        etaDiv = document.getElementById(
          "arrival_" + arrival.route_short_name.split(" ")[0]
        );
      }

      let arrivalTimeRealtime = arrival.arrival_realtime;

      let order = minutesFromNow(arrivalTimeRealtime, 1);

      if (order > 120) continue;

      let arrivalTimeSpan = addElement("span", etaDiv, "arrivalTime");
      let arItem = etaDiv.parentNode.parentNode;
      if (arItem.style.order > order || arItem.style.order == "") {
        arItem.style.order = order;
      }

      if (arrival.realtime) {
        arrivalTimeSpan.innerHTML =
          "<md-icon style='animation-delay:" +
          randomOneDecimal() +
          "s;'>near_me</md-icon>";
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
          arrival.stopIndex == 0 ? "arrivalBlue" : "arrivalRed"
        );
      } else {
        arrivalTimeSpan.innerHTML += minutesFromNow(arrivalTimeRealtime);
      }

      arrivalTimeSpan = null;
    }
  } else {
    arrivalsScroll.innerHTML +=
      "<p><md-icon>no_transfer</md-icon>V naslednji uri ni predvidenih avtobusov.</p>";
  }
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

// Example usage
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
    "translateX(-100vw)";
  let iks = addElement("md-icon-button", container, "iks");
  iks.innerHTML = "<md-icon>arrow_back_ios_new</md-icon>";
  iks.addEventListener("click", function () {
    window.history.replaceState(null, document.title, location.pathname);
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
  /*let info = await fetchData(
    "https://cors.proxy.prometko.si/https://data.lpp.si/api/station/messages?station-code=" +
      station_id
  );
  if (info.length !== 0 && false) {
    let infoTextC = addElement("div", infoBar, "infoTextContainer");
    let infoText = addElement("div", infoTextC, "infoText");
    infoText.innerHTML = decodeURIComponent(info.toString());
  }
    */
  setTimeout(() => {
    infoBar.style.transform = "translateY(0)";
  }, 10);
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

    getMyBusData(null, arrivals, arrival.route_id);
  }
}

window.onpopstate = function (event) {
  document.querySelectorAll(".iks").forEach((iks) => {
    if (iks.getBoundingClientRect().left > 0) iks.click();
  });
};

async function getMyBusData(busId, arrivalsAll, routeId) {
  console.log(arrivalsAll);
  const arrivals = arrivalsAll
    ? arrivalsAll.filter((element) => element.route_id == routeId)
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
  console.log(arrivals);

  let iks = addElement("md-icon-button", myEtaHolder, "iks");
  let myEtaChips = addElement("div", myEtaHolder, "myEtaChips");
  if (arrivals && arrivals.length > 1) {
    for (const arrival of arrivals) {
      if (!isLessThanMinutes(arrival.arrival_realtime, getFormattedDate(), 120))
        continue;
      let arTime = addElement("div", myEtaChips, "arrivalTime");
      arTime.innerHTML = minutesFromNow(arrival.arrival_realtime);
      arTime.busId = arrival.trip_id;
      addElement("md-ripple", arTime);
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
          clickedMyBus(busek, arrival.trip_id, arrival);
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
    let bus = arrivals.find((arrival) =>
      busObject.some((bus) => bus.trip_id === arrival.trip_id)
    );

    clickedMyBus(bus, bus ? bus.trip_id : arrivals[0].trip_id, arrivals[0]);
    intervalBusk = setInterval(() => {
      clickedMyBus(bus, bus ? bus.trip_id : arrivals[0].trip_id, arrivals[0]);
    }, 10000);
    return;
  }

  //get buse based on location (removed)
}
async function clickedMyBus(bus, tripId, arrival) {
  let arOnS1 = await fetchData(
    `https://api.beta.brezavta.si/trips/${encodeURIComponent(tripId)}`
  );
  let arOnS = arOnS1.stop_times;

  let myBusDiv = document.querySelector(".myBusDiv");
  let scrollPosition = myBusDiv.scrollTop;

  clearElementContent(myBusDiv);
  myBusDiv = document.querySelector(".myBusDiv");

  let arrivalItem = addElement("div", myBusDiv, "arrivalItem");
  arrivalItem.style.margin = "10px 0";
  let busHolder = addElement("div", arrivalItem, "stepIcon");
  let busNumberDiv = addElement("div", busHolder, "busNo2");

  busNumberDiv.style.background = lineToColor(
    parseInt(arrival.route_short_name.split(" ")[0])
  );

  busNumberDiv.textContent = arrival.route_short_name.split(" ")[0];
  let curve = addElement("div", busHolder, "connectingLine");
  curve.style.background =
    " linear-gradient(to bottom, #" +
    adaptColors(arrival.route_color_background) +
    " 15%,RGB(" +
    darkenColor(
      lineToColor(parseInt(arrival.route_short_name.split(" ")[0]), 1),
      5
    ).join(",") +
    ") 100%)";

  let imgHolder = addElement("div", busHolder, "agencyLogo");
  let imgLogo = addElement("img", imgHolder, "");
  imgLogo.src = "assets/images/logos_brezavta/" + arrival.agency_id + ".svg";
  imgHolder.style.background =
    "#" + adaptColors(arrival.route_color_background);
  let tripNameSpan = addElement("span", arrivalItem);
  tripNameSpan.innerHTML = arOnS1.trip_headsign.replace(
    /(.+?)[-–]/g,
    (_, word) =>
      `<span style="white-space: nowrap;">${word}<md-icon>arrow_right</md-icon></span>`
  );
  let arrivalDataDiv = addElement("div", myBusDiv, "arrivalsOnStation");
  showArrivalsMyBus(arOnS, arrivalDataDiv, arrival);

  myBusDiv.scrollTop = scrollPosition ? scrollPosition : 0;
  myBusDiv.style.transform = "translateY(0px)";
  myBusDiv.style.opacity = "1";
}
function showArrivalsMyBus(info, container, arrival) {
  let holder = addElement("div", container, "arFlex");
  holder.style.display = "flex";
  let color =
    "RGB(" +
    lineToColor(parseInt(arrival.route_short_name.split(" ")[0]), 1).join(",") +
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
          lineToColor(parseInt(arrival.route_short_name.split(" ")[0]), 1),
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
        "<md-icon style='color:RGB(" +
        darkenColor(
          lineToColor(parseInt(arrival.route_short_name.split(" ")[0]), 1),
          100
        ).join(",") +
        ")!important;background-color:" +
        color +
        "'>directions_bus</md-icon>";
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
        "<md-icon style='color:RGB(" +
        darkenColor(
          lineToColor(parseInt(arrival.route_short_name.split(" ")[0]), 1),
          100
        ).join(",") +
        ")!important;background-color:" +
        color +
        "'>directions_bus</md-icon>";
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
          "<md-icon style='color:RGB(" +
          darkenColor(
            lineToColor(parseInt(arrival.route_short_name.split(" ")[0]), 1),
            150
          ).join(",") +
          ")!important;background-color:" +
          color +
          "'>directions_bus</md-icon>";
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
                item + `<sub>${long}</sub>` + "<md-icon>near_me</md-icon>";
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
