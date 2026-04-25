# Workshop 2: Docker Build and Publish

I denne workshopen containeriserer du Idempotweet-applikasjonen med Docker og publiserer imaget til GitHub Container Registry (GHCR). Du skal selv opprette alle filene.

## Læringsmål

- Skrive en multi-stage Dockerfile for en Next.js-applikasjon
- Forstå forskjellen mellom build context og Dockerfile-plassering
- Sette opp en GitHub Actions workflow som bygger og pusher Docker-images
- Kjøre containere lokalt med docker-compose
- Kjede workflows sammen (CI må passere før Docker-bygg)

## Oversikt

Du skal opprette tre filer:

| Fil | Plassering | Beskrivelse |
|-----|-----------|-------------|
| Dockerfile | `1-DevOps/2-Docker/Dockerfile` | Multi-stage build med 3 steg |
| Docker workflow | `.github/workflows/docker.yml` | Bygger og pusher image til GHCR |
| Docker Compose | `1-DevOps/2-Docker/docker-compose.yml` | Kjører det publiserte imaget lokalt |

I tillegg skal du opprette en `.dockerignore`-fil.

## Steg-for-steg

---

### Steg 1: Opprett `.dockerignore`

Opprett filen `1-DevOps/2-Docker/.dockerignore`. Denne forteller Docker hvilke filer som **ikke** skal inkluderes i build context.

Du bør ekskludere ting som:
- `node_modules` (installeres i containeren)
- `.next`-mappen (bygges i containeren)
- `.git`-mappen
- `.env`-filer (hemmeligheter skal ikke bakes inn)
- Dokumentasjon og konfigurasjon som ikke trengs i imaget (f.eks. `README.md`, `.vscode/`)

> **Tips:** Tenk på `.dockerignore` som `.gitignore` for Docker. Alt som ikke trengs for å bygge appen bør ekskluderes. Dette gjør bygget raskere og imaget sikrere.

---

### Steg 2: Skriv Dockerfilen

Opprett filen `1-DevOps/2-Docker/Dockerfile`. Den skal ha tre stages som bygger på `node:20-alpine`.

**Viktig:** Dockerfilen ligger i `1-DevOps/2-Docker/`, men build context er `1-DevOps/idempotweet/`. Det betyr at `COPY`-instruksjoner kopierer filer **fra idempotweet-mappen**, ikke fra Docker-mappen.

#### Stage 1 — `deps` (installer avhengigheter)

Denne stagen skal:
- Bruke `node:20-alpine` som base image
- Installere `libc6-compat` med `apk` (trengs av noen Node-pakker på Alpine)
- Sette `/app` som working directory
- Aktivere Corepack (for Yarn v4-støtte)
- Kopiere inn pakkefiler: `package.json`, `yarn.lock` og `.yarnrc.yml`
- Installere avhengigheter med `yarn install --immutable`

> **Tips:** `--immutable` betyr at `yarn.lock` ikke kan endres under installasjon. Dette sikrer reproduserbare bygg.

#### Stage 2 — `builder` (bygg applikasjonen)

Denne stagen skal:
- Starte fra `node:20-alpine` igjen (ny, ren stage)
- Aktivere Corepack
- Definere to build-time argumenter (`ARG`) med standardverdi `false`:
  - `NEXT_PUBLIC_ENABLE_IDEM_FORM`
  - `NEXT_PUBLIC_SHOW_SEEDED_IDEMS`
- Gjøre disse tilgjengelige som `ENV`-variabler (Next.js trenger dem under bygg)
- Kopiere `node_modules` og `.yarn` fra `deps`-stagen
- Kopiere inn resten av applikasjonskoden
- Kjøre `yarn build`

> **Tips:** `NEXT_PUBLIC_`-variabler bakes inn i klientsiden av Next.js under bygging. Derfor må de være tilgjengelige som miljøvariabler i builder-stagen, ikke bare i runner-stagen.

#### Stage 3 — `runner` (produksjonsimage)

Denne stagen skal:
- Starte fra `node:20-alpine`
- Sette `NODE_ENV=production` og `NEXT_TELEMETRY_DISABLED=1`
- Opprette en **ikke-root bruker** for sikkerhet:
  - Gruppe `nodejs` med GID 1001
  - Bruker `nextjs` med UID 1001
- Kopiere det som trengs fra builder-stagen:
  - `/app/public`
  - `/app/.next/standalone` (dette er hele den kjørbare appen takket være `output: "standalone"` i `next.config.ts`)
  - `/app/.next/static`
- Bytte til `nextjs`-brukeren
- Eksponere port 3000
- Sette `PORT=3000` og `HOSTNAME="0.0.0.0"`
- Starte appen med `CMD ["node", "server.js"]`

> **Tips:** Bruk `--chown=nextjs:nodejs` på COPY-instruksjonene for standalone og static, slik at filene eies av den ikke-root brukeren.

#### Test Dockerfilen lokalt

Kjør dette fra **repository-roten**:

```bash
docker build -t idempotweet:local -f 1-DevOps/2-Docker/Dockerfile 1-DevOps/idempotweet/
```

Legg merke til:
- `-f` angir hvor Dockerfilen er
- Siste argument er build context (applikasjonsmappen)

Kjør deretter:

```bash
docker run -p 3000:3000 idempotweet:local
```

Åpne http://localhost:3000 og sjekk at appen kjører.

> **Merk:** Uten en database-tilkobling vil appen vise demodata. Det er forventet — fokuset her er på containerisering.

---

### Steg 3: Skriv Docker-workflowen

Opprett filen `.github/workflows/docker.yml`. Denne workflowen skal bygge Docker-imaget og pushe det til GitHub Container Registry.

#### Triggere

Workflowen skal trigges av:
- Push til `main`-branchen (med path filters for relevante mapper)
- `workflow_dispatch` (manuell kjøring)

#### Miljøvariabler (workflow-nivå)

Definer to `env`-variabler øverst i workflowen:
- `REGISTRY` — satt til `ghcr.io`
- `IMAGE_NAME` — satt til `${{ github.repository }}`

#### Jobb 1: CI

Gjenbruk CI-workflowen fra Workshop 1 med `uses`:

```yaml
ci:
  uses: ./.github/workflows/ci-solution.yml
```

#### Jobb 2: Docker Build & Push

Denne jobben:
- Trenger at `ci`-jobben passerer først (`needs: ci`)
- Kjører på `${{ vars.RUNNER || 'self-hosted' }}`
- Trenger permissions: `contents: read` og `packages: write`

Stegene i jobben:

1. **Checkout** — hent koden
2. **Login til GHCR** — bruk `docker/login-action@v3` med `registry`, `username` (`github.actor`) og `password` (`secrets.GITHUB_TOKEN`)
3. **Docker metadata** — bruk `docker/metadata-action@v5` for å generere tags:
   - `type=raw,value=latest`
   - `type=sha,prefix=sha-` (gir tags som `sha-a1b2c3d`)
4. **Build og push** — bruk `docker/build-push-action@v6`

> **Tips:** I build-push-action må du angi `context` (build context-mappen) og `file` (stien til Dockerfilen). Disse er de samme verdiene du brukte med `-f` og siste argument i den lokale `docker build`-kommandoen.

> **Tips:** Metadata-action gir deg outputs som du refererer til i build-push-action. Gi metadata-steget en `id` (f.eks. `meta`), så kan du bruke `${{ steps.meta.outputs.tags }}` og `${{ steps.meta.outputs.labels }}` i build-push-action.

---

### Steg 4: Trigger workflowen

Merge en pull request til `main` (eller push direkte). Da skjer dette:

1. Docker-workflowen trigges
2. CI-jobben kjøres først (tester)
3. Docker-imaget bygges
4. Imaget pushes til GHCR

Gå til **Actions**-fanen og følg med. Etter fullført kjøring finner du imaget under **Packages** i GitHub-repoet.

---

### Steg 5: Opprett docker-compose.yml

Opprett filen `1-DevOps/2-Docker/docker-compose.yml`. Denne filen skal definere hele applikasjons-stacken slik at du kan starte alt med én kommando.

Den trenger to tjenester:

**`app`** — selve applikasjonen:
- Port-mapping: `3000:3000`
- `DATABASE_URL` som miljøvariabel (peker til postgres-tjenesten)
- `depends_on: postgres`

**`postgres`** — databasen:
- Image: `postgres:17-alpine`
- Port `5432`, brukernavn/passord/database: `codeacademy`
- Et volume for å persistere data

#### Variant A: Bygg lokalt fra kildekoden

For å bygge og kjøre appen direkte fra koden bruker du `build` i stedet for `image`:

```yaml
app:
  build:
    context: ../../1-DevOps/idempotweet   # build context (applikasjonsmappen)
    dockerfile: ../2-Docker/Dockerfile     # sti til Dockerfilen relativt til context
  ports:
    - "3000:3000"
  # ...
```

Start med:

```bash
cd 1-DevOps/2-Docker
docker compose up --build
```

> **Tips:** `--build` tvinger Docker til å bygge imaget på nytt. Uten dette flagget gjenbruker den et eventuelt cachet image.

Dette er nyttig for å teste endringer raskt uten å pushe til GHCR først.

#### Variant B: Kjør publisert image fra GHCR

Etter at Docker-workflowen har publisert imaget, kan du bytte `build`-blokken med `image`:

```yaml
app:
  image: ghcr.io/${GITHUB_REPOSITORY}:latest
  ports:
    - "3000:3000"
  # ...
```

```bash
cd 1-DevOps/2-Docker
docker compose up
```

> **Tips:** `GITHUB_REPOSITORY` ble satt da du kjørte `just setup`. Du kan se/endre verdien i `.env`-filen.

> **Tips:** Du kan ha begge variantene i filen og kommentere ut den du ikke bruker, eller lage to separate compose-filer.

> **Tips:** Kjør `just seed` for å fylle databasen med demodata.

---

## Nøkkelbegreper

| Begrep | Forklaring |
|--------|-----------|
| **Docker image** | En pakke med alt som trengs for å kjøre en applikasjon |
| **Container** | En kjørende instans av et image |
| **Multi-stage build** | Dockerfile med flere `FROM`-steg, der kun siste stage blir det endelige imaget |
| **Build context** | Mappen med filer Docker har tilgang til under bygging |
| **Standalone output** | Next.js-innstilling som pakker appen til en selvstendig `server.js` uten `node_modules` |
| **GHCR** | GitHub Container Registry — lagringsplass for Docker-images knyttet til GitHub |
| **docker-compose** | Verktøy for å definere og kjøre containeriserte applikasjoner deklarativt |
| **Non-root user** | Sikkerhetspraksis — containeren kjører ikke som root-brukeren |
| **Workflow chaining** | En workflow som gjenbruker en annen (`uses:` / `needs:`) |
| **`--immutable`** | Yarn-flagg som forhindrer endringer i lockfilen — sikrer reproduserbare bygg |
