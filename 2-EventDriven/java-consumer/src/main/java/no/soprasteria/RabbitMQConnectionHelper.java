package no.soprasteria;

import com.rabbitmq.client.Connection;
import com.rabbitmq.client.ConnectionFactory;

import java.io.IOException;
import java.util.Properties;
import java.util.concurrent.TimeoutException;


public record RabbitMQConnectionHelper(Properties properties) {

    public Connection getConnection() throws IOException, TimeoutException {
        System.setProperty("java.net.preferIPv4Stack", "true");
        ConnectionFactory factory = new ConnectionFactory();
        factory.setUsername(properties.getProperty("rabbitmq.userName"));
        factory.setPassword(properties.getProperty("rabbitmq.password"));
        factory.setVirtualHost(properties.getProperty("rabbitmq.vhost"));
        factory.setHost(properties.getProperty("rabbitmq.host"));
        factory.setPort(Integer.parseInt(properties.getProperty("rabbitmq.port", "5672")));

        return factory.newConnection();
    }
}
