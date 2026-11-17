using Kaffebar.Orm.Domain;
using Microsoft.EntityFrameworkCore;

namespace Kaffebar.Orm;

// Oppgave 4A: Kollisjonen. Virker bare sammen med Version på Order og migreringen AddOrderVersion.
public partial class KaffebarRepository
{
    /// <summary>
    /// Kunden henter kaffen. Kan skje én gang. Står to baristaer med samme ordre, skal den
    /// ene få <see cref="PickupResult.Conflict"/>, ikke overskrive den andre.
    /// </summary>
    public async Task<PickupResult> MarkAsPickedUpAsync(Order order)
    {
        if (order.Status != OrderStatus.Ready)
            return PickupResult.NotReady;

        order.Status = OrderStatus.PickedUp;
        order.StatusHistory.Add(new StatusChange { Status = OrderStatus.PickedUp, ChangedAt = DateTimeOffset.UtcNow });

        try
        {
            await db.SaveChangesAsync();
            return PickupResult.PickedUp;
        }
        catch (DbUpdateConcurrencyException ex)
        {
            // SaveChanges kjører i én transaksjon, så verken UPDATE-en av ordren eller
            // INSERT-en i historikken ble lagret. Men change trackeren tror fortsatt at
            // endringene våre venter. Rydd, ellers prøver neste SaveChanges på nytt.
            foreach (var added in db.ChangeTracker.Entries<StatusChange>().Where(e => e.State == EntityState.Added).ToList())
            {
                order.StatusHistory.Remove(added.Entity);
                added.State = EntityState.Detached;
            }

            // Hent ordren slik den faktisk står i databasen nå. Er den borte, er den Detached.
            var entry = ex.Entries.Single();
            await entry.ReloadAsync();

            return entry.State == EntityState.Detached ? PickupResult.NotFound : PickupResult.Conflict;
        }
    }

    /// <summary>
    /// Det samme, men kollisjonen skjer mellom to kall: klienten så ordren med versjon
    /// <paramref name="expectedVersion"/>, og sender den med når baristaen trykker «Hentet».
    /// </summary>
    /// <remarks>
    /// EF bruker <c>OriginalValue</c> i <c>WHERE</c>, altså verdien den leste fra databasen, ikke
    /// den som står på objektet. <c>order.Version = expectedVersion</c> ville ikke hatt noen virkning.
    /// </remarks>
    public async Task<PickupResult> MarkAsPickedUpAsync(Guid orderId, uint expectedVersion)
    {
        var order = await db.Orders.SingleOrDefaultAsync(o => o.Id == orderId);
        if (order is null)
            return PickupResult.NotFound;

        db.Entry(order).Property(o => o.Version).OriginalValue = expectedVersion;
        return await MarkAsPickedUpAsync(order);
    }
}
