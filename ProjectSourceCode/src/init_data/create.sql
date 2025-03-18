DROP TABLE IF EXISTS users;
CREATE TABLE users (
  username VARCHAR(50) PRIMARY KEY NOT NULL,
  password VARCHAR(60) NOT NULL
);

CREATE TABLE IF NOT EXISTS uses_to_reviews (
  username VARCHAR(50) PRIMARY KEY NOT NULL,
  review_id INT
)

DROP TABLE IF EXISTS reviews CASCADE;
CREATE TABLE IF NOT EXISTS reviews (
  username VARCHAR(50) SERIAL PRIMARY KEY NOT NULL,
  review_id INT,
  review VARCHAR(500),
  rating DECIMAL NOT NULL
);

CREATE TABLE IF NOT EXISTS review_to_image (
  review_id PRIMARY KEY,
  image_id INT
);

CREATE TABLE IF NOT EXISTS images (
  image_id PRIMARY KEY,
  image_url URL,
  image_caption VARCHAR(200)
)

