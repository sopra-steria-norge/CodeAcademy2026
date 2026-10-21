# Repository instructions

## Conventions

- Choose .NET wherever Java and .NET alternatives exist, including integration configuration.
- Follow the current exercise in the local README and `oppgave.md`; preserve Norwegian documentation and UI text.
- Reuse existing helpers. Use TanStack Query for server-state fetching, Vitest/Testing Library/MSW for frontend tests, and xUnit with `WebApplicationFactory<Program>` for API contract tests.
- Keep API examples in `Kaffebar.http` aligned with endpoint changes.
- Before frontend changes, follow [AGENTS.md](../4-Frontend/kaffebar-web/AGENTS.md) and the relevant installed Next.js guides in `node_modules/next/dist/docs/`.

## Commands

Run from the indicated directory. Use .NET 10 and Yarn 4 (`yarn install --immutable`).

| Directory | Commands |
| --- | --- |
| `1-DevOps/idempotweet` | `yarn dev`, `yarn build`, `yarn lint`, `yarn test`, `yarn test:watch`, `yarn test:coverage`, `yarn seed` |
| `4-Frontend/kaffebar-web` | `yarn dev`, `yarn build`, `yarn lint`, `yarn test`, `yarn test:watch`; backend-free: `USE_MOCK_API=true yarn dev` |
| `3-APIs/kaffebar-dotnet/Kaffebar` | `dotnet build`, `dotnet run` |
| `3-APIs/kaffebar-dotnet-solution` | `dotnet build Kaffebar/Kaffebar.csproj`, `dotnet test Kaffebar.Tests/Kaffebar.Tests.csproj` |
| `2-EventDriven/dotnet-consumer` | `dotnet build DotnetEvents.slnx`; run separately: `dotnet run --project Producer`, `dotnet run --project Consumer` |

Single-test examples (from the corresponding directory above):

- DevOps: `yarn vitest run __tests__/components/IdemCard.test.tsx -t "IdemCard"`.
- Frontend: `yarn vitest run __tests__/components.test.tsx -t "viser norsk etikett for statusen"`.
- API solution: `dotnet test Kaffebar.Tests/Kaffebar.Tests.csproj --filter "FullyQualifiedName~CreateOrder_Returns201WithLocation"`.

Root `just` commands target Idempotweet only. API solution tests do not test the starter.
For frontend type generation, use `yarn generate:types`; adjust its OpenAPI URL for .NET first (the starter serves `/openapi/v1.json`, not the script's `/openapi.json`).

## Forbidden

- Do not replace starters with `-solution` code or implement later exercises unless requested.
- Do not expose `KAFFEBAR_API_URL` as `NEXT_PUBLIC_*` or call the backend/RabbitMQ directly from browser code; use Next.js API routes.
- Do not remove the AMQP `globalThis` connection guard, API test store resets, or fixed seed UUIDs.
- Do not hand-edit generated API types; regenerate from the selected backend contract.
- Never commit secrets. Do not overwrite unrelated user changes or force-push without explicit approval.
