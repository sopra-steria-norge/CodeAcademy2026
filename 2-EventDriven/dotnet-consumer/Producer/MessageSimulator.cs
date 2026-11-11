using CodeAcademy.DotnetConsumer.Common.Config;
using RabbitMQ.Client;
using System.Text;
using System.Text.Json;

namespace Producer;

public static class MessageSimulator
{
    private const string QUEUE_NAME = "codeacademy_queue";
    private static readonly string[] Exchanges = ["amq.direct", "amq.fanout", "amq.topic", "chat"];
    
    public static async Task CreateSimulator(int exchangeIndex, string queue = QUEUE_NAME)
    {
        await using var connection = await ConnectionHelper.ConnectAsync();
        Console.WriteLine("Connected to RabbitMQ");
        
        await using var channel = await connection.CreateChannelAsync();
        await channel.QueueDeclareAsync(queue: queue, durable: true, exclusive: false, autoDelete: false);
        var count = 1;
        
        while (count < 1000) // Runs infinitely, exit with Ctrl + C
        {
            var message = $"Hello From SVG! Message {count} of infinite - {DateTime.Now} ";
            count++;

            var messageBody = JsonSerializer.Serialize(new { Text = message });
            var body = Encoding.UTF8.GetBytes(messageBody);

            await channel.BasicPublishAsync(
                exchange: Exchanges[exchangeIndex],
                routingKey: queue,
                mandatory: false,
                basicProperties: new BasicProperties { Persistent = true },
                body: body
            );
    
            Console.WriteLine($"Sent: {message}");
            
            var random = new Random();
            var interval = random.Next(1000, 5001);
            await Task.Delay(interval);
        }
    }
}