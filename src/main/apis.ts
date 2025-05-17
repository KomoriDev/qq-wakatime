import { Config } from '@/preload';
import { StatusBar } from './schema';

export class Wakatime {
  baseUrl: string = 'https://wakatime.com/api/v1';

  getApiKey(): string | null {
    const config: Config = LiteLoader.api.config.get('wakatime');
    if (config.apikey === undefined || config.apikey === '') {
      return null;
    }
    return config.apikey;
  }

  async getStatusBar(): Promise<StatusBar> {
    const apiKey = this.getApiKey();
    if (!apiKey) {
      throw new Error('API key is missing');
    }

    const response = await fetch(`${this.baseUrl}/users/current/status_bar/today?api_key=${apiKey}`);
    const statusBar: StatusBar = (await response.json()).data;
    return statusBar;
  }
}
