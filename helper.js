'use strict';

var setSheetHeight
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
var canGo = true
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
  
  if ( sheetHeight !== 98)scrollList.style.overflow = "hidden";
  if((scrollList.scrollTop>1 && sheetHeight == 98) && !event.target.closest(".handleHolder") )canGo=undefined;
  if( !event.target.closest(".bottomSheet"))canGo=undefined;
  bottomSheet.style.willChange = "transform";
  }
  const onDragMove = (event) => {
    if (!dragPosition) return;
    if (!canGo) return;
      const y = touchPosition(event).pageY;
      var deltaY = dragPosition - y;
      if(sheetHeight == 98 && deltaY > 0) return;
      if (sheetHeight < 40 && deltaY < 0) {
        deltaY = deltaY / formatNumber(y);
      }
      const deltaHeight = (deltaY / window.innerHeight) * 100;

      

      dragPosition = y;
     
        setSheetHeight(sheetHeight + deltaHeight)
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
canGo = true
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
   })
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
async function loop(firsttim, arrival, station) {
  
  

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
  displayBuses(firsttim, arrival, station);
}

var 
  rasterLayer,
  coordinates, 
  markers,
  stations,
  iconFeature,
  iconStyle,
  tempMarkersSource,
  busPreviusPosition = {},
  buses = [];
async function displayBuses(firsttim, arrival, station) {
 tempMarkersSource = new ol.source.Vector();
 if(firsttim) {
   

 stations = await fetchData(
  "https://cors.proxy.prometko.si/https://data.lpp.si/api/route/stations-on-route?trip-id=" +
    arrival.trip_id
);
 coordinates = await getCoordinates( arrival.trip_id, stations)
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
            anchor: [0.5, 0.5],
            anchorXUnits: "fraction",
            anchorYUnits: "fraction",
            src: bus.model.includes("MAN Lion's City G CNG-H")
              ? "./images/busimg_lion.svg"
              : "./images/busimg.svg",
            scale: 0.2,
            rotation: (bus.cardinal_direction * Math.PI) / 180, // Convert degrees to radians
          }),
        });

        marker.busId = bus.bus_unit_id;
        marker.busNo = bus.no;

        marker.setStyle(busStyle);

       
        tempMarkersSource.addFeature(marker);
        busPreviusPosition[bus.bus_unit_id] = coordinates1
     
      } else {
        try {
          markers.getSource().forEachFeature(function (feature) {
        

            if (bus.bus_unit_id === feature.busId) {
              let newCoordinates = ol.proj.fromLonLat([
                bus.longitude,
                bus.latitude,
              ]);
            
              
              if(busPreviusPosition[bus.bus_unit_id][0]-newCoordinates[0] !== 0 ||  bus.ground_speed<5){
                //console.log(busPreviusPosition[bus.bus_unit_id][0]-newCoordinates[0], busPreviusPosition[bus.bus_unit_id][1]-newCoordinates[1]);

             
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
                
               //feature.getGeometry().setCoordinates(newCoordinates);
                busPreviusPosition[bus.bus_unit_id] = newCoordinates
              }
              if(bus.ground_speed>5 && document.querySelector(".switch").selected)moveBus(feature, bus.ground_speed, stations.at(-1))
              
              
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
      holder.innerHTML = "";
      holder.style.display = "flex";
      let img = addElement("img", holder, "busImgElement");
      img.src =
        "https://mestnipromet.cyou/tracker/img/avtobusi/" +
        feature.busNo +
        ".jpg";
      img.onclick = () => (holder.style.display = "none");
    }
  });

  if (firsttim) {
    
   
    await generateRouteVector(
      stations,
      arrival.trip_id,
      arrival.route_name,
      station,
      coordinates
    );
  } else {
    document.querySelector(".loader").style.backgroundSize = "0% 0%";
    setTimeout(() => {
      document.querySelector(".loader").style.display = "none";
      document.querySelector(".loader").style.backgroundSize = "40% 40%";
    }, 300);
  }

}
async function generateRouteVector(data, trip_id, lno, stationID, coordinatesRoute) {

  
  if (trip_id === undefined) return;


  // Create new vector sources for stations and routes
  const tempStationSource = new ol.source.Vector();
  const tempRouteSource = new ol.source.Vector();

  // Add station markers
  data.forEach((station, index) => {
    const stationFeature = new ol.Feature({
      geometry: new ol.geom.Point(
        ol.proj.fromLonLat([station.longitude, station.latitude])
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
                color: station.station_code == stationID
                    ? darkenColor(lineColorsObj[lno.replace(/\D/g, "")], -50)
                    : darkenColor(lineColorsObj[lno.replace(/\D/g, "")], 100)
            }),
            stroke: new ol.style.Stroke({
                color: lineColorsObj[lno.replace(/\D/g, "")], // Border color
                width: 3 // Border width
            })
        })
    })
    );
    
    tempStationSource.addFeature(stationFeature);
  });

  let lineStrings = [];

  // Check if the geojson_shape is a MultiLineString or a LineString
  const hasLongSubarray = (arr) =>
    arr.some((sub) => Array.isArray(sub) && sub.length > 2);
  if (hasLongSubarray(coordinatesRoute)) {
    for (const j in coordinatesRoute) {
      if (j[0][0] < j[0][1]) {
        for (const i in coordinatesRoute) {
          coordinatesRoute[j][i].reverse();
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
async function getCoordinates(trip_id, data) {
  let coordinates = await fetchData(
    "https://mestnipromet.cyou/api/v1/resources/buses/shape?trip_id=" + trip_id
  );

  
  if (!coordinates || coordinates.length == 0) {
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
      marker.getGeometry().getCoordinates()[0] + (newCoord[0] - marker.getGeometry().getCoordinates()[0]) * fraction,
      marker.getGeometry().getCoordinates()[1] + (newCoord[1] - marker.getGeometry().getCoordinates()[1]) * fraction,
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
function moveBus(busMarker, speed, stationID) {

  let coords = [...coordinates];
  if(coords[0][0][0]) {
    coords=coords.flat()
  }

  
  let currentIndex = findClosestPoint(ol.proj.toLonLat(busMarker.getGeometry().getCoordinates()), coords);
  
  
  
  let speedPerSecond = (speed * 1000) / 3600; // Convert km/h to meters per second
  let maxDistance = speedPerSecond * 5; // Total distance to travel in 5 seconds

  let traveledDistance = 0;
  let nextIndex = currentIndex;


  // Find the farthest coordinate within maxDistance
  while (nextIndex < coords.length - 1 && traveledDistance < maxDistance) {
      traveledDistance += getDistance(coords[nextIndex], coords[nextIndex + 1]);
     nextIndex++; 
  }
  nextIndex = nextIndex - Math.floor((nextIndex-currentIndex)/2);
  let nowCoord = [...coords[currentIndex]]; // Convert [lon, lat] to [lat, lon]
  let nextCoord = [...coords[nextIndex]];
  if(nowCoord[0] < nowCoord[1]) {
    nowCoord.reverse()
    nextCoord.reverse()
  }

  
  let duration = 3000; // Move over 5 seconds
  let start = performance.now();
  const style = busMarker.getStyle();
  const image = style.getImage();
  function move(timestamp) {
      let elapsed = timestamp - start;
      let fraction = Math.min(elapsed / duration, 1); // Normalize progress

      busMarker.getGeometry().setCoordinates(ol.proj.fromLonLat([
        nowCoord[1] + (nextCoord[1] - nowCoord[1]) * fraction,
        nowCoord[0] + (nextCoord[0] - nowCoord[0]) * fraction
        
          
      ]));
      
      
    image.setRotation(calculateDirection(nowCoord, nextCoord)); // Use the provided direction for rotation
  
      if (fraction < 1) requestAnimationFrame(move);
  }

  requestAnimationFrame(move);
}
function getDirLine(currentIndex, station) {
  
  
 
  let searchArray = [ station.latitude,station.longitude];
  searchArray = coordinates[findClosestPoint(searchArray, coordinates)]

  let index = coordinates.findIndex(arr => 
    arr.length === searchArray.length && arr.every((val, index) => val === searchArray[index])
  );
  if(index !== -1) {
    searchArray.reverse()
    index = coordinates.findIndex(arr => 
      arr.length === searchArray.length && arr.every((val, index) => val === searchArray[index])
    );
  }
  console.log(currentIndex,index);
  
  if(index>currentIndex) return 1;
  if(index<currentIndex) return -1;

 
}
function calculateDirection(prevCoord, nextCoord) {
  const x1 = prevCoord[0];
  const y1 = prevCoord[1];
  const x2 = nextCoord[0];
  const y2 = nextCoord[1];

  // Calculate the angle using atan2 in radians
  const angleInRadians = Math.atan2(y2 - y1, x2 - x1);

  return angleInRadians;
}
// Calculate distance between two coordinates (Haversine formula)
function getDistance(coord1, coord2) {
  const R = 6371000; // Earth's radius in meters
  const lat1 = (coord1[1] * Math.PI) / 180;
  const lat2 = (coord2[1] * Math.PI) / 180;
  const deltaLat = ((coord2[1] - coord1[1]) * Math.PI) / 180;
  const deltaLon = ((coord2[0] - coord1[0]) * Math.PI) / 180;

  const a = Math.sin(deltaLat / 2) ** 2 +
            Math.cos(lat1) * Math.cos(lat2) *
            Math.sin(deltaLon / 2) ** 2;
  
  return R * (2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))); // Distance in meters
}


function findClosestPoint(busCoord, routeCoords) {
  let minDist = Infinity, closestIndex = 0;

  
  routeCoords.forEach((coord, index) => {
      let dist = Math.hypot(coord[0] - busCoord[0], coord[1] - busCoord[1]);
      if (dist < minDist) {
          minDist = dist;
          closestIndex = index;
      }
  });
  return closestIndex;
}
// Calculate distance between two coordinates (Haversine formula can be used for more accuracy)


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
  view.fit(myExtent, {duration: 750});
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

  let darkerColor = i.includes("N")
    ? darkenColor(color, 100)
    : darkenColor(color, 70);

  return i.includes("N")
    ? `linear-gradient(320deg,rgb(${darkerColor.join(",")})50%,rgb(${color.join(
        ","
      )})130%) `
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
    "elementType": "geometry",
    "stylers": [
      {
        "color": "#242f3e"
      }
    ]
  },
  {
    "elementType": "labels.text.fill",
    "stylers": [
      {
        "color": "#746855"
      }
    ]
  },
  {
    "elementType": "labels.text.stroke",
    "stylers": [
      {
        "color": "#242f3e"
      }
    ]
  },
  {
    "featureType": "administrative.land_parcel",
    "elementType": "labels",
    "stylers": [
      {
        "visibility": "off"
      }
    ]
  },
  {
    "featureType": "administrative.locality",
    "elementType": "labels.text.fill",
    "stylers": [
      {
        "color": "#cddaf4"
      }
    ]
  },
  {
    "featureType": "administrative.neighborhood",
    "elementType": "labels.text.fill",
    "stylers": [
      {
        "color": "#9da5b5"
      }
    ]
  },
  {
    "featureType": "poi",
    "elementType": "labels.text",
    "stylers": [
      {
        "visibility": "off"
      }
    ]
  },
  {
    "featureType": "poi",
    "elementType": "labels.text.fill",
    "stylers": [
      {
        "color": "#d59563"
      }
    ]
  },
  {
    "featureType": "poi.business",
    "stylers": [
      {
        "visibility": "off"
      }
    ]
  },
  {
    "featureType": "poi.park",
    "elementType": "geometry",
    "stylers": [
      {
        "color": "#263c3f"
      }
    ]
  },
  {
    "featureType": "poi.park",
    "elementType": "labels.text.fill",
    "stylers": [
      {
        "color": "#6b9a76"
      }
    ]
  },
  {
    "featureType": "road",
    "elementType": "geometry",
    "stylers": [
      {
        "color": "#38414e"
      }
    ]
  },
  {
    "featureType": "road",
    "elementType": "geometry.stroke",
    "stylers": [
      {
        "color": "#212a37"
      }
    ]
  },
  {
    "featureType": "road",
    "elementType": "labels.icon",
    "stylers": [
      {
        "visibility": "off"
      }
    ]
  },
  {
    "featureType": "road",
    "elementType": "labels.text.fill",
    "stylers": [
      {
        "color": "#9ca5b3"
      }
    ]
  },
  {
    "featureType": "road.highway",
    "elementType": "geometry",
    "stylers": [
      {
        "color": "#746855"
      }
    ]
  },
  {
    "featureType": "road.highway",
    "elementType": "geometry.fill",
    "stylers": [
      {
        "color": "#696d69"
      }
    ]
  },
  {
    "featureType": "road.highway",
    "elementType": "geometry.stroke",
    "stylers": [
      {
        "color": "#1f2835"
      }
    ]
  },
  {
    "featureType": "road.highway",
    "elementType": "labels.text.fill",
    "stylers": [
      {
        "color": "#f3d19c"
      }
    ]
  },
  {
    "featureType": "road.local",
    "elementType": "labels",
    "stylers": [
      {
        "visibility": "off"
      }
    ]
  },
  {
    "featureType": "transit",
    "stylers": [
      {
        "visibility": "off"
      }
    ]
  },
  {
    "featureType": "transit",
    "elementType": "geometry",
    "stylers": [
      {
        "color": "#2f3948"
      }
    ]
  },
  {
    "featureType": "transit.station",
    "elementType": "labels.text.fill",
    "stylers": [
      {
        "color": "#d59563"
      }
    ]
  },
  {
    "featureType": "transit.station.bus",
    "stylers": [
      {
        "visibility": "on"
      }
    ]
  },
  {
    "featureType": "transit.station.bus",
    "elementType": "geometry",
    "stylers": [
      {
        "visibility": "on"
      }
    ]
  },
  {
    "featureType": "water",
    "elementType": "geometry",
    "stylers": [
      {
        "color": "#17263c"
      }
    ]
  },
  {
    "featureType": "water",
    "elementType": "labels.text.fill",
    "stylers": [
      {
        "color": "#515c6d"
      }
    ]
  },
  {
    "featureType": "water",
    "elementType": "labels.text.stroke",
    "stylers": [
      {
        "color": "#17263c"
      }
    ]
  }
]
const lightMap = [
  {
    "featureType": "administrative.land_parcel",
    "elementType": "labels",
    "stylers": [
      {
        "visibility": "off"
      }
    ]
  },
  {
    "featureType": "poi",
    "elementType": "labels.text",
    "stylers": [
      {
        "visibility": "off"
      }
    ]
  },
  {
    "featureType": "poi.business",
    "stylers": [
      {
        "visibility": "off"
      }
    ]
  },
  {
    "featureType": "road",
    "elementType": "labels.icon",
    "stylers": [
      {
        "visibility": "off"
      }
    ]
  },
  {
    "featureType": "road.local",
    "elementType": "labels",
    "stylers": [
      {
        "visibility": "off"
      }
    ]
  },
  {
    "featureType": "transit",
    "stylers": [
      {
        "visibility": "off"
      }
    ]
  },
  {
    "featureType": "transit.station.bus",
    "stylers": [
      {
        "visibility": "on"
      }
    ]
  },
  {
    "featureType": "transit.station.bus",
    "elementType": "geometry",
    "stylers": [
      {
        "visibility": "on"
      }
    ]
  },
  {
    "featureType": "transit.station.bus",
    "elementType": "geometry.fill",
    "stylers": [
      {
        "visibility": "on"
      }
    ]
  },
  {
    "featureType": "transit.station.bus",
    "elementType": "geometry.stroke",
    "stylers": [
      {
        "visibility": "on"
      }
    ]
  }
]
