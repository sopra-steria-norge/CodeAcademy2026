package no.soprasteria.rabbit;

import com.rabbitmq.client.Channel;

import java.io.IOException;
import java.util.HashMap;
import java.util.Map;

public class RabbitMQConfiguration {
    public Channel ensureQueuesAndExchanges(
            Channel channel,
            String queueName,
            String exchangeName,
            String exchangeType,
            String routingKey,
            Map<String, Object> bindingHeaders,
            boolean autoDelete
    ) throws IOException {
        Map<String, Object> argsMap = new HashMap<>();
        argsMap.put("x-queue-type", "quorum");

        channel.basicQos(1);

        channel.exchangeDeclare(exchangeName, exchangeType, false);
        channel.queueDeclare(queueName, false, false, autoDelete, null);
        if (!exchangeType.equals("headers")) {
            channel.queueBind(queueName, exchangeName, routingKey);
        }
        else {
            channel.queueBind(queueName, exchangeName, "", bindingHeaders);
        }

        return channel;
    }
}
