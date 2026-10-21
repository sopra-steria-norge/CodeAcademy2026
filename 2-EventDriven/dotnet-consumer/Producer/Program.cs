

using Producer;

Console.WriteLine("Producer starting...");
// Establish connection to RabbitMQ

// Implement a basic producer here.
// Start with:
// - Create a channel
// - Declare a queue
// - Publish a message to the queue (you can use a simple JSON string as the message body)

<<<<<<< HEAD
await MessageSimulator.CreateSimulator(3);
=======

// Create a channel and declare the queue
using var channel = await connection.CreateChannelAsync();
await channel.QueueDeclareAsync(queue: "idem-events", durable: true, exclusive: false, autoDelete: false, arguments: null);

// Publish messages to the queue with for loop to simulate multiple events
for (int i = 0; i < 10; i++)
{
    var message = $"Idems Event {i + 1} at {DateTime.Now}";

    var messageBody = JsonSerializer.Serialize(message);
    var body = Encoding.UTF8.GetBytes(messageBody);

    await channel.BasicPublishAsync(exchange: string.Empty, routingKey: "idem-events", mandatory: true, basicProperties: new BasicProperties { Persistent = true }, body: body);
    Console.WriteLine($"Published event: {message}");

    await Task.Delay(2000);
}

Console.WriteLine("Producer finished.");
>>>>>>> 331ffec73b954d6698a255a6a0a1f24184e6d75b
