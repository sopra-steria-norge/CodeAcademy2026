using Kaffebar.Orm.Domain;

namespace Kaffebar.Orm;

// Oppgave 3D (bonus): Den motsatte fellen.
public partial class KaffebarRepository
{
    /// <summary>Lagrer en ordre kassa-appen hentet tidligere og nå sender inn igjen med ny status.</summary>
    /// <remarks>
    /// Objektet kommer fra en context som er borte, så det er <c>Detached</c>. Denne contexten kjenner
    /// det ikke. <c>db.Update(order)</c> ville skrevet alle kolonnene tilbake, også de andre har endret
    /// i mellomtiden. Bruk bare endringen, på en nyhentet og sporet entitet.
    /// </remarks>
    public Task SaveOrderAsync(Order order) => UpdateStatusAsync(order.Id, order.Status);
}
