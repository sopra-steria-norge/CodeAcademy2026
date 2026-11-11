# Repository guidance

## Scope

- Unfinished starters are intentional. Do not replace them with `*-solution`
  implementations or complete unrelated exercises unless requested.
- Leave Java projects and Java-related files untouched unless explicitly requested.
- For Kaffebar frontend work, follow
  [AGENTS.md](../4-Frontend/kaffebar-web/AGENTS.md), including its requirement to
  consult the bundled Next.js documentation.

## Commands

For all .NET work, load and follow
[dotnet-clean-build](skills/dotnet-clean-build/SKILL.md) before running build,
restore, or build-capable test commands. Always use `-warnaserror`; do not
finish an implementation until affected projects build with zero warnings and
zero errors and relevant tests pass. Do not suppress diagnostics or disable
NuGet auditing to pass this gate.

In `1-DevOps/idempotweet` or `4-Frontend/kaffebar-web`, use Corepack/Yarn:
`yarn dev`, `yarn build`, `yarn lint`, `yarn test`.

Focused Vitest runs (append `-t "test name"` to select one test):

- Idempotweet: `yarn test __tests__/components/IdemCard.test.tsx`
- Kaffebar: `yarn test __tests__/components.test.tsx`

Root `just` recipes target Idempotweet, not Kaffebar; `just dev` also starts PostgreSQL.

In `3-APIs/kaffebar-dotnet-solution`:

- Build: `dotnet build Kaffebar.slnx -warnaserror`
- Tests: `dotnet test Kaffebar.Tests/Kaffebar.Tests.csproj -warnaserror`
- Single test: `dotnet test Kaffebar.Tests/Kaffebar.Tests.csproj -warnaserror --filter "FullyQualifiedName=Kaffebar.Tests.KaffebarApiTests.Menu_ReturnsTenFixedItems"`

## Integration

- Kaffebar uses Next.js as a BFF; `KAFFEBAR_API_URL` stays server-side.
  Regenerate frontend API types with `yarn generate:types`; handwritten mappings
  belong in `src/types/domain.ts`.
- Root stack: `docker compose --profile dotnet --profile frontend up --build`.
  Java and .NET API profiles share port 8080 and alias `kaffebar-api`; run only one.
- Idem consumers share a queue; running both implementations does not broadcast
  each event to both.
- Some consumer README port examples differ from the root Compose mappings.
