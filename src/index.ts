import pino from "pino";
import { NatsClient, subjects } from "@lutria/nats-common";
import PluginManager from "./PluginManager";
import { SourcePlugin } from "./plugins/SourcePlugin";
import { EventType, LutriaEvent, StreamScanRequest } from "@lutria/types";

const logLevel = process.env.LOG_LEVEL || "info";
const instanceId = process.env.INSTANCE_ID || "1";
const natsUrl = process.env.NATS_URL || "nats://localhost:4222";
const serviceName = process.env.SERVICE_NAME || "stream-scanner";

const logger = pino({ level: logLevel });

const pluginManager = new PluginManager<SourcePlugin>({
  logger,
  path: __dirname,
});

pluginManager.registerPlugin({
  packageName: "./plugins/alpha",
  isRelative: true,
});

const natsClient = new NatsClient({
  logger,
  name: `${serviceName}-${instanceId}`,
  servers: natsUrl,
});

const onStreamScanRequest = (event: LutriaEvent) => {
  if (event.type != EventType.StreamScanRequest) {
    throw new Error(`Event has unexpected type: ${event.type}`);
  }

  const scanRequest = event as StreamScanRequest;

  const sourcePlugin = pluginManager.loadPlugin(scanRequest.sourceName);

  sourcePlugin.scanStream({
    externalId: scanRequest.externalId,
    externalType: scanRequest.externalType,
    scanCursor: scanRequest.scanCursor,
  });
};

const run = async () => {
  await natsClient.connect();

  natsClient.subscribe(
    subjects.STREAM_SCAN_REQUEST,
    serviceName,
    onStreamScanRequest
  );
};

const gracefulShutdown = () => {
  logger.info("Shutting down");

  natsClient.disconnect().finally(() => {
    logger.info("NATS connection closed");
    process.exit(0);
  });
};

process.on("SIGINT", gracefulShutdown);
process.on("SIGTERM", gracefulShutdown);

(async () => {
  try {
    await run();
  } catch (err) {
    logger.error("Uh-oh!");
    process.exit(1);
  }
})();
