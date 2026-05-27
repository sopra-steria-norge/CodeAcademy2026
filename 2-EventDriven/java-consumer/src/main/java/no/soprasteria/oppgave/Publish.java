package no.soprasteria.oppgave;

import com.fasterxml.jackson.databind.ObjectMapper;
import no.soprasteria.Application;
import no.soprasteria.JacksonConfig;
import no.soprasteria.domain.IdemDataDTO;
import no.soprasteria.rabbit.MessageService;
import no.soprasteria.rabbit.RabbitMQConnectionHelper;
import no.soprasteria.rabbit.helper.RabbitConfig;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import java.io.InputStream;
import java.time.OffsetDateTime;
import java.util.HashMap;
import java.util.Map;
import java.util.Properties;
import java.util.UUID;

public class Publish {
    private static final Logger log = LoggerFactory.getLogger(Publish.class);
    static final String EXCHANGE_NAME = "chat";
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
            MessageService messageService = new MessageService(
                    new RabbitMQConnectionHelper(rabbitConfig),
                    mapper
            );

            while (true) {
                IdemDataDTO idemDataDTORedVehicle = new IdemDataDTO(
                        UUID.randomUUID().toString(),
                        "Melissa",
                        "Red vehicle",
                        OffsetDateTime.now().toLocalDateTime()
                );

                IdemDataDTO idemDataDTOBlueVehicle = new IdemDataDTO(
                        UUID.randomUUID().toString(),
                        "Melissa",
                        "Blue vehicle",
                        OffsetDateTime.now().toLocalDateTime()
                );

                IdemDataDTO idemDataDTOPurpleBike = new IdemDataDTO(
                        UUID.randomUUID().toString(),
                        "Melissa",
                        "Purple bike",
                        OffsetDateTime.now().toLocalDateTime()
                );

                Map<String, Object> redVehicleHeaders = new HashMap<>();
                redVehicleHeaders.put("type", "vehicle");
                redVehicleHeaders.put("color", "red");

                messageService.publishMessageToQueue(
                        idemDataDTORedVehicle,
                        EXCHANGE_NAME,
                        "headers",
                        "",
                        redVehicleHeaders
                );

                Map<String, Object> blueVehicleHeaders = new HashMap<>();
                blueVehicleHeaders.put("type", "vehicle");
                blueVehicleHeaders.put("color", "blue");

                messageService.publishMessageToQueue(
                        idemDataDTOBlueVehicle,
                        EXCHANGE_NAME,
                        "headers",
                        "",
                        blueVehicleHeaders
                );

                Map<String, Object> purpleBikeHeaders = new HashMap<>();
                purpleBikeHeaders.put("type", "bike");
                purpleBikeHeaders.put("color", "purple");

                messageService.publishMessageToQueue(
                        idemDataDTOPurpleBike,
                        EXCHANGE_NAME,
                        "headers",
                        "",
                        purpleBikeHeaders
                );

                Thread.sleep(5000);
           }
        } catch (Exception e) {
            log.error("Failed {}", e.getMessage());
        }
    }
}
