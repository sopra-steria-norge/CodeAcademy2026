using Kaffebar.Orm.Data;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.EntityFrameworkCore.Migrations;
using Xunit.Abstractions;

namespace Kaffebar.Orm.Tests;

/// <summary>Valgfri oppgave 4: en migrering som mister data. Ikke en del av nivåene.</summary>
public class Optional4Tests(PostgresFixture fixture, ITestOutputHelper output) : IClassFixture<PostgresFixture>
{
    private const string AdasComment = "Uten lokk, takk";

    [Fact]
    public async Task Optional4_TheLastMigration_KeepsTheData()
    {
        await using var db = fixture.CreateContext(output.WriteLine);
        var migrations = db.Database.GetMigrations().ToList();
        var migrator = db.GetService<IMigrator>();

        // Data i kolonnen, slik det ville vært i en database som har vært i bruk en stund.
        (await db.Orders.SingleAsync(o => o.Id == SeedData.AdaOrderId)).Comment = AdasComment;
        await db.SaveChangesAsync();

        // Tilbake til migreringen før den siste, og fram igjen.
        await migrator.MigrateAsync(migrations[^2]);
        await migrator.MigrateAsync();

        await using var fresh = fixture.CreateContext();
        var ada = await fresh.Orders.SingleAsync(o => o.Id == SeedData.AdaOrderId);
        output.Heading($"Ada, før og etter {migrations[^1]}");
        output.Facts(("Comment før", AdasComment), ("Comment etter", ada.Comment ?? "null"));

        Assert.Equal(AdasComment, ada.Comment);
    }
}
