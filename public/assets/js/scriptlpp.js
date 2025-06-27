"use strict";

async function updateStations(t) {
  console.log(agency);
  let url =
    "https://lpp.ojpp.derp.si/api/station/station-details?show-subroutes=1";

  if (localStorage.getItem("stationList") && !t) {
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
        "<p><mdui-icon name=location_off></mdui-icon>Lokacija ni omogočena.</p>";
    for (const station in stationList) {
      if (
        search &&
        !normalizeText(stationList[station].name.toLowerCase()).includes(
          normalizeText(query.toLowerCase())
        )
      )
        continue;
      let item = addElement("mdui-card", null, "station");
      item.clickable = true;
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
          cornot =
            '<mdui-icon name=adjust--outlined class="center"></mdui-icon>';
        }
        let fav = "";
        if (favList.includes(stationList[station].ref_id)) {
          fav =
            '<mdui-icon name=favorite--outlined class="iconFill"></mdui-icon>';
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
        item.addEventListener("click", () => {
          stationClick(station);
        });
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
        addElement("mdui-ripple", arrivalItem);

        let tripNameSpan = addElement("span", arrivalDataDiv);
        tripNameSpan.textContent = line.route_name;
        arrivalItem.addEventListener("click", () => {
          document.querySelector(".searchContain").style.transform =
            "translateX(-100vw) translateZ(1px)";
          document.getElementById("tabsFav").style.transform =
            "translateX(-100vw) translateZ(1px)";

          let line2 = line;
          line2.route_name = line.route_number;
          showBusById(line2, 60);
          setTimeout(() => {
            let busObject2 = busObject.map((obj) => ({
              ...obj,
              vehicle_id: obj.bus_id,
            }));
            busObject2 = busObject2.filter(
              (element) => element.trip_id == line2.trip_id
            );
            busObject2 = busObject2.length ? busObject2 : null;
            getMyBusData(null, busObject2, line2.trip_id, line2);
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
      "<p><mdui-icon name=location_off></mdui-icon>Lokacija ni omogočena.</p>";
  const favList = JSON.parse(localStorage.getItem("favouriteStations") || "[]");
  for (const station in stationList) {
    if (favList.length == 0 && !search) {
      let p = addElement("p", parent);
      p.innerHTML =
        "<p><mdui-icon name=favorite></mdui-icon>Nimate priljubljenih postaj.</p>";
      break;
    }
    let item = addElement("mdui-card", null, "station");
    item.clickable = true;
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
        cornot = '<mdui-icon name=adjust--outlined class="center"></mdui-icon>';
      }
      let fav = "";
      if (favList.includes(stationList[station].ref_id)) {
        fav =
          '<mdui-icon name=favorite--outlined class="iconFill"></mdui-icon>';
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
        buses.innerHTML += `<div class=busNo style=background:${lineColors(
          bus
        )}>${bus}</div>`;
      }

      item.appendChild(buses);

      item.addEventListener("click", () => {
        stationClick(station);
      });
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

        let tripNameSpan = addElement("span", arrivalDataDiv);
        tripNameSpan.textContent = line.route_name;
        arrivalItem.addEventListener("click", () => {
          document.querySelector(".searchContain").style.transform =
            "translateX(-100vw) translateZ(1px)";
          document.getElementById("tabsFav").style.transform =
            "translateX(-100vw) translateZ(1px)";

          let line2 = line;
          line2.route_name = line.route_number;
          showBusById(line2, 60);
          setTimeout(() => {
            let busObject2 = busObject.map((obj) => ({
              ...obj,
              vehicle_id: obj.bus_id,
            }));
            busObject2 = busObject2.filter(
              (element) => element.trip_id == line2.trip_id
            );
            busObject2 = busObject2.length ? busObject2 : null;
            getMyBusData(null, busObject2, line2.trip_id, line2);
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
  if (query.includes("migrated")) {
    window.location.href = query;
    return;
  }
  createStationItems(true, query);
}

var interval;

async function oppositeStation(id) {
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

const delayedSearch = debounce(searchRefresh, 300);
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

  let ttl = addElement("span", title);
  let cornot = "";
  if (station.ref_id % 2 !== 0)
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
  showLines(document.getElementById("time-panel"), station);

  showStationOnMap(station.latitude, station.longitude, station.name);

  isArrivalsOpen = station;
  showArrivals(station.ref_id);
  interval = setInterval(async () => {
    showArrivals(station.ref_id, true);
  }, 10000);
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

async function showArrivals(ref_id, repeated) {
  var data = await fetchData(
    "https://lpp.ojpp.derp.si/api/station/arrival?station-code=" + ref_id
  );
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
        if (arrival.depot) arrivalTimeSpan.innerHTML += "G";

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

        let busNumberDiv = addElement("div", arrivalItem, "busNo2");

        busNumberDiv.style.background = lineColors(arrival.route_name);

        busNumberDiv.id = "bus_" + arrival.route_name;
        busNumberDiv.textContent = arrival.route_name;
        listOfArrivals.push(arrival.trip_id);
        let arrivalDataDiv = addElement("div", arrivalItem, "arrivalData");
        addElement("mdui-ripple", arrivalItem);

        let tripNameSpan = addElement("span", arrivalDataDiv);
        tripNameSpan.textContent = arrival.stations.arrival;

        let etaDiv = addElement("div", arrivalDataDiv, "eta");
        etaDiv.id = "eta_" + arrival.route_name;

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
      "<p><mdui-icon name=no_transfer--outlined></mdui-icon>V naslednji uri ni predvidenih avtobusov.</p>";
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
      arrivalItem.style.order =
        arrival.route_number[0] == "N"
          ? arrival.route_number.replace(/\D/g, "") + 100
          : arrival.route_number.replace(/\D/g, "");
      const busNumberDiv = addElement(
        "mdui-button-icon",
        arrivalItem,
        "busNo2",
        "style=height:auto"
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
        tabs.innerHTML += `<mdui-tab value="tab-${key.slice(
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
    })
    .catch((error) => {
      console.error("Error:", error);
      tabs.innerHTML =
        "Zgodila se je napaka med pridobivanjem podatkov o odhodih.";
    });
}

function hoursDay(what) {
  const now = new Date();
  const hoursFromMidnight = now.getHours() + now.getMinutes() / 60;
  const hoursToMidnight = 168;
  return what ? hoursToMidnight.toFixed(2) : hoursFromMidnight.toFixed(2);
}
const randomOneDecimal = () => +(Math.random() * 2).toFixed(1);
function transformToDelavnikTimes(data) {
  const result = {
    Delavnik: {
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
  result.Delavnik.times = Array.from(hoursMap.values());

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

/**
 * Populates the parent element with bus arrival information, specifically for the next bus.
 * Adds a new element for each arrival in the list if its ETA is greater than 1 minute.
 * The first valid arrival is marked as the next bus, and further arrivals are skipped.
 *
 * @param {Array} arrivals - The list of arrival objects containing bus information.
 * @param {HTMLElement} parent - The parent element to which the arrival items will be appended.
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
  setTimeout(() => {
    infoBar.style.transform = "translateY(0)";
  }, 10);
  return infoBar;
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

    getMyBusData(null, arrivals, arrival.trip_id);
  }
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
    let bus = busObject.find(
      (el) =>
        el.bus_id == (busId ? busId : arrivals[0].vehicle_id.toUpperCase())
    );

    await clickedMyBus(bus, arrivals ? arrivals[0].trip_id : bus.trip_id);
    holder.style.opacity = "1";
    holder.style.transform = "translateX(0px) translateY(0px)";
    intervalBusk = setInterval(() => {
      updateMyBus(bus, arrivals ? arrivals[0].trip_id : bus.trip_id);
    }, 10000);
    window.refreshMyBus = async () => {
      await updateMyBus(bus, arrivals ? arrivals[0].trip_id : bus.trip_id);
    };

    return;
  } else {
    stationsOnRoute(line, myBusDiv);
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
  arrivalItem.style.margin = "15px 0";
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
  setTimeout(() => {
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
  }, 100);
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
    arDiv.style.viewTransitionName = (arrivalRoute.name + arrivalRoute.order_no)
      .toLowerCase()
      .replace(/ /g, "_");
    let ar = arrivalRoute.arrivals.find(
      (el) => el.vehicle_id == busIdUp.toLowerCase()
    );

    try {
      if (!ar) {
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
        "<mdui-icon name='directions_bus--outlined' style='view-transition-name:busIcon;color:RGB(" +
        darkenColor(
          lineColorsObj[arrival.line_number.replace(/\D/g, "")],
          100
        ).join(",") +
        ")!important;background-color:RGB(" +
        lineColorsObj[arrival.line_number.replace(/\D/g, "")].join(",") +
        ")'></mdui-icon>";
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
          "<mdui-icon name='directions_bus--outlined' style='view-transition-name:busIcon;color:RGB(" +
          darkenColor(
            lineColorsObj[arrival.line_number.replace(/\D/g, "")],
            100
          ).join(",") +
          ")!important;background-color:RGB(" +
          lineColorsObj[arrival.line_number.replace(/\D/g, "")].join(",") +
          ")'></mdui-icon>";
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
    let imageLoaded = new Promise((resolve, reject) => {
      img.onload = resolve;
      img.onerror = reject;
    });
    img.src =
      "https://mestnipromet.cyou/tracker/img/avtobusi/" + bus.no + ".jpg";
    await imageLoaded;
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
