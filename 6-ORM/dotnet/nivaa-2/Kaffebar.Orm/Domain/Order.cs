namespace Kaffebar.Orm.Domain;

/// <summary>En bestilling i kaffebaren.</summary>
/// <remarks>
/// Navigasjonene er <c>virtual</c>. Det har ingen betydning før oppgave 1B, der vi skrur på
/// lazy loading. Da lager EF en proxy-subklasse som overstyrer dem, og det kan den bare
/// gjøre med virtuelle egenskaper.
/// </remarks>
public class Order
{
    public Guid Id { get; set; }
    public string CustomerName { get; set; } = null!;
    public OrderStatus Status { get; set; }
    public DateTimeOffset CreatedAt { get; set; }

    /// <summary>Summen av linjene, lagret på ordren slik den sto på kvitteringen.</summary>
    public decimal TotalPrice { get; set; }

    public virtual List<OrderLine> Lines { get; set; } = [];
    public virtual List<StatusChange> StatusHistory { get; set; } = [];

    public void AddLine(OrderLine line)
    {
        Lines.Add(line);
        TotalPrice += line.UnitPrice * line.Quantity;
    }

    public void RemoveLine(int lineId)
    {
        var line = Lines.SingleOrDefault(l => l.Id == lineId);
        
        if (line == null)
            throw new InvalidOperationException("Cannot remove line");
        
        Lines.Remove(line);
        TotalPrice -= line.UnitPrice  * line.Quantity;
    }
}
