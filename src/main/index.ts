import { ipcMain } from 'electron';
import { Config } from '@/preload';

import { Wakatime } from './apis';

const wakatime = new Wakatime();

ipcMain.handle('LiteLoader.WakaTime.getConfig', async () => {
  const config: Config = LiteLoader.api.config.get('wakatime');
  return config;
});

ipcMain.handle('LiteLoader.WakaTime.getStatusBar', async () => {
  return await wakatime.getStatusBar();
});

ipcMain.handle('LiteLoader.WakaTime.saveConfig', async (_, config: Config) => {
  LiteLoader.api.config.set('wakatime', { 'apikey': config.apikey, 'refreshTime': config.refreshTime });
});
