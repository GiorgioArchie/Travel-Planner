
// public/js/calendar.js
// (runs in the browser, no imports)
document.addEventListener('DOMContentLoaded', async () => {
  const Calendar  = tui.Calendar;            // global from CDN
  const container = document.getElementById('calendar');

  const calendar = new tui.Calendar('#calendar', {
    defaultView : 'month',
    calendars   : [{ id:'trips', name:'Trips', backgroundColor:'#03bd9e' }],
    useFormPopup: true,
    useDetailPopup: true
  });

  calendar.setTheme({
    common: {
      gridSelection: {
        backgroundColor: 'rgba(81, 230, 92, 0.05)',
        border: '1px dotted #515ce6',
      },
    },
  });
// public/js/calendar.js  (after you create `calendar`)
const $range = document.getElementById('range');

document.getElementById('prev').addEventListener('click', () => {
  calendar.prev();
  renderRange();
});
document.getElementById('next').addEventListener('click', () => {
  calendar.next();
  renderRange();
});
document.getElementById('today').addEventListener('click', () => {
  calendar.today();
  renderRange();
});

/*
function renderRange() {
  // month view → show “April 2025”, week view → “Apr 7 – 13 2025”, etc.
  const date = calendar.getDate();               // current pivot date
  $range.textContent = date.toLocaleString('default', { month:'long', year:'numeric' });
}
renderRange();          // initial paint
*/

  calendar.on('clickEvent', ({ event }) => {
    const el = document.getElementById('clicked-event');
    el.innerText = event.title;
  });
  
  /* Optional: show details when the user clicks an event */
  /*
  calendar.on('clickEvent', ({ event }) => {
    const { raw } = event;
    const details = `
      <strong>${event.title}</strong><br>
      ${raw.city}, ${raw.country}<br>
      Hotel: ${raw.hotel || '–'}<br>
      Flight: ${raw.plane || '–'}<br>
      ${raw.desc || ''}
    `;
    document.getElementById('clicked-event').innerHTML = details;
  });
  */

  function renderRange() {
    const date = calendar.getDate();
    if ($range) {
      $range.textContent = date.toLocaleString('default', { month: 'long', year: 'numeric' });
    }
  }
  renderRange();

  // Fetch trips from the API and add them to the calendar.
  try {
    const res = await fetch('/api/trips');
    if (!res.ok) {
      throw new Error(`API call failed with status ${res.status}`);
    }
    const events = await res.json();
    calendar.createEvents(events);
  } catch (e) {
    console.error('Cannot load trips', e);
  }

});



//########################################################################################################

