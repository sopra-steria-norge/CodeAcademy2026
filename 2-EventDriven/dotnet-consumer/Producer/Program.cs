using CodeAcademy.DotnetConsumer.Common.Config;
using RabbitMQ.Client;
using System.Text;
using System.Text.Json;

Console.WriteLine("Producer starting...");

using var connection = await ConnectionHelper.ConnectAsync();
Console.WriteLine("Connected to RabbitMQ");

using var channel = await connection.CreateChannelAsync();

const string exchangeName = "idem-fanout";
await channel.ExchangeDeclareAsync(exchange: exchangeName, type: ExchangeType.Fanout, durable: false, autoDelete: false);

using var cts = new CancellationTokenSource();
Console.CancelKeyPress += (_, e) =>
{
    e.Cancel = true;
    cts.Cancel();
};

Console.WriteLine("Publishing messages. Press Ctrl+C to stop.");

var i = 0;
while (!cts.Token.IsCancellationRequested)
{
    var message = new { Author = "producer", Message = $"Idem event {++i} at {DateTime.Now:O}" };
    var body = Encoding.UTF8.GetBytes(JsonSerializer.Serialize(message));

    await channel.BasicPublishAsync(exchange: exchangeName, routingKey: "", mandatory: false, basicProperties: new BasicProperties { Persistent = false }, body: body);
    Console.WriteLine($"Published: {message.Message}");

    await Task.Delay(2000, cts.Token).ContinueWith(_ => { });
}

Console.WriteLine("Producer stopped.");
