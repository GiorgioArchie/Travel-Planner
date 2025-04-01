// Global variables
let map;
let markers = [];
const destinations = [];
const trips = [];
const events = [];
const journalEntries = [];

// Initialize the map
function initMap() {
  console.log("Initializing map...");
  
  try {
    // Create a new map centered at a default location (world view)
    map = new google.maps.Map(document.getElementById("map"), {
      center: { lat: 20, lng: 0 },
      zoom: 2,
      mapTypeId: "terrain",
      mapTypeControl: true,
      fullscreenControl: true,
    });
    
    console.log("Map initialized successfully");

    // Set up form submission handlers
    const destinationForm = document.getElementById("addDestinationForm");
    const tripForm = document.getElementById("addTripForm");
    const eventForm = document.getElementById("addEventForm");
    const journalForm = document.getElementById("addJournalForm");
    
    if (destinationForm) {
      destinationForm.addEventListener("submit", addDestination);
    }
    
    if (tripForm) {
      tripForm.addEventListener("submit", addTrip);
    }
    
    if (eventForm) {
      eventForm.addEventListener("submit", addEvent);
    }
    
    if (journalForm) {
      journalForm.addEventListener("submit", addJournalEntry);
    }

    // Initialize datepickers
    initializeDatepickers();
    
    // Load saved data from localStorage (for demo purposes)
    loadSavedData();
    
  } catch (error) {
    console.error("Error initializing map:", error);
    document.getElementById('map').innerHTML = '<div class="alert alert-danger p-5 text-center"><h4>Map Initialization Error</h4><p>There was an error initializing the map: ' + error.message + '</p></div>';
  }
}

// Initialize datepickers
function initializeDatepickers() {
  const datepickers = document.querySelectorAll('.datepicker');
  datepickers.forEach(picker => {
    flatpickr(picker, {
      dateFormat: "Y-m-d",
      allowInput: true
    });
  });
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
  
  console.log(`Geocoding ${cityName}, ${countryName}...`);
  
  // Use the Places API to geocode the location
  const geocoder = new google.maps.Geocoder();
  geocoder.geocode({ address: `${cityName}, ${countryName}` }, (results, status) => {
    if (status === "OK" && results[0]) {
      const location = results[0].geometry.location;
      console.log(`Location found: ${location.lat()}, ${location.lng()}`);
      
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
      
      // Update destination dropdown in trip form
      updateDestinationDropdown();
      
      // Save to localStorage (for demo purposes)
      saveData();
      
      // Clear the form
      document.getElementById("cityName").value = "";
      document.getElementById("countryName").value = "";
    } else {
      console.error(`Geocoding failed with status: ${status}`);
      alert("Could not find that location. Please try again.");
    }
  });
}

// Add a new trip from the form
function addTrip(event) {
  event.preventDefault();
  
  const destinationId = document.getElementById("tripDestination").value;
  const startDate = document.getElementById("tripStartDate").value;
  const endDate = document.getElementById("tripEndDate").value;
  
  if (!destinationId || !startDate || !endDate) {
    alert("Please fill in all required fields");
    return;
  }
  
  // Find the destination
  const destination = destinations.find(d => d.id == destinationId);
  
  if (!destination) {
    alert("Please select a valid destination");
    return;
  }
  
  // Create a new trip object
  const trip = {
    id: Date.now(),
    destinationId: parseInt(destinationId),
    destination: `${destination.city}, ${destination.country}`,
    startDate: startDate,
    endDate: endDate
  };
  
  // Add to our array
  trips.push(trip);
  
  // Add to the sidebar list
  addTripToList(trip);
  
  // Update trip dropdown in event form
  updateTripDropdown();
  
  // Update marker info windows
  updateAllMarkerInfoWindows();
  
  // Save to localStorage (for demo purposes)
  saveData();
  
  // Clear the form
  document.getElementById("tripDestination").selectedIndex = 0;
  document.getElementById("tripStartDate").value = "";
  document.getElementById("tripEndDate").value = "";
}

// Add a new event from the form
function addEvent(event) {
  event.preventDefault();
  
  const tripId = document.getElementById("eventTrip").value;
  const activity = document.getElementById("eventActivity").value;
  const startTime = document.getElementById("eventStartTime").value;
  const endTime = document.getElementById("eventEndTime").value;
  const hotelBooking = document.getElementById("eventHotelBooking").value;
  const planeTickets = document.getElementById("eventPlaneTickets").value;
  
  if (!tripId || !activity) {
    alert("Please fill in all required fields");
    return;
  }
  
  // Find the trip
  const trip = trips.find(t => t.id == tripId);
  
  if (!trip) {
    alert("Please select a valid trip");
    return;
  }
  
  // Create a new event object
  const newEvent = {
    id: Date.now(),
    tripId: parseInt(tripId),
    trip: trip.destination,
    activity: activity,
    startTime: startTime,
    endTime: endTime,
    hotelBooking: hotelBooking,
    planeTickets: planeTickets
  };
  
  // Add to our array
  events.push(newEvent);
  
  // Add to the sidebar list
  addEventToList(newEvent);
  
  // Update event dropdown in journal form
  updateEventDropdown();
  
  // Update marker info windows
  updateAllMarkerInfoWindows();
  
  // Save to localStorage (for demo purposes)
  saveData();
  
  // Clear the form
  document.getElementById("eventTrip").selectedIndex = 0;
  document.getElementById("eventActivity").value = "";
  document.getElementById("eventStartTime").value = "";
  document.getElementById("eventEndTime").value = "";
  document.getElementById("eventHotelBooking").value = "";
  document.getElementById("eventPlaneTickets").value = "";
}

// Add a new journal entry from the form
function addJournalEntry(event) {
  event.preventDefault();
  
  const eventId = document.getElementById("journalEvent").value;
  const comments = document.getElementById("journalComments").value;
  
  if (!eventId || !comments) {
    alert("Please fill in all required fields");
    return;
  }
  
  // Find the event
  const selectedEvent = events.find(e => e.id == eventId);
  
  if (!selectedEvent) {
    alert("Please select a valid event");
    return;
  }
  
  // Create a new journal entry object
  const journalEntry = {
    id: Date.now(),
    eventId: parseInt(eventId),
    event: selectedEvent.activity,
    comments: comments
  };
  
  // Add to our array
  journalEntries.push(journalEntry);
  
  // Add to the sidebar list
  addJournalEntryToList(journalEntry);
  
  // Update marker info windows
  updateAllMarkerInfoWindows();
  
  // Save to localStorage (for demo purposes)
  saveData();
  
  // Clear the form
  document.getElementById("journalEvent").selectedIndex = 0;
  document.getElementById("journalComments").value = "";
}

// Add a marker to the map
function addMarkerToMap(destination) {
  const marker = new google.maps.Marker({
    position: { lat: destination.lat, lng: destination.lng },
    map: map,
    title: `${destination.city}, ${destination.country}`,
    animation: google.maps.Animation.DROP
  });
  
  // Store the destination ID with the marker for reference
  marker.destinationId = destination.id;
  
  // Create an info window with enhanced content
  updateMarkerInfoWindow(marker, destination);
  
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

// Update or create an info window for a marker
function updateMarkerInfoWindow(marker, destination) {
  // Find related trips
  const destinationTrips = trips.filter(trip => trip.destinationId === destination.id);
  
  // Prepare trips HTML
  let tripsHtml = '<p>No trips planned</p>';
  if (destinationTrips.length > 0) {
    tripsHtml = '<ul class="mb-0">';
    destinationTrips.forEach(trip => {
      tripsHtml += `<li>${trip.startDate} to ${trip.endDate}</li>`;
      
      // Find events for this trip
      const tripEvents = events.filter(event => event.tripId === trip.id);
      if (tripEvents.length > 0) {
        tripsHtml += '<ul>';
        tripEvents.forEach(event => {
          tripsHtml += `<li>${event.activity} (${event.startTime || 'No time set'})`;
          
          // Find journal entries for this event
          const eventJournals = journalEntries.filter(journal => journal.eventId === event.id);
          if (eventJournals.length > 0) {
            tripsHtml += '<ul>';
            eventJournals.forEach(journal => {
              tripsHtml += `<li class="font-italic">"${journal.comments.substring(0, 30)}${journal.comments.length > 30 ? '...' : ''}"</li>`;
            });
            tripsHtml += '</ul>';
          }
          
          tripsHtml += '</li>';
        });
        tripsHtml += '</ul>';
      }
    });
    tripsHtml += '</ul>';
  }
  
  // Create content for the info window
  const content = `
    <div style="max-width: 300px; padding: 10px;">
      <h5>${destination.city}, ${destination.country}</h5>
      <hr class="my-2">
      <div>
        <h6>Trips & Events:</h6>
        ${tripsHtml}
      </div>
    </div>
  `;
  
  // Create an info window if it doesn't exist
  if (!marker.infoWindow) {
    marker.infoWindow = new google.maps.InfoWindow();
    
    // Add click listener to open info window
    marker.addListener("click", () => {
      // Close any other open info windows
      markers.forEach(m => {
        if (m.infoWindow && m !== marker) {
          m.infoWindow.close();
        }
      });
      
      // Open this info window
      marker.infoWindow.open(map, marker);
    });
  }
  
  // Update the content
  marker.infoWindow.setContent(content);
}

// Update info windows for all markers
function updateAllMarkerInfoWindows() {
  markers.forEach(marker => {
    const destination = destinations.find(d => d.id === marker.destinationId);
    if (destination) {
      updateMarkerInfoWindow(marker, destination);
    }
  });
}

// Add a destination to the sidebar list
function addDestinationToList(destination) {
  const destinationsList = document.getElementById("destinationsList");
  
  const item = document.createElement("a");
  item.href = "#";
  item.className = "list-group-item list-group-item-action destination-item";
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
      // Find the marker for this destination
      const marker = markers.find(m => m.destinationId === destination.id);
      
      if (marker) {
        // Center and zoom the map
        map.setCenter(marker.getPosition());
        map.setZoom(10);
        
        // Open the info window
        marker.infoWindow.open(map, marker);
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

// Add a trip to the sidebar list
function addTripToList(trip) {
  const tripsList = document.getElementById("tripsList");
  
  const item = document.createElement("a");
  item.href = "#";
  item.className = "list-group-item list-group-item-action";
  item.setAttribute("data-id", trip.id);
  item.innerHTML = `
    <div class="d-flex w-100 justify-content-between">
      <h5 class="mb-1">${trip.destination}</h5>
      <button class="btn btn-sm btn-danger remove-btn">✕</button>
    </div>
    <p class="mb-1">${trip.startDate} to ${trip.endDate}</p>
  `;
  
  // Add click handler to focus on this destination
  item.addEventListener("click", (e) => {
    if (!e.target.classList.contains("remove-btn")) {
      // Find the destination
      const destination = destinations.find(d => d.id === trip.destinationId);
      
      if (destination) {
        // Find the marker
        const marker = markers.find(m => m.destinationId === destination.id);
        
        if (marker) {
          // Center and zoom the map
          map.setCenter(marker.getPosition());
          map.setZoom(10);
          
          // Open the info window
          marker.infoWindow.open(map, marker);
        }
      }
    }
  });
  
  // Add remove button click handler
  item.querySelector(".remove-btn").addEventListener("click", (e) => {
    e.preventDefault();
    e.stopPropagation();
    
    removeTrip(trip.id);
  });
  
  tripsList.appendChild(item);
}

// Add an event to the sidebar list
function addEventToList(event) {
  const eventsList = document.getElementById("eventsList");
  
  const item = document.createElement("a");
  item.href = "#";
  item.className = "list-group-item list-group-item-action";
  item.setAttribute("data-id", event.id);
  
  let timeInfo = "";
  if (event.startTime && event.endTime) {
    timeInfo = `${event.startTime} to ${event.endTime}`;
  } else if (event.startTime) {
    timeInfo = `Starting at ${event.startTime}`;
  }
  
  item.innerHTML = `
    <div class="d-flex w-100 justify-content-between">
      <h5 class="mb-1">${event.activity}</h5>
      <button class="btn btn-sm btn-danger remove-btn">✕</button>
    </div>
    <p class="mb-1">${event.trip}</p>
    ${timeInfo ? `<small>${timeInfo}</small>` : ''}
  `;
  
  // Add click handler to focus on this destination
  item.addEventListener("click", (e) => {
    if (!e.target.classList.contains("remove-btn")) {
      // Find the trip
      const trip = trips.find(t => t.id === event.tripId);
      
      if (trip) {
        // Find the destination
        const destination = destinations.find(d => d.id === trip.destinationId);
        
        if (destination) {
          // Find the marker
          const marker = markers.find(m => m.destinationId === destination.id);
          
          if (marker) {
            // Center and zoom the map
            map.setCenter(marker.getPosition());
            map.setZoom(10);
            
            // Open the info window
            marker.infoWindow.open(map, marker);
          }
        }
      }
    }
  });
  
  // Add remove button click handler
  item.querySelector(".remove-btn").addEventListener("click", (e) => {
    e.preventDefault();
    e.stopPropagation();
    
    removeEvent(event.id);
  });
  
  eventsList.appendChild(item);
}

// Add a journal entry to the sidebar list
function addJournalEntryToList(journalEntry) {
  const journalList = document.getElementById("journalList");
  
  const item = document.createElement("a");
  item.href = "#";
  item.className = "list-group-item list-group-item-action";
  item.setAttribute("data-id", journalEntry.id);
  item.innerHTML = `
    <div class="d-flex w-100 justify-content-between">
      <h5 class="mb-1">${journalEntry.event}</h5>
      <button class="btn btn-sm btn-danger remove-btn">✕</button>
    </div>
    <p class="mb-1">${journalEntry.comments.substring(0, 100)}${journalEntry.comments.length > 100 ? '...' : ''}</p>
  `;
  
  // Add click handler to focus on this destination
  item.addEventListener("click", (e) => {
    if (!e.target.classList.contains("remove-btn")) {
      // Find the event
      const event = events.find(ev => ev.id === journalEntry.eventId);
      
      if (event) {
        // Find the trip
        const trip = trips.find(t => t.id === event.tripId);
        
        if (trip) {
          // Find the destination
          const destination = destinations.find(d => d.id === trip.destinationId);
          
          if (destination) {
            // Find the marker
            const marker = markers.find(m => m.destinationId === destination.id);
            
            if (marker) {
              // Center and zoom the map
              map.setCenter(marker.getPosition());
              map.setZoom(10);
              
              // Open the info window
              marker.infoWindow.open(map, marker);
            }
          }
        }
      }
    }
  });
  
  // Add remove button click handler
  item.querySelector(".remove-btn").addEventListener("click", (e) => {
    e.preventDefault();
    e.stopPropagation();
    
    removeJournalEntry(journalEntry.id);
  });
  
  journalList.appendChild(item);
}

// Update destination dropdown in trip form
function updateDestinationDropdown() {
  const dropdown = document.getElementById("tripDestination");
  if (!dropdown) return;
  
  // Clear existing options (except the first one)
  while (dropdown.options.length > 1) {
    dropdown.remove(1);
  }
  
  // Add destinations to dropdown
  destinations.forEach(destination => {
    const option = document.createElement("option");
    option.value = destination.id;
    option.text = `${destination.city}, ${destination.country}`;
    dropdown.add(option);
  });
}

// Update trip dropdown in event form
function updateTripDropdown() {
  const dropdown = document.getElementById("eventTrip");
  if (!dropdown) return;
  
  // Clear existing options (except the first one)
  while (dropdown.options.length > 1) {
    dropdown.remove(1);
  }
  
  // Add trips to dropdown
  trips.forEach(trip => {
    const option = document.createElement("option");
    option.value = trip.id;
    option.text = `${trip.destination} (${trip.startDate} - ${trip.endDate})`;
    dropdown.add(option);
  });
}

// Update event dropdown in journal form
function updateEventDropdown() {
  const dropdown = document.getElementById("journalEvent");
  if (!dropdown) return;
  
  // Clear existing options (except the first one)
  while (dropdown.options.length > 1) {
    dropdown.remove(1);
  }
  
  // Add events to dropdown
  events.forEach(event => {
    const option = document.createElement("option");
    option.value = event.id;
    option.text = `${event.activity} (${event.trip})`;
    dropdown.add(option);
  });
}

// Remove a destination by ID
function removeDestination(id) {
  // Find the index of this destination
  const index = destinations.findIndex(d => d.id === id);
  
  if (index !== -1) {
    // Remove the marker from the map
    const markerIndex = markers.findIndex(m => m.destinationId === id);
    if (markerIndex !== -1) {
      markers[markerIndex].setMap(null);
      markers.splice(markerIndex, 1);
    }
    
    // Remove related trips
    const relatedTrips = trips.filter(trip => trip.destinationId === id).map(trip => trip.id);
    relatedTrips.forEach(tripId => removeTrip(tripId));
    
    // Remove from destinations array
    destinations.splice(index, 1);
    
    // Remove from the list
    const listItem = document.querySelector(`#destinationsList a[data-id="${id}"]`);
    if (listItem) {
      listItem.remove();
    }
    
    // Save updated data
    saveData();
  }
}

// Remove a trip by ID
function removeTrip(id) {
  // Find the index of this trip
  const index = trips.findIndex(t => t.id === id);
  
  if (index !== -1) {
    // Remove related events
    const relatedEvents = events.filter(event => event.tripId === id).map(event => event.id);
    relatedEvents.forEach(eventId => removeEvent(eventId));
    
    // Remove from trips array
    trips.splice(index, 1);
    
    // Remove from the list
    const listItem = document.querySelector(`#tripsList a[data-id="${id}"]`);
    if (listItem) {
      listItem.remove();
    }
    
    // Update marker info windows
    updateAllMarkerInfoWindows();
    
    // Save updated data
    saveData();
  }
}

// Remove an event by ID
function removeEvent(id) {
  // Find the index of this event
  const index = events.findIndex(e => e.id === id);
  
  if (index !== -1) {
    // Remove related journal entries
    const relatedJournals = journalEntries.filter(journal => journal.eventId === id).map(journal => journal.id);
    relatedJournals.forEach(journalId => removeJournalEntry(journalId));
    
    // Remove from events array
    events.splice(index, 1);
    
    // Remove from the list
    const listItem = document.querySelector(`#eventsList a[data-id="${id}"]`);
    if (listItem) {
      listItem.remove();
    }
    
    // Update marker info windows
    updateAllMarkerInfoWindows();
    
    // Save updated data
    saveData();
  }
}

// Remove a journal entry by ID
function removeJournalEntry(id) {
  // Find the index of this journal entry
  const index = journalEntries.findIndex(j => j.id === id);
  
  if (index !== -1) {
    // Remove from journal entries array
    journalEntries.splice(index, 1);
    
    // Remove from the list
    const listItem = document.querySelector(`#journalList a[data-id="${id}"]`);
    if (listItem) {
      listItem.remove();
    }
    
    // Update marker info windows
    updateAllMarkerInfoWindows();
    
    // Save updated data
    saveData();
  }
}

// Save data to localStorage (for demo purposes)
function saveData() {
  try {
    localStorage.setItem("travelPlannerDestinations", JSON.stringify(destinations));
    localStorage.setItem("travelPlannerTrips", JSON.stringify(trips));
    localStorage.setItem("travelPlannerEvents", JSON.stringify(events));
    localStorage.setItem("travelPlannerJournals", JSON.stringify(journalEntries));
    console.log("Data saved to localStorage");
  } catch (e) {
    console.error("Error saving to localStorage:", e);
  }
}

// Load saved data from localStorage (for demo purposes)
function loadSavedData() {
  try {
    // Load destinations
    const savedDestinations = JSON.parse(localStorage.getItem("travelPlannerDestinations")) || [];
    savedDestinations.forEach(destination => {
      destinations.push(destination);
      addMarkerToMap(destination);
      addDestinationToList(destination);
    });
    
    // Load trips
    const savedTrips = JSON.parse(localStorage.getItem("travelPlannerTrips")) || [];
    savedTrips.forEach(trip => {
      trips.push(trip);
      addTripToList(trip);
    });
    
    // Load events
    const savedEvents = JSON.parse(localStorage.getItem("travelPlannerEvents")) || [];
    savedEvents.forEach(event => {
      events.push(event);
      addEventToList(event);
    });
    
    // Load journal entries
    const savedJournals = JSON.parse(localStorage.getItem("travelPlannerJournals")) || [];
    savedJournals.forEach(journal => {
      journalEntries.push(journal);
      addJournalEntryToList(journal);
    });
    
    // Update dropdowns
    updateDestinationDropdown();
    updateTripDropdown();
    updateEventDropdown();
    
    // Update info windows
    updateAllMarkerInfoWindows();
    
    console.log("Data loaded from localStorage");
  } catch (e) {
    console.error("Error loading from localStorage:", e);
  }
}

// Add event listener for when DOM is loaded
window.addEventListener('DOMContentLoaded', (event) => {
  console.log('DOM fully loaded, ready for map initialization');
});