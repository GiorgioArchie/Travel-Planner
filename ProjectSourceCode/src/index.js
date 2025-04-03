const express = require('express');
const app = express();
const handlebars = require('express-handlebars');
const path = require('path');
const pgp = require('pg-promise')();
const bodyParser = require('body-parser');
const session = require('express-session');
const bcrypt = require('bcryptjs');
const axios = require('axios');

// Set up handlebars
const hbs = handlebars.create({
  extname: 'hbs',
  defaultLayout: 'main',
  layoutsDir: path.join(__dirname, 'views/layouts'),
  partialsDir: path.join(__dirname, 'views/partials'),
  helpers: {
    // Add any custom helpers here if needed
  }
});

// Database configuration
const dbConfig = {
  host: 'db', // the database server
  port: 5432, // the database port
  database: process.env.POSTGRES_DB, // the database name
  user: process.env.POSTGRES_USER, // the user account to connect with
  password: process.env.POSTGRES_PASSWORD, // the password of the user account
};

const db = pgp(dbConfig);

// Test database connection
db.connect()
  .then(obj => {
    console.log('Database connection successful');
    obj.done(); // success, release the connection;
  })
  .catch(error => {
    console.log('ERROR:', error.message || error);
  });

// Use hbs as the template engine
app.engine('hbs', hbs.engine);
app.set('view engine', 'hbs');

// Set the 'views' directory
app.set('views', path.join(__dirname, 'views'));

// Serve static files from resources directory
app.use('/css', express.static(path.join(__dirname, 'resources/css')));
app.use('/js', express.static(path.join(__dirname, 'resources/js')));
app.use('/img', express.static(path.join(__dirname, 'resources/img')));

// Parse request bodies
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());

// Set up sessions
app.use(session({
  secret: process.env.SESSION_SECRET || 'default_secret',
  resave: false,
  saveUninitialized: true,
  cookie: { secure: false } // set to true if using https
}));

// Route for home page - redirects to login
app.get('/', (req, res) => {
  res.redirect('/login');
});

// Route for registration page
app.get('/register', (req, res) => {
  const message = req.query.message || '';
  res.render('pages/register', { message, title: 'Register' });
});

// Process registration form
app.post('/register', async (req, res) => {
  try {
    console.log('Registration attempt with data:', {
      username: req.body.username,
      passwordProvided: !!req.body.password
    });
    
    const { username, password } = req.body;
    
    // Basic validation
    if (!username || !password) {
      console.log('Missing username or password');
      return res.redirect('/register?message=Username and password are required');
    }
    
    console.log('Checking if username exists...');
    
    // Check if username already exists
    try {
      const userCheck = await db.oneOrNone('SELECT username FROM users WHERE username = $1', [username]);
      console.log('User check result:', userCheck);
      
      if (userCheck) {
        console.log('Username already exists');
        return res.redirect('/register?message=Username already exists');
      }
    } catch (dbErr) {
      console.error('Error checking for existing user:', dbErr);
      return res.redirect('/register?message=Database error. Please try again.');
    }
    
    console.log('Hashing password...');
    
    // Hash the password
    try {
      const hash = await bcrypt.hash(password, 10);
      console.log('Password hashed successfully');
      
      console.log('Inserting new user...');
      
      // Insert the new user
      try {
        await db.none('INSERT INTO users (username, password) VALUES ($1, $2)', [username, hash]);
        console.log('User registered successfully:', username);
        
        // Redirect to login page with success message
        return res.redirect('/login?message=Registration successful. Please log in.');
      } catch (insertErr) {
        console.error('Error inserting user into database:', insertErr);
        return res.redirect('/register?message=Error saving user to database. Please try again.');
      }
    } catch (hashErr) {
      console.error('Error hashing password:', hashErr);
      return res.redirect('/register?message=Error processing password. Please try again.');
    }
  } catch (err) {
    console.error('General registration error:', err);
    return res.redirect('/register?message=Error registering user. Please try again.');
  }
});

// Route for login page
app.get('/login', (req, res) => {
  const message = req.query.message || '';
  res.render('pages/login', { message, title: 'Login' });
});

// Process login form
app.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    
    // Get the user from the database
    const user = await db.oneOrNone('SELECT * FROM users WHERE username = $1', [username]);
    
    // If user doesn't exist or password doesn't match
    if (!user || !(await bcrypt.compare(password, user.password))) {
      return res.redirect('/login?message=Invalid username or password');
    }
    
    // Set up session
    req.session.user = {
      username: user.username,
      loggedIn: true
    };
    
    // Redirect to events page
    res.redirect('/map');
  } catch (err) {
    console.error('Login error:', err);
    res.redirect('/login?message=Error during login. Please try again.');
  }
});

// Route for logout
app.get('/logout', (req, res) => {
  // Destroy the session
  req.session.destroy();
  res.redirect('/login?message=You have been logged out');
});

// Authentication middleware
const isAuthenticated = (req, res, next) => {
  if (req.session.user && req.session.user.loggedIn) {
    next();
  } else {
    res.redirect('/login?message=Please log in to access this page');
  }
};

// Route for events page (protected)
app.get('/events', isAuthenticated, (req, res) => {
  res.render('pages/events', { 
    LoggedIn: true,
    username: req.session.user.username,
    title: 'Events'
  });
});

app.get('/calendar', isAuthenticated, (req, res) => {
  res.render('pages/calendar', { 
    LoggedIn: true,
    username: req.session.user.username,
    title: 'Calendar'
  });
});

app.get('/trips', isAuthenticated, (req, res) => {
  res.render('pages/trips', { 
    LoggedIn: true,
    username: req.session.user.username,
    title: 'Trips'
  });
});

app.get('/journal', isAuthenticated, (req, res) => {
  res.render('pages/journal', { 
    LoggedIn: true,
    username: req.session.user.username,
    title: 'Journal'
  });
});

// Route for map page
app.get('/map', isAuthenticated, (req, res) => {
  // Get the Google Maps API key
  const mapApiKey = process.env.API_KEY || '';
  
  res.render('pages/map', { 
    LoggedIn: true,
    username: req.session.user.username,
    title: 'Interactive Map',
    mapApiKey: mapApiKey
  });
});

// API ROUTES FOR TRAVEL DATA

// Destinations API
// Get all destinations
app.get('/api/destinations', isAuthenticated, async (req, res) => {
  try {
    const destinations = await db.any('SELECT * FROM destinations');
    res.json(destinations);
  } catch (err) {
    console.error('Error fetching destinations:', err);
    res.status(500).json({ error: 'Failed to fetch destinations' });
  }
});

// Create a new destination
app.post('/api/destinations', isAuthenticated, async (req, res) => {
  try {
    const { city, country, latitude, longitude } = req.body;
    
    // Create destination
    const result = await db.one(
      'INSERT INTO destinations (city, country, latitude, longitude) VALUES ($1, $2, $3, $4) RETURNING id', 
      [city, country, latitude, longitude]
    );
    
    res.status(201).json({
      id: result.id,
      city,
      country,
      latitude,
      longitude
    });
  } catch (err) {
    console.error('Error creating destination:', err);
    res.status(500).json({ error: 'Failed to create destination' });
  }
});

// Delete a destination
app.delete('/api/destinations/:id', isAuthenticated, async (req, res) => {
  try {
    const { id } = req.params;
    
    // Delete destination (cascading will handle related records)
    await db.none('DELETE FROM destinations WHERE id = $1', [id]);
    
    res.status(200).json({ message: 'Destination deleted successfully' });
  } catch (err) {
    console.error('Error deleting destination:', err);
    res.status(500).json({ error: 'Failed to delete destination' });
  }
});

// Trips API
// Get all trips for the current user
app.get('/api/trips', isAuthenticated, async (req, res) => {
  try {
    const username = req.session.user.username;
    
    const trips = await db.any(`
      SELECT t.trip_id, t.date_start, t.date_end, t.city, t.country, d.id as destination_id
      FROM trips t
      JOIN uses_to_trips u ON t.trip_id = u.trip_id
      LEFT JOIN destinations d ON t.city = d.city AND t.country = d.country
      WHERE u.username = $1
    `, [username]);
    
    res.json(trips.map(trip => ({
      id: trip.trip_id,
      destinationId: trip.destination_id,
      startDate: trip.date_start,
      endDate: trip.date_end,
      destination: `${trip.city}, ${trip.country}`
    })));
  } catch (err) {
    console.error('Error fetching trips:', err);
    res.status(500).json({ error: 'Failed to fetch trips' });
  }
});

// Create a new trip
app.post('/api/trips', isAuthenticated, async (req, res) => {
  try {
    const { destinationId, startDate, endDate, city, country } = req.body;
    const username = req.session.user.username;
    
    // Start a transaction
    await db.tx(async t => {
      // Insert trip
      const tripResult = await t.one(
        'INSERT INTO trips (date_start, date_end, city, country) VALUES ($1, $2, $3, $4) RETURNING trip_id',
        [startDate, endDate, city, country]
      );
      
      // Link user to trip
      await t.none(
        'INSERT INTO uses_to_trips (username, trip_id) VALUES ($1, $2)',
        [username, tripResult.trip_id]
      );
      
      res.status(201).json({
        id: tripResult.trip_id,
        destinationId,
        startDate,
        endDate,
        destination: `${city}, ${country}`
      });
    });
  } catch (err) {
    console.error('Error creating trip:', err);
    res.status(500).json({ error: 'Failed to create trip' });
  }
});

// Delete a trip
app.delete('/api/trips/:id', isAuthenticated, async (req, res) => {
  try {
    const { id } = req.params;
    const username = req.session.user.username;
    
    // Verify trip belongs to user
    const trip = await db.oneOrNone(
      'SELECT * FROM uses_to_trips WHERE trip_id = $1 AND username = $2',
      [id, username]
    );
    
    if (!trip) {
      return res.status(404).json({ error: 'Trip not found or unauthorized' });
    }
    
    // Delete trip (cascading will handle related records)
    await db.none('DELETE FROM trips WHERE trip_id = $1', [id]);
    
    res.status(200).json({ message: 'Trip deleted successfully' });
  } catch (err) {
    console.error('Error deleting trip:', err);
    res.status(500).json({ error: 'Failed to delete trip' });
  }
});

// Events API
// Get all events for the current user
app.get('/api/events', isAuthenticated, async (req, res) => {
  try {
    const username = req.session.user.username;
    
    const events = await db.any(`
      SELECT e.event_id, e.activity, e.start_time, e.end_time, e.hotel_booking, e.plane_tickets,
             t.trip_id, t.city, t.country
      FROM events e
      JOIN trips_to_events te ON e.event_id = te.event_id
      JOIN trips t ON te.trip_id = t.trip_id
      JOIN uses_to_trips ut ON t.trip_id = ut.trip_id
      WHERE ut.username = $1
    `, [username]);
    
    res.json(events.map(event => ({
      id: event.event_id,
      tripId: event.trip_id,
      activity: event.activity,
      startTime: event.start_time,
      endTime: event.end_time,
      hotelBooking: event.hotel_booking,
      planeTickets: event.plane_tickets,
      trip: `${event.city}, ${event.country}`
    })));
  } catch (err) {
    console.error('Error fetching events:', err);
    res.status(500).json({ error: 'Failed to fetch events' });
  }
});

// Create a new event
app.post('/api/events', isAuthenticated, async (req, res) => {
  try {
    const { tripId, activity, startTime, endTime, hotelBooking, planeTickets } = req.body;
    const username = req.session.user.username;
    
    // Verify trip belongs to user
    const trip = await db.oneOrNone(
      'SELECT * FROM uses_to_trips WHERE trip_id = $1 AND username = $2',
      [tripId, username]
    );
    
    if (!trip) {
      return res.status(404).json({ error: 'Trip not found or unauthorized' });
    }
    
    // Start a transaction
    await db.tx(async t => {
      // Insert event
      const eventResult = await t.one(
        'INSERT INTO events (activity, start_time, end_time, hotel_booking, plane_tickets) VALUES ($1, $2, $3, $4, $5) RETURNING event_id',
        [activity, startTime, endTime, hotelBooking, planeTickets]
      );
      
      // Link event to trip
      await t.none(
        'INSERT INTO trips_to_events (trip_id, event_id) VALUES ($1, $2)',
        [tripId, eventResult.event_id]
      );
      
      // Get trip details for the response
      const tripDetails = await t.one(
        'SELECT city, country FROM trips WHERE trip_id = $1',
        [tripId]
      );
      
      res.status(201).json({
        id: eventResult.event_id,
        tripId,
        activity,
        startTime,
        endTime,
        hotelBooking,
        planeTickets,
        trip: `${tripDetails.city}, ${tripDetails.country}`
      });
    });
  } catch (err) {
    console.error('Error creating event:', err);
    res.status(500).json({ error: 'Failed to create event' });
  }
});

// Delete an event
app.delete('/api/events/:id', isAuthenticated, async (req, res) => {
  try {
    const { id } = req.params;
    const username = req.session.user.username;
    
    // Verify event belongs to user's trip
    const event = await db.oneOrNone(`
      SELECT e.event_id
      FROM events e
      JOIN trips_to_events te ON e.event_id = te.event_id
      JOIN trips t ON te.trip_id = t.trip_id
      JOIN uses_to_trips ut ON t.trip_id = ut.trip_id
      WHERE e.event_id = $1 AND ut.username = $2
    `, [id, username]);
    
    if (!event) {
      return res.status(404).json({ error: 'Event not found or unauthorized' });
    }
    
    // Delete event (cascading will handle related records)
    await db.none('DELETE FROM events WHERE event_id = $1', [id]);
    
    res.status(200).json({ message: 'Event deleted successfully' });
  } catch (err) {
    console.error('Error deleting event:', err);
    res.status(500).json({ error: 'Failed to delete event' });
  }
});

// Journal API
// Get all journal entries for the current user
app.get('/api/journals', isAuthenticated, async (req, res) => {
  try {
    const username = req.session.user.username;
    
    const journals = await db.any(`
      SELECT j.journal_id, j.comments, e.event_id, e.activity
      FROM journals j
      JOIN events_to_journals ej ON j.journal_id = ej.journal_id
      JOIN events e ON ej.event_id = e.event_id
      WHERE j.username = $1
    `, [username]);
    
    res.json(journals.map(journal => ({
      id: journal.journal_id,
      eventId: journal.event_id,
      event: journal.activity,
      comments: journal.comments
    })));
  } catch (err) {
    console.error('Error fetching journal entries:', err);
    res.status(500).json({ error: 'Failed to fetch journal entries' });
  }
});

// Create a new journal entry
app.post('/api/journals', isAuthenticated, async (req, res) => {
  try {
    const { eventId, comments } = req.body;
    const username = req.session.user.username;
    
    // Verify event belongs to user's trip
    const event = await db.oneOrNone(`
      SELECT e.event_id, e.activity
      FROM events e
      JOIN trips_to_events te ON e.event_id = te.event_id
      JOIN trips t ON te.trip_id = t.trip_id
      JOIN uses_to_trips ut ON t.trip_id = ut.trip_id
      WHERE e.event_id = $1 AND ut.username = $2
    `, [eventId, username]);
    
    if (!event) {
      return res.status(404).json({ error: 'Event not found or unauthorized' });
    }
    
    // Start a transaction
    await db.tx(async t => {
      // Insert journal entry
      const journalResult = await t.one(
        'INSERT INTO journals (username, comments) VALUES ($1, $2) RETURNING journal_id',
        [username, comments]
      );
      
      // Link journal to event
      await t.none(
        'INSERT INTO events_to_journals (event_id, journal_id) VALUES ($1, $2)',
        [eventId, journalResult.journal_id]
      );
      
      res.status(201).json({
        id: journalResult.journal_id,
        eventId,
        event: event.activity,
        comments
      });
    });
  } catch (err) {
    console.error('Error creating journal entry:', err);
    res.status(500).json({ error: 'Failed to create journal entry' });
  }
});

// Delete a journal entry
app.delete('/api/journals/:id', isAuthenticated, async (req, res) => {
  try {
    const { id } = req.params;
    const username = req.session.user.username;
    
    // Verify journal belongs to user
    const journal = await db.oneOrNone(
      'SELECT * FROM journals WHERE journal_id = $1 AND username = $2',
      [id, username]
    );
    
    if (!journal) {
      return res.status(404).json({ error: 'Journal entry not found or unauthorized' });
    }
    
    // Delete journal entry (cascading will handle related records)
    await db.none('DELETE FROM journals WHERE journal_id = $1', [id]);
    
    res.status(200).json({ message: 'Journal entry deleted successfully' });
  } catch (err) {
    console.error('Error deleting journal entry:', err);
    res.status(500).json({ error: 'Failed to delete journal entry' });
  }
});

// GET Journal Page
app.get('/journal', isAuthenticated, async (req, res) => {
  try {
    const username = req.session.user.username;
    const selectedTripId = req.query.tripId || null;

    // Fetch user's trips
    const trips = await db.any(
      `SELECT trips.trip_id AS id, city, country, date_start, date_end
       FROM trips
       JOIN user_to_trips ON trips.trip_id = user_to_trips.trip_id
       WHERE user_to_trips.username = $1;`,
      [username]
    );

    let journalData = [];
    if (selectedTripId) {
      journalData = await db.any(
        `SELECT 
          journals.journal_id, 
          journals.comments, 
          images.image_id, 
          images.image_url, 
          images.image_caption
         FROM trips
         JOIN trips_to_events ON trips.trip_id = trips_to_events.trip_id
         JOIN journals ON trips_to_events.journal_id = journals.journal_id
         LEFT JOIN journal_to_image ON journals.journal_id = journal_to_image.journal_id
         LEFT JOIN images ON journal_to_image.image_id = images.image_id
         WHERE trips.trip_id = $1 AND journals.username = $2;`,
        [selectedTripId, username]
      );
    }

    res.render('pages/journal', { 
      LoggedIn: true,
      username,
      title: 'Journal',
      trips,
      selectedTripId,
      journalData
    });
  } catch (err) {
    console.error('[GET /journal] Error:', err);
    res.redirect('/login?message=Error loading journal page');
  }
});

// Add Journal Entry + Optional Photo
app.post('/journal/add', isAuthenticated, async (req, res) => {
  try {
    const username = req.session.user.username;
    const { tripId, comment } = req.body;
    const photo = req.files ? req.files.photo : null;

    // Insert journal
    const journalResult = await db.one(
      `INSERT INTO journals (username, comments) VALUES ($1, $2) RETURNING journal_id;`,
      [username, comment]
    );
    const journalId = journalResult.journal_id;

    // Link journal to trip
    const eventLink = await db.oneOrNone(
      `SELECT event_id FROM trips_to_events WHERE trip_id = $1 LIMIT 1;`,
      [tripId]
    );
    if (eventLink) {
      await db.none(
        `INSERT INTO trips_to_events (trip_id, event_id, journal_id) VALUES ($1, $2, $3);`,
        [tripId, eventLink.event_id, journalId]
      );
    }

    // Handle photo upload
    if (photo) {
      const uniqueName = Date.now() + '-' + photo.name.replace(/\s+/g, '_');
      const uploadPath = path.join(__dirname, 'resources/img/uploads', uniqueName);
      await photo.mv(uploadPath);

      const imageResult = await db.one(
        `INSERT INTO images (image_url, image_caption) VALUES ($1, $2) RETURNING image_id;`,
        [`/img/uploads/${uniqueName}`, photo.name]
      );
      await db.none(
        `INSERT INTO journal_to_image (journal_id, image_id) VALUES ($1, $2);`,
        [journalId, imageResult.image_id]
      );
    }

    res.redirect(`/journal?tripId=${tripId}&message=Journal entry added`);
  } catch (err) {
    console.error('[POST /journal/add] Error:', err);
    res.redirect('/journal?message=Error adding journal');
  }
});

// Delete Journal Entry + Photo
app.post('/journal/delete', isAuthenticated, async (req, res) => {
  try {
    const { journalId, tripId } = req.body;

    // Delete photo links
    await db.none(`DELETE FROM journal_to_image WHERE journal_id = $1;`, [journalId]);

    // Delete from trips_to_events
    await db.none(`DELETE FROM trips_to_events WHERE journal_id = $1;`, [journalId]);

    // Delete journal
    await db.none(`DELETE FROM journals WHERE journal_id = $1;`, [journalId]);

    res.redirect(`/journal?tripId=${tripId}&message=Journal deleted`);
  } catch (err) {
    console.error('[POST /journal/delete] Error:', err);
    res.redirect('/journal?message=Error deleting journal');
  }
});

// Edit Journal Entry
app.post('/journal/edit', isAuthenticated, async (req, res) => {
  try {
    const { journalId, tripId, comment } = req.body;
    console.log(`[POST /journal/edit] Editing journal ${journalId}`);

    await db.none(
      `UPDATE journals SET comments = $1 WHERE journal_id = $2;`,
      [comment, journalId]
    );

    res.redirect(`/journal?tripId=${tripId}&message=Journal updated successfully`);
  } catch (err) {
    console.error('[POST /journal/edit] Error:', err);
    res.redirect('/journal?message=Error editing journal');
  }
});

//####################################### TESTS CODE FOR LAB #######################################
app.get('/welcome', (req, res) => {
  res.json({status: 'success', message: 'Welcome!'});
});

//module.exports = app.listen(3000);

//####################################### TESTS CODE FOR LAB #######################################

// Start the server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});