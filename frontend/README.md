# AgriIntel Frontend

React frontend for the AgriIntel microservices platform.

## Run

1. Start the backend stack from `../backend` so the API gateway is available at `http://localhost:8090`.
2. Install frontend dependencies:
   `npm install`
3. Start the React development server:
   `npm run dev`

## API configuration

- Default gateway URL: `http://localhost:8090`
- Override for deployed environments with `VITE_API_BASE_URL`

## Features

- User registration and login
- Weather lookup
- Crop recommendation
- Price prediction
- Market-data CRUD
