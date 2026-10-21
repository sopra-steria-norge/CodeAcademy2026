# Repository instructions

## Conventions

- Follow the backend selected by the local exercise or project. If Java and .NET are both valid options and the task has not selected one, prefer .NET, including for integration configuration.
- Follow the current exercise in the local README and `oppgave.md`; preserve Norwegian documentation and UI text.
- Reuse existing helpers. Use TanStack Query for server-state fetching and Vitest/Testing Library/MSW for frontend tests. For API contract tests, use the project's existing test setup; where available, use xUnit with `WebApplicationFactory<Program>`.

## Commands

Run from the indicated directory.

| Directory                         | Commands                                                                                                           |
| --------------------------------- | ------------------------------------------------------------------------------------------------------------------ |
| `1-DevOps/idempotweet`            | `yarn dev`, `yarn build`, `yarn lint`, `yarn test`, `yarn test:watch`, `yarn test:coverage`, `yarn seed`           |
| `4-Frontend/kaffebar-web`         | `yarn dev`, `yarn build`, `yarn lint`, `yarn test`, `yarn test:watch`; backend-free: `USE_MOCK_API=true yarn dev`  |
| `3-APIs/kaffebar-dotnet/Kaffebar` | `dotnet build`, `dotnet run`                                                                                       |
| `3-APIs/kaffebar-dotnet-solution` | `dotnet build Kaffebar/Kaffebar.csproj`, `dotnet test Kaffebar.Tests/Kaffebar.Tests.csproj`                        |
| `2-EventDriven/dotnet-consumer`   | `dotnet build DotnetEvents.slnx`; run separately: `dotnet run --project Producer`, `dotnet run --project Consumer` |

Single-test examples (from the corresponding directory above):

- DevOps: `yarn vitest run __tests__/components/IdemCard.test.tsx -t "IdemCard"`.

Root `just` commands target Idempotweet only. API solution tests do not test the starter.

## Forbidden

- Do not replace starters with `-solution` code or implement later exercises unless requested.
- Do not expose `KAFFEBAR_API_URL` as `NEXT_PUBLIC_*` or call the backend/RabbitMQ directly from browser code; use Next.js API routes.
- Do not remove the AMQP `globalThis` connection guard, API test store resets, or fixed seed UUIDs.
- Do not hand-edit generated API types; regenerate from the selected backend contract.
- Never commit secrets. Do not overwrite unrelated user changes or force-push without explicit approval.
