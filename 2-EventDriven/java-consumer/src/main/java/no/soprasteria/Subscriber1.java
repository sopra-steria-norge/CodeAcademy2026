package no.soprasteria;

import com.fasterxml.jackson.databind.ObjectMapper;

import java.io.InputStream;
import java.util.Properties;

public class Subscriber1 {

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

    public static void main(String[] args) {
        new Subscriber1().run();
    }

    private void run() {
        RabbitMQConnectionHelper connectionHelper = new RabbitMQConnectionHelper(properties);
        try {
            RabbitMQConfiguration config = new RabbitMQConfiguration();
            //Ensure queuesAndExchanges
            //basicConsume m/ defaultConsumer --> channel.basicAck()
        } catch (Exception e) {
            System.out.println("Failed" + e.getMessage());
        }
    }
}
