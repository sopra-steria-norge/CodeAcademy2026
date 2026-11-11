using Kaffebar.Orm.Domain;
using Microsoft.EntityFrameworkCore;

namespace Kaffebar.Orm;

// Oppgave 1A: Den naive spørringen.
public partial class KaffebarRepository
{
    /// <summary>Alle bestillinger, eldste først.</summary>
    public async Task<List<Order>> GetAllOrdersAsync()
    {
        var orders = await db.Orders.OrderBy(o => o.CreatedAt).ToListAsync();
        return orders;
    }
}
