import { localFetch } from '@/lib';

export const onSettingWindowCreated = async (view: HTMLElement) => {
  try {
    view.innerHTML = await (await localFetch('/renderer/views/index.html')).text();

    const apikeyInput = view.querySelector<HTMLInputElement>('.wakatime-apikey')!;
    const apikey = await WakaTime.getApiKey();
    if (apikey) {
      apikeyInput.value = apikey;
    }

    apikeyInput.addEventListener('blur', async (event: FocusEvent) => {
      const target = event.target as HTMLInputElement;

      if (target) {
        console.log(target.value);
        await WakaTime.saveApiKey(target.value);
      }
    });
  } catch (error) {
    view.innerHTML = `<p>Error loading page: ${error}</p>`;
  }
};
