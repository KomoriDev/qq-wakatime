import { ipcMain } from 'electron';

ipcMain.handle('LiteLoader.WakaTime.getApiKey', async () => {
  const config: Record<'apikey', string> = LiteLoader.api.config.get('wakatime');
  if (config.apikey === undefined || config.apikey === '') {
    return null;
  }
  console.log('Get Config:', config);
  return config.apikey;
});

ipcMain.handle('LiteLoader.WakaTime.saveApiKey', async (_, apikey) => {
  console.log('Received API key:', apikey);
  LiteLoader.api.config.set('wakatime', { 'apikey': apikey });
});
