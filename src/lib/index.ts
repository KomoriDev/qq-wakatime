export const localFetch = async (path: string, slug = 'wakatime') => {
  return fetch(
    `local:///${LiteLoader.plugins[slug].path.plugin.replace(':\\', '://').replaceAll('\\', '/')}/${path.startsWith('/') ? path.slice(1) : path}`
  );
};
