import path from "path";
import pino from "pino";
import requireModule from "require-module";

interface IPlugin {
  name: string;
  packageName: string;
  isRelative?: boolean;
  instance?: any;
  options?: any;
}

class PluginManager {
  private logger: pino.Logger;
  private plugins: Map<String, IPlugin>;
  private path: string;

  constructor({ logger, path }: { logger: pino.Logger; path: string }) {
    this.logger = logger;
    this.plugins = new Map();
    this.path = path;
  }

  registerPlugin(plugin: IPlugin): void {
    if (!plugin.name || !plugin.packageName) {
      throw new Error("Plugin name and packageName are required");
    }

    if (this.pluginExists(plugin.name)) {
      throw new Error(`Cannot add existing plugin ${plugin.name}`);
    }

    try {
      // Try to load the plugin
      const packageContents = plugin.isRelative
        ? requireModule(path.join(this.path, plugin.packageName))
        : requireModule(plugin.packageName);
      this.addPlugin(plugin, packageContents);
    } catch (error) {
      const message = error instanceof Error ? error.message : "";
      this.logger.error(`Cannot load plugin ${plugin.name}: ${message}`);
    }
  }

  loadPlugin<T>(name: string): T {
    const plugin = this.plugins.get(name);
    if (!plugin) {
      throw new Error(`Cannot find plugin ${name}`);
    }

    plugin.instance.default.prototype.options = plugin.options;
    return Object.create(plugin.instance.default.prototype) as T;
  }

  listPlugins() {
    return Object.freeze(this.plugins);
  }

  private addPlugin(plugin: IPlugin, packageContents: any): void {
    this.plugins.set(plugin.name, { ...plugin, instance: packageContents });
  }

  private pluginExists(name: string): boolean {
    return this.plugins.has(name);
  }
}

export default PluginManager;
