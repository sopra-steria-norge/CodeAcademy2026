package no.soprasteria.rabbit;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.rabbitmq.client.Channel;
import com.rabbitmq.client.DeliverCallback;
import jakarta.annotation.PostConstruct;
import no.soprasteria.db.DataRepository;
import no.soprasteria.db.MessageData;
import no.soprasteria.domain.IdemDataDTO;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;

@Service
public class Subscriber {

    private static final String EXCHANGE_NAME = "fanout_chat";
    private static final String QUEUE_NAME = "fanout_docker_queue";

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
            Channel channel = config.ensureQueuesAndExchanges(
                    connectionHelper.getConnection().createChannel(),
                    QUEUE_NAME,
                    EXCHANGE_NAME,
                    "fanout",
                    "",
                    null,
                    true
            );

            DeliverCallback deliverCallback = (consumerTag, delivery) -> {
                String json = new String(delivery.getBody(), java.nio.charset.StandardCharsets.UTF_8);
                log.info("[CONSUMER] Mottok: {}", json);
                try {
                    IdemDataDTO dto = mapper.readValue(json, IdemDataDTO.class);
                    MessageData data = new MessageData();
                    data.setId(java.util.UUID.fromString(dto.id()));
                    data.setAuthor(dto.author());
                    data.setMessage(dto.message());
                    data.setCreatedAt(dto.createdAt());
                    dataRepository.save(data);
                    log.info("[CONSUMER] Persistert melding fra: {}", dto.author());
                } catch (Exception e) {
                    log.error("[CONSUMER] Kunne ikke parse/persistere melding: {}", e.getMessage());
                }
            };
            channel.basicConsume(QUEUE_NAME, true, deliverCallback, consumerTag -> {});

        } catch (Exception e) {
            log.error("Failed {}", e.getMessage());
        }
    }
}
