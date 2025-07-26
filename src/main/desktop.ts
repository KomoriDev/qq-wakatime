/**
 * 修改自 wakatime/vscode-wakatime
 * @src https://github.com/wakatime/vscode-wakatime/blob/master/src/desktop.ts
 * @last-updated 2023-10-24
 * @last-updated-by @alanhamlett
 */

import * as fs from 'fs';
import * as os from 'os';

export class Desktop {
  public static isWindows(): boolean {
    return os.platform() === 'win32';
  }

  public static isPortable(): boolean {
    return !!process.env['VSCODE_PORTABLE'];
  }

  public static getHomeDirectory(): string {
    const home = process.env.WAKATIME_HOME;
    if (home && home.trim() && fs.existsSync(home.trim())) return home.trim();
    if (this.isPortable()) return process.env['VSCODE_PORTABLE'] as string;
    return process.env[this.isWindows() ? 'USERPROFILE' : 'HOME'] || process.cwd();
  }

  public static buildOptions(): object {
    const options = {
      windowsHide: true,
    };
    if (!this.isWindows() && !process.env.WAKATIME_HOME && !process.env.HOME) {
      options['env'] = { ...process.env, WAKATIME_HOME: this.getHomeDirectory() };
    }
    return options;
  }
}
