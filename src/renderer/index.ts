import { localFetch, watchURLHash } from '@/lib';

const VERSION = LiteLoader.plugins.liteloader_nonebot.manifest['version'];

const initializeEditor = async () => {
  let refreshTimer: NodeJS.Timeout | null = null;

  const addStatusBarToOperation = async () => {
    const statusBar = await WakaTime.getStatusBar();

    const operationElement = document.querySelector<HTMLElement>('.operation');
    const sendBtnWrap = document.querySelector('.send-btn-wrap');

    if (operationElement && sendBtnWrap && statusBar.categories) {
      const existingStatusBar = operationElement.querySelector('#wakatime-status-bar');
      if (existingStatusBar) {
        existingStatusBar.remove();
      }

      const statusBarDiv = document.createElement('div');
      statusBarDiv.id = 'wakatime-status-bar';
      statusBarDiv.textContent = statusBar.categories?.map((value) => `${value.name}: ${value.text}`).join(', ');
      statusBarDiv.style.color = '#b8b8b8';
      statusBarDiv.style.fontSize = 'smaller';

      operationElement.insertBefore(statusBarDiv, sendBtnWrap);
      operationElement.style.justifyContent = 'space-between';
      return true;
    }
    return false;
  };

  const retryAddingDiv = (retries: number, delay: number) => {
    let attempts = 0;
    const intervalId = setInterval(async () => {
      if (await addStatusBarToOperation()) {
        clearInterval(intervalId);
      } else if (attempts >= retries) {
        clearInterval(intervalId);
        console.warn('Failed to add div after multiple attempts.');
      }
      attempts++;
    }, delay);
  };

  const refreshMessages = () => {
    console.log('refresh status bar');
    addStatusBarToOperation();
  };

  watchURLHash(async (currentHash: string) => {
    if (refreshTimer) {
      clearInterval(refreshTimer);
      refreshTimer = null;
    }

    if (currentHash.includes('#/main/message')) {
      const config = await WakaTime.getConfig();
      const intervalMs = (config.refreshTime ? config.refreshTime : 5) * 60 * 1000;

      if (!addStatusBarToOperation()) {
        retryAddingDiv(10, 100);
      }

      refreshTimer = setInterval(refreshMessages, intervalMs);
    }
  });
};

initializeEditor();

export const onSettingWindowCreated = async (view: HTMLElement) => {
  const config = await WakaTime.getConfig();

  try {
    view.innerHTML = await (await localFetch('/renderer/views/index.html')).text();

    const apikeyInput = view.querySelector<HTMLInputElement>('.wakatime-apikey')!;
    const refreshTimeInput = view.querySelector<HTMLInputElement>('.wakatime-refresh')!;

    if (config.apikey) {
      apikeyInput.value = config.apikey;

      try {
        const statusBar = await WakaTime.getStatusBar();
        const configSection = document.querySelector('setting-section[data-title="配置"]');
        configSection?.insertAdjacentHTML(
          'afterend',
          `
          <setting-section data-title="状态">
            <setting-panel>
              <setting-list data-direction="column">
                <setting-item>
                  <div>
                    <setting-text>今日活动</setting-text>
                    <setting-text data-type="secondary">
                      ${statusBar.categories?.map((value) => `${value.name}: ${value.text}`).join(', ')}
                    </setting-text>
                  </div>
                  <setting-text>${statusBar.grand_total.text}</setting-text>
                </setting-item>
              </setting-list>
            </setting-panel>
          </setting-section>
          `
        );
      } catch (error) {
        console.log(error);
      }
    }

    if (config.refreshTime) {
      refreshTimeInput.value = config.refreshTime.toString();
    } else {
      refreshTimeInput.value = '5';
    }

    const handleConfigInputBlur = async (
      event: FocusEvent,
      key: string,
      parser: (value: string) => unknown = String
    ) => {
      const target = event.target as HTMLInputElement;
      if (!target) return;

      const config = await WakaTime.getConfig();
      await WakaTime.saveConfig({ ...config, [key]: parser(target.value) });
    };

    apikeyInput.addEventListener('blur', (e) => handleConfigInputBlur(e, 'apikey'));
    refreshTimeInput.addEventListener('blur', (e) => handleConfigInputBlur(e, 'refreshTime', Number));

    const versionText = view.querySelector<HTMLElement>('#version')!;
    versionText.innerHTML += ` - v${VERSION}`;
    const githubJumpBtn = view.querySelector<HTMLButtonElement>('.btn-github')!;
    githubJumpBtn.onclick = () => LiteLoader.api.openExternal('https://github.com/KomoriDev/qq-wakatime');
  } catch (error) {
    view.innerHTML = `<p>Error loading page: ${error}</p>`;
  }
};
