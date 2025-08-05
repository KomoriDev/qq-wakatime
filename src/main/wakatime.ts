import fs from 'fs';
import path from 'path';
import child_process from 'child_process';

import { Config } from '@/preload';
import { StatusBar } from './schema';
import { Desktop } from './desktop';
import { Dependencies } from './dependencies';

export function throttleAsync<Args extends unknown[]>(
  fn: (...args: Args) => Promise<void>,
  interval: number
): [(...args: Args) => Promise<void>, () => void] {
  let lastExecTime = 0;
  let timeout: ReturnType<typeof setTimeout> | null = null;
  let pendingArgs: Args | null = null;

  const start = async (...args: Args): Promise<void> => {
    const now = Date.now();

    const run = async () => {
      lastExecTime = Date.now();
      await fn(...args);
    };

    if (lastExecTime + interval <= now) {
      if (timeout) {
        clearTimeout(timeout);
        timeout = null;
      }
      await run();
    } else {
      pendingArgs = args;
      if (!timeout) {
        timeout = setTimeout(
          async () => {
            timeout = null;
            if (pendingArgs) {
              await run();
              pendingArgs = null;
            }
          },
          lastExecTime + interval - now
        );
      }
    }
  };

  const cancel = () => {
    if (timeout) clearTimeout(timeout);
    timeout = null;
    pendingArgs = null;
  };

  return [start, cancel];
}

export class Wakatime {
  private resourcesLocation: string = '';
  private dependencies: Dependencies | undefined;
  private baseUrl: string = 'https://wakatime.com/api/v1';

  private throttledHeartbeat: () => Promise<void>;

  constructor() {
    this.setResourcesLocation();
    [this.throttledHeartbeat] = throttleAsync(this._sendHeartbeats.bind(this), 1 * 60 * 1000);
  }

  public initialize() {
    this.dependencies = new Dependencies(this.resourcesLocation);
    this.initializeDependencies();
  }

  public getApiKey(): string | null {
    const config: Config = LiteLoader.api.config.get('wakatime');
    if (config.apikey === undefined || config.apikey === '') {
      return null;
    }
    return config.apikey;
  }

  public async getStatusBar(): Promise<StatusBar> {
    const apiKey = this.getApiKey();
    if (!apiKey) {
      throw new Error('API key is missing');
    }

    const response = await fetch(`${this.baseUrl}/users/current/status_bar/today?api_key=${apiKey}`);
    const statusBar: StatusBar = (await response.json()).data;
    return statusBar;
  }

  private async _sendHeartbeats() {
    if (!this.dependencies?.isCliInstalled()) return;

    const apiKey = this.getApiKey();
    if (!apiKey) {
      throw new Error('API key is missing');
    }

    const args: string[] = [];

    args.push('--entity', 'https://im.qq.com/');
    args.push('--entity-type', 'app');
    args.push('--category', 'communicating');
    args.push('--project', 'QQ');
    args.push('--key', apiKey);

    const binary = this.dependencies.getCliLocation();
    const options = Desktop.buildOptions();
    child_process.execFile(binary, args, options, (error, stdout, stderr) => {
      if (error != null) {
        if (stderr && stderr.toString() != '') console.error(stderr.toString());
        if (stdout && stdout.toString() != '') console.error(stdout.toString());
        console.error(error.toString());
      }
    });
  }

  public async sendHeartbeats() {
    await this.throttledHeartbeat();
  }

  private setResourcesLocation() {
    const home = Desktop.getHomeDirectory();
    const folder = path.join(home, '.wakatime');

    fs.mkdirSync(folder, { recursive: true });
    this.resourcesLocation = folder;
  }

  public initializeDependencies(): void {
    console.debug('Initializing WakaTime');
    this.dependencies?.checkAndInstallCli(() => {
      console.debug('WakaTime initialized');
    });
  }
}
