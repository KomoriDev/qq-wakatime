export const localFetch = async (path: string, slug = 'wakatime') => {
  return fetch(
    `local:///${LiteLoader.plugins[slug].path.plugin.replace(':\\', '://').replaceAll('\\', '/')}/${path.startsWith('/') ? path.slice(1) : path}`
  );
};

export const findElement = (selector, callback) => {
  const observer = (_, observer) => {
    const element = document.querySelector(selector);
    if (element) {
      callback(element);
      observer?.disconnect?.();
      return true;
    }
    return false;
  };
  if (!observer) {
    new MutationObserver(observer).observe(document, {
      subtree: true,
      attributes: false,
      childList: true,
    });
  }
};

export const watchURLHash = (callback: (hash: string) => void): void => {
  if (!location.hash.includes('#/blank')) {
    callback(location.hash);
  } else {
    // @ts-ignore
    navigation.addEventListener(
      'navigatesuccess',
      () => {
        callback(location.hash);
      },
      { once: true }
    );
  }
};
