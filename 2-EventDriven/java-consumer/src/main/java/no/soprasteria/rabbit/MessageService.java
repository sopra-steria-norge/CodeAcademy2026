package no.soprasteria.rabbit;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.rabbitmq.client.AMQP;
import com.rabbitmq.client.Channel;
import no.soprasteria.domain.IdemDataDTO;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.util.Map;

@Service
public class MessageService {

    private static final Logger log = LoggerFactory.getLogger(MessageService.class);
    private final RabbitMQConnectionHelper connectionHelper;
    private final ObjectMapper mapper;

    @Autowired
    public MessageService(
            RabbitMQConnectionHelper connectionHelper,
            ObjectMapper mapper
    ) {
        this.connectionHelper = connectionHelper;
        this.mapper = mapper;
    }

    public void publishMessageToQueue(
            IdemDataDTO msgToSend,
            String exchangeName,
            String exchangeType,
            String routingKey,
            Map<String, Object> headers
    ) {
        try (Channel channel = connectionHelper.getConnection().createChannel()) {
            channel.exchangeDeclare(exchangeName, exchangeType, false);

            AMQP.BasicProperties properties = new AMQP.BasicProperties.Builder()
                    .headers(headers)
                    .contentType("application/json")
                    .build();

            channel.basicPublish(
                    exchangeName,
                    routingKey,
                    properties,
                    mapper.writeValueAsBytes(msgToSend)
            );

            log.info(
                    "[key={}] Sent message to exchange '{}'",
                    routingKey,
                    exchangeName
            );
        } catch (Exception e) {
            log.error(
                    "Failed to publish message: {}",
                    e.getMessage(),
                    e
            );
        }
    }
}