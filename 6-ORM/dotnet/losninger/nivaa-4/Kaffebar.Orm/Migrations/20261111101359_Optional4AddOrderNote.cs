using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Kaffebar.Orm.Migrations
{
    /// <summary>Valgfri oppgave 4: legger til <c>Note</c> på ordren, før den får nytt navn.</summary>
    public partial class Optional4AddOrderNote : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "note",
                table: "orders",
                type: "text",
                nullable: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "note",
                table: "orders");
        }
    }
}
