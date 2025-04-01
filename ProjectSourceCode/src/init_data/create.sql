-- Drop tables in reverse order of dependencies
DROP TABLE IF EXISTS journal_to_image CASCADE;
DROP TABLE IF EXISTS images CASCADE;
DROP TABLE IF EXISTS events_to_journals CASCADE;
DROP TABLE IF EXISTS journals CASCADE;
DROP TABLE IF EXISTS trips_to_events CASCADE;
DROP TABLE IF EXISTS events CASCADE;
DROP TABLE IF EXISTS uses_to_trips CASCADE;
DROP TABLE IF EXISTS trips CASCADE;
DROP TABLE IF EXISTS users CASCADE;

-- Create users table (this must work for registration)
CREATE TABLE users (
  username VARCHAR(50) PRIMARY KEY,
  password VARCHAR(100) NOT NULL
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

-- Create relationship tables
CREATE TABLE uses_to_trips (
  id SERIAL PRIMARY KEY,
  username VARCHAR(50) REFERENCES users(username),
  trip_id INT REFERENCES trips(trip_id)
);

CREATE TABLE trips_to_events (
  id SERIAL PRIMARY KEY,
  trip_id INT REFERENCES trips(trip_id),
  event_id INT REFERENCES events(event_id)
);

CREATE TABLE journals (
  journal_id SERIAL PRIMARY KEY,
  username VARCHAR(50) REFERENCES users(username),
  comments VARCHAR(500)
);

CREATE TABLE events_to_journals (
  id SERIAL PRIMARY KEY,
  event_id INT REFERENCES events(event_id),
  journal_id INT REFERENCES journals(journal_id)
);

CREATE TABLE images (
  image_id SERIAL PRIMARY KEY,
  image_url VARCHAR(255),
  image_caption VARCHAR(200)
);

CREATE TABLE journal_to_image (
  id SERIAL PRIMARY KEY,
  journal_id INT REFERENCES journals(journal_id),
  image_id INT REFERENCES images(image_id)
);