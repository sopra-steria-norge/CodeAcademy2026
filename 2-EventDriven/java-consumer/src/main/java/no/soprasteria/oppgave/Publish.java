package no.soprasteria.oppgave;

import com.fasterxml.jackson.databind.ObjectMapper;
import no.soprasteria.Application;
import no.soprasteria.JacksonConfig;
import no.soprasteria.domain.IdemDataDTO;
import no.soprasteria.rabbit.FanOutMessageService;
import no.soprasteria.rabbit.RabbitMQConnectionHelper;
import no.soprasteria.rabbit.helper.RabbitConfig;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import java.io.InputStream;
import java.time.OffsetDateTime;
import java.util.Properties;
import java.util.UUID;

public class Publish {
    private static final Logger log = LoggerFactory.getLogger(Publish.class);
    private static final String EXCHANGE_NAME = "chat";
    private static final String QUEUE_NAME = "chat_all";
    private static final Properties properties;

    static {
        properties = new Properties();

        try {
            ClassLoader classLoader = Application.class.getClassLoader();
            InputStream applicationPropertiesStream = classLoader.getResourceAsStream("application.properties");
            properties.load(applicationPropertiesStream);
        } catch (Exception e) {
            log.error("Failed to load application.properties", e);
        }
    }

    private final ObjectMapper mapper = new JacksonConfig().objectMapper();

    public static void main(String[] args) {
        new Publish().run();
    }

    private void run() {
        try {
            RabbitConfig rabbitConfig = RabbitConfig.mapFromProperties(properties);
            FanOutMessageService fanOutMessageService = new FanOutMessageService(
                    new RabbitMQConnectionHelper(rabbitConfig),
                    mapper
            );

            while (true) {
                IdemDataDTO idemDataDTO = new IdemDataDTO(
                        UUID.randomUUID().toString(),
                        "Magnus", "Heelllooo", 
                        OffsetDateTime.now().toLocalDateTime()
                );

                fanOutMessageService.publishMessageToQueue(
                        idemDataDTO,
                        EXCHANGE_NAME,
                        QUEUE_NAME,
                        ""
                );
                
                Thread.sleep(5000);
           }
        } catch (Exception e) {
            log.error("Failed {}", e.getMessage());
        }
    }
}
