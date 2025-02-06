import { contextBridge, ipcRenderer } from 'electron';

contextBridge.exposeInMainWorld('WakaTime', {
  getApiKey: () => ipcRenderer.invoke('LiteLoader.WakaTime.getApiKey'),
  saveApiKey: (apikey: string) => ipcRenderer.invoke('LiteLoader.WakaTime.saveApiKey', apikey),
});
