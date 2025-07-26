import { localFetch, watchURLHash } from '@/lib';

const VERSION = LiteLoader.plugins.wakatime.manifest['version'];

const initializeEditor = async () => {
  let refreshTimer: NodeJS.Timeout | null = null;
  let editorObserver: MutationObserver | null = null;

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

  const refreshStatusBar = () => {
    addStatusBarToOperation();
  };

  const watchQQEditor = () => {
    const handleEditorChange = (element: Element) => {
      element.addEventListener('input', async () => {
        await WakaTime.sendHeartbeats();
      });

      element.addEventListener('focus', async () => {
        await WakaTime.sendHeartbeats();
      });
    };

    editorObserver = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        if (mutation.type === 'childList') {
          mutation.addedNodes.forEach((node) => {
            if (node instanceof HTMLDivElement) {
              const editor = node.querySelector<HTMLDivElement>('.ck.ck-content.ck-editor__editable');
              if (editor) {
                handleEditorChange(editor);
              }
            }
          });
        }
      });
    });

    editorObserver.observe(document.documentElement, {
      childList: true,
      subtree: true,
    });
  };

  watchURLHash(async (currentHash: string) => {
    if (refreshTimer) {
      clearInterval(refreshTimer);
      refreshTimer = null;
    }

    if (editorObserver) {
      editorObserver.disconnect();
      editorObserver = null;
    }

    if (currentHash.includes('#/main/message')) {
      const config = await WakaTime.getConfig();
      const intervalMs = (config.refreshTime ? config.refreshTime : 5) * 60 * 1000;

      if (config.isSendHeatbeat) {
        watchQQEditor();
      }

      if (!addStatusBarToOperation()) {
        retryAddingDiv(10, 100);
      }

      refreshTimer = setInterval(refreshStatusBar, intervalMs);
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
    const switchButton = view.querySelector<HTMLInputElement>('.wakatime-switch')!;
    switchButton.toggleAttribute('is-active', config.isSendHeatbeat ? config.isSendHeatbeat : true);

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
                <setting-item class="activity" style="cursor: pointer;">
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

        const activityItem = view.querySelector<HTMLElement>('.activity')!;
        activityItem.onclick = () => LiteLoader.api.openExternal('https://wakatime.com/');
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
    switchButton.onclick = async () => {
      const config = await WakaTime.getConfig();
      const isActive = switchButton.hasAttribute('is-active');
      switchButton.toggleAttribute('is-active', !isActive);
      await WakaTime.saveConfig({ ...config, isSendHeatbeat: !isActive });
    };

    const versionText = view.querySelector<HTMLElement>('#version')!;
    versionText.innerHTML += ` - v${VERSION}`;
    const githubJumpBtn = view.querySelector<HTMLButtonElement>('.btn-github')!;
    const sponsorBtn = view.querySelector<HTMLButtonElement>('.btn-sponsor')!;
    githubJumpBtn.onclick = () => LiteLoader.api.openExternal('https://github.com/KomoriDev/qq-wakatime');
    sponsorBtn.onclick = () => LiteLoader.api.openExternal('https://afdian.com/@komoridev');
  } catch (error) {
    view.innerHTML = `<p>Error loading page: ${error}</p>`;
  }
};
