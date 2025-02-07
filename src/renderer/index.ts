import { localFetch, watchURLHash } from '@/lib';

const VERSION = LiteLoader.plugins.liteloader_nonebot.manifest['version'];

const initializeEditor = async () => {
  const statusBar = await WakaTime.getStatusBar();

  if (!statusBar) return;

  const addStatusBarToOperation = () => {
    const operationElement = document.querySelector<HTMLElement>('.operation');
    const sendBtnWrap = document.querySelector('.send-btn-wrap');

    if (operationElement && sendBtnWrap && statusBar.categories) {
      const statusBarDiv = document.createElement('div');
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
    const intervalId = setInterval(() => {
      if (addStatusBarToOperation()) {
        clearInterval(intervalId);
      } else if (attempts >= retries) {
        clearInterval(intervalId);
        console.warn('Failed to add div after multiple attempts.');
      }
      attempts++;
    }, delay);
  };

  watchURLHash((currentHash: string) => {
    if (currentHash.includes('#/main/message')) {
      if (!addStatusBarToOperation()) {
        retryAddingDiv(10, 100);
      }
    }
  });
};

initializeEditor();

export const onSettingWindowCreated = async (view: HTMLElement) => {
  try {
    view.innerHTML = await (await localFetch('/renderer/views/index.html')).text();

    const apikeyInput = view.querySelector<HTMLInputElement>('.wakatime-apikey')!;
    const apikey = await WakaTime.getApiKey();
    if (apikey) {
      apikeyInput.value = apikey;

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

    apikeyInput.addEventListener('blur', async (event: FocusEvent) => {
      const target = event.target as HTMLInputElement;

      if (target) {
        console.log(target.value);
        await WakaTime.saveApiKey(target.value);
      }
    });

    const versionText = view.querySelector<HTMLElement>('#version')!;
    versionText.innerHTML += ` - v${VERSION}`;
    const githubJumpBtn = view.querySelector<HTMLButtonElement>('.btn-github')!;
    githubJumpBtn.onclick = () => LiteLoader.api.openExternal('https://github.com/KomoriDev/qq-wakatime');
  } catch (error) {
    view.innerHTML = `<p>Error loading page: ${error}</p>`;
  }
};
