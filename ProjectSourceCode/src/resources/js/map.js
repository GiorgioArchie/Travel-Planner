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
    
    // Load data from server and localStorage as backup
    loadData();
    
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
      const destinationData = {
        city: cityName,
        country: countryName,
        latitude: location.lat(),
        longitude: location.lng()
      };
      
      // Save destination to the database
      fetch('/api/destinations', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(destinationData)
      })
      .then(response => {
        if (!response.ok) {
          throw new Error('Network response was not ok');
        }
        return response.json();
      })
      .then(savedDestination => {
        // Format destination for client-side use
        const destination = {
          id: savedDestination.id,
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
        
        // Save to localStorage as backup
        saveData();
        
        // Clear the form
        document.getElementById("cityName").value = "";
        document.getElementById("countryName").value = "";
      })
      .catch(error => {
        console.error('Error saving destination:', error);
        
        // Fallback: save locally even if server save fails
        const destination = {
          id: Date.now(),
          city: cityName,
          country: countryName,
          lat: location.lat(),
          lng: location.lng()
        };
        
        destinations.push(destination);
        addMarkerToMap(destination);
        addDestinationToList(destination);
        updateDestinationDropdown();
        saveData();
        
        document.getElementById("cityName").value = "";
        document.getElementById("countryName").value = "";
      });
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
  
  // Create trip data object
  const tripData = {
    destinationId: parseInt(destinationId),
    startDate: startDate,
    endDate: endDate,
    city: destination.city,
    country: destination.country
  };
  
  // Save trip to database
  fetch('/api/trips', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(tripData)
  })
  .then(response => {
    if (!response.ok) {
      throw new Error('Network response was not ok');
    }
    return response.json();
  })
  .then(savedTrip => {
    // Create trip object for client-side use
    const trip = {
      id: savedTrip.id || savedTrip.trip_id,
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
    
    // Save to localStorage as backup
    saveData();
    
    // Clear the form
    document.getElementById("tripDestination").selectedIndex = 0;
    document.getElementById("tripStartDate").value = "";
    document.getElementById("tripEndDate").value = "";
  })
  .catch(error => {
    console.error('Error saving trip:', error);
    
    // Fallback: save locally even if server save fails
    const trip = {
      id: Date.now(),
      destinationId: parseInt(destinationId),
      destination: `${destination.city}, ${destination.country}`,
      startDate: startDate,
      endDate: endDate
    };
    
    trips.push(trip);
    addTripToList(trip);
    updateTripDropdown();
    updateAllMarkerInfoWindows();
    saveData();
    
    document.getElementById("tripDestination").selectedIndex = 0;
    document.getElementById("tripStartDate").value = "";
    document.getElementById("tripEndDate").value = "";
  });
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
  
  // Create event data object
  const eventData = {
    tripId: parseInt(tripId),
    activity: activity,
    startTime: startTime,
    endTime: endTime,
    hotelBooking: hotelBooking,
    planeTickets: planeTickets
  };
  
  // Save event to database
  fetch('/api/events', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(eventData)
  })
  .then(response => {
    if (!response.ok) {
      throw new Error('Network response was not ok');
    }
    return response.json();
  })
  .then(savedEvent => {
    // Create event object for client-side use
    const newEvent = {
      id: savedEvent.id || savedEvent.event_id,
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
    
    // Save to localStorage as backup
    saveData();
    
    // Clear the form
    document.getElementById("eventTrip").selectedIndex = 0;
    document.getElementById("eventActivity").value = "";
    document.getElementById("eventStartTime").value = "";
    document.getElementById("eventEndTime").value = "";
    document.getElementById("eventHotelBooking").value = "";
    document.getElementById("eventPlaneTickets").value = "";
  })
  .catch(error => {
    console.error('Error saving event:', error);
    
    // Fallback: save locally even if server save fails
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
    
    events.push(newEvent);
    addEventToList(newEvent);
    updateEventDropdown();
    updateAllMarkerInfoWindows();
    saveData();
    
    document.getElementById("eventTrip").selectedIndex = 0;
    document.getElementById("eventActivity").value = "";
    document.getElementById("eventStartTime").value = "";
    document.getElementById("eventEndTime").value = "";
    document.getElementById("eventHotelBooking").value = "";
    document.getElementById("eventPlaneTickets").value = "";
  });
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
  
  // Create journal data object
  const journalData = {
    eventId: parseInt(eventId),
    comments: comments
  };
  
  // Save journal entry to database
  fetch('/api/journals', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(journalData)
  })
  .then(response => {
    if (!response.ok) {
      throw new Error('Network response was not ok');
    }
    return response.json();
  })
  .then(savedJournal => {
    // Create journal entry object for client-side use
    const journalEntry = {
      id: savedJournal.id || savedJournal.journal_id,
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
    
    // Save to localStorage as backup
    saveData();
    
    // Clear the form
    document.getElementById("journalEvent").selectedIndex = 0;
    document.getElementById("journalComments").value = "";
  })
  .catch(error => {
    console.error('Error saving journal entry:', error);
    
    // Fallback: save locally even if server save fails
    const journalEntry = {
      id: Date.now(),
      eventId: parseInt(eventId),
      event: selectedEvent.activity,
      comments: comments
    };
    
    journalEntries.push(journalEntry);
    addJournalEntryToList(journalEntry);
    updateAllMarkerInfoWindows();
    saveData();
    
    document.getElementById("journalEvent").selectedIndex = 0;
    document.getElementById("journalComments").value = "";
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
  
  // Store the destination ID with the marker for reference
  marker.destinationId = destination.id;
  
  // Create an info window with enhanced content
  const infoWindow = new google.maps.InfoWindow({
    content: getInfoWindowContent(destination)
  });
  
  // Store the info window with the marker
  marker.infoWindow = infoWindow;
  
  // Add click listener to open info window
  marker.addListener("click", () => {
    // Close any other open info windows
    markers.forEach(m => {
      if (m.infoWindow && m !== marker) {
        m.infoWindow.close();
      }
    });
    
    // Update content before opening
    infoWindow.setContent(getInfoWindowContent(destination));
    
    // Open this info window
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

// Helper function to generate info window content
function getInfoWindowContent(destination) {
  console.log("Generating content for:", destination);
  
  // Find related trips
  const destinationTrips = trips.filter(trip => {
    console.log("Comparing trip.destinationId:", trip.destinationId, "with destination.id:", destination.id);
    return Number(trip.destinationId) === Number(destination.id);
  });
  
  console.log("Related trips found:", destinationTrips);
  
  // Prepare trips HTML - add a default message even if no trips exist
  let content = `
    <div style="max-width: 300px; padding: 10px; color: black;">
      <h5 style="color: black;">${destination.city}, ${destination.country}</h5>
      <hr class="my-2">
      <div>
        <h6 style="color: black;">Trips & Events:</h6>
  `;
  
  if (destinationTrips.length === 0) {
    content += '<p style="color: black;">No trips planned for this destination yet. Add a trip from the Trips tab.</p>';
  } else {
    content += '<ul class="mb-0" style="color: black;">';
    destinationTrips.forEach(trip => {
      content += `<li style="color: black;"><strong>${trip.startDate} to ${trip.endDate}</strong></li>`;
      
      // Find events for this trip
      const tripEvents = events.filter(event => Number(event.tripId) === Number(trip.id));
      if (tripEvents.length > 0) {
        content += '<ul style="color: black;">';
        tripEvents.forEach(event => {
          content += `<li style="color: black;"><strong>${event.activity}</strong> (${event.startTime || 'No time set'})`;
          
          // Find journal entries for this event
          const eventJournals = journalEntries.filter(journal => Number(journal.eventId) === Number(event.id));
          if (eventJournals.length > 0) {
            content += '<ul style="color: black;">';
            eventJournals.forEach(journal => {
              content += `<li class="font-italic" style="color: black;">"${journal.comments.substring(0, 30)}${journal.comments.length > 30 ? '...' : ''}"</li>`;
            });
            content += '</ul>';
          }
          
          content += '</li>';
        });
        content += '</ul>';
      } else {
        content += '<ul><li style="color: black;">No events added for this trip yet</li></ul>';
      }
    });
    content += '</ul>';
  }
  
  content += '</div></div>';
  
  return content;
}

// Update all marker info windows
function updateAllMarkerInfoWindows() {
  markers.forEach(marker => {
    const destination = destinations.find(d => Number(d.id) === Number(marker.destinationId));
    if (destination) {
      // Update the content of the info window
      marker.infoWindow.setContent(getInfoWindowContent(destination));
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
      const marker = markers.find(m => Number(m.destinationId) === Number(destination.id));
      
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
      const destination = destinations.find(d => Number(d.id) === Number(trip.destinationId));
      
      if (destination) {
        // Find the marker
        const marker = markers.find(m => Number(m.destinationId) === Number(destination.id));
        
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
      const trip = trips.find(t => Number(t.id) === Number(event.tripId));
      
      if (trip) {
        // Find the destination
        const destination = destinations.find(d => Number(d.id) === Number(trip.destinationId));
        
        if (destination) {
          // Find the marker
          const marker = markers.find(m => Number(m.destinationId) === Number(destination.id));
          
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
      const event = events.find(ev => Number(ev.id) === Number(journalEntry.eventId));
      
      if (event) {
        // Find the trip
        const trip = trips.find(t => Number(t.id) === Number(event.tripId));
        
        if (trip) {
          // Find the destination
          const destination = destinations.find(d => Number(d.id) === Number(trip.destinationId));
          
          if (destination) {
            // Find the marker
            const marker = markers.find(m => Number(m.destinationId) === Number(destination.id));
            
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
  // First, try to remove from server
  fetch(`/api/destinations/${id}`, {
    method: 'DELETE'
  })
  .catch(error => {
    console.error('Error deleting destination from server:', error);
  })
  .finally(() => {
    // Continue with local removal regardless of server response
    // Find the index of this destination
    const index = destinations.findIndex(d => Number(d.id) === Number(id));
    
    if (index !== -1) {
      // Remove the marker from the map
      const markerIndex = markers.findIndex(m => Number(m.destinationId) === Number(id));
      if (markerIndex !== -1) {
        markers[markerIndex].setMap(null);
        markers.splice(markerIndex, 1);
      }
      
      // Remove related trips
      const relatedTrips = trips.filter(trip => Number(trip.destinationId) === Number(id)).map(trip => trip.id);
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
  });
}

// Remove a trip by ID
function removeTrip(id) {
  // First, try to remove from server
  fetch(`/api/trips/${id}`, {
    method: 'DELETE'
  })
  .catch(error => {
    console.error('Error deleting trip from server:', error);
  })
  .finally(() => {
    // Continue with local removal regardless of server response
    // Find the index of this trip
    const index = trips.findIndex(t => Number(t.id) === Number(id));
    
    if (index !== -1) {
      // Remove related events
      const relatedEvents = events.filter(event => Number(event.tripId) === Number(id)).map(event => event.id);
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
  });
}

// Remove an event by ID
function removeEvent(id) {
  // First, try to remove from server
  fetch(`/api/events/${id}`, {
    method: 'DELETE'
  })
  .catch(error => {
    console.error('Error deleting event from server:', error);
  })
  .finally(() => {
    // Continue with local removal regardless of server response
    // Find the index of this event
    const index = events.findIndex(e => Number(e.id) === Number(id));
    
    if (index !== -1) {
      // Remove related journal entries
      const relatedJournals = journalEntries.filter(journal => Number(journal.eventId) === Number(id)).map(journal => journal.id);
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
  });
}

// Remove a journal entry by ID
function removeJournalEntry(id) {
  // First, try to remove from server
  fetch(`/api/journals/${id}`, {
    method: 'DELETE'
  })
  .catch(error => {
    console.error('Error deleting journal entry from server:', error);
  })
  .finally(() => {
    // Continue with local removal regardless of server response
    // Find the index of this journal entry
    const index = journalEntries.findIndex(j => Number(j.id) === Number(id));
    
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
  });
}

// Save data to localStorage (for backup purposes)
function saveData() {
  try {
    localStorage.setItem("travelPlannerDestinations", JSON.stringify(destinations));
    localStorage.setItem("travelPlannerTrips", JSON.stringify(trips));
    localStorage.setItem("travelPlannerEvents", JSON.stringify(events));
    localStorage.setItem("travelPlannerJournals", JSON.stringify(journalEntries));
    console.log("Data saved to localStorage (backup)");
  } catch (e) {
    console.error("Error saving to localStorage:", e);
  }
}

// Load data from server and localStorage as backup
function loadData() {
  // First try to load from server
  Promise.all([
    fetch('/api/destinations').then(res => res.ok ? res.json() : []).catch(() => []),
    fetch('/api/trips').then(res => res.ok ? res.json() : []).catch(() => []),
    fetch('/api/events').then(res => res.ok ? res.json() : []).catch(() => []),
    fetch('/api/journals').then(res => res.ok ? res.json() : []).catch(() => [])
  ])
  .then(([serverDestinations, serverTrips, serverEvents, serverJournals]) => {
    // If we got data from the server, use it
    if (serverDestinations.length > 0) {
      serverDestinations.forEach(destination => {
        // Format destination for client-side use
        const dest = {
          id: destination.id,
          city: destination.city,
          country: destination.country,
          lat: destination.latitude,
          lng: destination.longitude
        };
        
        destinations.push(dest);
        addMarkerToMap(dest);
        addDestinationToList(dest);
      });
    }
    
    if (serverTrips.length > 0) {
      serverTrips.forEach(trip => {
        trips.push(trip);
        addTripToList(trip);
      });
    }
    
    if (serverEvents.length > 0) {
      serverEvents.forEach(event => {
        events.push(event);
        addEventToList(event);
      });
    }
    
    if (serverJournals.length > 0) {
      serverJournals.forEach(journal => {
        journalEntries.push(journal);
        addJournalEntryToList(journal);
      });
    }
    
    // Update dropdowns
    updateDestinationDropdown();
    updateTripDropdown();
    updateEventDropdown();
    
    // Update info windows
    updateAllMarkerInfoWindows();
    
    console.log("Data loaded from server");
  })
  .catch(error => {
    console.error("Error loading data from server:", error);
    // Fallback to localStorage if server load fails
    loadFromLocalStorage();
  });
}

// Load from localStorage as backup
function loadFromLocalStorage() {
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
    
    console.log("Data loaded from localStorage (backup)");
  } catch (e) {
    console.error("Error loading from localStorage:", e);
  }
}

// Add event listener for when DOM is loaded
window.addEventListener('DOMContentLoaded', (event) => {
  console.log('DOM fully loaded, ready for map initialization');
});