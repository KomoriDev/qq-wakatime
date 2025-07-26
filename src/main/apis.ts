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

  async sendHeartbeats() {
    const apiKey = this.getApiKey();
    if (!apiKey) {
      throw new Error('API key is missing');
    }

    try {
      await fetch(`${this.baseUrl}/users/current/heartbeats`, {
        method: 'POST',
        headers: {
          'Authorization': `Basic ${btoa(apiKey)}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          entity: 'https://im.qq.com/',
          type: 'app',
          time: Date.now() / 1000,
          project: 'QQ',
          category: 'communicating',
          is_write: false,
        }),
      });
    } catch (e) {
      console.log('send heatbeats error: ', e);
    }
  }
}
