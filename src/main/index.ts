import { ipcMain } from 'electron';
import { Wakatime } from './apis';

const wakatime = new Wakatime();

ipcMain.handle('LiteLoader.WakaTime.getApiKey', async () => {
  return wakatime.getApiKey();
});

ipcMain.handle('LiteLoader.WakaTime.saveApiKey', async (_, apikey) => {
  LiteLoader.api.config.set('wakatime', { 'apikey': apikey });
});

ipcMain.handle('LiteLoader.WakaTime.getStatusBar', async () => {
  return await wakatime.getStatusBar();
});
