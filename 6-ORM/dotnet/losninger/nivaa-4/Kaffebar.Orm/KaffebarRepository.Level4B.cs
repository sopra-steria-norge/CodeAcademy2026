using Microsoft.EntityFrameworkCore;

namespace Kaffebar.Orm;

// Oppgave 4B: Den komplekse lesemodellen.
public partial class KaffebarRepository
{
    // Ingen verdier fra brukeren, så det er ingenting å parametrisere her.
    private const string TopBeansSql = """
        WITH monthly AS (
            SELECT date_trunc('month', o.created_at AT TIME ZONE 'UTC')::date AS month,
                   r.name                        AS roastery,
                   b.name                        AS bean,
                   SUM(l.quantity)::int          AS cups_sold,
                   SUM(l.quantity * l.unit_price) AS revenue
            FROM order_lines l
            JOIN orders o     ON o.id = l.order_id
            JOIN beans b      ON b.id = l.bean_id
            JOIN roasteries r ON r.id = b.roastery_id
            GROUP BY 1, 2, 3
        ),
        ranked AS (
            SELECT m.*,
                   ROW_NUMBER() OVER (PARTITION BY month, roastery
                                      ORDER BY cups_sold DESC, revenue DESC, bean)::int AS rank
            FROM monthly m
        )
        SELECT month, roastery, bean, cups_sold, revenue, rank
        FROM ranked
        WHERE rank <= 3
        ORDER BY roastery, month, rank
        """;

    /// <summary>
    /// Topp 3 bønner per brenneri per måned, målt i antall kopper, med omsetning.
    /// Rå SQL, fordi «topp N per gruppe» er en vindusfunksjon, og det er databasen god på.
    /// </summary>
    public Task<List<BeanSalesRow>> GetTopBeansPerRoasteryPerMonthAsync() =>
        db.Database.SqlQueryRaw<BeanSalesRow>(TopBeansSql).ToListAsync();

    /// <summary>
    /// Bonus: den samme rapporten, kjørt rett på ADO.NET-tilkoblingen. Her er vi forbi EF:
    /// ingen automatisk mapping, ingen logging og ingen interceptorer, så QueryCounter ser den ikke.
    /// </summary>
    public async Task<List<BeanSalesRow>> GetTopBeansWithAdoNetAsync()
    {
        var connection = db.Database.GetDbConnection();
        await db.Database.OpenConnectionAsync();
        try
        {
            await using var command = connection.CreateCommand();
            command.CommandText = TopBeansSql;

            var rows = new List<BeanSalesRow>();
            await using var reader = await command.ExecuteReaderAsync();
            while (await reader.ReadAsync())
            {
                rows.Add(new BeanSalesRow(
                    reader.GetFieldValue<DateOnly>(reader.GetOrdinal("month")),
                    reader.GetString(reader.GetOrdinal("roastery")),
                    reader.GetString(reader.GetOrdinal("bean")),
                    reader.GetInt32(reader.GetOrdinal("cups_sold")),
                    reader.GetDecimal(reader.GetOrdinal("revenue")),
                    reader.GetInt32(reader.GetOrdinal("rank"))));
            }

            return rows;
        }
        finally
        {
            await db.Database.CloseConnectionAsync();
        }
    }
}
