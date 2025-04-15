// Updated calendar.js with fixed date display
document.addEventListener('DOMContentLoaded', async () => {
  try {
    console.log("Initializing calendar...");
   
    // Define an array of colors for different trips
    const tripColors = [
      '#03bd9e', // teal
      '#ff5583', // pink
      '#3498db', // blue
      '#f39c12', // orange
      '#9b59b6', // purple
      '#2ecc71', // green
      '#e74c3c', // red
      '#34495e', // dark blue
      '#1abc9c', // light teal
      '#d35400'  // dark orange
    ];
   
    // Get username from the page
    let username = "Loading username...";
    const calendarData = document.getElementById('calendar-data');
    if (calendarData && calendarData.dataset.username) {
      username = calendarData.dataset.username;
      console.log("Got username from page:", username);
    }
   
    // Configure calendar
    const calendar = new tui.Calendar('#calendar', {
      defaultView: 'month',
      useDetailPopup: true,
      isReadOnly: true, // Make calendar read-only to prevent cell selection
      template: {
        // Customize what shows in the calendar item
        allday: function(schedule) {
          return schedule.title;
        },
        // FIXED DATE FORMATTER
        popupDetailDate: function(isAllDay, start, end) {
          console.log("Date formatter inputs:", { isAllDay, start, end });
         
          try {
            // Convert start and end to Date objects if they're strings
            let startDate, endDate;
           
            if (typeof start === 'string') {
              startDate = new Date(start);
            } else {
              startDate = start;
            }
           
            if (typeof end === 'string') {
              endDate = new Date(end);
            } else {
              endDate = end;
            }
           
            // For all-day events, the end date is exclusive, so subtract 1 day
            if (isAllDay) {
              endDate = new Date(endDate);
              endDate.setDate(endDate.getDate() - 1);
            }
           
            // Format dates as MM/DD/YYYY
            const formatDate = (date) => {
              if (!date || isNaN(date.getTime())) {
                return "Invalid date";
              }
             
              const month = date.getMonth() + 1;
              const day = date.getDate();
              const year = date.getFullYear();
             
              return `${month}/${day}/${year}`;
            };
           
            const startStr = formatDate(startDate);
            const endStr = formatDate(endDate);
           
            // If start and end dates are the same, just show one date
            if (startStr === endStr) {
              return startStr;
            }
           
            // Otherwise show the date range
            return `${startStr} - ${endStr}`;
          } catch (e) {
            console.error("Error formatting dates:", e);
            console.log("Raw date values:", { start, end });
            return "Date error";
          }
        },
        popupDetailLocation: function(schedule) {
          // Display destination in location field
          if (schedule.raw) {
            if (schedule.raw.city || schedule.raw.country) {
              return `${schedule.raw.city || ''} ${schedule.raw.country ? ', ' + schedule.raw.country : ''}`;
            } else if (schedule.raw.destination) {
              return schedule.raw.destination;
            }
          }
          return schedule.location || 'No destination specified';
        },
        popupDetailAttendees: function(schedule) {
          // Use the username from the data attribute
          return username;
        },
        popupDetailState: function(schedule) {
          return schedule.state || 'Trip';
        },
        popupDetailBody: function(schedule) {
          if (schedule.raw && schedule.raw.description) {
            return schedule.raw.description;
          }
          return '';
        }
      }
    });
   
    // Disable default click behavior that selects/highlights cells
    calendar.off('clickDayName');
    calendar.off('clickMoreEventsBtn');
    calendar.off('clickTimezonesCollapseBtn');
   
    // Set up calendar navigation
    document.getElementById('prev').addEventListener('click', () => {
      calendar.prev();
      updateRange();
    });
   
    document.getElementById('next').addEventListener('click', () => {
      calendar.next();
      updateRange();
    });
   
    document.getElementById('today').addEventListener('click', () => {
      calendar.today();
      updateRange();
    });
   
    function updateRange() {
      const range = document.getElementById('range');
      if (range) {
        const date = calendar.getDate();
        range.textContent = date.toLocaleString('default', { month: 'long', year: 'numeric' });
      }
    }
   
    // Initial range update
    updateRange();
   
    // Fetch trips from API
    try {
      console.log("Fetching trips data...");
      const response = await fetch('/api/trips');
      if (!response.ok) {
        throw new Error(`API call failed with status ${response.status}`);
      }
      const tripsData = await response.json();
      console.log("Received trips data:", tripsData);
     
      if (tripsData.length === 0) {
        console.log("No trips found");
        document.getElementById('clicked-event').textContent = "No trips found";
        return;
      }
     
      // Create a new calendar category for each trip with a different color
      const calendarCategories = [];
     
      // Use a Set to track unique trip IDs
      const uniqueTripIds = new Set();
      tripsData.forEach(trip => {
        const tripId = trip.id || trip.trip_id;
        uniqueTripIds.add(tripId);
      });
     
      // Create a category for each unique trip
      let index = 0;
      uniqueTripIds.forEach(tripId => {
        calendarCategories.push({
          id: `trip-${tripId}`,
          name: `Trip ${index + 1}`,
          backgroundColor: tripColors[index % tripColors.length]
        });
        index++;
      });
     
      // Make sure we have at least one category
      if (calendarCategories.length === 0) {
        calendarCategories.push({
          id: 'default-trip',
          name: 'Trips',
          backgroundColor: tripColors[0]
        });
      }
     
      console.log("Calendar categories:", calendarCategories);
     
      // Set the categories on the calendar
      calendar.setCalendars(calendarCategories);
     
      // Process trips into calendar events
      const calendarEvents = tripsData.map((trip, index) => {
        console.log("Processing trip:", trip);
       
        // Get trip ID
        const tripId = trip.id || trip.trip_id;
       
        // Get trip name
        let tripName = trip.trip_name || trip.tripName || trip.title || 'Unnamed Trip';
       
        // Create calendar event with the category matching this trip's ID
        const calendarEvent = {
          id: `trip-${tripId}-event`,
          calendarId: `trip-${tripId}`, // This links to the category we created
          title: tripName,
          isAllday: true,
          category: 'allday',
          location: (trip.city && trip.country) ? `${trip.city}, ${trip.country}` : (trip.destination || ''),
          state: 'Trip',
          attendees: [username] // Use our username
        };
       
        // Store the username directly in the raw data as well
        calendarEvent.raw = {
          type: 'trip',
          username: username,
          city: trip.city || '',
          country: trip.country || '',
          destination: trip.destination || ''
        };
       
        // IMPROVED START DATE HANDLING
        if (trip.date_start || trip.startDate) {
          const startDate = trip.date_start || trip.startDate;
          // Make sure it's a full datetime string with time component
          calendarEvent.start = startDate.includes('T') ? startDate : `${startDate}T00:00:00`;
          console.log(`Trip ${tripId} start date:`, calendarEvent.start);
        } else if (trip.start) {
          calendarEvent.start = trip.start;
        } else {
          calendarEvent.start = new Date().toISOString().split('T')[0] + 'T00:00:00';
        }
       
        // IMPROVED END DATE HANDLING
        if (trip.date_end || trip.endDate) {
          const endDate = trip.date_end || trip.endDate;
         
          // For Toast UI Calendar's all-day events, the end date is exclusive
          // So we need to add one day to make it inclusive
          try {
            const endDateObj = new Date(endDate);
            // Add one day to make it work with Toast UI Calendar
            endDateObj.setDate(endDateObj.getDate() + 0);
            calendarEvent.end = endDateObj.toISOString().split('T')[0];
          } catch (e) {
            // Fallback
            calendarEvent.end = endDate.includes('T') ? endDate : `${endDate}T23:59:59`;
          }
         
          console.log(`Trip ${tripId} end date:`, calendarEvent.end);
        } else if (trip.end) {
          calendarEvent.end = trip.end;
        } else {
          // Default to same day as start
          calendarEvent.end = calendarEvent.start.split('T')[0];
        }
       
        return calendarEvent;
      });
     
      // Add events to calendar
      calendar.createEvents(calendarEvents);
      console.log(`Added ${calendarEvents.length} events to calendar`);
    } catch (error) {
      console.error("Error fetching or processing trips:", error);
      document.getElementById('clicked-event').textContent = `Error: ${error.message}`;
    }
  } catch (error) {
    console.error("Calendar initialization error:", error);
    document.getElementById('calendar').innerHTML =
      `<div class="alert alert-danger">Calendar Error: ${error.message}</div>`;
  }
});
