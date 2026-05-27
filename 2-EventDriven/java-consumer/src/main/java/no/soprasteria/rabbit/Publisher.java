package no.soprasteria.rabbit;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.rabbitmq.client.Channel;
import jakarta.annotation.PostConstruct;
import jakarta.annotation.PreDestroy;
import no.soprasteria.domain.IdemDataDTO;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.UUID;
import java.util.concurrent.Executors;
import java.util.concurrent.ScheduledExecutorService;
import java.util.concurrent.TimeUnit;

@Service
public class Publisher {

    private static final String EXCHANGE_NAME = "fanout_chat";
    private static final String QUEUE_NAME = "fanout_docker_queue";

    private final Logger log = LoggerFactory.getLogger(Publisher.class);
    private final RabbitMQConnectionHelper connectionHelper;
    private final ObjectMapper mapper;
    private final ScheduledExecutorService scheduler = Executors.newSingleThreadScheduledExecutor();

    public Publisher(RabbitMQConnectionHelper connectionHelper, ObjectMapper mapper) {
        this.connectionHelper = connectionHelper;
        this.mapper = mapper;
    }

    @PostConstruct
    public void startPublisher() {
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

            scheduler.scheduleAtFixedRate(() -> {
                try {
                    IdemDataDTO dto = new IdemDataDTO(
                            UUID.randomUUID().toString(),
                            "Docker Publisher",
                            "Hello from Docker at " + LocalDateTime.now(),
                            LocalDateTime.now()
                    );
                    publish(channel, mapper.writeValueAsString(dto));
                } catch (Exception e) {
                    log.error("Feil ved publisering: {}", e.getMessage());
                }
            }, 0, 5, TimeUnit.SECONDS);

        } catch (Exception e) {
            log.error("Failed to start publisher: {}", e.getMessage());
        }
    }

    private void publish(Channel channel, String message) throws Exception {
        channel.basicPublish(EXCHANGE_NAME, "", null, message.getBytes());
        log.info("[PUBLISHER] Sendte: {}", message);
    }

    @PreDestroy
    public void shutdown() {
        scheduler.shutdown();
    }
}
