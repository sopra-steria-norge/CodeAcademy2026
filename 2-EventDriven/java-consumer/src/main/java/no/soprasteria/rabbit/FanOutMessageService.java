package no.soprasteria.rabbit;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.rabbitmq.client.Channel;
import no.soprasteria.domain.IdemDataDTO;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

@Service
public class FanOutMessageService {

    private static final Logger log = LoggerFactory.getLogger(FanOutMessageService.class);
    private final RabbitMQConnectionHelper connectionHelper;
    private final ObjectMapper mapper;

    @Autowired
    public FanOutMessageService(
            RabbitMQConnectionHelper connectionHelper,
            ObjectMapper mapper
    ) {
        this.connectionHelper = connectionHelper;
        this.mapper = mapper;
    }

    public void publishMessageToQueue(IdemDataDTO msgToSend, String exchange, String routingKey) {
        try (Channel channel = connectionHelper.getConnection().createChannel()) {
            channel.exchangeDeclare(exchange, "fanout", false);
            channel.basicPublish(exchange, routingKey, null, mapper.writeValueAsBytes(msgToSend));

            log.info(
                    "[key={}] Sent message to exchange '{}'",
                    routingKey,
                    exchange
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