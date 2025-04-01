const express = require('express');
const app = express();
const handlebars = require('express-handlebars');
const path = require('path');
const pgp = require('pg-promise')();
const bodyParser = require('body-parser');
const session = require('express-session');
const bcrypt = require('bcryptjs');
const axios = require('axios');

// Debug environment variables
console.log('Environment variables check:');
console.log('- API_KEY exists:', !!process.env.API_KEY);
console.log('- POSTGRES_DB exists:', !!process.env.POSTGRES_DB);
console.log('- POSTGRES_USER exists:', !!process.env.POSTGRES_USER);
console.log('- POSTGRES_PASSWORD exists:', !!process.env.POSTGRES_PASSWORD);

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

// database configuration
const dbConfig = {
  host: 'db', // the database server
  port: 5432, // the database port
  database: process.env.POSTGRES_DB, // the database name
  user: process.env.POSTGRES_USER, // the user account to connect with
  password: process.env.POSTGRES_PASSWORD, // the password of the user account
};

const db = pgp(dbConfig);

// test your database
db.connect()
  .then(obj => {
    console.log('Database connection successful'); // you can view this message in the docker compose logs
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

// Enhanced registration route with debug logging
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

app.get('/journal', isAuthenticated, (req, res) => {
  res.render('pages/journal', { 
    LoggedIn: true,
    username: req.session.user.username,
    title: 'Journal'
  });
});
app.get('/trips', isAuthenticated, (req, res) => {
  res.render('pages/trips', { 
    LoggedIn: true,
    username: req.session.user.username,
    title: 'Trips'
  });
});
// Map route with API key
app.get('/map', isAuthenticated, (req, res) => {
  // Get API key from environment variables
  const mapApiKey = process.env.API_KEY || '';
  
  console.log('Map page requested, API key exists:', !!mapApiKey);
  if (!mapApiKey) {
    console.warn('WARNING: Google Maps API key is missing from environment variables');
  }
  
  res.render('pages/map', { 
    LoggedIn: true,
    username: req.session.user.username,
    title: 'Interactive Map',
    mapApiKey: mapApiKey
  });
});

// Add this route after your other routes
app.get('/calendar', isAuthenticated, (req, res) => {
  // Construct the embed URL using your Calendar ID and desired time zone
  const calendarId = 'c_03f444f99225ea19fd6f2845cf898dcd4b9abb839ef60b898d624781811e0862@group.calendar.google.com';
  const timeZone = 'America/Denver';
  
  // Encode the calendar ID and time zone to safely place in the URL
  const googleCalendarURL = `https://calendar.google.com/calendar/embed?src=${encodeURIComponent(calendarId)}&ctz=${encodeURIComponent(timeZone)}`;

  res.render('pages/calendar', {
    title: 'Calendar',
    LoggedIn: true,
    username: req.session.user.username,
    googleCalendarURL
  });
});

// Start the server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});