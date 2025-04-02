-- Drop tables in reverse order of dependencies
DROP TABLE IF EXISTS journal_to_image CASCADE;
DROP TABLE IF EXISTS images CASCADE;
DROP TABLE IF EXISTS events_to_journals CASCADE;
DROP TABLE IF EXISTS journals CASCADE;
DROP TABLE IF EXISTS trips_to_events CASCADE;
DROP TABLE IF EXISTS events CASCADE;
DROP TABLE IF EXISTS uses_to_trips CASCADE;
DROP TABLE IF EXISTS trips CASCADE;
DROP TABLE IF EXISTS destinations CASCADE;
DROP TABLE IF EXISTS users CASCADE;

-- Create users table
CREATE TABLE users (
  username VARCHAR(50) PRIMARY KEY,
  password VARCHAR(100) NOT NULL
);

-- Create destinations table
CREATE TABLE destinations (
  id SERIAL PRIMARY KEY,
  city VARCHAR(50) NOT NULL,
  country VARCHAR(50) NOT NULL,
  latitude NUMERIC,
  longitude NUMERIC
);

-- Create trips table
CREATE TABLE trips (
  trip_id SERIAL PRIMARY KEY,
  date_start DATE,
  date_end DATE,
  city VARCHAR(50),
  country VARCHAR(50)
);

-- Create events table
CREATE TABLE events (
  event_id SERIAL PRIMARY KEY,
  start_time TIME,
  end_time TIME,
  activity VARCHAR(100),
  hotel_booking VARCHAR(100),
  plane_tickets VARCHAR(100)
);

-- Create users to trips relationship table
CREATE TABLE uses_to_trips (
  id SERIAL PRIMARY KEY,
  username VARCHAR(50) REFERENCES users(username),
  trip_id INTEGER REFERENCES trips(trip_id)
);

-- Create trips to events relationship table
CREATE TABLE trips_to_events (
  id SERIAL PRIMARY KEY,
  trip_id INTEGER REFERENCES trips(trip_id),
  event_id INTEGER REFERENCES events(event_id)
);

-- Create journals table
CREATE TABLE journals (
  journal_id SERIAL PRIMARY KEY,
  username VARCHAR(50) REFERENCES users(username),
  comments VARCHAR(500)
);

-- Create events to journals relationship table
CREATE TABLE events_to_journals (
  id SERIAL PRIMARY KEY,
  event_id INTEGER REFERENCES events(event_id),
  journal_id INTEGER REFERENCES journals(journal_id)
);

-- Create images table
CREATE TABLE images (
  image_id SERIAL PRIMARY KEY,
  image_url VARCHAR(255),
  image_caption VARCHAR(200)
);

-- Create journals to images relationship table
CREATE TABLE journal_to_image (
  id SERIAL PRIMARY KEY,
  journal_id INTEGER REFERENCES journals(journal_id),
  image_id INTEGER REFERENCES images(image_id)
);