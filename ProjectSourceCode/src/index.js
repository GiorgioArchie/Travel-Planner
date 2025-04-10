const express = require('express');
const app = express();
const handlebars = require('express-handlebars');
const path = require('path');
const pgp = require('pg-promise')();
const bodyParser = require('body-parser');
const session = require('express-session');
const bcrypt = require('bcryptjs');
const axios = require('axios');
const fileUpload = require('express-fileupload');

// Set up handlebars
const hbs = handlebars.create({
extname: 'hbs',
defaultLayout: 'main',
layoutsDir: path.join(__dirname, 'views/layouts'),
partialsDir: path.join(__dirname, 'views/partials'),
helpers: {
// Add any custom helpers here if needed
  eq: (a, b) => a == b,
  formatDate: function(dateStr) {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
  },
  json: obj => JSON.stringify(obj, null, 2),
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
app.use(fileUpload());
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
  if (req.session.user && req.session.user.loggedIn) {
    res.redirect('/map');
  } else {
  res.redirect('/login');
  }
});

// Route for registration page
app.get('/register', (req, res) => {
const message = req.query.message || '';
res.render('pages/register', { message, title: 'Register' });
});

// Process registration form
app.post('/register', async (req, res) => {
  try {
    const { username, password, test } = req.body;

    console.log('Registration attempt with data:', {
      username,
      passwordProvided: !!password,
      test
    });


    // Basic validation
    if (!username || !password) {
      console.log('Missing username or password');
      const message = 'Username and password are required';
      if (test) {
        return res.status(400).json({ message });
      } else {
        return res.status(400).render('pages/register', { message, error: true });
      }
    }


    console.log('Checking if username exists...');
    const userCheck = await db.oneOrNone('SELECT username FROM users WHERE username = $1', [username]);

    if (userCheck) {
      console.log('Username already exists');
      const message = 'Username already exists';
      if (test) {
        return res.status(409).json({ message });
      } else {
        return res.status(409).render('pages/register', { message, error: true });
      }
    }

    console.log('Hashing password...');

    const hash = await bcrypt.hash(password, 10);
    console.log('Password hashed successfully');

    console.log('Inserting new user...');
    await db.none('INSERT INTO users (username, password) VALUES ($1, $2)', [username, hash]);
    console.log('User registered successfully:', username);

    if (test) {
      return res.status(200).json({ message: 'Success' });
    } else {
      return res.redirect('/login?message=Registration successful. Please log in.');
    }

  } catch (err) {
    console.error('Registration error:', err);
    const message = 'Server error. Please try again.';
    if (req.body.test) {
      return res.status(500).json({ message });
    } else {
      return res.status(500).render('pages/register', { message, error: true });
    }
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
    return next();
  }
  return res.status(401).send('Please log in to access this page');
};

// Route for events page (protected)
app.get('/events', isAuthenticated, (req, res) => {
res.render('pages/events', {
LoggedIn: true,
username: req.session.user.username,
title: 'Events'
});
});

app.post('/events', isAuthenticated, async (req, res, next) => {
  res.render('pages/events', { 
    LoggedIn: true,
    username: req.session.user.username,
   title: 'Events'
  });
  const username    = req.session.user.username;
  console.log('username: ', username);
  const { event_id, start_time, end_time, city, country, activity, description } = req.body;

  if (!event_id || !start_time || !end_time || !city || !country || !activity || !description) {
    return res.status(400).send('Start and end dates are required.');
  }

  try {
    // insert into trips, grab the auto‑gen trip_id
    const { trip_id } = await db.one(`
    INSERT INTO events (event_id, start_time, end_time, city, country, activity, description)
    VALUES ($1, $2, $3, $4, $5, $6, $7)
    RETURNING event_id
    `, [event_id, start_time, end_time, city, country, activity, description]);

    await db.none(`
      INSERT INTO trips_to_events (trip_id, event_id)
      VALUES ($1, $2)
      `, [trip_id, event_id]);

    // redirect into the “trip details” page
    res.redirect(`/events/`);
  } catch (err) {
    next(err);
  }
});


app.get('/calendar', isAuthenticated, (req, res) => {
res.render('pages/calendar', {
LoggedIn: true,
username: req.session.user.username,
title: 'Calendar'
});
});

app.get('/trips', isAuthenticated, async (req, res) => {
  try {
    const username = req.session.user.username;

    const trips = await db.any(`
      SELECT t.*
      FROM trips t
      INNER JOIN users_to_trips ut ON t.trip_id = ut.trip_id
      WHERE ut.username = $1
    `, [username]);

    res.render('pages/trips', {
      LoggedIn: true,
      username: username,
      title: 'Trips',
      trips: trips
    });
  } catch (err) {
    console.error('Error querying trips:', err);
    res.status(500).send('Server Error');
  }
});

app.post('/trips', isAuthenticated, async (req, res, next) => {
  const username    = req.session.user.username;
  console.log('username: ', username);
  const { trip_name, date_start, date_end } = req.body;

  if (!trip_name || !date_start || !date_end) {
    return res.status(400).send('Start and end dates are required.');
  }

  try {
    // insert into trips, grab the auto‑gen trip_id
    const { trip_id } = await db.one(`
    INSERT INTO trips (trip_name, date_start, date_end)
    VALUES ($1, $2, $3)
    RETURNING trip_id
    `, [trip_name, date_start, date_end]);

    await db.none(`
      INSERT INTO users_to_trips (username, trip_id)
      VALUES ($1, $2)
      `, [username, trip_id]);

    // redirect into the “trip details” page
    res.redirect(`/trips/`);
  } catch (err) {
    next(err);
  }
});


app.post('/trips', isAuthenticated, async (req, res, next) => {
  const username    = req.session.user.username;
  console.log('username: ', username);
  const { trip_name, date_start, date_end } = req.body;

  if (!trip_name || !date_start || !date_end) {
    return res.status(400).send('Start and end dates are required.');
  }

  try {
    // insert into trips, grab the auto‑gen trip_id
    const { trip_id } = await db.one(`
    INSERT INTO trips (trip_name, date_start, date_end)
    VALUES ($1, $2, $3)
    RETURNING trip_id
    `, [trip_name, date_start, date_end]);

    await db.none(`
      INSERT INTO users_to_trips (username, trip_id)
      VALUES ($1, $2)
      `, [username, trip_id]);

    // redirect into the “trip details” page
    res.redirect(`/trips/`);
  } catch (err) {
    next(err);
  }
});

app.post('/trips', isAuthenticated, async (req, res, next) => {
  const username    = req.session.user.username;
  console.log('username: ', username);
  const { trip_name, date_start, date_end } = req.body;

  if (!trip_name || !date_start || !date_end) {
    return res.status(400).send('Start and end dates are required.');
  }

  try {
    // insert into trips, grab the auto‑gen trip_id
    const { trip_id } = await db.one(`
    INSERT INTO trips (trip_name, date_start, date_end)
    VALUES ($1, $2, $3)
    RETURNING trip_id
    `, [trip_name, date_start, date_end]);

    await db.none(`
      INSERT INTO users_to_trips (username, trip_id)
      VALUES ($1, $2)
      `, [username, trip_id]);

      console.log('[POST /trips] Linked trip_id', trip_id, 'to username', username); //test
    // redirect into the “trip details” page
    res.redirect(`/trips/`);
  } catch (err) {
    next(err);
  }
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

app.post('/api/destinations', isAuthenticated, async (req, res) => {
  try {
    const { city, country, latitude, longitude } = req.body;
    console.log('Creating destination:', { city, country, latitude, longitude });
    
    // Create destination
    const result = await db.one(
      'INSERT INTO destinations (city, country, latitude, longitude) VALUES ($1, $2, $3, $4) RETURNING id', 
      [city, country, latitude, longitude]
    );
    
    console.log('Destination created with ID:', result.id);
    
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

// Create a new destination


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
JOIN users_to_trips u ON t.trip_id = u.trip_id
LEFT JOIN destinations d ON t.city = d.city AND t.country = d.country
WHERE username = $1
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
// Replace the current trips API post route in index.js with this fixed version

// Create a new trip
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
        'INSERT INTO users_to_trips (username, trip_id) VALUES ($1, $2)',
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
'SELECT * FROM users_to_trips WHERE trip_id = $1 AND username = $2',
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

// GET Journal Page
app.get('/journal', isAuthenticated, async (req, res) => {
  try {
    const username = req.session.user.username;
    const selectedTripId = parseInt(req.query.tripId, 10) || null;
    const message = req.query.message || null;

    const trips = await db.any(
      `SELECT trips.trip_id AS id, city, country, date_start, date_end
       FROM trips
       JOIN users_to_trips ON trips.trip_id = users_to_trips.trip_id
       WHERE users_to_trips.username = $1`,
      [username]
    );

    let journalData = [];

if (selectedTripId) {
  const rawData = await db.any(
    `SELECT 
       journals.journal_id, 
       journals.comments,
       images.image_id, 
       images.image_url
     FROM journals
     LEFT JOIN journal_to_image ON journals.journal_id = journal_to_image.journal_id
     LEFT JOIN images ON journal_to_image.image_id = images.image_id
     WHERE journals.trip_id = $1 AND journals.username = $2
     ORDER BY journals.journal_id`,
    [selectedTripId, username]
  );

  // Group journal entries by journal_id
  const journalMap = new Map();

  for (const row of rawData) {
    if (!journalMap.has(row.journal_id)) {
      journalMap.set(row.journal_id, {
        journal_id: row.journal_id,
        comments: row.comments,
        images: []
      });
      journalData.push(journalMap.get(row.journal_id));
    }

    if (row.image_url) {
      journalMap.get(row.journal_id).images.push({
        image_id: row.image_id,
        image_url: row.image_url
      });
    }
  }
}

    res.render('pages/journal', { 
      LoggedIn: true,
      username,
      title: 'Journal',
      trips,
      selectedTripId,
      journalData,
      message
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
    let { tripId, comment } = req.body;

    tripId = parseInt(tripId, 10);
    if (!tripId || isNaN(tripId)) {
      console.log('[ADD JOURNAL] Invalid tripId:', tripId);
      return res.redirect('/journal?message=Invalid trip ID.');
    }

    let photos = req.files ? req.files.photos : null;

    // Normalize to array if a single photo is uploaded
    if (photos && !Array.isArray(photos)) {
      photos = [photos];
    }

    if (!comment && (!photos || photos.length === 0)) {
      return res.redirect(`/journal?tripId=${tripId}&message=Please provide a comment or upload a photo.`);
    }

    // Save the journal entry
    const journalResult = await db.one(
      `INSERT INTO journals (username, comments, trip_id) VALUES ($1, $2, $3) RETURNING journal_id`,
      [username, comment || '', tripId]
    );
    const journalId = journalResult.journal_id;

    // Upload each photo and associate with the journal
    if (photos && photos.length > 0) {
      for (const photo of photos) {
        const uniqueName = Date.now() + '-' + photo.name.replace(/\s+/g, '_');
        const uploadPath = path.join(__dirname, 'resources/img/uploads', uniqueName);
        await photo.mv(uploadPath);

        const imageResult = await db.one(
          `INSERT INTO images (image_url, image_caption) VALUES ($1, $2) RETURNING image_id`,
          [`/img/uploads/${uniqueName}`, ''] // No caption
        );

        await db.none(
          `INSERT INTO journal_to_image (journal_id, image_id) VALUES ($1, $2)`,
          [journalId, imageResult.image_id]
        );
      }
    }

    res.redirect(`/journal?tripId=${tripId}&message=Journal entry added`);
  } catch (err) {
    console.error('[POST /journal/add] Error:', err);
    res.redirect(`/journal?message=Error adding journal`);
  }
});


// Delete Journal Entry + Photo
app.post('/journal/delete', isAuthenticated, async (req, res) => {
  try {
    const { journalId, tripId } = req.body;
    console.log('[DELETE] req.body:', req.body);

    // Delete related images (optional)
    await db.none(`DELETE FROM journal_to_image WHERE journal_id = $1`, [journalId]);

    // Delete the journal itself
    await db.none(`DELETE FROM journals WHERE journal_id = $1`, [journalId]);

    res.redirect(`/journal?tripId=${tripId}&message=Journal deleted`);
  } catch (err) {
    console.error('[POST /journal/delete] Error:', err);
    res.redirect(`/journal?tripId=${req.body.tripId}&message=Error deleting journal`);
  }
});


// Edit Journal Entry
app.post('/journal/edit', isAuthenticated, async (req, res) => {
  try {
    const { journalId, tripId, comment } = req.body;
    let photos = req.files ? req.files.photos : null;

    // Normalize to array if a single photo is uploaded
    if (photos && !Array.isArray(photos)) {
      photos = [photos];
    }

    // Update the journal comment
    await db.none(
      `UPDATE journals SET comments = $1 WHERE journal_id = $2`,
      [comment, journalId]
    );

    // Upload each new photo and associate with journal
    if (photos && photos.length > 0) {
      for (const photo of photos) {
        const uniqueName = Date.now() + '-' + photo.name.replace(/\s+/g, '_');
        const uploadPath = path.join(__dirname, 'resources/img/uploads', uniqueName);
        await photo.mv(uploadPath);

        const imageResult = await db.one(
          `INSERT INTO images (image_url, image_caption) VALUES ($1, $2) RETURNING image_id`,
          [`/img/uploads/${uniqueName}`, '']
        );

        await db.none(
          `INSERT INTO journal_to_image (journal_id, image_id) VALUES ($1, $2)`,
          [journalId, imageResult.image_id]
        );
      }
    }

    res.redirect(`/journal?tripId=${tripId}&message=Journal updated successfully`);
  } catch (err) {
    console.error('[POST /journal/edit] Error:', err);
    res.redirect(`/journal?tripId=${req.body.tripId}&message=Error editing journal`);
  }
});



////////////////////////////////////////////////////
// ADD THIS CALENDAR ROUTE TO YOUR EXISTING index.js
////////////////////////////////////////////////////
// 2) Define a route for "/calendar" that renders "calendar.hbs"
app.get('/calendar', (req, res) => {
  res.render('pages/calendar');
});

// 3) (Optional) Root route => redirect to "/calendar"
app.get('/', (req, res) => {
  res.redirect('/calendar');
});

//###############################################################################//



// Test welcome route
app.get('/welcome', (req, res) => {
res.json({ status: 'success', message: 'Welcome!' });
});

// Start server
const PORT = process.env.PORT || 3000;
if (require.main === module) {
app.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`));
}
module.exports = app;