# Vocabulary Master - Docker Instructions

This project is fully containerized using Docker and Docker Compose. It consists of:
- **Frontend**: React/Vite app served by Nginx (Port 8080)
- **Backend**: Node.js/Express API (Port 9876)
- **Database**: SQLite (persisted in a docker volume)

## Prerequisites
- Docker Desktop installed and running.

## Quick Start
1. Open a terminal in the `vocab-master` directory.
2. Run the following command to build and start the application:
   ```powershell
   docker-compose up --build
   ```
3. The application will be available at:
   - **Frontend**: http://localhost:8080
   - **Backend Health Check**: http://localhost:9876/api/health

## Configuration
- Environment variables are defined in `.env`.
- Data is persisted in the `vocab-data` volume. To reset data, run:
  ```powershell
  docker-compose down -v
  ```

## Development
- The frontend proxy is configured in `nginx.conf`.
- API requests to `/api` are automatically proxied to the backend container.
