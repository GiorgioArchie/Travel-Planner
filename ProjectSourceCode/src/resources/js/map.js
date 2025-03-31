// Global variables
let map;
let markers = [];
const destinations = [];

// Initialize the map
function initMap() {
  // Create a new map centered at a default location (world view)
  map = new google.maps.Map(document.getElementById("map"), {
    center: { lat: 20, lng: 0 },
    zoom: 2,
    mapTypeId: "terrain",
    mapTypeControl: true,
    fullscreenControl: true,
  });

  // Set up the form submission handler
  document.getElementById("addDestinationForm").addEventListener("submit", addDestination);

  // Load any saved destinations from localStorage (for demo purposes)
  loadSavedDestinations();
}

// Add a new destination from the form
function addDestination(event) {
  event.preventDefault();
  
  const cityName = document.getElementById("cityName").value;
  const countryName = document.getElementById("countryName").value;
  
  if (!cityName || !countryName) {
    alert("Please enter both city and country");
    return;
  }
  
  // Use the Places API to geocode the location
  const geocoder = new google.maps.Geocoder();
  geocoder.geocode({ address: `${cityName}, ${countryName}` }, (results, status) => {
    if (status === "OK" && results[0]) {
      const location = results[0].geometry.location;
      
      // Create a new destination object
      const destination = {
        id: Date.now(), // Simple unique ID
        city: cityName,
        country: countryName,
        lat: location.lat(),
        lng: location.lng()
      };
      
      // Add to our array
      destinations.push(destination);
      
      // Add marker to the map
      addMarkerToMap(destination);
      
      // Add to the sidebar list
      addDestinationToList(destination);
      
      // Save to localStorage (for demo purposes)
      saveSavedDestinations();
      
      // Clear the form
      document.getElementById("cityName").value = "";
      document.getElementById("countryName").value = "";
    } else {
      alert("Could not find that location. Please try again.");
    }
  });
}

// Add a marker to the map
function addMarkerToMap(destination) {
  const marker = new google.maps.Marker({
    position: { lat: destination.lat, lng: destination.lng },
    map: map,
    title: `${destination.city}, ${destination.country}`,
    animation: google.maps.Animation.DROP
  });
  
  // Create an info window for this marker
  const infoWindow = new google.maps.InfoWindow({
    content: `
      <div>
        <h5>${destination.city}, ${destination.country}</h5>
        <p>Latitude: ${destination.lat.toFixed(4)}</p>
        <p>Longitude: ${destination.lng.toFixed(4)}</p>
      </div>
    `
  });
  
  // Add click listener to open info window
  marker.addListener("click", () => {
    infoWindow.open(map, marker);
  });
  
  // Add the marker to our array
  markers.push(marker);
  
  // Fit the map to show all markers
  if (markers.length > 0) {
    const bounds = new google.maps.LatLngBounds();
    markers.forEach((marker) => bounds.extend(marker.getPosition()));
    map.fitBounds(bounds);
    
    // If there's only one marker, zoom in a bit more
    if (markers.length === 1) {
      map.setZoom(6);
    }
  }
}

// Add a destination to the sidebar list
function addDestinationToList(destination) {
  const destinationsList = document.getElementById("destinationsList");
  
  const item = document.createElement("a");
  item.href = "#";
  item.className = "list-group-item list-group-item-action";
  item.setAttribute("data-id", destination.id);
  item.innerHTML = `
    <div class="d-flex w-100 justify-content-between">
      <h5 class="mb-1">${destination.city}</h5>
      <button class="btn btn-sm btn-danger remove-btn">✕</button>
    </div>
    <p class="mb-1">${destination.country}</p>
  `;
  
  // Add click handler to focus on this marker
  item.addEventListener("click", (e) => {
    if (!e.target.classList.contains("remove-btn")) {
      const marker = markers.find((m, index) => {
        return m.getPosition().lat() === destination.lat && 
               m.getPosition().lng() === destination.lng;
      });
      
      if (marker) {
        map.setCenter(marker.getPosition());
        map.setZoom(10);
        
        // Open the info window
        new google.maps.event.trigger(marker, 'click');
      }
    }
  });
  
  // Add remove button click handler
  item.querySelector(".remove-btn").addEventListener("click", (e) => {
    e.preventDefault();
    e.stopPropagation();
    
    removeDestination(destination.id);
  });
  
  destinationsList.appendChild(item);
}

// Remove a destination by ID
function removeDestination(id) {
  // Find the index of this destination
  const index = destinations.findIndex(d => d.id === id);
  
  if (index !== -1) {
    // Remove the marker from the map
    markers[index].setMap(null);
    
    // Remove from arrays
    destinations.splice(index, 1);
    markers.splice(index, 1);
    
    // Remove from the list
    const listItem = document.querySelector(`#destinationsList a[data-id="${id}"]`);
    if (listItem) {
      listItem.remove();
    }
    
    // Save updated list
    saveSavedDestinations();
  }
}

// Save destinations to localStorage (demo purposes)
function saveSavedDestinations() {
  localStorage.setItem("travelPlannerDestinations", JSON.stringify(destinations));
}

// Load saved destinations from localStorage (demo purposes)
function loadSavedDestinations() {
  const saved = localStorage.getItem("travelPlannerDestinations");
  
  if (saved) {
    try {
      const savedDestinations = JSON.parse(saved);
      
      // Add each saved destination
      savedDestinations.forEach(destination => {
        destinations.push(destination);
        addMarkerToMap(destination);
        addDestinationToList(destination);
      });
    } catch (e) {
      console.error("Error loading saved destinations", e);
    }
  }
}