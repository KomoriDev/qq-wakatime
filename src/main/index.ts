import { ipcMain } from 'electron';
import { Config } from '@/preload';

import { Wakatime } from './wakatime';

const wakatime = new Wakatime();
wakatime.initialize();

ipcMain.handle('LiteLoader.WakaTime.getConfig', async () => {
  const config: Config = LiteLoader.api.config.get('wakatime');
  return config;
});

ipcMain.handle('LiteLoader.WakaTime.getStatusBar', async () => {
  return await wakatime.getStatusBar();
});

ipcMain.handle('LiteLoader.WakaTime.saveConfig', async (_, config: Config) => {
  LiteLoader.api.config.set('wakatime', {
    'apikey': config.apikey,
    'refreshTime': config.refreshTime,
    'isSendHeatbeat': config.isSendHeatbeat,
  });
});

ipcMain.handle('LiteLoader.WakaTime.sendHeartbeats', async () => {
  return await wakatime.sendHeartbeats();
});
