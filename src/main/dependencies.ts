import adm_zip from 'adm-zip';
import child_process from 'child_process';
import fs from 'fs';
import os from 'os';
import path from 'path';
import request from 'request';
import which from 'which';

import { Desktop } from './desktop';

export class Dependencies {
  private resourcesLocation: string;
  private cliLocation?: string = undefined;
  private cliLocationGlobal?: string = undefined;
  private cliInstalled: boolean = false;
  private githubDownloadPrefix = 'https://github.com/wakatime/wakatime-cli/releases/download';
  private githubReleasesStableUrl = 'https://api.github.com/repos/wakatime/wakatime-cli/releases/latest';
  private githubReleasesAlphaUrl = 'https://api.github.com/repos/wakatime/wakatime-cli/releases?per_page=1';
  private latestCliVersion: string = '';

  private config = {
    proxy: process.env.HTTP_PROXY || process.env.HTTPS_PROXY || null,
    no_ssl_verify: process.env.NODE_TLS_REJECT_UNAUTHORIZED === '0',
    alpha: false,
    cli_version_last_modified: '',
    cli_version: '',
  };

  constructor(resourcesLocation: string) {
    this.resourcesLocation = resourcesLocation;
  }

  public getCliLocation(): string {
    if (this.cliLocation) return this.cliLocation;

    this.cliLocation = this.getCliLocationGlobal();
    if (this.cliLocation) return this.cliLocation;

    const ext = Desktop.isWindows() ? '.exe' : '';
    let osname = os.platform() as string;
    if (osname == 'win32') osname = 'windows';
    const arch = this.architecture();
    this.cliLocation = path.join(this.resourcesLocation, `wakatime-cli-${osname}-${arch}${ext}`);

    return this.cliLocation;
  }

  public getCliLocationGlobal(): string | undefined {
    if (this.cliLocationGlobal) return this.cliLocationGlobal;

    const binaryName = `wakatime-cli${Desktop.isWindows() ? '.exe' : ''}`;
    const path = which.sync(binaryName, { nothrow: true });
    if (path) {
      this.cliLocationGlobal = path;
      console.debug(`Using global wakatime-cli location: ${path}`);
    }

    return this.cliLocationGlobal;
  }

  public isCliInstalled(): boolean {
    if (this.cliInstalled) return true;
    this.cliInstalled = fs.existsSync(this.getCliLocation());
    return this.cliInstalled;
  }

  public checkAndInstallCli(callback: () => void): void {
    if (!this.isCliInstalled()) {
      this.installCli(callback);
    } else {
      this.isCliLatest((isLatest) => {
        if (!isLatest) {
          this.installCli(callback);
        } else {
          callback();
        }
      });
    }
  }

  private isCliLatest(callback: (arg0: boolean) => void): void {
    if (this.getCliLocationGlobal()) {
      callback(true);
      return;
    }

    const args = ['--version'];
    const options = Desktop.buildOptions();
    try {
      child_process.execFile(this.getCliLocation(), args, options, (error, _stdout, stderr) => {
        if (!(error != null)) {
          const currentVersion = _stdout.toString().trim() + stderr.toString().trim();
          console.debug(`Current wakatime-cli version is ${currentVersion}`);

          if (currentVersion.trim() === '<local-build>') {
            callback(true);
            return;
          }

          console.debug('Checking for updates to wakatime-cli...');
          this.getLatestCliVersion((latestVersion) => {
            if (currentVersion === latestVersion) {
              console.debug('wakatime-cli is up to date');
              callback(true);
            } else if (latestVersion) {
              console.debug(`Found an updated wakatime-cli ${latestVersion}`);
              callback(false);
            } else {
              console.debug('Unable to find latest wakatime-cli version');
              callback(false);
            }
          });
        } else {
          callback(false);
        }
      });
    } catch {
      callback(false);
    }
  }

  private getLatestCliVersion(callback: (arg0: string) => void): void {
    if (this.latestCliVersion) {
      console.debug(`Using cached latest wakatime-cli version: ${this.latestCliVersion}`);
      callback(this.latestCliVersion);
      return;
    }

    const requestOptions: request.OptionsWithUri = {
      uri: this.config.alpha ? this.githubReleasesAlphaUrl : this.githubReleasesStableUrl,
      json: true,
      headers: {
        'User-Agent': 'github.com/wakatime/standalone-cli-installer',
      },
    };
    console.debug(`Fetching latest wakatime-cli version from GitHub API: ${requestOptions.uri}`);

    if (this.config.proxy) {
      console.debug(`Using Proxy: ${this.config.proxy}`);
      requestOptions['proxy'] = this.config.proxy;
    }
    if (this.config.no_ssl_verify) {
      requestOptions['strictSSL'] = false;
    }
    if (this.config.cli_version_last_modified && this.config.cli_version) {
      requestOptions.headers!['If-Modified-Since'] = this.config.cli_version_last_modified;
    }

    try {
      request.get(requestOptions, (error, response, json) => {
        if (!error && response && (response.statusCode == 200 || response.statusCode == 304)) {
          console.debug(`GitHub API Response ${response.statusCode}`);
          if (response.statusCode == 304) {
            this.latestCliVersion = this.config.cli_version;
            callback(this.latestCliVersion);
            return;
          }
          this.latestCliVersion = this.config.alpha ? json[0]['tag_name'] : json['tag_name'];
          console.debug(`Latest wakatime-cli version from GitHub: ${this.latestCliVersion}`);
          const lastModified = response.headers['last-modified'] as string;
          if (lastModified && this.latestCliVersion) {
            this.config.cli_version = this.latestCliVersion;
            this.config.cli_version_last_modified = lastModified;
          }
          callback(this.latestCliVersion);
        } else {
          if (response) {
            console.warn(`GitHub API Response ${response.statusCode}: ${error}`);
          } else {
            console.warn(`GitHub API Response Error: ${error}`);
          }
          callback('');
        }
      });
    } catch (e) {
      console.warn(e);
      callback('');
    }
  }

  private installCli(callback: () => void): void {
    this.getLatestCliVersion((version) => {
      if (!version) {
        console.debug('Unable to find latest version from GitHub releases api.');
        callback();
        return;
      }
      console.debug(`Downloading wakatime-cli ${version}...`);
      const url = this.cliDownloadUrl(version);
      const zipFile = path.join(this.resourcesLocation, 'wakatime-cli' + this.randStr() + '.zip');
      this.downloadFile(
        url,
        zipFile,
        () => {
          this.extractCli(zipFile, callback);
        },
        callback
      );
    });
  }

  private isSymlink(file: string): boolean {
    try {
      return fs.lstatSync(file).isSymbolicLink();
    } catch {
      /* empty */
    }
    return false;
  }

  private extractCli(zipFile: string, callback: () => void): void {
    console.debug(`Extracting wakatime-cli into "${this.resourcesLocation}"...`);
    this.removeCli(() => {
      this.unzip(zipFile, this.resourcesLocation, () => {
        if (!Desktop.isWindows()) {
          const cli = this.getCliLocation();
          try {
            console.debug('Chmod 755 wakatime-cli...');
            fs.chmodSync(cli, 0o755);
          } catch (e) {
            console.warn(e);
          }
          const ext = Desktop.isWindows() ? '.exe' : '';
          const link = path.join(this.resourcesLocation, `wakatime-cli${ext}`);
          if (!this.isSymlink(link)) {
            try {
              console.debug(`Create symlink from wakatime-cli to ${cli}`);
              fs.symlinkSync(cli, link);
            } catch (e) {
              console.warn(e);
              try {
                fs.copyFileSync(cli, link);
                fs.chmodSync(link, 0o755);
              } catch (e2) {
                console.warn(e2);
              }
            }
          }
        }
        callback();
      });
      console.debug('Finished extracting wakatime-cli.');
    });
  }

  private removeCli(callback: () => void): void {
    if (fs.existsSync(this.getCliLocation())) {
      fs.unlink(this.getCliLocation(), () => {
        callback();
      });
    } else {
      callback();
    }
  }

  private downloadFile(url: string, outputFile: string, callback: () => void, error: () => void): void {
    const requestOptions: request.OptionsWithUri = { uri: url };
    if (this.config.proxy) {
      console.debug(`Using Proxy: ${this.config.proxy}`);
      requestOptions['proxy'] = this.config.proxy;
    }
    if (this.config.no_ssl_verify) {
      requestOptions['strictSSL'] = false;
    }
    try {
      const r = request.get(requestOptions);
      r.on('error', (e) => {
        console.warn(`Failed to download ${url}`);
        console.warn(e.toString());
        error();
      });
      const out = fs.createWriteStream(outputFile);
      r.pipe(out);
      r.on('end', () => {
        out.on('finish', () => {
          callback();
        });
      });
    } catch (e) {
      console.warn(e);
      callback();
    }
  }

  private unzip(file: string, outputDir: string, callback: () => void): void {
    if (fs.existsSync(file)) {
      try {
        const zip = new adm_zip(file);
        zip.extractAllTo(outputDir, true);
      } catch (e) {
        console.error(e);
      } finally {
        try {
          fs.unlink(file, () => {
            callback();
          });
        } catch {
          callback();
        }
      }
    }
  }

  private architecture(): string {
    const arch = os.arch();
    if (arch.indexOf('32') > -1) return '386';
    if (arch.indexOf('x64') > -1) return 'amd64';
    return arch;
  }

  private cliDownloadUrl(version: string): string {
    let osname = os.platform() as string;
    if (osname == 'win32') osname = 'windows';
    const arch = this.architecture();

    const validCombinations = [
      'darwin-amd64',
      'darwin-arm64',
      'freebsd-386',
      'freebsd-amd64',
      'freebsd-arm',
      'linux-386',
      'linux-amd64',
      'linux-arm',
      'linux-arm64',
      'netbsd-386',
      'netbsd-amd64',
      'netbsd-arm',
      'openbsd-386',
      'openbsd-amd64',
      'openbsd-arm',
      'openbsd-arm64',
      'windows-386',
      'windows-amd64',
      'windows-arm64',
    ];
    if (!validCombinations.includes(`${osname}-${arch}`)) this.reportMissingPlatformSupport(osname, arch);

    return `${this.githubDownloadPrefix}/${version}/wakatime-cli-${osname}-${arch}.zip`;
  }

  private reportMissingPlatformSupport(osname: string, architecture: string): void {
    const url = `https://api.wakatime.com/api/v1/cli-missing?osname=${osname}&architecture=${architecture}&plugin=standalone`;
    const requestOptions: request.OptionsWithUri = { uri: url };
    if (this.config.proxy) requestOptions['proxy'] = this.config.proxy;
    if (this.config.no_ssl_verify) requestOptions['strictSSL'] = false;
    try {
      request.get(requestOptions);
    } catch {
      /* empty */
    }
  }

  private randStr(): string {
    return (Math.random() + 1).toString(36).substring(7);
  }
}
