import { Injectable } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { DeviceMessagesService } from './device-messages.service';
import { CalinLorawanIncomingService } from './adapters/calin-lorawan/_incoming.service';
import { CalinApiV1IncomingService } from './adapters/calin-api-v1/_incoming.service';
import { CalinApiV2IncomingService } from './adapters/calin-api-v2/_incoming.service';
import { NetworkServerImplementation, ParsedIncomingEvent } from './lib/types';
import { redisRepo } from './lib/redis-repository';
import { moveQueuePush, QUEUE_DEVICE_KEY } from './lib/queue-moving.push';
import { PushIncomingAdapter } from './lib/lifecycle.push';
import { pollImplementation, PullIncomingAdapter } from './lib/lifecycle.pull';

/**
 * Service responsible for handling incoming events from network servers.
 *
 * Supports two communication patterns:
 * - PUSH (webhooks): External system pushes events to us (e.g., ChirpStack/LoRaWAN)
 * - PULL (polling): We poll external API for status updates (e.g., CALIN API)
 *
 * Event types handled:
 * - Gateway ACKs (downlink transmitted to device)
 * - Device responses (uplink received from device)
 * - Delivery failures (device did not acknowledge)
 * - Unsolicited messages (device-initiated)
 */
@Injectable()
export class DeviceMessageIncomingService extends DeviceMessagesService {
  constructor(
    private readonly calinLorawanIncomingService: CalinLorawanIncomingService,
    private readonly calinApiV1IncomingService: CalinApiV1IncomingService,
    private readonly calinApiV2IncomingService: CalinApiV2IncomingService,
  ) {
    super();
  }

  /**
   * PUSH pattern adapters (webhook-based).
   * These adapters parse raw webhook events into normalized ParsedIncomingEvent.
   */
  private PUSH_ADAPTERS: Partial<Record<NetworkServerImplementation, PushIncomingAdapter>> = {
    CALIN_LORAWAN: this.calinLorawanIncomingService,
  };

  /**
   * PULL pattern adapters (polling-based).
   * These adapters fetch status from external APIs and return ParsedIncomingEvent.
   */
  private PULL_ADAPTERS: Partial<Record<NetworkServerImplementation, PullIncomingAdapter>> = {
    CALIN_API_V1: this.calinApiV1IncomingService,
    CALIN_API_V2: this.calinApiV2IncomingService,
  };

  /**
   * PUSH pattern entry: Handle webhook event from external system.
   * Parses the raw event via the appropriate adapter and processes it.
   *
   * @param event - Raw event payload from webhook
   * @param implementation - Which implementation to use for parsing
   */
  async handle(event: unknown, implementation: NetworkServerImplementation) {
    const route = this.PUSH_ADAPTERS[implementation];
    if (!route) return;

    const parsedEvent: ParsedIncomingEvent = route.handle(event);
    if (!parsedEvent) return;

    await this.processIncomingEvent(parsedEvent, QUEUE_DEVICE_KEY);
  }

  /**
   * PULL pattern entry: Poll adapters for status updates.
   * Delegates to the lifecycle.pull module for actual polling logic.
   */
  @Cron(CronExpression.EVERY_5_SECONDS,
    { disabled: process.env.NXT_ENV !== 'production' },
  )
  async pollPullImplementations() {
    for (const implementation of Object.keys(this.PULL_ADAPTERS) as NetworkServerImplementation[]) {
      const results = await pollImplementation(implementation, this.PULL_ADAPTERS[implementation]);

      for (const { parsedEvent, queueKey } of results) {
        await this.processIncomingEvent(parsedEvent, queueKey);
      }
    }
  }

  /**
   * Process a parsed incoming event from either PUSH or PULL pattern.
   * Shared processing logic for both webhook events and polled status updates.
   *
   * @param parsedEvent - Normalized event from adapter
   * @param currentQueueKey - Current queue for retry logic
   */
  private async processIncomingEvent(parsedEvent: ParsedIncomingEvent, currentQueueKey: string) {
    const { delivery_queue_id, delivery_status, device, message_type, response, unsolicited, failure_context } = parsedEvent;

    // For responses that were sent autonomously by the device, without us requesting them,
    // create a new message and publish it as a successful response.
    if (unsolicited) {
      this.publish({ message_type, delivery_status, device, response });
      return;
    }

    if (!delivery_queue_id) {
      // @TOCHECK :: This is probably impossible
      console.warn('[INCOMING] No delivery_queue_id??', parsedEvent);
      return;
    }

    const messageId = await redisRepo.getMessageIdFromDeliveryQueueId(delivery_queue_id);

    if (!messageId) {
      // console.warn(`[INCOMING DEVICE MESSAGE] Can't find message for delivery_queue_id: ${ delivery_queue_id }`);
      // console.info(parsedEvent);
      return;
    }

    // For gateway ACKs (PUSH pattern only, LoRaWAN specific)
    if (delivery_status === 'SENT_TO_DEVICE') {
      await moveQueuePush.fromGwToDevice({ id: messageId });
      return;
    }

    if (delivery_status === 'DELIVERY_FAILED') {
      const _failureContext = failure_context ?? { reason: 'Unable to deliver message after negative remote response' };
      await this.retryOrFail(messageId, currentQueueKey, _failureContext);
      return;
    }

    // By now the message has to be successful
    if (delivery_status !== 'DELIVERY_SUCCESSFUL') {
      console.warn(`[INCOMING] Unexpected delivery status ${ delivery_status }`, parsedEvent);
      return;
    }

    const storedMessage = await redisRepo.getMessageById(messageId);

    if (!storedMessage) {
      console.warn(`[INCOMING] Message not found (already cleaned up?): ${ messageId }`);
      return;
    }

    await redisRepo.messageFullCleanup(storedMessage);

    const updatedMessage = { ...storedMessage, delivery_status, response, device };

    // We may have a successfully DELIVERED message but a failed EXECUTION, so we still build failure history
    if(failure_context) {
      const completeFailureContext = {
        timestamp: (new Date()).toISOString(),
        status: delivery_status,
        isFinal: true,
        ...failure_context,
      };
      updatedMessage.failure_history = updatedMessage.failure_history ?
        [ completeFailureContext, ...updatedMessage.failure_history ] :
        [ completeFailureContext ]
      ;
    }

    this.publish(updatedMessage);
  }
}
