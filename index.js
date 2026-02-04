const DISCORD_API_BASE = 'https://discord.com/api/v10';
const DISCORD_CDN_BASE = 'https://cdn.discordapp.com';

const cdnKeywords = [
  '/attachments/', '/avatars/', '/icons/', '/banners/', '/emojis/', 
  '/app-icons/', '/splashes/', '/team-icons/', '/stickers/', 
  '/role-icons/', '/guild-events/', '/avatar-decoration-presets/'
];

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const requestPath = url.pathname;
    const requestSearch = url.search;

    // 1. 転送先（CDNかAPIか）を判定
    let targetBase = DISCORD_API_BASE;
    let finalPath = requestPath;


    for (const keyword of cdnKeywords) {
      if (requestPath.includes(keyword)) {
        const pos = requestPath.indexOf(keyword);
        finalPath = requestPath.substring(pos);
        targetBase = DISCORD_CDN_BASE;
        break;
      }
    }


    if (targetBase === DISCORD_API_BASE && !finalPath.startsWith('/api/v10')) {


        finalPath = finalPath.replace(/^\/[^/]+/, ''); 
        if (!finalPath.startsWith('/api/v10')) {
            finalPath = '/api/v10' + (finalPath.startsWith('/') ? '' : '/') + finalPath;
        }
    }

    const targetUrl = targetBase.replace('/api/v10', '') + finalPath + requestSearch;

    const newHeaders = new Headers(request.headers);
    
    newHeaders.set('Origin', 'https://discord.com');
    newHeaders.set('Referer', 'https://discord.com/channels/@me');

    if (!newHeaders.has('User-Agent')) {
      newHeaders.set('User-Agent', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
    }


    try {
      const modifiedRequest = new Request(targetUrl, {
        method: request.method,
        headers: newHeaders,
        body: request.method !== 'GET' && request.method !== 'HEAD' ? request.body : null,
        redirect: 'follow'
      });

      const response = await fetch(modifiedRequest);


      const responseHeaders = new Headers(response.headers);
      

      responseHeaders.set('Access-Control-Allow-Origin', '*');
      responseHeaders.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, PATCH, OPTIONS');
      responseHeaders.set('Access-Control-Allow-Headers', 'Authorization, Content-Type, User-Agent, X-Super-Properties, X-Discord-Locale, Accept-Language');


      responseHeaders.delete('transfer-encoding');
      responseHeaders.delete('connection');
      responseHeaders.delete('content-encoding');

      return new Response(response.body, {
        status: response.status,
        statusText: response.statusText,
        headers: responseHeaders
      });

    } catch (e) {
      return new Response(JSON.stringify({ code: 0, message: 'Proxy Error: ' + e.message }), {
        status: 500,
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
      });
    }
  }
};
