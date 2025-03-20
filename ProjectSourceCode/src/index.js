const express = require('express'); // To build an application server or API
const app = express();
const handlebars = require('express-handlebars');
const Handlebars = require('handlebars');
const path = require('path');
const pgp = require('pg-promise')(); // To connect to the Postgres DB from the node server
const bodyParser = require('body-parser');
const session = require('express-session'); // To set the session object. To store or access session data, use the `req.session`, which is (generally) serialized as JSON by the store.
const bcrypt = require('bcryptjs'); //  To hash passwords
const axios = require('axios'); // To make HTTP requests from our server. We'll learn more about it in Part C.
const fs = require('fs');

// Register the message partial manually
const messagePartial = fs.readFileSync(path.join(__dirname, 'views/partials/message.hbs'), 'utf8');
Handlebars.registerPartial('message', messagePartial);
console.log('Message partial registered:', Handlebars.partials.message);

const hbs = handlebars.create({
  extname: 'hbs',
  layoutsDir: __dirname + '/views/layouts',
  partialsDir: __dirname + '/views/partials',
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
app.set('view engine', 'hbs');
// Set the 'views' directory
app.set('views', path.join(__dirname, 'views'));


// (Optional) Serve static files (CSS, images, JS) from a 'public' folder
app.use(express.static(path.join(__dirname, 'public')));

app.use(express.urlencoded({ extended: true })); // To parse URL-encoded form data
app.use(express.json()); // To parse JSON data (if needed));

// app.get('/register', (req, res) => {
//   res.render('pages/register');
// });
app.get('/', (req, res) => {
  res.redirect('/login');
});
const users = [];
app.post('/register', async (req, res) => {
  try {
    const { username, password } = req.body;
    const hash = await bcrypt.hash(password, 10);

    const query = 'INSERT INTO users (username, password) VALUES ($1, $2)';
    await db.none(query, [username, hash]);

    res.redirect('/login?message=Registration successful. Please log in.');
  } catch (err) {
    console.error(err);
    res.status(400).send('Error registering user.');
  }
});


// Route for login page
app.get('/login', (req, res) => {
  const message = req.query.message || ''; // Get the message from the query string
  res.render('pages/login', { message }); // Render the login page with the message
});


// Route for events page
app.get('/events', (req, res) => {
  // Renders 'events.hbs' from the views folder
  res.render('pages/events');
});


// Start the server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});



