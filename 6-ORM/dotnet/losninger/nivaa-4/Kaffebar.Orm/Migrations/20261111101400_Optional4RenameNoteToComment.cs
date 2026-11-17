using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Kaffebar.Orm.Migrations
{
    /// <summary>
    /// Valgfri oppgave 4. <c>Note</c> fikk nytt navn og maks lengde i samme endring. Da kjenner ikke
    /// EF igjen omdøpingen, og foreslo <c>DropColumn</c> + <c>AddColumn</c>, med advarselen
    /// «may result in the loss of data». Rettet for hånd til <c>RenameColumn</c> + <c>AlterColumn</c>.
    /// </summary>
    public partial class Optional4RenameNoteToComment : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.RenameColumn(
                name: "note",
                table: "orders",
                newName: "comment");

            migrationBuilder.AlterColumn<string>(
                name: "comment",
                table: "orders",
                type: "character varying(200)",
                maxLength: 200,
                nullable: true,
                oldClrType: typeof(string),
                oldType: "text",
                oldNullable: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AlterColumn<string>(
                name: "comment",
                table: "orders",
                type: "text",
                nullable: true,
                oldClrType: typeof(string),
                oldType: "character varying(200)",
                oldMaxLength: 200,
                oldNullable: true);

            migrationBuilder.RenameColumn(
                name: "comment",
                table: "orders",
                newName: "note");
        }
    }
}
