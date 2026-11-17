using Kaffebar.Orm.Domain;
using Microsoft.EntityFrameworkCore;

namespace Kaffebar.Orm;

// Valgfri oppgave 1: Kan ikke oversettes. Ikke en del av nivåene.
public partial class KaffebarRepository
{
    /// <summary>Ordrene som ble lagt inn en lørdag eller søndag (UTC).</summary>
    /// <remarks>
    /// EF kan ikke oversette en egen C#-metode til SQL. <c>DayOfWeek</c> kan den: Npgsql gjør det
    /// til <c>date_part('dow', …)</c>, så filtreringen skjer i databasen og bare helgeordrene
    /// kommer over nettverket.
    /// </remarks>
    public Task<List<Order>> GetWeekendOrdersAsync() =>
        db.Orders
            .Where(o => o.CreatedAt.DayOfWeek == DayOfWeek.Saturday || o.CreatedAt.DayOfWeek == DayOfWeek.Sunday)
            .ToListAsync();
}
