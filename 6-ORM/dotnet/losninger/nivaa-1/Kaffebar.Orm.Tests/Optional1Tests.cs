using Kaffebar.Orm.Data;
using Microsoft.EntityFrameworkCore;
using Xunit.Abstractions;

namespace Kaffebar.Orm.Tests;

/// <summary>Valgfri oppgave 1: Kan ikke oversettes. Ikke en del av nivåene.</summary>
public class Optional1Tests(PostgresFixture fixture, ITestOutputHelper output) : IClassFixture<PostgresFixture>
{
    [Fact]
    public async Task Optional1_WeekendOrders_AreFilteredInTheDatabase()
    {
        var counter = new QueryCounter();
        await using var db = fixture.CreateContext(output.WriteLine, counter);

        var weekend = await new KaffebarRepository(db).GetWeekendOrdersAsync();

        await using var check = fixture.CreateContext();
        var all = await check.Orders.ToListAsync();
        output.Heading("Resultat");
        output.Facts(
            ("Ordrer i databasen", all.Count),
            ("Helgeordrer", weekend.Count));
        output.Commands(counter);

        Assert.Equal(all.Count(o => o.CreatedAt.DayOfWeek is DayOfWeek.Saturday or DayOfWeek.Sunday), weekend.Count);
        // Databasen skal filtrere: bare helgeordrene kommer over nettverket.
        Assert.Equal(weekend.Count, counter.RowsRead);
    }
}
