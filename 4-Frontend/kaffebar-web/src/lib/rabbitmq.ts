import amqp, { type ChannelModel } from "amqplib";
import { RABBITMQ_EXCHANGE, RABBITMQ_URL, USE_MOCK_API } from "./config";
import type { KaffebarEvent } from "@/types/domain";

/**
 * RUNDE 2 — her fyller du inn.  Se 4-Frontend/oppgave.md, oppgave 2.
 *
 * Dette er det eneste stedet i appen som snakker AMQP. Alt rundt ligger ferdig:
 * tilkoblingen, kanalen, opprydningen, og route handleren som gjør hendelsene om
 * til Server-Sent Events. Det du skriver er de linjene som bærer poenget —
 * exchange, routing key og consume-callbacken.
 *
 * Det er nøyaktig de samme fire kallene som i consumeren du skrev i april:
 *
 *     assertExchange → assertQueue → bindQueue → consume
 *
 * Fasit: `rabbitmq-solution.ts` i samme mappe.
 *
 * Én forskjell fra april er verdt å merke seg: der konkurrerte consumerne om
 * meldingene i én delt kø. Her skal *alle* som ser på skjermen få *alle*
 * hendelsene, så hver lytter får sin egen eksklusive kø som slettes når fanen
 * lukkes. Det er forskjellen på en arbeidskø og en kringkasting.
 */

export interface Subscription {
  /** Lukker kanal og kø. Kall den alltid når klienten kobler fra. */
  close: () => Promise<void>;
}

export type EventHandler = (event: KaffebarEvent) => void;

const globalForAmqp = globalThis as typeof globalThis & {
  __kaffebarConnection?: Promise<ChannelModel>;
};

function getConnection(): Promise<ChannelModel> {
  globalForAmqp.__kaffebarConnection ??= amqp
    .connect(RABBITMQ_URL)
    .then((connection) => {
      // Dør forbindelsen, skal neste kall lage en ny — ikke gjenbruke en død.
      connection.on("close", () => void (globalForAmqp.__kaffebarConnection = undefined));
      connection.on("error", () => void (globalForAmqp.__kaffebarConnection = undefined));
      return connection;
    })
    .catch((error: unknown) => {
      globalForAmqp.__kaffebarConnection = undefined;
      throw error;
    });

  return globalForAmqp.__kaffebarConnection;
}

/**
 * Abonnerer på alle `order.*`-hendelser og kaller `onEvent` for hver.
 * Kaster hvis broker ikke er tilgjengelig — route handleren bestemmer hva som
 * skjer da (den sier fra til nettleseren i stedet for å henge).
 */
export async function subscribeToOrders(
  onEvent: EventHandler,
  onClosed?: () => void,
): Promise<Subscription> {
  // Mock-modus (USE_MOCK_API=true) har ingen broker. Da bruker vi den samme
  // falske kilden som i runde 1, slik at resten av appen er uvitende om forskjellen.
  if (USE_MOCK_API) {
    const { subscribeToMockOrders } = await import("@/mocks/events");
    return subscribeToMockOrders(onEvent);
  }

  const connection = await getConnection();
  const channel = await connection.createChannel();

  // Dør kanalen — fordi broker forsvant, eller fordi noen startet den på nytt — er
  // abonnementet vårt borte for godt. Da sier vi fra, slik at route handleren kan
  // lukke strømmen og la nettleseren koble seg opp igjen med et nytt abonnement.
  channel.on("error", () => {
    // «close» kommer rett etterpå. Lytteren må finnes, ellers kaster amqplib.
  });
  channel.on("close", () => onClosed?.());

  await channel.assertExchange(RABBITMQ_EXCHANGE, "topic", { durable: true });
  const queue = await channel.assertQueue("", { exclusive: true, autoDelete: true });
  await channel.bindQueue(queue.queue, RABBITMQ_EXCHANGE, "order.#");
  const consumer = await channel.consume(
    queue.queue,
    (message) => {
      if (!message) return;
      try {
        onEvent(JSON.parse(message.content.toString()) as KaffebarEvent);
      } catch (error) {
        console.error("Failed to handle message", error);
      }
    },
    { noAck: true },
  );

  return {
    close: async () => {
      try {
        await channel.cancel(consumer.consumerTag);
        await channel.close();
      } catch {
        // Kanalen kan allerede være borte. Det er greit.
      }
    },
  };
}
