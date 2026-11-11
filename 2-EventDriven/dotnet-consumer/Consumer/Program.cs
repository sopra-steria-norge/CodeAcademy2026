
using Consumer.ConsumerFactory;

Console.WriteLine("Starting Consumer application...");

var consumer = await ConsumerFactory.CreateConsumer();

// Implement a basic consumer here.
// Start with:
// - Create a channel
// - Declare a queue
// - Create a consumer and subscribe to the queue
// - Handle incoming messages by deserializing the JSON and printing the content to the console

<<<<<<< HEAD
Console.ReadLine();
=======


// Create a channel and declare the queue
using var channel = await connection.CreateChannelAsync();
await channel.QueueDeclareAsync(queue: "idem-events", durable: true, exclusive: false, autoDelete: false, arguments: null);

// Set up a consumer to listen for messages
var consumer = new AsyncEventingBasicConsumer(channel);

// Handle received messages
consumer.ReceivedAsync += async (sender, eventArgs) =>
{
    var body = eventArgs.Body.ToArray();
    var message = JsonSerializer.Deserialize<JsonNode>(Encoding.UTF8.GetString(body));

    Console.WriteLine($"Received message: {message}");

    // Simulate processing time
    await Task.Delay(1000);

    // Acknowledge the message
    await channel.BasicAckAsync(eventArgs.DeliveryTag, multiple: false);   
};
// Start consuming messages
await channel.BasicConsumeAsync(queue: "idem-events", autoAck: false, consumerTag: "", noLocal: false, exclusive: false, arguments: null, consumer: consumer);
Console.ReadLine(); // Keep the application running to listen for messages
>>>>>>> 331ffec73b954d6698a255a6a0a1f24184e6d75b
