let gEmergency = {};
let map;
let myMarker;
let rentalMarkers = []; // Array to store rental station markers
const mockRentals = [
  [-26.192788, 28.02673],
  [-26.190573, 28.027724],
  [-26.189649, 28.030912],
  [-26.192499, 28.028636],
  [-26.190543, 28.029708],
[-26.190166, 28.031451],
  [-26.191358, 28.031880],
  [-26.192875, 28.028635],
  [-26.193366, 28.030473]
];

function getEmergencyAlertIdFromUrl() {
  const url = window.location.href;
  const urlParts = url.split("/");
  const emergencyAlertId = urlParts[urlParts.length - 1];
  return emergencyAlertId;
}

document.addEventListener("DOMContentLoaded", function () {
  fetchEmergencyDetails();

  const emergencyAlertId = getEmergencyAlertIdFromUrl();

  // cancellation process
  const cancelButton = document.getElementById("cancelRequest");
  cancelButton.addEventListener("click", async function () {
    const response = await fetch(
      `/emergency/cancelEmergencyAlert/${emergencyAlertId}`
    );
    //const data = await response.json();
    if (response.status === 200) {
      window.location.href = "/admin/emergencyAlerts";
    } else {
      let errorMessage = document.getElementById("cancelAlert");
      errorMessage.textContent =
        "Error cancelling the alert. Please try again.";
      errorMessage.style.display = "block";
    }
  });
  
});

function fetchEmergencyDetails() {

  const emergencyAlertId = getEmergencyAlertIdFromUrl();
 

  fetch(`/emergency/getEmergencyUserDetails/${emergencyAlertId}`)
    .then((response) => response.json())
    .then((data) => {
      if (data.emergency) {
        gEmergency = data.emergency;
        const reportedBy = data.reportedBy;
        let emergencyLocation = JSON.parse(gEmergency.location);

        emergencyLocation = {
          lat: emergencyLocation.latitude,
          lng: emergencyLocation.longitude,
        };

        initMap(emergencyLocation);

        // Display emergency details (omitted for brevity)
        //display the emergency details
        document.getElementById("alertTitle").innerHTML = `<b>Title: </b>${gEmergency.title || "No title was provided"
          }`;
        document.getElementById(
          "alertDescription"
        ).innerHTML = `<b>Description: </b>${gEmergency.description || "No description was provided"
          }`;
        document.getElementById("adminFirstName").innerText =
          reportedBy.firstName;
        document.getElementById("adminLastName").innerText =
          reportedBy.lastName;
        document.getElementById("adminEmail").innerText = reportedBy.email;
        document.getElementById("adminCellphone").innerText = reportedBy.phone;
        document.getElementById(
          "chat"
        ).innerText = `Chat to ${reportedBy.firstName}`;
      } else {
        console.log("Error fetching emergency details" + data.error);
      }
    });
}

window.initMap = function (emergencyLocation) {
  if (navigator.geolocation) {
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const location = {
          lat: position.coords.latitude,
          lng: position.coords.longitude,
        };
        initializeMap(location, emergencyLocation);
      },
      () => {
        const defaultLocation = { lat: -26.192423, lng: 28.030411 };
        initializeMap(defaultLocation, emergencyLocation);
      }
    );
  } else {
    const defaultLocation = { lat: -26.192423, lng: 28.030411 };
    initializeMap(defaultLocation, emergencyLocation);
  }
};

function initializeMap(location, emergencyLocation) {
  map = new google.maps.Map(document.getElementById("map"), {
    zoom: 16,
    center: location,
  });

  myMarker = new google.maps.Marker({
    position: location,
    map: map,
    draggable: false,
    label: {
      text: "Me",
      color: "white",
      fontSize: "12px",
      background: "white",
    },
  });

  watchUserLocation();

  // Emergency Marker
  const emergencyMarker = new google.maps.Marker({
    position: {
      lat: emergencyLocation.lat,
      lng: emergencyLocation.lng,
    },
    map: map,
    draggable: false,
    icon: {
      url: "http://maps.google.com/mapfiles/ms/icons/red-dot.png",
    },
  });

  // Add rental station markers
  mockRentals.forEach((station, index) => {
    const rentalMarker = new google.maps.Marker({
      position: { lat: station[0], lng: station[1] },
      map: map,
      draggable: false,
      icon: {
        url: "http://maps.google.com/mapfiles/ms/icons/green-dot.png",
      },
    });

    rentalMarkers.push(rentalMarker);

    const infoWindow = new google.maps.InfoWindow({
      content: `<div style="color:black;">Rental Station ${index + 1}</div>`,
    });

    rentalMarker.addListener("mouseover", () => {
      infoWindow.open(map, rentalMarker);
    });

    rentalMarker.addListener("mouseout", () => {
      infoWindow.close();
    });
  });

  // Calculate the best route
  calculateBestRoute(location, emergencyLocation);
}

function watchUserLocation() {
  navigator.geolocation.watchPosition(
    (position) => {
      const newLocation = {
        lat: position.coords.latitude,
        lng: position.coords.longitude,
      };

      myMarker.setPosition(newLocation);
      // map.setCenter(newLocation);

      let emergencyLocation = JSON.parse(gEmergency.location);

      emergencyLocation = {
        lat: emergencyLocation.latitude,
        lng: emergencyLocation.longitude,
      };

      // Recalculate best route when user location changes
      calculateBestRoute(newLocation, {
        lat: emergencyLocation.lat,
        lng: emergencyLocation.lng,
      });
    },
    (error) => {
      console.error("Error watching location:", error);
    },
    {
      enableHighAccuracy: true,
      maximumAge: 0,
      timeout: 5000,
    }
  );
}

function calculateBestRoute(currentLocation, emergencyLocation) {
  let shortestTime = Infinity;
  let bestRoute = null;

  console.log("currentLocation", currentLocation);
  console.log("emergencyLocation", emergencyLocation);
  // Calculate walking directly to emergency
  calculateDistance(
    currentLocation,
    emergencyLocation,
    "WALKING",
    (directWalkingTime) => {
      shortestTime = directWalkingTime;
      bestRoute = {
        type: "DIRECT",
        time: directWalkingTime,
        description: "Walking directly to emergency",
      };

      // Check routes via rental stations
      let completedCalculations = 0;
      mockRentals.forEach((station, index) => {
        const rentalStation = { lat: station[0], lng: station[1] };

        console.log("currentLocation", currentLocation);
        console.log("rentalLocation", rentalStation);

        calculateDistance(
          currentLocation,
          rentalStation,
          "WALKING",
          (walkingTime) => {
            calculateDistance(
              rentalStation,
              emergencyLocation,
              "DRIVING",
              (drivingTime) => {
                const totalTime = walkingTime + drivingTime;

                if (totalTime < shortestTime) {
                  shortestTime = totalTime;
                  bestRoute = {
                    type: "RENTAL",
                    time: totalTime,
                    walkingTime: walkingTime,
                    drivingTime: drivingTime,
                    rentalStation: rentalStation,
                    description: `Walking to Rental ${index + 1
                      } and driving to emergency`,
                  };
                  

                }

                completedCalculations++;
                if (completedCalculations === mockRentals.length) {
                  console.log("Best route:", bestRoute);
                  console.log("The time it will take to walk to the first rental station is: ", bestRoute.walkingTime/60+ " minutes");
                  console.log("The time it will take to drive from the first rental station to the emergency location is: ", bestRoute.drivingTime/60+ " minutes");
                  displayBestRoute(
                    bestRoute,
                    currentLocation,
                    emergencyLocation
                  );
                }
              }
            );
          }
        );
      });
    }
  );
}

function calculateDistance(origin, destination, mode, callback) {
  const service = new google.maps.DistanceMatrixService();
  console.log("Calculating distance from", origin, "to", destination);
  service.getDistanceMatrix(
    {
      origins: [origin],
      destinations: [destination],
      travelMode: google.maps.TravelMode[mode],
    },
    (response, status) => {
      if (status === google.maps.DistanceMatrixStatus.OK) {
        const results = response.rows[0].elements[0];
        const travelTime = results.duration.value; // Time in seconds
        callback(travelTime);
      } else {
        console.error("Error calculating distance:", status);
        callback(Infinity);
      }
    }
  );
}

function displayBestRoute(route, currentLocation, emergencyLocation) {
  // Remove existing route polylines
  if (window.currentRoutePolyline) {
    window.currentRoutePolyline.setMap(null);
  }

  const directionsService = new google.maps.DirectionsService();

  // Define the symbol for dots
  const lineSymbol = {
    path: google.maps.SymbolPath.CIRCLE,
    fillOpacity: 1,
    scale: 3
  };

  if (route.type === "DIRECT") {
    // Request walking directions directly to the emergency location
    const request = {
      origin: currentLocation,
      destination: emergencyLocation,
      travelMode: google.maps.TravelMode.WALKING,
    };

    directionsService.route(request, (response, status) => {
      if (status === google.maps.DirectionsStatus.OK) {
        // Display the walking route
        const walkingRenderer = new google.maps.DirectionsRenderer({
          map: map,
          suppressMarkers: true,
          polylineOptions: {
            strokeColor: "#0000FF", // Blue for walking
            strokeOpacity: 0,
            strokeWeight: 2,
            icons: [{
              icon: lineSymbol,
              offset: '0',
              repeat: '15px',
              scale: 2
            }]
          },
          preserveViewport: true,
        });
        walkingRenderer.setDirections(response);
      } else {
        console.error("Error fetching walking directions:", status);
      }
    });
  } else {
    // First request: walking directions from current location to the rental station
    const walkingRequest = {
      origin: currentLocation,
      destination: route.rentalStation,
      travelMode: google.maps.TravelMode.WALKING,
    };

    directionsService.route(
      walkingRequest,
      (walkingResponse, walkingStatus) => {
        if (walkingStatus === google.maps.DirectionsStatus.OK) {
          // Display the walking route
          const walkingRenderer = new google.maps.DirectionsRenderer({
            map: map,
            suppressMarkers: true,
            polylineOptions: {
              strokeColor: "#0000FF", // Blue for walking
              strokeOpacity: 0,
              strokeWeight: 2,
              icons: [{
                icon: lineSymbol,
                offset: '0',
                repeat: '15px',
                scale: 2
              }]
            },
            preserveViewport: true,
          });
          walkingRenderer.setDirections(walkingResponse);

          // Second request: driving directions from rental station to emergency location
          const drivingRequest = {
            origin: route.rentalStation,
            destination: emergencyLocation,
            travelMode: google.maps.TravelMode.DRIVING,
          };

          directionsService.route(
            drivingRequest,
            (drivingResponse, drivingStatus) => {
              if (drivingStatus === google.maps.DirectionsStatus.OK) {
                // Display the driving route
                const drivingRenderer = new google.maps.DirectionsRenderer({
                  map: map,
                  suppressMarkers: true,
                  polylineOptions: {
                    strokeColor: "#FF0000", // Red for driving
                    strokeOpacity: 1.0,
                    strokeWeight: 2,
                
                  },
                  preserveViewport: true,
                });
                drivingRenderer.setDirections(drivingResponse);
              } else {
                console.error(
                  "Error fetching driving directions:",
                  drivingStatus
                );
              }
            }
          );
        } else {
          console.error("Error fetching walking directions:", walkingStatus);
        }
      }
    );
  }
}