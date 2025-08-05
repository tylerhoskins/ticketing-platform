# WeOn Ticketing - Code Test

An event ticketing system. See more information about the [database](./docs/DATABASE.md), [backend](./docs/API_ENDPOINTS.md), or [frontend](./docs/FRONTEND_OVERVIEW.md).

## Running it

Ensure you've got Node 20+ installed and Docker installed on your system.

```bash
# Start the database
docker compose up

# Run the backend
npm i 
cp .env.example .env
npm run migration:run
npm run start:dev

# Run the frontend
bash ./start-frontend.sh
```

