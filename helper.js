"use strict";

var setSheetHeight;
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
    const scrollList = document.querySelector(".arrivalsOnStation")
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
    (document.querySelector(".arrivalsOnStation")
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
var currentBus = "";
var busObject;
var busMarker = [];
var busImageData;
/**
 * Main loop for fetching bus data and displaying it on the map.
 * @param {boolean} firsttim - Whether this is the first time the loop is run.
 * @param {string} line - The line number of the bus.
 * @param {string} trip - The trip name of the bus.
 * @returns {void}
 */
async function loop(firsttim, arrival, station, arOnSt) {
  console.log(arrival);
  
  if (firsttim) {
    document.querySelector(".loader").style.display = "grid";
    document
      .querySelector(".loader")
      .style.setProperty(
        "--_color",
        "RGB(" + lineColorsObj[arrival.route_name.replace(/\D/g, "")] + ")"
      );
  }
  // Fetch bus data
  let response = await fetchData(
    "https://cors.proxy.prometko.si/https://data.lpp.si/api/bus/buses-on-route?route-group-number=" +
      arrival.route_name
  );

  let tempBusObject = response;

  for (const i in tempBusObject) {
    for (const j in busImageData) {
      if (tempBusObject[i].bus_name.includes(busImageData[j].no)) {
        tempBusObject[i] = {
          ...tempBusObject[i],
          ...busImageData[j],
        };
      }
    }
  }
  busObject = tempBusObject;

  // Create or update markers
  displayBuses(firsttim, arrival, station, arOnSt);
}

var rasterLayer,
  coordinates,
  markers,
  stations,
  iconFeature,
  iconStyle,
  tempMarkersSource,
  busPreviusPosition = {},
  buses = [];
async function displayBuses(firsttim, arrival, station, arrivalsOnRoutes) {
  tempMarkersSource = new ol.source.Vector();
  if (firsttim) {
    stations = await fetchData(
      "https://cors.proxy.prometko.si/https://data.lpp.si/api/route/stations-on-route?trip-id=" +
        arrival.trip_id
    );
    coordinates = await getCoordinates(arrival.trip_id, stations);
  }
  for (const i in busObject) {
    const bus = busObject[i];

    if (bus.trip_id == arrival.trip_id) {
      if (!buses.includes(bus.bus_unit_id)) {
        buses.push(bus.bus_unit_id);
        const coordinates1 = ol.proj.fromLonLat([bus.longitude, bus.latitude]); // Convert to EPSG:3857

        // Create a feature for the bus
        const marker = new ol.Feature({
          geometry: new ol.geom.Point(coordinates1),
        });
        
        // Create a style for the bus with rotation
        const busStyle = new ol.style.Style({
          image: new ol.style.Icon({
            rotateWithView: true,
            anchor: [0.52, 0.5],
            anchorXUnits: "fraction",
            anchorYUnits: "fraction",
            
            src: generateCustomSVG(darkenColor(lineColorsObj[bus.route_number.replace(/\D/g, "")], -100),lineColorsObj[bus.route_number.replace(/\D/g, "")]), // Generate dynamic SVG
            scale:.5,
            rotation: (bus.cardinal_direction * Math.PI) / 180, // Convert degrees to radians
          }),
        });

        marker.busId = bus.bus_unit_id;
        marker.busNo = bus.no;

        marker.setStyle(busStyle);

        tempMarkersSource.addFeature(marker);
        busPreviusPosition[bus.bus_unit_id] = coordinates1;
      } else {
        try {
          let coords = [...coordinates];
          if (coords[0][0][0]) {
            coords = coords.flat(); // Flatten the array if needed
          }
          markers.getSource().forEachFeature(function (feature) {
            if (bus.bus_unit_id === feature.busId) {
              let cordi =  [...coords[findClosestPoint([bus.longitude,
                bus.latitude], coords)]];
                cordi = getDistance(cordi, [bus.longitude, bus.latitude]) > 10 ? [bus.longitude, bus.latitude] : cordi;
               
                
                cordi[0]>cordi[1] ? cordi.reverse() : cordi

              let newCoordinates = ol.proj.fromLonLat(
                cordi
              );



              
              if (
                findClosestPoint([bus.longitude, bus.latitude], coords) >
                  findClosestPoint(
                    ol.proj.toLonLat(feature.getGeometry().getCoordinates()),
                    coords
                  ) ||
                !document.querySelector(".switch").selected
              ) {
                if (!document.querySelector(".switch").selected) {
                  now = new Date().getTime();

                  const animate = () => {
                    const shouldContinue = moveMarker(
                      feature,
                      newCoordinates,
                      (bus.cardinal_direction * Math.PI) / 180
                    );

                    // Re-render map for smooth animation
                    map.render();

                    if (shouldContinue) {
                      requestAnimationFrame(animate); // Continue animation
                    }
                  };

                  animate(); // Start animation loop
                } else {
                  feature.getGeometry().setCoordinates(coords);
                }

                busPreviusPosition[bus.bus_unit_id] = newCoordinates;
              }

              if (document.querySelector(".switch").selected){
                const spanText = arrivalsOnRoutes[
                  bus.bus_unit_id.toLowerCase()
                ].map((item) =>
                  item === null ? null : item.match(/^(\d+)/)?.[1] || null
                );
                moveBus(
                  feature,
                  bus.ground_speed,
                  stations.at(-1),
                  spanText,
                  arrivalsOnRoutes.stations
                );
              }
                
            }
          });
        } catch (error) {
          console.log(error);
        }
      }
    }
  }
  map.on("click", function (evt) {
    const feature = map.forEachFeatureAtPixel(evt.pixel, function (feature) {
      return feature;
    });
    if (feature && feature.busNo) {
      let holder = document.querySelector(".busImg");
      holder.innerHTML = "<span><md-ripple></md-ripple>&#10005;</span>"
      setTimeout(() => {
        holder.style.opacity = 1
      }, 100);
      
      holder.style.display = "flex";
      let img = addElement("img", holder, "busImgElement");
      img.src =
        "https://mestnipromet.cyou/tracker/img/avtobusi/" +
        feature.busNo +
        ".jpg";
      holder.querySelector("span").onclick = () => {
        setTimeout(() => {
           holder.style.display = "none"
          img.remove()
           holder = null;
           img = null;
        }, 300);
        holder.style.opacity = 0
       
      };
     
    }
  });

  if (firsttim) {
    await generateRouteVector(
      stations,
      arrival.trip_id,
      arrival.route_name,
      station,
      [...coordinates]
    );
  } else {
    document.querySelector(".loader").style.backgroundSize = "0% 0%";
    setTimeout(() => {
      document.querySelector(".loader").style.display = "none";
      document.querySelector(".loader").style.backgroundSize = "40% 40%";
    }, 300);
  }
}
async function generateRouteVector(
  data,
  trip_id,
  lno,
  stationID,
  coordinatesRoute
) {
  if (trip_id === undefined) return;
  let coords1 = [...coordinates];
  if (coords1[0][0][0]) {
    coords1 = coords1.flat(); // Flatten the array if needed
  }
  
 
    for (const i of coords1) {
     
      if (i[0] < i[1]) {
      i.reverse();

  }
    }

  
  // Create new vector sources for stations and routes
  const tempStationSource = new ol.source.Vector();
  const tempRouteSource = new ol.source.Vector();

  // Add station markers
  data.forEach((station, index) => {
    
    let loca = [...coords1[findClosestPoint( [station.latitude, station.longitude], coords1)]]
    loca =  loca.reverse()
   // console.log(loca,coords1);
    
    const stationFeature = new ol.Feature({
      geometry: new ol.geom.Point(
        ol.proj.fromLonLat(loca)
      ),
      name: station.name,
      order: station.order_no,
      code: station.station_code,
      color: lineColorsObj[lno.replace(/\D/g, "")],
    });

    // Set styles for stations
    stationFeature.setStyle(
      new ol.style.Style({
        image: new ol.style.Circle({
          radius: 6, // Adjust size as needed
          fill: new ol.style.Fill({
            color:
              station.station_code == stationID
                ? darkenColor(lineColorsObj[lno.replace(/\D/g, "")], -50)
                : darkenColor(lineColorsObj[lno.replace(/\D/g, "")], 100),
          }),
          stroke: new ol.style.Stroke({
            color: lineColorsObj[lno.replace(/\D/g, "")], // Border color
            width: 3, // Border width
          }),
        }),
      })
    );

    tempStationSource.addFeature(stationFeature);
  });

  let lineStrings = [];

  // Check if the geojson_shape is a MultiLineString or a LineString
  const hasLongSubarray = (arr) =>
    arr.some((sub) => Array.isArray(sub) && sub.length > 2);
  if (hasLongSubarray(coordinatesRoute)) {
    for (const j of coordinatesRoute) {
      if (j[0][0] > j[0][1]) {
        for (const i of j) {
         i.reverse();
        }
      }
    }
    

    // For MultiLineString, iterate over each array of coordinates
    lineStrings = coordinatesRoute.map((coordinatesa) => {
      return new ol.geom.LineString(
        coordinatesa.map((c) => {
          return ol.proj.fromLonLat(c);
        })
      );
    });
  } else {
    if (coordinatesRoute[0][0] > coordinatesRoute[0][1]) {
      for (const i in coordinatesRoute) {
        coordinatesRoute[i].reverse();
      }
    }

    // For a single LineString, just create a single geometry
    lineStrings = [
      new ol.geom.LineString(
        coordinatesRoute.map((c) => {
          return ol.proj.fromLonLat(c);
        })
      ),
    ];
  }
  // Add features to the source
  lineStrings.forEach((line, index) => {
    const routeFeature = new ol.Feature({
      geometry: line,
    });

    // Set styles based on index or a color object
    routeFeature.setStyle(
      new ol.style.Style({
        stroke: new ol.style.Stroke({
          color: lineColorsObj[lno.replace(/\D/g, "")],
          width: 7,
        }),
      })
    );
    // Add the feature to the route source
    tempRouteSource.addFeature(routeFeature);
  });

  if (busVectorLayer) {
    map.removeLayer(busVectorLayer);
  }
  busVectorLayer = new ol.layer.Vector({
    source: tempRouteSource,
    updateWhileInteracting: true,
    style: {},
  });
  busVectorLayer.trip = trip_id;
  map.addLayer(busVectorLayer);

  if (busStationLayer) {
    map.removeLayer(busStationLayer);
  }
  busStationLayer = new ol.layer.Vector({
    source: tempStationSource,
    updateWhileInteracting: true,
    style: {},
  });
  map.addLayer(busStationLayer);
  markers = new ol.layer.Vector({
    source: tempMarkersSource,
    updateWhileInteracting: true,
    style: {},
  });
  map.addLayer(markers);
  setTimeout(() => {
    centerBus();
  }, 100);
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
async function getCoordinates(trip_id, data) {
  let coordinates = await fetchData(
    "https://mestnipromet.cyou/api/v1/resources/buses/shape?trip_id=" + trip_id
  );
  //!coordinates || coordinates.length == 0
  if (true) {
    let coords = "";
    for (const i in data) {
      coords += data[i].longitude + "," + data[i].latitude + ";";
    }
    coordinates = await (
      await fetch(
        "https://cors.proxy.prometko.si/https://router.project-osrm.org/route/v1/driving/" +
          coords.substring(0, coords.length - 2) +
          "?overview=full&geometries=geojson",
        {
          headers: {
            apiKey: "D2F0C381-6072-45F9-A05E-513F1515DD6A",
            Accept: "Travana",
          },
        }
      )
    ).json();

    coordinates = coordinates.routes[0].geometry.coordinates;
  }
  return coordinates;
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

function moveBus(busMarker, speed, stationID, arrivals, stationsList) {
  let dirWay = getWay(stationList);
  var nextStationGlobal;
  var io = false;
  let coords = [...coordinates];
  if (coords[0][0][0]) {
    coords = coords.flat(); // Flatten the array if needed
  }
  if (!dirWay) {
    coords = coords.reverse();
  }

  let currentIndex = findClosestPoint(
    ol.proj.toLonLat(busMarker.getGeometry().getCoordinates()),
    coords
  );

  // Get the closest coordinate and the next station coordinates
  let currentCoord = coords[currentIndex];
  let nextIndex = currentIndex + 1;

  if (nextIndex >= coords.length) {
    console.log("Bus has reached the last coordinate.");
    return; // Stop if we've reached the last coordinate
  }

  let nextCoord = coords[nextIndex];

  // Get the time to next station from arrivals (assuming it's in minutes)
  let minToNextStation = arrivals.filter((item) => item !== null)[0]; // Get time to the next station
  if (!minToNextStation) return; // No valid time available for the next station

  // Find the station arrival status for the next station
  const nextStationArrival =
    arrivals[stationsList[arrivals.indexOf(minToNextStation)]];
  if (arrivals.indexOf(minToNextStation) !== nextStationGlobal) {
    nextStationGlobal = arrivals.indexOf(minToNextStation);
  }
  // If next station arrival is "P" (indicating the bus should wait), stop the bus
  if (
    nextStationGlobal &&
    stationsList[nextStationGlobal][0] > stationsList[nextStationGlobal][1]
  ) {
    stationsList[nextStationGlobal].reverse();
  }

  if (nextStationGlobal && arrivals[nextStationGlobal] == "P") {
    console.log("Bus is waiting at the station...");
    io = true;
    busMarker
      .getGeometry()
      .setCoordinates(
        ol.proj.fromLonLat([
          stationsList[nextStationGlobal][0],
          stationsList[nextStationGlobal][1],
        ])
      );

    return;
  }

  // Calculate the distance to the next station and time to next station
  let distanceToNextStation = getDistance(currentCoord, nextCoord);

  // Calculate speed per second based on time to next station and distance
  const timeToNextStationInSeconds = minToNextStation * 60; // Convert minutes to seconds
  const realWorldSpeedInMetersPerSecond =
    distanceToNextStation / timeToNextStationInSeconds; // Real-world speed in meters per second

  // Use the real-world speed to adjust bus movement
  const speedFactor = speed / 100; // Adjust speed slightly based on provided speed argument (speedFactor can be tweaked)
  const adjustedSpeedInMetersPerSecond =
    realWorldSpeedInMetersPerSecond * speedFactor;

  // Duration for the bus to move (using 5-second intervals)
  let duration = 5000; // Duration in milliseconds for each move
  let startTime = performance.now();

  const style = busMarker.getStyle();
  const image = style.getImage();

  function move(timestamp) {
    if (
      nextStationGlobal &&
      findClosestPoint(
        ol.proj.toLonLat(busMarker.getGeometry().getCoordinates()),
        coords
      ) == findClosestPoint(stationsList[nextStationGlobal], coords)
    ) {
      console.log("Bus went too far...");
      if (arrivals[nextStationGlobal] == "P") {
        busMarker
          .getGeometry()
          .setCoordinates(
            ol.proj.fromLonLat([
              stationsList[nextStationGlobal][0],
              stationsList[nextStationGlobal][1],
            ])
          );
      }
      io = true;
      return;
    }

    let elapsedTime = timestamp - startTime;
    let fraction = Math.min(elapsedTime / duration, 1); // Normalize progress

    if (!io) {
      // Update the bus marker's position
      busMarker
        .getGeometry()
        .setCoordinates(
          ol.proj.fromLonLat([
            currentCoord[0] + (nextCoord[0] - currentCoord[0]) * fraction,
            currentCoord[1] + (nextCoord[1] - currentCoord[1]) * fraction,
          ])
        );

      // Rotate the bus marker based on the direction of movement

      image.setRotation(calculateDirection(currentCoord, nextCoord));
    }
    if (fraction < 1) {
      requestAnimationFrame(move); // Continue moving until we reach the destination
    } else {
      // If the bus has reached the next coordinate, update to the next index
      currentIndex++;
      if (currentIndex < coords.length - 1) {
        currentCoord = coords[currentIndex];
        nextCoord = coords[currentIndex + 1];
        distanceToNextStation = getDistance(currentCoord, nextCoord); // Recalculate distance
        startTime = performance.now(); // Reset start time for the next movement
        //requestAnimationFrame(move); // Continue moving
      }
    }
  }

  requestAnimationFrame(move);
}
function getWay(stationsList) {
  if (stationsList.at(-1)[0] > stationsList.at(-1)[1]) {
    stationsList.at(-1).reverse();
  }
  let coords2 = [...coordinates].flat();

  if (
    findClosestPoint(stationsList.at(-1), coords2) <
    findClosestPoint(stationsList.at(0), coords2)
  ) {
    return false;
  }
  return true;
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

// Calculate distance between two coordinates (Haversine formula)
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

function centerBus() {
  const myExtent = busVectorLayer.getSource().getExtent();
  const view = map.getView();
  /*var resolution = view.getResolutionForExtent(myExtent);
  var zoom = view.getZoomForResolution(resolution);
  var center = ol.extent.getCenter(myExtent);
  var duration = 1000;
  view.animate({
    center: center,
    duration: duration,
  });
  view.animate({
    zoom: zoom,
    duration: duration,
  });*/
  view.fit(myExtent, { duration: 750 });
  document.querySelector(".loader").style.backgroundSize = "0% 0%";
  setTimeout(() => {
    document.querySelector(".loader").style.display = "none";
    document.querySelector(".loader").style.backgroundSize = "40% 40%";
  }, 300);
}
const darkenColor = (rgbArray, amount) =>
  rgbArray.map((channel) => Math.max(0, channel - amount));

const lineColors = (i) => {
  let color = lineColorsObj[i.replace(/\D/g, "")]; // Example: [201, 51, 54]

  if (!color) color = [201, 51, 54]; // Return empty string if the index is not found
  if (/[a-zA-Z]/.test(i)) color = darkenColor(color, 40);

  let darkerColor = darkenColor(color, 70);

  return i.includes("N")
    ? `linear-gradient(320deg,rgb(0,0,0)10%,rgb(${color.join(
        ","
      )})160%) `
    : `linear-gradient(165deg,rgb(${color.join(",")}),rgb(${darkerColor.join(
        ","
      )}))`;
};
async function fetchData(url) {
  return (
    await (
      await fetch(url, {
        headers: {
          apiKey: "D2F0C381-6072-45F9-A05E-513F1515DD6A",
          Accept: "Travana",
        },
      })
    ).json()
  ).data;
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
