using System.Data;
using Kaffebar.Orm.Domain;
using Microsoft.EntityFrameworkCore;

namespace Kaffebar.Orm;

// Oppgave 3C (bonus): Masseoppdatering.
public partial class KaffebarRepository
{
    /// <summary>
    /// Rydder baristakøen: alt som har stått Ready siden før <paramref name="cutoff"/> er hentet.
    /// Én UPDATE i databasen, ingen entiteter i minnet.
    /// </summary>
    /// <remarks>
    /// Prisen: <c>ExecuteUpdate</c> går forbi change trackeren. Ingen <c>StatusChange</c>
    /// blir lagt til av seg selv, og ordrer denne contexten allerede har lastet, står fortsatt
    /// som Ready i minnet. Historikken må vi derfor skrive selv, og det gjør vi først, mens
    /// ordrene fortsatt er Ready.
    ///
    /// <c>RepeatableRead</c>, ikke standarden <c>ReadCommitted</c>: begge setningene skal se
    /// det samme øyeblikksbildet. Ellers kan en ordre som blir Ready mellom INSERT og UPDATE
    /// bli hentet uten å få en rad i historikken.
    /// </remarks>
    public async Task<int> PickUpStaleOrdersAsync(DateTimeOffset cutoff)
    {
        await using var transaction = await db.Database.BeginTransactionAsync(IsolationLevel.RepeatableRead);

        var stale = db.Orders.Where(o => o.Status == OrderStatus.Ready && o.CreatedAt < cutoff);
        var now = DateTimeOffset.UtcNow;

        await db.Database.ExecuteSqlAsync($"""
            INSERT INTO status_changes (order_id, status, changed_at)
            SELECT id, 'PickedUp', {now} FROM orders
            WHERE status = 'Ready' AND created_at < {cutoff}
            """);

        var updated = await stale.ExecuteUpdateAsync(s => s.SetProperty(o => o.Status, OrderStatus.PickedUp));

        await transaction.CommitAsync();
        return updated;
    }
}
