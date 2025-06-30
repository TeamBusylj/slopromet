"use strict";

var isArrivalsOpen = false;
var currentPanel;

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

function hoursDay(what) {
  const now = new Date();
  const hoursFromMidnight = now.getHours() + now.getMinutes() / 60;
  const hoursToMidnight = 168;
  return what ? hoursToMidnight.toFixed(2) : hoursFromMidnight.toFixed(2);
}
const randomOneDecimal = () => +(Math.random() * 2).toFixed(1);
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
  console.log("clickedbus");
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
