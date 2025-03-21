const express = require('express'); // To build an application server or API
const app = express();
const handlebars = require('express-handlebars');
const path = require('path');
const pgp = require('pg-promise')(); // To connect to the Postgres DB from the node server
const bodyParser = require('body-parser');
const session = require('express-session'); // To set the session object. To store or access session data, use the `req.session`, which is (generally) serialized as JSON by the store.
const bcrypt = require('bcryptjs'); //  To hash passwords
const axios = require('axios'); // To make HTTP requests from our server. We'll learn more about it in Part C.

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
  secret: 'your_session_secret',
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
    res.redirect('/events');
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

// Route for map page
app.get('/map', isAuthenticated, (req, res) => {
  res.render('pages/home', { 
    LoggedIn: true,
    username: req.session.user.username,
    title: 'Map'
  });
});

// Start the server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});