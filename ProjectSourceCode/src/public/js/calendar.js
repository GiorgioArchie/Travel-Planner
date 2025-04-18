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
        popupDetailSchedule: function(schedule) {
          const formatDate = (d) =>
            d
              ? d.toLocaleDateString('en-US', {
                  month: 'long',
                  day: 'numeric',
                  year: 'numeric'
                })
              : 'Unknown';
      
          const start = schedule.start?.toDate?.();
          const end = schedule.end?.toDate?.();
      
          const dateRange =
            start && end
              ? formatDate(start) === formatDate(end)
                ? formatDate(start)
                : `${formatDate(start)} – ${formatDate(end)}`
              : 'Trip date';
      
          const location =
            schedule.location ||
            schedule.raw?.destination ||
            (schedule.raw?.city && schedule.raw?.country
              ? `${schedule.raw.city}, ${schedule.raw.country}`
              : 'No location');
      
          const attendees = schedule.attendees?.join(', ') || 'N/A';
          const description = schedule.raw?.description || '';
      
          return `
            <strong>${schedule.title}</strong><br>
            📅 ${dateRange}<br>
            📍 ${location}<br>
            👥 ${attendees}<br>
            📝 ${description}
          `;
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
        const tripId = trip.id || trip.trip_id || `trip-${index}`;
        const tripName = trip.trip_name || trip.tripName || trip.title || 'Unnamed Trip';
      
        const startDateStr = trip.date_start || trip.startDate || trip.start;
        const endDateStr = trip.date_end || trip.endDate || trip.end || startDateStr;
      
        // Convert to ISO strings
        const startISO = startDateStr
          ? new Date(startDateStr).toISOString()
          : new Date().toISOString();
      
        const endISO = endDateStr
          ? new Date(new Date(endDateStr).getTime()).toISOString()
          : new Date(new Date(startDateStr || new Date()).getTime()).toISOString();
      
        return {
          id: `trip-${tripId}-event`,
          calendarId: `trip-${tripId}`,
          title: tripName,
          isAllday: true,
          category: 'allday',
          start: startISO,
          end: endISO,
          location: (trip.city && trip.country)
            ? `${trip.city}, ${trip.country}`
            : (trip.destination || ''),
          state: 'Trip',
          attendees: [username],
          raw: {
            type: 'trip',
            username: username,
            city: trip.city || '',
            country: trip.country || '',
            destination: trip.destination || '',
            date_start: startDateStr,
            date_end: endDateStr
          }
        };
      });
      
      
     
      // Add events to calendar
      console.log("Final calendarEvents being created:", calendarEvents);
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
