export default {
  async fetch(request) {
    const url = new URL(request.url);
    const upstream = new URL(url.pathname + url.search, 'https://roll-betty-storm-chemistry.trycloudflare.com');
    return fetch(upstream, request);
  }
}
