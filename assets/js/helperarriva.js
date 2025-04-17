"use strict";

/**
 * Main loop for fetching bus data and displaying it on the map.
 * @param {boolean} firsttim - Whether this is the first time the loop is run.
 * @param {string} line - The line number of the bus.
 * @param {string} trip - The trip name of the bus.
 * @returns {void}
 */
async function loop(firsttim, arrival, station, arOnSt) {
  if (firsttim) {
    document.querySelector(".loader").style.display = "grid";
    document
      .querySelector(".loader")
      .style.setProperty(
        "--_color",
        lineToColor(parseInt(arrival.routeId.match(/:(.*?)_/)[1]), 1)
      );
  }
  console.log(arrival.routeId);

  // Fetch bus data
  let response = await fetchData(
    "https://arriva-mtb-prod.lit-transit.com/mtbp/service/ui/eta/vehicles-on-pattern/" +
      encodeURIComponent(arrival.patternId)
  );

  let tempBusObject = response;

  busObject = tempBusObject;

  // Create or update markers
  displayBuses(firsttim, arrival, station, arOnSt);
}

async function displayBuses(firsttim, arrival, station, arrivalsOnRoutes) {
  tempMarkersSource = new ol.source.Vector();
  if (firsttim) {
    stations = await fetchData(
      `https://arriva-mtb-prod.lit-transit.com/mtbp/service/api/v1/otp/trips/${encodeURIComponent(
        arrival.tripId
      )}/stop-times?locale=sl-si`
    );
    stations = stations.stopTimeList;
    stations.forEach((item) => {
      const match = stationList.find((data) => data.id === item.stopId);
      if (match) {
        item.latitude = match.latitude;
        item.longitude = match.longitude;
        item.name = match.name;
      }
    });
    coordinates = await getCoordinates(stations);
  }

  for (const i in busObject) {
    const bus = busObject[i];

    if (!buses.includes(bus.id)) {
      buses.push(bus.id);
      const coordinates1 = ol.proj.fromLonLat([bus.longitude, bus.latitude]); // Convert to EPSG:3857

      // Create a feature for the bus
      const marker = new ol.Feature({
        geometry: new ol.geom.Point(coordinates1),
      });
      let prev = findClosestPoint([bus.longitude, bus.latitude], coordinates);
      // Create a style for the bus with rotation
      const busStyle = new ol.style.Style({
        image: new ol.style.Icon({
          rotateWithView: true,
          anchor: [0.52, 0.5],
          anchorXUnits: "fraction",
          anchorYUnits: "fraction",

          src: generateCustomSVG(
            darkenColor(
              lineToColor(parseInt(arrival.routeId.match(/:(.*?)_/)[1]), 1),
              -100
            ),
            lineToColor(parseInt(arrival.routeId.match(/:(.*?)_/)[1]), 1)
          ), // Generate dynamic SVG
          scale: 0.5,
          rotation: calculateDirection(
            coordinates[prev],
            coordinates[prev + 1]
          ), // Convert degrees to radians
        }),
      });

      marker.busId = bus.id;
      marker.busNo = bus.label;

      marker.setStyle(busStyle);

      tempMarkersSource.addFeature(marker);
      busPreviusPosition[bus.id] = coordinates1;
    } else {
      try {
        let coords = [...coordinates];
        if (coords[0][0][0]) {
          coords = coords.flat(); // Flatten the array if needed
        }
        markers.getSource().forEachFeature(function (feature) {
          if (bus.id === feature.busId) {
            let cordi = [
              ...coords[
                findClosestPoint([bus.longitude, bus.latitude], coords)
              ],
            ];
            cordi =
              getDistance(cordi, [bus.longitude, bus.latitude]) > 10
                ? [bus.longitude, bus.latitude]
                : cordi;

            cordi[0] > cordi[1] ? cordi.reverse() : cordi;

            let newCoordinates = ol.proj.fromLonLat(cordi);

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
                let prev = findClosestPoint(
                  [bus.longitude, bus.latitude],
                  coordinates
                );
                console.log(prev);

                const animate = () => {
                  const shouldContinue = moveMarker(
                    feature,
                    newCoordinates,
                    calculateDirection(coordinates[prev], coordinates[prev + 1])
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

              busPreviusPosition[bus.id] = newCoordinates;
            }
          }
        });
      } catch (error) {
        console.log(error);
      }
    }
  }

  if (firsttim) {
    console.log(arrival);

    await generateRouteVector(arrival, station, [...coordinates]);
  } else {
    document.querySelector(".loader").style.backgroundSize = "0% 0%";
    setTimeout(() => {
      document.querySelector(".loader").style.display = "none";
      document.querySelector(".loader").style.backgroundSize = "40% 40%";
    }, 300);
  }
}
async function generateRouteVector(arrival, stationID, coordinatesRoute) {
  let color = lineToColor(parseInt(arrival.routeId.match(/:(.*?)_/)[1]), 1);
  if (arrival.tripId === undefined) return;
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
  stations.forEach((station, index) => {
    let loca = [
      ...coords1[
        findClosestPoint([station.latitude, station.longitude], coords1)
      ],
    ];
    loca = [station.latitude, station.longitude];
    loca = loca.reverse();
    // console.log(loca,coords1);

    const stationFeature = new ol.Feature({
      geometry: new ol.geom.Point(ol.proj.fromLonLat(loca)),
      name: station.name,
      order: station.order_no,
      code: station.station_code,
      color: color,
    });

    // Set styles for stations
    stationFeature.setStyle(
      new ol.style.Style({
        image: new ol.style.Circle({
          radius: 6, // Adjust size as needed
          fill: new ol.style.Fill({
            color:
              station.station_code == stationID
                ? darkenColor(color, -50)
                : darkenColor(color, 100),
          }),
          stroke: new ol.style.Stroke({
            color: color, // Border color
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
          color: color,
          width: 7,
        }),
      })
    );
    // Add the feature to the route source
    tempRouteSource.addFeature(routeFeature);
  });
  const myExtent = tempRouteSource.getExtent();
  const view = map.getView();
  view.fit(myExtent, { duration: 750 });
  document.querySelector(".loader").style.backgroundSize = "0% 0%";

  setTimeout(() => {
    busVectorLayer = new ol.layer.Vector({
      source: tempRouteSource,
      updateWhileInteracting: true,
      style: {},
    });
    busVectorLayer.trip = arrival.tripId;
    map.addLayer(busVectorLayer);

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

    document.querySelector(".loader").style.display = "none";
    document.querySelector(".loader").style.backgroundSize = "40% 40%";
  }, 100);
}

async function getCoordinates(data) {
  let coords = "";
  for (const i in data) {
    coords += data[i].longitude + "," + data[i].latitude + ";";
  }
  coordinates = await fetchData(
    "https://cors.proxy.prometko.si/https://router.project-osrm.org/route/v1/driving/" +
      coords.substring(0, coords.length - 2) +
      "?overview=full&geometries=geojson"
  );

  coordinates = coordinates.routes[0].geometry.coordinates;

  return coordinates;
}
