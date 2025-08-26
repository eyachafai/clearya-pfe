#!/bin/bash

# Wait for app-db
until nc -z -v -w30 app-db 5432
do
  echo "Waiting for PostgreSQL (app-db)..."
  sleep 5
done

# Wait for keycloak_db
until nc -z -v -w30 keycloak_db 5432
do
  echo "Waiting for PostgreSQL (keycloak_db)..."
  sleep 5
done

# Wait for keycloak
until nc -z -v -w30 keycloak 8080
do
  echo "Waiting for Keycloak..."
  sleep 5
done

echo "All services are ready. Starting backend..."
node server.js
