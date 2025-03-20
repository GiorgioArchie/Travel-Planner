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
  username VARCHAR(50) PRIMARY KEY NOT NULL,
  password VARCHAR(100) NOT NULL
);

-- Create other tables
CREATE TABLE trips (
  trip_id SERIAL PRIMARY KEY,
  date_start DATE,
  date_end DATE,
  city VARCHAR(50),
  country VARCHAR(50)
)

CREATE TABLE IF NOT EXISTS trips_to_events_journals (
  trip_id PRIMARY KEY NOT NULL,
  event_id INT,
  journal_id INT
)

CREATE TABLE events (
  event_id SERIAL PRIMARY KEY,
  start_time TIME,
  end_time TIME,
  activity VARCHAR(100),
  hotel_booking VARCHAR(100),
  plane_tickets VARCHAR(100)
)

DROP TABLE IF EXISTS journals CASCADE;
CREATE TABLE IF NOT EXISTS journals (
  journal_id PRIMARY KEY,
  comments VARCHAR(500)
);

CREATE TABLE journal_to_image (
  journal_id INT REFERENCES journals(journal_id),
  image_id INT REFERENCES images(image_id)
);

CREATE TABLE images (
  image_id SERIAL PRIMARY KEY,
  image_url VARCHAR(255),
  image_caption VARCHAR(200)
);

