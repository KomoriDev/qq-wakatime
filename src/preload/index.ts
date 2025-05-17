import { contextBridge, ipcRenderer } from 'electron';

export type Config = {
  apikey?: string;
  refreshTime?: number;
};

contextBridge.exposeInMainWorld('WakaTime', {
  getStatusBar: () => ipcRenderer.invoke('LiteLoader.WakaTime.getStatusBar'),
  getConfig: () => ipcRenderer.invoke('LiteLoader.WakaTime.getConfig'),
  saveConfig: (config: Config) => ipcRenderer.invoke('LiteLoader.WakaTime.saveConfig', config),
});
