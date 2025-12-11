# Overview
This project is a concert memory website where users can record the concerts they have attended and attach songs that remind them of the experience. The site includes:
1. A custom soundtrack search powered by the Deezer API
2. A backend server built with Node.js + Express
3. A MongoDB database connected through Prisma
4. A user-friendly interface for creating, editing, and viewing concert cards
5. Song previews (using Deezer’s built-in 30-second preview)
The goal of this project is to help users turn their concert memories into interactive digital cards that include notes, images, and music.

## Feature
1. Concert Memory Creation
- Concert name
- Artist name
- Date
- Venue
- City
- Seat info
- Price
- Type of ticket
- Upload image URLs
- Notes
2. Song Search Using Deezer API
- Sends the search query to Deezer
- Fetches multiple pages of results
- Returns a clean list of tracks to the frontend
- Allows users to preview songs directly on the website
3. Data Storage with MongoDB + Prisma
- Data schema
- Type safety
- Querying and inserting new concert records

# Tech Stack
1. Frontend
- HTML
- CSS
- JavaScript
2. Backend
- Node.js
- API.js
- Prisma
3. Database
- MongoDB Atlas
4. API
- Deezer API

# How the Soundtrack Feature Works
Type to search the songs that you like from the artist that you are currently recording, and select some songs that are your favorite and listen with preview player, this is helpful with recalling user's memory back to the concert date to think about what happened at that day.

# Acknowledgements
Deezer API for providing the song data and audio previews that made the soundtrack feature possible, and having database that can help with recording all the information about the concert. In addition, using ChatGPT to troubleshoot issues and review explanations while building this project.
