FROM node:20-alpine AS deps

# 2) Installer libc6-compat (noen Node-pakker forventer glibc ABI)
RUN apk add --no-cache libc6-compat

# 3) Sett arbeidskatalog
WORKDIR /app
COPY . .
# 4) Aktiver Corepack (for Yarn v4-støtte) og lås til stabil Yarn
RUN corepack enable && corepack prepare yarn@stable --activate

# 5) Kopiér pakkefiler
#igheter deterministisk#    OBS: Yarn v4-prosjekter har ofte en .yarn/-mappe (releases/plugins). Hvis du bruker den,
RUN yarn install --immutable

#    ta den med i COPY slik at install blir deterministisk.
#COPY package.json .yarnrc.yml ./
