---
name: dotnet-clean-build
description: 'Require zero warnings and zero errors for .NET changes. Use before every dotnet build, restore or test command, when fixing build or NuGet warnings, and before declaring any .NET implementation complete.'
---

# Clean .NET builds

## Completion gate

A .NET implementation is not complete until the affected projects and tests
build with zero warnings and zero errors, and the relevant tests pass.
An exit code of zero alone is not sufficient: inspect the full command output.
Existing warnings also block completion for the projects being validated.

## Workflow

1. Read repository instructions and identify the affected projects, their test
   projects, SDK selection, package sources, and any inherited build properties.
   Do not expand to unrelated exercises or modify Java projects.
2. Add `-warnaserror` to every `dotnet build`, `dotnet restore`, and build-capable
   `dotnet test` command. This also promotes MSBuild warnings, not just compiler
   warnings. Keep NuGet auditing enabled, including transitive dependencies.
3. After dependency changes, or when stale restore data could hide warnings,
   perform a fresh restore with auditing enabled:

   ```powershell
   dotnet restore <project-or-solution> --force --no-http-cache -warnaserror -p:NuGetAudit=true -p:NuGetAuditMode=all
   ```

   Restore the test project or solution so project references are included.
   Restore only after manifest changes or a missing-dependency failure; do not
   install or update unrelated packages.
4. Compile the affected projects and tests without incremental compilation:

   ```powershell
   dotnet build <project-or-solution> --no-incremental -warnaserror
   ```

   Use `--no-restore` only after a successful, current restore of the same graph.
   A full rebuild is sufficient; do not delete `bin` or `obj` directories or run
   destructive cleanup commands to obtain a clean result.
5. Fix each warning or error at its source and rerun the failed validation.
   For vulnerable transitive packages, trace the parent dependency and prefer
   a compatible patched parent version. Verify the resolved transitive version.
   For feed or audit failures, repair connectivity/configuration and retry.
   If blocked, report the blocker and do not claim completion.
6. Run the smallest relevant test suite using the repository's test platform.
   Keep `-warnaserror` on test commands that can build. `--no-build --no-restore`
   is allowed only after the exact tested configuration was successfully built.
   For API documentation changes, test both the generated OpenAPI document and
   Scalar UI, as well as the affected endpoint's behavior.
7. Inspect all validation output. Require zero warnings, zero errors, a successful
   exit code, and passing tests. Report the commands and results.

## Never bypass the gate

- Do not use `NoWarn`, `WarningsNotAsErrors`, `NuGetAuditSuppress`, warning
  pragmas, reduced warning levels, or disabled analyzers to conceal diagnostics.
- Do not disable NuGet auditing or ignore failed package sources.
- Do not filter warning/error lines from output or accept partial log output.
- Do not present cached, incremental, or `--no-build` success as proof of a
  fresh build unless the prerequisite build was verified in the current task.
- Do not change dependencies outside the affected scope without approval.

## Starter example

From the repository root, after a dependency manifest change:

```powershell
dotnet restore '3-APIs\kaffebar-dotnet\Kaffebar.Tests\Kaffebar.Tests.csproj' --force --no-http-cache -warnaserror -p:NuGetAudit=true -p:NuGetAuditMode=all
dotnet build '3-APIs\kaffebar-dotnet\Kaffebar.Tests\Kaffebar.Tests.csproj' --no-restore --no-incremental -warnaserror
dotnet test '3-APIs\kaffebar-dotnet\Kaffebar.Tests\Kaffebar.Tests.csproj' --no-build --no-restore
```

Run each command only if the preceding command succeeded. The final command
uses this starter's xUnit v2/VSTest setup; detect the platform for other projects.
