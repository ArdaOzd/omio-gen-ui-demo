# Omio generative UI demo

This local demo recreates Omio's landing page through its mobile-app section and
adds a working connection-results page for trains, buses, flights, and ferries.
Schedules, prices, and seat counts are deterministic synthetic data. The SQLite
database contains exactly 1,000,000 fares.

## Run locally

Install the frontend dependencies once:

```sh
npm install
```

Start the API and Vite development server together:

```sh
npm run dev
```

Open http://127.0.0.1:5173/. If `data/omio.sqlite3` is missing, the command first
generates the full database. A running API on port 8000 is reused.

For a production build and local preview:

```sh
npm start
```

This builds the frontend, starts or reuses the API, and serves the built site at
http://127.0.0.1:4173/.

## Useful commands

```sh
npm run seed       # regenerate data/omio.sqlite3 with 1,000,000 fares
npm run build      # build the React frontend
python3 -m unittest discover -s backend/tests -v
```

The API contract and direct Python commands are documented in
[backend/README.md](backend/README.md). Original visual asset URLs are recorded in
[public/assets/omio/SOURCES.md](public/assets/omio/SOURCES.md).

Development starts from `dev`. Stable releases live on `main`. See
[CONTRIBUTING.md](CONTRIBUTING.md) for the branch naming and merge flow.
