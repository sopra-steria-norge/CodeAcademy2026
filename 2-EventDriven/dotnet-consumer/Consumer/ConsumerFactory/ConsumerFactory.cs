using System.Text;
using System.Text.Json;
using System.Text.Json.Nodes;
using CodeAcademy.DotnetConsumer.Common.Config;
using RabbitMQ.Client;
using RabbitMQ.Client.Events;

namespace Consumer.ConsumerFactory;

public class ConsumerFactory
{
    private const string QUEUE_NAME = "codeacademy_queue";
    private const string EXCHANGE_NAME = "amq.fanout";

    public static async Task<AsyncEventingBasicConsumer> CreateConsumer(bool autoDelete=false)
    {
        // Establish connection to RabbitMQ
        // Do NOT use 'await using' here — the connection and channel must remain alive
        // for the consumer to keep receiving messages.
        var connection = await ConnectionHelper.ConnectAsync();
        Console.WriteLine("Connected to RabbitMQ");
        
        var channel = await connection.CreateChannelAsync();
        
        // Declare the fanout exchange
        await channel.ExchangeDeclareAsync(exchange: EXCHANGE_NAME, type: ExchangeType.Fanout, durable: true);
        
        // Declare the queue
        await channel.QueueDeclareAsync(queue: QUEUE_NAME, durable: true, exclusive: false, autoDelete);
        
        // Bind the queue to the fanout exchange
        await channel.QueueBindAsync(queue: QUEUE_NAME, exchange: EXCHANGE_NAME, routingKey: "");
        
        var consumer = new AsyncEventingBasicConsumer(channel);
        consumer.ReceivedAsync += async (model, ea) =>
        {
            var body = ea.Body.ToArray();
            var message = Encoding.UTF8.GetString(body);
            var json = JsonSerializer.Deserialize<JsonObject>(message);
            Console.WriteLine($"Received: {json?["Text"]}");
            await Task.Yield();
        };

        await channel.BasicConsumeAsync(queue: QUEUE_NAME, autoAck: true, consumer: consumer);
        
        return consumer;
    }
}