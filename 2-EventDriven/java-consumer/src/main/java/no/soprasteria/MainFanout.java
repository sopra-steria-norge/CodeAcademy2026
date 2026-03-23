package no.soprasteria;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.rabbitmq.client.Channel;
import no.soprasteria.domain.ChatMessageDTO;

import java.io.IOException;
import java.io.InputStream;
import java.time.OffsetDateTime;
import java.util.Properties;
import java.util.UUID;
import java.util.concurrent.TimeoutException;

import static no.soprasteria.RabbitMQConfiguration.EXCHANGE_NAME_FANOUT;

public class MainFanout {

    private static final Properties properties;
    private ObjectMapper mapper = new ObjectMapper();

    static {
        properties = new Properties();

        try {
            ClassLoader classLoader = MainFanout.class.getClassLoader();
            InputStream applicationPropertiesStream = classLoader.getResourceAsStream("application.properties");
            properties.load(applicationPropertiesStream);
        } catch (Exception e) {
            // process the exception
        }
    }

    public static void main(String[] args) throws IOException, TimeoutException {
        new MainFanout().run();
    }

    public void run() throws IOException, TimeoutException {
        System.out.println("Server started!");
        RabbitMQConnectionHelper rabbitMQConnectionHelper = new RabbitMQConnectionHelper(properties);
        RabbitMQConfiguration rabbitMQConfiguration = new RabbitMQConfiguration();
        Channel channel = rabbitMQConfiguration.ensureQueuesAndExchanges(rabbitMQConnectionHelper.getConnection().createChannel());
        try {
            while (true) {
                ChatMessageDTO msgToSend = new ChatMessageDTO(UUID.randomUUID().toString(),"Leeroy", "Jeeeenkiiiins", OffsetDateTime.now().toString());
                publishMessage(channel, mapper.writeValueAsString(msgToSend), EXCHANGE_NAME_FANOUT, "");
                Thread.sleep(5000);
            }
        } catch (Exception e) {
            System.out.println("Failed to publish message: " + e.getMessage());
        }
    }

    private static void publishMessage(Channel channel, String message, String exchange, String routingKey) throws IOException {
        channel.basicPublish(
                exchange,
                routingKey,
                null,
                message.getBytes());
        System.out.println(routingKey + " [x] Sent '" + message + "'");
    }
}