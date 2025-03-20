DROP TABLE IF EXISTS users;
CREATE TABLE users (
  username VARCHAR(50) PRIMARY KEY NOT NULL,
  password VARCHAR(60) NOT NULL
);

CREATE TABLE IF NOT EXISTS uses_to_trips (
  username VARCHAR(50) PRIMARY KEY NOT NULL,
  trip_id INT
)

CREATE TABLE IF NOT EXISTS trips (
  trip_id INT PRIMARY KEY NOT NULL,
  date_start date,
  date_end date,
  city VARCHAR(50),
  country VARCHAR(50)
)

CREATE TABLE IF NOT EXISTS trips_to_events (
  trip_id PRIMARY KEY NOT NULL,
  event_id INT
)

CREATE TABLE IF NOT EXISTS events (
  event_id INT PRIMARY KEY NOT NULL,
  start_time time,
  end_time time,
  activity VARCHAR(100),
  hotel_booking VARCHAR(100),
  plane_tickets VARCHAR(100)
)

CREATE TABLE IF NOT EXISTS events_to_journals (
  events_id 
)

DROP TABLE IF EXISTS journals CASCADE;
CREATE TABLE IF NOT EXISTS journals (
  username VARCHAR(50) SERIAL PRIMARY KEY NOT NULL,
  journal_id INT,
  comments VARCHAR(500)
);

CREATE TABLE IF NOT EXISTS journal_to_image (
  journal_id PRIMARY KEY,
  image_id INT
);

CREATE TABLE IF NOT EXISTS images (
  image_id PRIMARY KEY,
  image_url URL,
  image_caption VARCHAR(200)
)

