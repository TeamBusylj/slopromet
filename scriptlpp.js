
function debounce(func, delay) {
  let timeoutId;
  return function() {
      const context = this;
      const args = arguments;
      clearTimeout(timeoutId);
      timeoutId = setTimeout(() => {
          func.apply(context, args);
      }, delay);
  };
}
var map;
async function makeMap(){

var controlButton
async function initMap() {
  let id 
  if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
   id = "8ffb6c843fc80897"
} else {
id="828836cb97c61eb5"
}
  const { Map } = await google.maps.importLibrary("maps");
  
  map = new Map(document.getElementById("map"), {
    center: { lat: latitude, lng: longitude },
    zoom: 15,
    mapId: id,
    disableDefaultUI: true,
  });
const centerControlDiv = document.createElement("div");


controlButton = document.createElement("md-fab");
controlButton.variant = "secondary"
controlButton.classList.add("centerMap")
let icn = addElement("md-icon", controlButton)
  icn.innerHTML = "radio_button_checked";
  icn.slot="icon"
  controlButton.addEventListener("click", () => {
    map.setZoom(15);
    map.setCenter({ lat: latitude, lng: longitude });
  });
  centerControlDiv.appendChild(controlButton);
map.controls[google.maps.ControlPosition.RIGHT_BOTTOM].push(centerControlDiv);
centerControlDiv.style.right="25px !important"





  
}
const parser = new DOMParser();
const pinSvgString = '<svg xmlns="http://www.w3.org/2000/svg" width="25" height="25" viewBox="0 0 1080 1080" xml:space="preserve"><g transform="translate(540 540)"/><g transform="translate(540 540)"/><rect style="stroke:#000;stroke-width:0;stroke-dasharray:none;stroke-linecap:butt;stroke-dashoffset:0;stroke-linejoin:miter;stroke-miterlimit:4;fill:#78a75a;fill-rule:nonzero;opacity:1" vector-effect="non-scaling-stroke" x="-33.084" y="-33.084" width="66.167" height="66.167" rx="13" ry="13" transform="translate(540 540)scale(16.4)"/><path style="stroke:#000;stroke-width:0;stroke-dasharray:none;stroke-linecap:butt;stroke-dashoffset:0;stroke-linejoin:miter;stroke-miterlimit:4;fill:#fff;fill-rule:nonzero;opacity:1" vector-effect="non-scaling-stroke" transform="translate(60 1040)" d="M240-120q-17 0-28.5-11.5T200-160v-82q-18-20-29-44.5T160-340v-380q0-83 77-121.5T480-880q172 0 246 37t74 123v380q0 29-11 53.5T760-242v82q0 17-11.5 28.5T720-120h-40q-17 0-28.5-11.5T640-160v-40H320v40q0 17-11.5 28.5T280-120zm242-640h224-448zm158 280H240h480zm-400-80h480v-120H240zm100 240q25 0 42.5-17.5T400-380t-17.5-42.5T340-440t-42.5 17.5T280-380t17.5 42.5T340-320Zm280 0q25 0 42.5-17.5T680-380t-17.5-42.5T620-440t-42.5 17.5T560-380t17.5 42.5T620-320ZM258-760h448q-15-17-64.5-28.5T482-800q-107 0-156.5 12.5T258-760Zm62 480h320q33 0 56.5-23.5T720-360v-120H240v120q0 33 23.5 56.5T320-280Z"/></svg>';

await initMap();
const { AdvancedMarkerElement } = await google.maps.importLibrary("marker");
var markers = []


  for (let po = 0; po < stationList.length; po++) {

    const pinSvg = parser.parseFromString(
      pinSvgString,
      "image/svg+xml",
    ).documentElement;
    let mrk = new AdvancedMarkerElement({
      map: map,   
      content: pinSvg,
      position: { lat: stationList[po].latitude, lng: stationList[po].longitude },
      title: stationList[po].name,
    })
  markers.push(mrk)
  mrk.addListener('click', function() {
    stationClick(po)
});
  }


  function getColor(count, maxMarkers) {
    // Create a sequential color scale using d3-scale-chromatic
    const colorScale = d3.scaleSequential()
      .domain([0, maxMarkers])  // Range from 0 (min) to maxMarkers (max)
      .interpolator(d3.interpolateHsl('red',  'green'));  // Interpolate between red, yellow, and green
  
    // Calculate the normalized count (0-1)
    const normalizedCount = count / maxMarkers;
    return colorScale(normalizedCount);
  }
  
  const interpolatedRenderer = {
   
    palette: d3.color("yellow", "green").rgb(),
    render: function ({ count, position }, stats) {
        // use d3-interpolateRgb to interpolate between red and blue
        const color = getColor(count, stats.clusters.markers.max);
        // create svg url with fill color
        const svg = window.btoa(`
  <svg fill="${color}" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 240 240">
    <circle cx="120" cy="120" opacity="1" r="70" />    
  </svg>`);
        // create marker using svg icon
        return new google.maps.Marker({
            position,
            icon: {
                url: `data:image/svg+xml;base64,${svg}`,
                scaledSize: new google.maps.Size(70, 70),
            },
            label: {
                text: String(count),
                color: "rgba(255,255,255,0.9)",
                fontSize: "18px",
            },
            // adjust zIndex to be above other markers
            zIndex: Number(google.maps.Marker.MAX_ZINDEX) + count,
        });
    },
};


var markerCluster = new markerClusterer.MarkerClusterer({algorithm: new markerClusterer.GridAlgorithm({ maxDistance: 5000 }), markers, map, renderer: interpolatedRenderer});


const sheet = document.querySelector(".bottomSheet")

var gsign = document.querySelector("#map div div a[target='_blank'] div")
let tmr = setInterval(() => {
  console.log("m")
  if(!gsign){
    gsign = document.querySelector("#map div div a[target='_blank'] div")
  }else{
    gsign.style.marginBottom=  "calc(100vh - "+sheet.offsetTop +"px + 10px)"
    gsign.innerHTML = gsign.innerHTML.replace('stroke-width%3D%221.5%22', 'stroke-width%3D%220%22')
    clearInterval(tmr)
  }
}, 200);
controlButton.style.marginBottom = "calc(100vh - "+sheet.offsetTop +"px + 10px)"
sheet.addEventListener('touchmove', e => {
gsign.style.marginBottom=  "calc(100vh - "+sheet.offsetTop +"px + 10px)"
 controlButton.style.marginBottom  =  "calc(100vh - "+sheet.offsetTop +"px + 10px)"
})

let resizeObserver= new ResizeObserver(() => { 
  try {
    gsign.style.marginBottom=  "calc(100vh - "+sheet.offsetTop +"px + 10px)" 
  } catch {
  }
  
  controlButton.style.marginBottom = "calc(100vh - "+sheet.offsetTop +"px + 10px)"
  });
  
  resizeObserver.observe(document.querySelector(".sheetContents")); 
}

const delayedSearch = debounce(searchRefresh, 300);
window.addEventListener("DOMContentLoaded", async function () {
  const url = "https://mestnipromet.cyou/api/v1/resources/buses/info";
  const response = await fetch(url);
  const movies = await response.json();
  createBuses(movies.data);

let sht = makeBottomheet(null, 30)
sht.innerHTML = `
<div class="searchContain"> <md-filled-text-field class="search" placeholder="Išči"><md-icon slot="leading-icon">search</md-icon></md-filled-text-field></div>
 <md-circular-progress indeterminate id="loader"></md-circular-progress>
    <md-list id="listOfStations"></md-list>`
    this.document.querySelector(".search").addEventListener("input",  delayedSearch)
    
})

/*window.addEventListener("load", async function () {


 const pullToRefresh = document.querySelector('.pull-to-refresh');
 
let touchstartY = 0;

var list 
var touchDiff = 0;
document.addEventListener('touchstart', e => {
  
  loadingC.removeAttribute("indeterminate")
  setTimeout(() => {
    loadingC.shadowRoot.querySelector(".active-track").style.transition = "all 0s"
  }, 1);
touchDiff = 0
  loadingC.setAttribute("value", "0")
  touchstartY = e.touches[0].clientY;
});
var bottomSheet
var loadingC = this.document.querySelector('.pll-loader');
setTimeout(() => {
  bottomSheet= document.querySelector(".sheetContents")
  list = this.document.getElementById('listOfStations')
}, 400);

document.addEventListener('touchmove', e => {
 if(bottomSheet.style.height == "100svh"){


  if((list.scrollTop < 1 && !isArrivalsOpen) ||(isArrivalsOpen &&  this.document.querySelector('.arrivalsScroll').scrollTop < 1)){


  const touchY = e.touches[0].clientY;
 touchDiff = touchY - touchstartY;
  if (touchDiff > 0 && window.scrollY === 0) {
    pullToRefresh.style.top = touchDiff/(touchY/250) + 'px' ;
    loadingC.setAttribute("value", Math.min(touchDiff/150, 1).toString())
  }
}else{
  touchDiff = 0
}
}
});
document.addEventListener('touchend', e => {
  console.log(touchDiff);
  loadingC.setAttribute("indeterminate", "")
  if(touchDiff>150){

    pullToRefresh.style.transition = "all .3s"
    pullToRefresh.style.top = "150px"
    setTimeout(() => {
      pullToRefresh.style.transition = "all 0s"
     
    }, 400);
   console.log('refresh');
   if(isArrivalsOpen) refreshArrivals(); else   createBuses()
   }else{
    pullToRefresh.style.transition = "all .3s"
    pullToRefresh.style.top = "0"
    setTimeout(() => {
      pullToRefresh.style.transition = "all 0s"
    
    }, 400);
  }

});
});*/
var arrivalsMain = {};
var tripIds = [];
var stationList = {};
var latitude 
var longitude
async function getLocation() {
  try {
      const position = await new Promise((resolve, reject) => {
          navigator.geolocation.getCurrentPosition(resolve, reject, {
              timeout: 10000,
              maximumAge: 60000,
              enableHighAccuracy: true
          });
      });

      latitude = position.coords.latitude;
      longitude = position.coords.longitude;
  } catch  {}
}

setInterval(getLocation, 60000);
async function createBuses(data) {
  await getLocation();
 
  for (const bus in data) {
    if (data[bus].trip_id && !tripIds.includes(data[bus].trip_id)) {
      tripIds.push(data[bus].trip_id);
    }
  }

  // for (let i = 0; i < tripIds.length; i++) { }
  const response = await fetch(
    "https://cors.proxy.prometko.si/https://lpp.ojpp.derp.si/api/station/station-details"
  );
  const movies = await response.json();

  stationList = movies.data;

  console.log("finish");
  makeMap()
 
 
  createStationItems();
}

var isArrivalsOpen = false;

function createStationItems() {
  var search = false
  var query = ''
  if(document.querySelector(".search").value !== ''){
    search = true
    query = document.querySelector(".search").value
  }
  var loader = document.getElementById("loader");
  var list = document.getElementById("listOfStations");
  list.innerHTML = ''
  list.style.display = "none"
  loader.style.display = "block"
  var nearby = {};
  if (navigator.geolocation) {
   
     
      let centertation = [];
      for (const station in stationList) {
        let item2 = addElement("md-list-item", null, "stationItem");
        item2.setAttribute("interactive", "");
        addElement("md-ripple", item2);
        let item = addElement("div", item2, "station");
        item.innerHTML =
          '<span class="stationName">' + stationList[station].name;
        +"</span>";

        const distance = haversineDistance(
          latitude,
          longitude,
          stationList[station].latitude,
          stationList[station].longitude
        );
        if (distance < 3 || search) {
          console.log(stationList[station].name);
          let cornot = "";
          if (!centertation.includes(stationList[station].name)) {
            centertation.push(stationList[station].name);
            cornot = '<span class="center">CENTER</span>';
          }

          if (distance > 1) {
            item.innerHTML +=
              cornot +
              "<span class=stationDistance>" +
              distance.toFixed(1) +
              " km</span>";
            nearby[distance.toFixed(5)] = item2;
          } else {
            item.innerHTML +=
              cornot +
              "<span class=stationDistance>" +
              Math.round(distance * 1000) +
              " m</span>";
            nearby[distance.toFixed(5)] = item2;
          }
          let buses = addElement("div", item, "buses");
          for (const bus of stationList[station].route_groups_on_station) {
            buses.innerHTML +=
              "<div class=busNo style=background-color:#" +
              lineColors[bus.replace(/\D/g, "")] +
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
        }
      }
      console.log(nearby);
      const sortedArray = Object.keys(nearby)
        .map((key) => parseFloat(key).toFixed(5))
        .sort((a, b) => a - b)
        .map((key) => nearby[key]);

      console.log(sortedArray);
      for (const stationDistance of sortedArray) {
        if(search){
          if (stationDistance.innerText.toLowerCase().includes(query.toLowerCase())) {
            list.appendChild(stationDistance);
          }
        }else{
          list.appendChild(stationDistance);
        }
       
      }
      list.style.display = "block"
     /* const pullToRefresh = document.querySelector('.pull-to-refresh');
     
      pullToRefresh.classList.add('hideLoad')
      setTimeout(() => {
        pullToRefresh.style.top = '0px' ;
        pullToRefresh.classList.remove('hideLoad')
      }, 300);     
      */
      loader.style.display = "none"
    

  }
}
function searchRefresh() {
  let query = document.querySelector(".search").value;
  createStationItems(true, query)
}



function haversineDistance(lat1, lon1, lat2, lon2) {
  const R = 6371; // Radius of the Earth in kilometers
  const dLat = ((lat2 - lat1) * Math.PI) / 180; // Convert degrees to radians
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const distance = R * c; // Distance in kilometers
  return distance;
}
function refreshArrivals() {
 
  stationClick(isArrivalsOpen, true)
}
function showOnMap(lnga, lata){
  console.log(lata, lnga)
map.setCenter({ lat: lata, lng: lnga });
map.setZoom(18);
setTimeout(() => {
  document.querySelector(".mainSheet").appendChild(document.createElement("ajokyxw"))

}, 300);


}
async function stationClick(station, noAnimation) {
  
 

let title = addElement("h1",  document.querySelector(".mainSheet"), "title");
title.innerHTML = stationList[station].name
  let iks = addElement("md-icon-button", title, "iks");
iks.innerHTML = "<md-icon>arrow_back_ios</md-icon>";


  let mapca = addElement("md-icon-button",title, "mapca");
  mapca.innerHTML = "<md-icon>map</md-icon>";
  mapca.addEventListener("click", function() {
  console.log(station)
    showOnMap(stationList[station].longitude, stationList[station].latitude)
   
  })
  var arrivalsScroll = addElement("div", document.querySelector(".mainSheet"), "arrivalsScroll");
  if(noAnimation){arrivalsScroll.style.transition = "all 0s"; }

setTimeout(() => {
  document.getElementById("listOfStations").style.display="none";
}, 300);
 
  isArrivalsOpen = station
  const response = await fetch(
    " https://cors.proxy.prometko.si/https://lpp.ojpp.derp.si/api/station/arrival?station-code=" +
      stationList[station].ref_id
  );
  const movies = await response.json();
  console.log(movies.data);

  arrivalsScroll.style.transform = "translateX(0px)";
  arrivalsScroll.style.opacity = "1";
title.style.transform = "translateX(0px)";
 title.style.opacity = "1";
    if (movies.data.arrivals.length > 0) {
    for (const arrival of movies.data.arrivals) {
      if (document.getElementById("bus_" + arrival.route_name)) {
        document
          .getElementById("eta_" + arrival.route_name).innerHTML +=
          "<span class=arrivalTime>" +
          arrival.eta_min +
          " min</span>"
      } else {
        let arrivalItem = addElement("div", arrivalsScroll, "arrivalItem");
        arrivalItem.style.order =arrival.route_name.replace(/\D/g, "")
        arrivalItem.innerHTML =
          "<div class=busNo2 style=background-color:#" +
          lineColors[arrival.route_name.replace(/\D/g, "")] +
          " id=bus_" +
          arrival.route_name +
          ">" +
          arrival.route_name +
          "</div><div class=arrivalData><b><span>" +
          arrival.trip_name.split(" - ").at(-1) +
          "</span></b><div class=eta id=eta_"+arrival.route_name+"><span class=arrivalTime>" +
          arrival.eta_min +
          " min</span></div></div>";
      }
    }
  
  }else{
   
    arrivalsScroll.innerHTML += "Trenutno ni na sporedu nobenega avtobusa"
  }
  iks.addEventListener("click", function() {
    document.getElementById("listOfStations").style.display="block"
    arrivalsScroll.style.transform = "translateX(30px)";   
    arrivalsScroll.style.opacity = "0";
    title.style.transform = "translateX(30px)";   
    title.style.opacity = "0";
    isArrivalsOpen = false
    setTimeout(() => {
      arrivalsScroll.remove();
      title.remove();
      document.querySelector("ajokyxw").remove()
    }, 400);
   
  })
}
function addElement(tag, parent, className) {
  var element = document.createElement(tag);
  if (className) {
    element.classList.add(className);
  }
  if (parent) {
    parent.appendChild(element);
  }
  return element;
}
function makeScreen(titlex) {
  let sheet = document.querySelector(".mainSheet")
  //sheet.innerHTML = 0
  let arrivalsContainer = addElement(
    "div",
    sheet,
    "arrivalsContainer"
  );  
  let title = addElement("h1", arrivalsContainer, "title");
  title.innerHTML = titlex
    let iks = addElement("md-icon-button", title, "iks");
  iks.innerHTML = "<md-icon>arrow_back_ios</md-icon>";
  iks.addEventListener("click", function() {
    arrivalsContainer.style.transform = "translateX(30px)";   
    arrivalsContainer.style.opacity = "0";
    isArrivalsOpen = false
    setTimeout(() => {
      arrivalsContainer.remove();
      document.querySelector("ajokyxw").remove()
    }, 400);
   
  })
 

  return arrivalsContainer;
}
const lineColors = {
  1: "C93336",
  2: "8C8841",
  3: "EC593A",
  5: "9F539E",
  6: "939598",
  7: "1CBADC",
  8: "116AB0",
  9: "86AACD",
  11: "EDC23B",
  12: "214AA0",
  13: "CFD34D",
  14: "EF59A1",
  15: "A2238E",
  16: "582C81",
  18: "895735",
  19: "EA9EB4",
  20: "1F8751",
  21: "52BA50",
  22: "F6A73A",
  23: "40AE49",
  24: "ED028C",
  25: "0F95CA",
  26: "231F20",
  27: "57A897",
  30: "9AD2AE",
  40: "496E6D",
  42: "A78B6B",
  43: "4E497A",
  44: "817EA8",
  51: "6C8BC6",
  52: "00565D",
  53: "C7B3CA",
  56: "953312",
  60: "ACBB71",
  61: "F9A64A",
  71: "6C8BC6",
  72: "4CA391",
  73: "FECA0A",
  78: "C96D6A",
  4: "F28B30",
  10: "A2BF2F",
  17: "B83D45",
  28: "E58C4D",
  29: "B2D28A",
  31: "7A56A1",
  32: "DA9D56",
  33: "77A8B3",
  34: "E35692",
  35: "514D6E",
  36: "D4A747",
  37: "3A7C7E",
  38: "E67527",
  39: "9C6E58",
  41: "D6E7A3",
  45: "A74243",
  46: "8F6B8E",
  47: "D3954A",
  48: "72C9B6",
  49: "CB4577",
  50: "6A789A",
  54: "D8AF56",
  55: "43577B",
  57: "E58E50",
  58: "908B9E",
  59: "BFD264",
  62: "9E7352",
  63: "3F9D9E",
  64: "EF7D50",
  65: "5D5C6B",
  66: "D3B257",
  67: "4D917F",
  68: "E27851",
  69: "A2755B",
  70: "A8CDB5",
  74: "D65274",
  75: "B8B3D5",
  76: "D4B158",
  77: "61937F",
  79: "EF8251",
  80: "75685C"
};


