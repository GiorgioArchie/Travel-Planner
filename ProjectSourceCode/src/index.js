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




// Use hbs as the template engine
app.set('view engine', 'hbs');
// Set the 'views' directory
app.set('views', path.join(__dirname, 'views'));


// (Optional) Serve static files (CSS, images, JS) from a 'public' folder
app.use(express.static(path.join(__dirname, 'public')));


// Route for login page
app.get('/login', (req, res) => {
  // Renders 'login.hbs' from the views folder
  res.render('login');
});


// Route for events page
app.get('/events', (req, res) => {
  // Renders 'events.hbs' from the views folder
  res.render('events');
});


// Start the server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});



