import fs from 'fs';
import path from 'path';
import child_process from 'child_process';

import { Config } from '@/preload';
import { StatusBar } from './schema';
import { Desktop } from './desktop';
import { Dependencies } from './dependencies';

export class Wakatime {
  private resourcesLocation: string = '';
  private dependencies: Dependencies | undefined;
  private baseUrl: string = 'https://wakatime.com/api/v1';

  constructor() {
    this.setResourcesLocation();
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

  public async sendHeartbeats() {
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
