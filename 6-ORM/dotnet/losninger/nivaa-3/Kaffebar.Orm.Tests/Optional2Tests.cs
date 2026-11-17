using Kaffebar.Orm.Data;
using Xunit.Abstractions;

namespace Kaffebar.Orm.Tests;

/// <summary>Valgfri oppgave 2: en test som stopper N+1 før den når produksjon. Ikke en del av nivåene.</summary>
public class Optional2Tests(PostgresFixture fixture, ITestOutputHelper output) : IClassFixture<PostgresFixture>
{
    [Fact]
    public async Task Optional2_Receipts_StayAtOneQuery()
    {
        // Lazy loading på, som i en app der den er skrudd på. Da blir en glemt Include til
        // flere spørringer i stedet for en NullReferenceException, og det er det testen skal fange.
        var counter = new QueryCounter();
        await using var db = fixture.CreateContext(output.WriteLine, counter, lazyLoading: true);

        var orders = await new KaffebarRepository(db).GetAllOrdersWithDetailsAsync();
        Receipts.Write(orders, _ => { });

        output.Commands(counter);
        Assert.Equal(1, counter.SelectCount);
    }
}
