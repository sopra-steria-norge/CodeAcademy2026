---
description: "Bruk for frontend-arbeid i kaffebar-web med Next.js, Yarn, typer og tester."
applyTo: "4-Frontend/kaffebar-web/**"
---

- Bruk Yarn 4 (`yarn install --immutable`).
- Før frontend-endringer: følg [AGENTS.md](../../4-Frontend/kaffebar-web/AGENTS.md) og relevant installert Next.js-dokumentasjon i `node_modules/next/dist/docs/`.
- For typegenerering, bruk `yarn generate:types`. Ved .NET-backend må OpenAPI-URL-en tilpasses: starteren serverer `/openapi/v1.json`, ikke skriptets `/openapi.json`.

Testing:

- `yarn vitest run __tests__/components.test.tsx -t "viser norsk etikett for statusen"` fra `4-Frontend/kaffebar-web`.
