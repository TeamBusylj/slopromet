"use strict";
/**
 * Main loop for fetching bus data and displaying it on the map.
 * @param {boolean} firsttim - Whether this is the first time the loop is run.
 * @param {string} line - The line number of the bus.
 * @param {string} trip - The trip name of the bus.
 * @returns {void}
 */
async function loop(isFirstTime, arrival, station, arOnSt) {
  if (isFirstTime) {
    document.querySelector(".loader").style.display = "grid";
    document
      .querySelector(".loader")
      .style.setProperty(
        "--_color",
        "RGB(" + lineColorsObj[arrival.route_name.replace(/\D/g, "")] + ")"
      );
  }
  busObject = await apiAdapter.getVehicleLocations(arrival);

  if (isFirstTime) {
    tempMarkersSource = new ol.source.Vector();
    stations = await apiAdapter.getStationsOnRoute(arrival);
    coordinates = await apiAdapter.getRouteGeometry(arrival, stations);
    coordinates = coordinates[0].length > 2 ? coordinates.flat() : coordinates;
  }

  await displayBuses(isFirstTime, arrival, station);

  if (!isFirstTime) {
    document.querySelector(".loader").style.backgroundSize = "0% 0%";
    setTimeout(() => {
      document.querySelector(".loader").style.display = "none";
      document.querySelector(".loader").style.backgroundSize = "40% 40%";
    }, 300);
  }
}
let buses = [];
/**
 * Displays buses on the map, creating or updating their markers.
 * @param {boolean} isFirstTime - True if this is the initial drawing.
 * @param {Object} arrival - The arrival object.
 * @param {string} stationId - The ID of the station.
 */
async function displayBuses(isFirstTime, arrival, stationId) {
  if (isFirstTime) {
    tempMarkersSource.clear(); // Clear previous features safely
  }

  for (const bus of busObject) {
    const busId = bus.bus_id;
    if (bus.trip_id !== arrival.trip_id) continue;

    const busCoords = ol.proj.fromLonLat([bus.longitude, bus.latitude]);

    // First time: create marker
    if (isFirstTime || !buses.includes(busId)) {
      if (!buses.includes(busId)) buses.push(busId);

      const marker = new ol.Feature({
        geometry: new ol.geom.Point(busCoords),
      });

      const busStyle = new ol.style.Style({
        image: new ol.style.Icon({
          rotateWithView: true,
          anchor: [0.5, 0.5],
          src: "assets/images/bus_urb.png",
          scale: 0.5,
          rotation: ((bus.direction || 0) * Math.PI) / 180,
        }),
      });

      marker.setStyle(busStyle);
      marker.busId = busId;
      tempMarkersSource.addFeature(marker);
    } else {
      // Animate existing marker
      tempMarkersSource.forEachFeature((feature) => {
        if (feature.busId == busId) {
          moveMarker(
            feature,
            busCoords,
            ((bus.direction || 0) * Math.PI) / 180
          );
        }
      });
    }
  }

  if (isFirstTime) {
    await generateRouteVector(arrival, stationId);
  }
}

/**
 * Draws the route line and station markers on the map.
 * @param {Object} arrival - The arrival object.
 * @param {string} stationId - The ID of the station.
 */
async function generateRouteVector(arrival, stationId) {
  if (!coordinates) return;

  const routeColor =
    agency === "lpp"
      ? lineColorsObj[arrival.route_name.replace(/\D/g, "")]
      : lineToColor(
          parseInt(Math.max(...arrival.route_name.match(/\d+/g).map(Number))),
          1
        );

  const tempStationSource = new ol.source.Vector();
  const tempRouteSource = new ol.source.Vector();
  console.log(darkenColor(routeColor, -50));

  // Draw stations
  stations.forEach((stationData) => {
    const stationFeature = new ol.Feature({
      geometry: new ol.geom.Point(
        ol.proj.fromLonLat([stationData.longitude, stationData.latitude])
      ),
      name: stationData.name,
      color: routeColor,
      txtColor: darkenColor(routeColor, 120),
    });
    stationFeature.setStyle(
      new ol.style.Style({
        image: new ol.style.Circle({
          radius: 7,
          fill: new ol.style.Fill({
            color:
              stationData.station_code == stationId
                ? darkenColor(routeColor, -50)
                : darkenColor(routeColor, 100),
          }),
          stroke: new ol.style.Stroke({ color: routeColor, width: 3 }),
        }),
      })
    );
    tempStationSource.addFeature(stationFeature);
  });

  // Draw route line
  const routeFeature = new ol.Feature({
    geometry: new ol.geom.LineString(
      coordinates.map((c) => {
        return ol.proj.fromLonLat(c[0] < c[1] ? c : c.reverse());
      })
    ),
  });
  routeFeature.setStyle(
    new ol.style.Style({
      stroke: new ol.style.Stroke({
        color: `RGB(${routeColor.join(",")})`,
        width: 7,
      }),
    })
  );
  tempRouteSource.addFeature(routeFeature);

  // Add layers to map

  busVectorLayer = new ol.layer.Vector({
    source: tempRouteSource,
    updateWhileInteracting: true,
  });
  busStationLayer = new ol.layer.Vector({
    source: tempStationSource,
    updateWhileInteracting: true,
  });
  markers = new ol.layer.Vector({ source: tempMarkersSource });
  map.addLayer(busVectorLayer);
  map.addLayer(busStationLayer);
  map.addLayer(markers);

  document.querySelector(".loader").style.display = "none";

  // Fit map to the route extent
  map.getView().fit(tempRouteSource.getExtent(), {
    duration: 750,
    padding: [50, 50, 50, 50],
  });
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
          "?overview=full&geometries=geojson"
      )
    ).json();

    coordinates = coordinates.routes[0].geometry.coordinates;
  }
  return coordinates;
}
