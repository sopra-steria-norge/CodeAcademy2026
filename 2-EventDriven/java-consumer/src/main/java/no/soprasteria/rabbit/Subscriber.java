package no.soprasteria.rabbit;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.rabbitmq.client.Channel;
import jakarta.annotation.PostConstruct;
import no.soprasteria.db.DataRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;

@Service
public class Subscriber {

    private final Logger log = LoggerFactory.getLogger(Subscriber.class);

    private final RabbitMQConnectionHelper connectionHelper;
    private final DataRepository dataRepository;
    private final ObjectMapper mapper;

    public Subscriber(RabbitMQConnectionHelper rabbitMQConnectionHelper, DataRepository dataRepository, ObjectMapper mapper) {
        this.connectionHelper = rabbitMQConnectionHelper;
        this.dataRepository = dataRepository;
        this.mapper = mapper;
    }

    @PostConstruct
    public void subscribe() {
        try {
            RabbitMQConfiguration config = new RabbitMQConfiguration();
            //Ensure queuesAndExchanges
            //basicConsume m/ defaultConsumer --> channel.basicAck()
            Channel channel = config.ensureQueuesAndExchanges(
                    connectionHelper.getConnection().createChannel(),
                    "EXCHANGE_NAME",
                    "QUEUE_NAME",
                    "direct",
                    "routingKey",
                    null,
                    true

            );
            // TODO: Consume messages og persister via DataRepository

        } catch (Exception e) {
            log.error("Failed {}", e.getMessage());
        }
    }
}
