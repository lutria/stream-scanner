import path from "path";
import pino from "pino";
import requireModule from "require-module";
import { SourcePlugin } from "./plugins/SourcePlugin";

interface IPluginConfig {
  packageName: string;
  isRelative?: boolean;
  options?: any;
}

class PluginManager<T extends SourcePlugin> {
  private logger: pino.Logger;
  private plugins: Map<String, T>;
  private path: string;

  constructor({ logger, path }: { logger: pino.Logger; path: string }) {
    this.logger = logger;
    this.plugins = new Map();
    this.path = path;
  }

  registerPlugin(pluginConfig: IPluginConfig): T {
    if (!pluginConfig.packageName) {
      throw new Error("Plugin packageName is required");
    }

    const packageContents = this.requirePlugin(pluginConfig);

    packageContents.default.prototype.options = pluginConfig.options;

    const instance = Object.create(packageContents.default.prototype) as T;

    this.logger.debug(
      `Registering plugin for source: ${instance.getSourceName()}`
    );

    if (this.plugins.has(instance.getSourceName())) {
      throw new Error(
        `There is already a plugin registered for source ${instance.getSourceName()}`
      );
    }

    this.plugins.set(instance.getSourceName(), instance);

    return instance;
  }

  loadPlugin(sourceName: string): T {
    this.logger.debug(`Loading plugin for source: ${sourceName}`);

    const plugin = this.plugins.get(sourceName);

    if (!plugin) {
      throw new Error(`No plugin registered for source ${sourceName}`);
    }

    return plugin;
  }

  listPlugins() {
    return Object.seal(this.plugins);
  }

  private requirePlugin(pluginConfig: IPluginConfig): any {
    try {
      // Try to load the module for the plugin
      return pluginConfig.isRelative
        ? requireModule(path.join(this.path, pluginConfig.packageName))
        : requireModule(pluginConfig.packageName);
    } catch (error) {
      const message = error instanceof Error ? error.message : "";
      throw new Error(
        `Cannot load module for plugin ${pluginConfig.packageName}: ${message}`
      );
    }
  }
}

export default PluginManager;
