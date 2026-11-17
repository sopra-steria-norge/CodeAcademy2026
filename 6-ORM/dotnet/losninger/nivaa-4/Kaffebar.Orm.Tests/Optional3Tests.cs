using Kaffebar.Orm.Data;
using Microsoft.EntityFrameworkCore;
using Xunit.Abstractions;
using static Kaffebar.Orm.Tests.Print;

namespace Kaffebar.Orm.Tests;

/// <summary>Valgfri oppgave 3: gammel data fra Identity Map. Ikke en del av nivåene.</summary>
public class Optional3Tests(PostgresFixture fixture, ITestOutputHelper output) : IClassFixture<PostgresFixture>
{
    [Fact]
    public async Task Optional3_SecondRead_SeesWhatOthersSaved()
    {
        var counter = new QueryCounter();
        await using var db = fixture.CreateContext(output.WriteLine, counter);
        var first = await db.Orders.SingleAsync(o => o.Id == SeedData.AdaOrderId);

        // Mens contexten lever, endrer noen andre prisen.
        await using (var other = fixture.CreateContext())
        {
            (await other.Orders.SingleAsync(o => o.Id == SeedData.AdaOrderId)).TotalPrice = 60m;
            await other.SaveChangesAsync();
        }

        // Løsningen: AsNoTracking bygger et nytt objekt fra raden i stedet for å gi tilbake det sporede.
        // await db.Entry(first).ReloadAsync() eller en ny context virker også.
        var second = await db.Orders.AsNoTracking().SingleAsync(o => o.Id == SeedData.AdaOrderId);

        output.Heading("Resultat");
        output.Facts(
            ("Første lesing, TotalPrice", Kr(first.TotalPrice)),
            ("Andre lesing, TotalPrice", Kr(second.TotalPrice)),
            ("Samme objekt", ReferenceEquals(first, second)),
            ("I databasen, TotalPrice", Kr(60m)));
        output.Commands(counter);

        Assert.Equal(60m, second.TotalPrice);
    }
}
