#!/bin/bash

# Connexion à Keycloak avec les identifiants d'administrateur
/opt/keycloak/bin/kcadm.sh config credentials --server http://localhost:8080 --realm master --user admin --password admin

# Créer le realm "myrealm"
/opt/keycloak/bin/kcadm.sh create realms -s realm=myrealm -s enabled=true -s sslRequired=external

# Créer le client frontend (public myapp)
/opt/keycloak/bin/kcadm.sh create clients -r myrealm \
  -s clientId=myapp \
  -s publicClient=true \
  -s "redirectUris=[\"http://localhost:3000/*\"]"\
  -s "webOrigins=[\"http://localhost:3000\"]"

# Créer le client backend (confidentiel)
# avec secret et mode bearerOnly
/opt/keycloak/bin/kcadm.sh create clients -r myrealm \
  -s clientId=backend-client \
  -s publicClient=false \
  -s secret="xFOb66wMThsgQb1nudZ50KZ1dH4heowD" \
  -s bearerOnly=true \
  -s standardFlowEnabled=false
