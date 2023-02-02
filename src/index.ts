import pino from "pino";
import { NatsClient, subjects } from "@lutria/nats-common/src/index.js";
import PluginManager from "./PluginManager.js";
import { SourcePlugin } from "./plugins/SourcePlugin.js";
import { LutriaEvent, StreamScanRequest } from "@lutria/types";

const logger = pino({ level: process.env.LOG_LEVEL });

const pluginManager = new PluginManager({ logger, path: __dirname });

pluginManager.registerPlugin({
  name: "alpha-source-plugin",
  packageName: "./plugins/alpha",
  isRelative: true,
});

const plugin = pluginManager.loadPlugin<SourcePlugin>("alpha-source-plugin");
plugin.scan();

const natsClient = new NatsClient({
  logger,
  name: `stream-scanner-${process.env.INSTANCE_ID}`,
  servers: process.env.NATS_URL || "nats://localhost:4222",
});

const handler = (event: LutriaEvent) => {
  // TODO:
  plugin.scan();
};

const run = async () => {
  await natsClient.connect();

  natsClient.subscribe(subjects.STREAM_SCAN_REQUEST, "stream-scanner", handler);
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
