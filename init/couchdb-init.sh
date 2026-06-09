#!/bin/sh
set -e

# COUCH_HOST defaults to the in-network service name; override with
# COUCH_HOST=localhost when running this script manually from the host.
COUCH_HOST="${COUCH_HOST:-couchdb}"
COUCH="http://${COUCHDB_USER}:${COUCHDB_PASSWORD}@${COUCH_HOST}:5984"

SEED_USER="${SEED_USER:-demo}"
SEED_PASSWORD="${SEED_PASSWORD:-demo1234}"

echo "==> Setting up CouchDB cluster..."
curl -sf -X POST "${COUCH}/_cluster_setup" \
  -H "Content-Type: application/json" \
  -d '{"action":"enable_single_node","bind_address":"0.0.0.0"}' || true

echo "==> Creating system databases..."
for db in _users _replicator _global_changes; do
  result=$(curl -sf -o /dev/null -w "%{http_code}" -X PUT "${COUCH}/${db}" || echo "000")
  if [ "$result" = "201" ] || [ "$result" = "412" ]; then
    echo "    ${db}: ok"
  else
    echo "    ${db}: unexpected status ${result}"
  fi
done

echo "==> Creating seed user..."
result=$(curl -sf -o /dev/null -w "%{http_code}" -X PUT \
  "${COUCH}/_users/org.couchdb.user:${SEED_USER}" \
  -H "Content-Type: application/json" \
  -d "{\"name\":\"${SEED_USER}\",\"password\":\"${SEED_PASSWORD}\",\"roles\":[],\"type\":\"user\"}" || echo "000")
if [ "$result" = "201" ] || [ "$result" = "409" ]; then
  echo "    ${SEED_USER}: ok"
else
  echo "    ${SEED_USER}: unexpected status ${result}"
fi

echo "==> Creating notes database..."
result=$(curl -sf -o /dev/null -w "%{http_code}" -X PUT "${COUCH}/notes" || echo "000")
if [ "$result" = "201" ] || [ "$result" = "412" ]; then
  echo "    notes: ok"
else
  echo "    notes: unexpected status ${result}"
fi

echo "==> Granting seed user access to notes database..."
result=$(curl -sf -o /dev/null -w "%{http_code}" -X PUT "${COUCH}/notes/_security" \
  -H "Content-Type: application/json" \
  -d "{\"admins\":{\"names\":[],\"roles\":[]},\"members\":{\"names\":[\"${SEED_USER}\"],\"roles\":[]}}" || echo "000")
if [ "$result" = "200" ]; then
  echo "    notes _security: ok"
else
  echo "    notes _security: unexpected status ${result}"
fi

echo "==> Configuring auth session lifetime..."
# Default session timeout is 600s (10 min), forcing frequent re-logins.
# Extend to 24h and refresh the cookie on each request (sliding window) so an
# active user is never logged out mid-session.
curl -sf -X PUT "${COUCH}/_node/_local/_config/couch_httpd_auth/timeout" \
  -H "Content-Type: application/json" -d '"86400"'

curl -sf -X PUT "${COUCH}/_node/_local/_config/couch_httpd_auth/allow_persistent_cookies" \
  -H "Content-Type: application/json" -d '"true"'

echo "==> Enabling CORS..."
curl -sf -X PUT "${COUCH}/_node/_local/_config/httpd/enable_cors" \
  -H "Content-Type: application/json" -d '"true"'

curl -sf -X PUT "${COUCH}/_node/_local/_config/cors/origins" \
  -H "Content-Type: application/json" -d '"*"'

curl -sf -X PUT "${COUCH}/_node/_local/_config/cors/credentials" \
  -H "Content-Type: application/json" -d '"true"'

curl -sf -X PUT "${COUCH}/_node/_local/_config/cors/methods" \
  -H "Content-Type: application/json" -d '"GET, PUT, POST, HEAD, DELETE"'

curl -sf -X PUT "${COUCH}/_node/_local/_config/cors/headers" \
  -H "Content-Type: application/json" -d '"accept, authorization, content-type, origin, referer"'

echo "==> CouchDB init complete."
