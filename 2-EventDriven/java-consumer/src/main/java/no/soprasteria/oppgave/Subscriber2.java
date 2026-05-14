package no.soprasteria.oppgave;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.rabbitmq.client.AMQP;
import com.rabbitmq.client.Channel;
import com.rabbitmq.client.DefaultConsumer;
import com.rabbitmq.client.Envelope;
import no.soprasteria.Application;
import no.soprasteria.JacksonConfig;
import no.soprasteria.domain.IdemDataDTO;
import no.soprasteria.rabbit.RabbitMQConfiguration;
import no.soprasteria.rabbit.RabbitMQConnectionHelper;
import no.soprasteria.rabbit.helper.RabbitConfig;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import java.io.IOException;
import java.io.InputStream;
import java.util.Properties;

import static no.soprasteria.oppgave.Publish.EXCHANGE_NAME;

public class Subscriber2 {
    private static final Logger log = LoggerFactory.getLogger(Subscriber2.class);
    private static final String QUEUE_NAME = "chat_all_2";
    private static final Properties properties;

    static {
        properties = new Properties();

        try {
            ClassLoader classLoader = Application.class.getClassLoader();
            InputStream applicationPropertiesStream = classLoader.getResourceAsStream("application.properties");
            properties.load(applicationPropertiesStream);
        } catch (Exception e) {
            log.error("Failed to load properties", e);
        }
    }

    private final ObjectMapper mapper = new JacksonConfig().objectMapper();

    public static void main(String[] args) throws Exception {
        new Subscriber2().run();
    }

    private void run() throws Exception {
        RabbitMQConfiguration config = new RabbitMQConfiguration();
        RabbitConfig rabbitConfig = RabbitConfig.mapFromProperties(properties);
        RabbitMQConnectionHelper connectionHelper = new RabbitMQConnectionHelper(rabbitConfig);
        Channel channel = config.ensureQueuesAndExchanges(
                connectionHelper.getConnection().createChannel(),
                EXCHANGE_NAME,
                QUEUE_NAME,
                true
        );

        channel.basicConsume(
            QUEUE_NAME,
            false,
            new DefaultConsumer(channel) {
                @Override
                public void handleDelivery(
                        String consumerTag,
                        Envelope envelope,
                        AMQP.BasicProperties properties,
                        byte[] body
                ) throws IOException {
                    String message = new String(body);
                    IdemDataDTO dto = mapper.readValue(message, IdemDataDTO.class);

                    log.info(
                            "Subscriber2 received from {}: {}",
                            dto.author(),
                            dto.message()
                    );

                    channel.basicAck(
                            envelope.getDeliveryTag(),
                            false
                    );
                }
            }
        );
    }
}