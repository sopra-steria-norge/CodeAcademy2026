#!/usr/bin/env bash
# Delt kode finnes i alle åtte prosjektene. Sjekker at den er lik overalt.
set -euo pipefail
cd "$(dirname "$0")"

files="Kaffebar.Orm/Kaffebar.Orm.csproj Kaffebar.Orm/KaffebarRepository.cs
Kaffebar.Orm/Data/DesignTimeDbContextFactory.cs Kaffebar.Orm/Data/KaffebarDbContext.cs
Kaffebar.Orm/Data/QueryCounter.cs Kaffebar.Orm/Data/SeedData.cs
Kaffebar.Orm/Domain/Bean.cs Kaffebar.Orm/Domain/Enums.cs Kaffebar.Orm/Domain/OrderLine.cs
Kaffebar.Orm/Domain/Roastery.cs Kaffebar.Orm/Domain/StatusChange.cs
Kaffebar.Orm/Migrations/20260927202958_InitialCreate.cs
Kaffebar.Orm.Tests/Kaffebar.Orm.Tests.csproj Kaffebar.Orm.Tests/ContainerRuntime.cs
Kaffebar.Orm.Tests/PostgresFixture.cs Kaffebar.Orm.Tests/Level1Tests.cs
Kaffebar.Orm.Tests/Print.cs
dotnet-tools.json KaffebarOrm.slnx"

status=0
for file in $files; do
    for dir in nivaa-2 nivaa-3 nivaa-4 losninger/nivaa-1 losninger/nivaa-2 losninger/nivaa-3 losninger/nivaa-4; do
        if ! cmp -s "nivaa-1/$file" "$dir/$file"; then
            echo "Ulik: $dir/$file"
            status=1
        fi
    done
done

# Valgfrie oppgaver: løsningene ligger i losninger fra nivået de passer etter, og skal være like.
check_optional() {
    local file=$1 from=$2
    for n in $(seq $((from + 1)) 4); do
        if ! cmp -s "losninger/nivaa-$from/$file" "losninger/nivaa-$n/$file"; then
            echo "Ulik: losninger/nivaa-$n/$file"
            status=1
        fi
    done
}
check_optional Kaffebar.Orm/KaffebarRepository.Optional1.cs 1
check_optional Kaffebar.Orm.Tests/Optional1Tests.cs 1
check_optional Kaffebar.Orm.Tests/Optional2Tests.cs 2
check_optional Kaffebar.Orm.Tests/Optional3Tests.cs 3

[ "$status" -eq 0 ] && echo "All delt kode er lik i alle prosjektene."
exit "$status"
