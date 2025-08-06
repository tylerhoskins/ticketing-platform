# Tixcel Ticketing - Code Test

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

# Concurrency Model

This app solves concurrent ticket purchases by essentially adding your "purchase intent" to a queue, and processing those intents one by one.

I decided on this approach because I wanted fairness, and with this approach, requests are processed in their exact arrival order. I didn't like that with either optimistic or pessimistic locking alone, clashes have a loser who needs to retry, meaning the third person to attempt to buy the ticket may win.

The intents are batch-processed every 2 seconds. 

# Motivations

This project was an experiment with Claude Code and a subagent workflow. It leverages three separate agents, one for the database, the backend, and the frontend. 
