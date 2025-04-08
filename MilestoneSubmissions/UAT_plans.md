**User Acceptance Test Plan**

**Project Name:** Travel Planner
**Team Name:** Team Travel  
**Test Environment: Localhost (`http://localhost:3000`) using Docker Compose setup

---

### Feature 1: User Registration

**Objective:** Verify that users can successfully register and the data is stored correctly.

**Test Cases:**
1. **Valid Registration**
   - **Input:** username: `user01`, password: `password01`, confirmPassword: `password01`
   - **Expected Result:** Redirects to login page with success message, and user is stored in `users` table.

2. **Missing Required Fields**
   - **Input:** username: ``, password: `password01`
   - **Expected Result:** Registration fails, message "Username and password are required" is shown on page.

3. **Duplicate Username**
   - **Input:** username: `user01`, password: `password01`
   - **Expected Result:** Registration fails, message "Username already exists" shown.

**Test Data:** See `/docker-entrypoint-initdb.d/create.sql` and manual form input.

**User Acceptance Testers:** tbd

**Test Results:** To be recorded during execution week.

---

### Feature 2: Add Trip

**Objective:** Users can create new trips from both the home/trips page and the all trips page, and that the trip data is saved and displayed correctly.

**Test Cases:**

1. **Add Trip from Home/Trips Page**
   - **Input:** On home page, user fills in trip name: `Spring Break`, start date: `2025-03-15`, end date: `2025-03-22`, destination: `Miami`, and clicks "Add Trip"
   - **Expected Result:** 
     - Trip is saved in the database
     - Trip appears on the All Trips page
     - No previous trips are removed or overwritten

2. **Add Trip from All Trips Page**
   - **Input:** On All Trips page, user enters trip name: `Summer Road Trip`, start date: `2025-06-10`, end date: `2025-03-22, destination: `California`, and submits the form
   - **Expected Result:** 
     - Trip is saved and shown on the All Trips page
     - Previously saved trips (Spring Break) still appear
     - Trip is visible when returning to the home page

3. **Verify Persistence of Multiple Trips**
   - **Input:** After adding multiple trips from both pages, refresh the All Trips page
   - **Expected Result:**
     - All created trips are listed correctly
     - No data is lost between page reloads or navigation

**Test Data:** Trip entries with varying names, dates, and destinations added through both home and all trips pages.

**Test Environment:** Localhost using Docker Compose

**User Acceptance Testers:** tbd

**Test Results:** To be recorded during execution week (screenshots and confirmations)

---

### Feature 3: Add Journal Entry

**Objective:** Ensure authenticated users can create journal entries linked to a trip.

**Test Cases:**
1. **Add Journal with Comment**
   - **Input:** Select a trip, enter comment: "It was fun."
   - **Expected Result:** Journal is saved, displayed under selected trip.

2. **Add Journal with phtot**
   - **Input:** Comment + photo upload
   - **Expected Result:** Both comment and image are saved and displayed correctly.

3. **Add Journal Without Photo Upload**
   - **Input:** Select a trip, write comment, do not upload any photo
   - **Expected Result:** Journal is saved and displayed under trip, photo field remains empty.

**Test Data:** Trip records pre-seeded.

**Test Environment:** Localhost

**User Acceptance Testers:** tbd

**Test Results:** Results and screenshots will be logged in final report.

