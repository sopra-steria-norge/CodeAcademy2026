using System.Text;
using System.Text.Json;
using System.Text.Json.Nodes;
using CodeAcademy.DotnetConsumer.Common.Config;
using RabbitMQ.Client;
using RabbitMQ.Client.Events;

Console.WriteLine("Starting Consumer application...");

using var connection = await ConnectionHelper.ConnectAsync();
Console.WriteLine("Connected to RabbitMQ");

using var channel = await connection.CreateChannelAsync();

const string exchangeName = "idem-fanout";
await channel.ExchangeDeclareAsync(exchange: exchangeName, type: ExchangeType.Fanout, durable: false, autoDelete: false);

var queueResult = await channel.QueueDeclareAsync(queue: "", durable: false, exclusive: true, autoDelete: true, arguments: null);
var queueName = queueResult.QueueName;

await channel.QueueBindAsync(queue: queueName, exchange: exchangeName, routingKey: "");

var consumer = new AsyncEventingBasicConsumer(channel);
consumer.ReceivedAsync += async (sender, eventArgs) =>
{
    var body = eventArgs.Body.ToArray();
    var message = JsonSerializer.Deserialize<JsonNode>(Encoding.UTF8.GetString(body));

    Console.WriteLine($"Received message: {message}");

    await channel.BasicAckAsync(eventArgs.DeliveryTag, multiple: false);
};

await channel.BasicConsumeAsync(queue: queueName, autoAck: false, consumerTag: "", noLocal: false, exclusive: false, arguments: null, consumer: consumer);

Console.WriteLine("Listening for messages. Press Enter to exit.");
Console.ReadLine();
