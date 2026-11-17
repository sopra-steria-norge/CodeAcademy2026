using Kaffebar.Orm.Domain;
using Microsoft.EntityFrameworkCore;

namespace Kaffebar.Orm;

// Oppgave 4C (bonus): Black Friday-importen.
public partial class KaffebarRepository
{
    private const int ImportChunkSize = 100;

    /// <summary>Importerer bestillinger fra nettbutikken, og returnerer antallet.</summary>
    /// <remarks>
    /// EF batcher hver <c>SaveChanges</c> selv, så det viktige er å ikke kalle den for hver ordre.
    /// Hver bolk tømmes ut av change trackeren etterpå, så minnebruken holder seg flat. Hver
    /// <c>SaveChanges</c> er sin egen transaksjon med mindre vi sier noe annet, så hele importen
    /// må ligge i én, ellers blir halve fila liggende hvis noe feiler.
    /// </remarks>
    public async Task<int> ImportOrdersAsync(IReadOnlyList<NewOrder> newOrders)
    {
        await using var transaction = await db.Database.BeginTransactionAsync();

        foreach (var chunk in newOrders.Chunk(ImportChunkSize))
        {
            db.Orders.AddRange(chunk.Select(item => new Order
            {
                Id = Guid.NewGuid(),
                CustomerName = item.CustomerName,
                Status = OrderStatus.Pending,
                CreatedAt = item.CreatedAt,
                TotalPrice = item.Lines.Sum(l => l.UnitPrice * l.Quantity),
                Lines = item.Lines
                    .Select(l => new OrderLine
                    {
                        DrinkName = l.DrinkName,
                        Size = l.Size,
                        Quantity = l.Quantity,
                        UnitPrice = l.UnitPrice,
                        BeanId = l.BeanId
                    })
                    .ToList()
            }));
            await db.SaveChangesAsync();
            db.ChangeTracker.Clear();
        }

        await transaction.CommitAsync();
        return newOrders.Count;
    }
}
