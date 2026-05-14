package no.soprasteria.rabbit;

import com.rabbitmq.client.Channel;

import java.io.IOException;
import java.util.HashMap;
import java.util.Map;

public class RabbitMQConfiguration {
    public Channel ensureQueuesAndExchanges(
            Channel channel,
            String exchangeName,
            String queueName,
            boolean autoDelete
    ) throws IOException {
        Map<String, Object> argsMap = new HashMap<>();
        argsMap.put("x-queue-type", "quorum");

        channel.basicQos(1);

        channel.exchangeDeclare(exchangeName, "fanout", false);
        channel.queueDeclare(queueName, false, false, autoDelete, null);
        channel.queueBind(queueName, exchangeName, "");

        return channel;
    }
}
