export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    
    // 1. 転送先URLの構築
    // パスから "/avoidcord" を削除し、Discord API/CDNのパスに変換
    // クライアント(index.js)からは BASE_URL + /api/v10/... で来ることを想定
    
    // 画像CDNかどうか判定 (簡易判定)
    const isCdn = url.pathname.match(/\/(attachments|avatars|icons|banners|emojis|stickers|app-icons)\//);
    const targetDomain = isCdn ? 'https://cdn.discordapp.com' : 'https://discord.com';
    
    // パスの調整: /avoidcord があれば削除
    let targetPath = url.pathname.replace(/^\/avoidcord/, '');
    
    // ターゲットURL完成
    const targetUrl = targetDomain + targetPath + url.search;

    // 2. CORSプリフライト(OPTIONS)リクエストへの対応
    // ブラウザはPOSTの前に必ずこれを送ってくる。ここで許可を返さないと送信すら始まらない。
    if (request.method === "OPTIONS") {
      return new Response(null, {
        headers: {
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, PATCH, OPTIONS",
          "Access-Control-Allow-Headers": request.headers.get("Access-Control-Request-Headers") || "Authorization, Content-Type, X-Super-Properties, X-Discord-Locale, User-Agent, If-None-Match",
          "Access-Control-Max-Age": "86400",
        },
      });
    }

    // 3. リクエストヘッダーの偽装
    const newHeaders = new Headers(request.headers);
    newHeaders.set("Host", isCdn ? "cdn.discordapp.com" : "discord.com");
    newHeaders.set("Origin", "https://discord.com");
    newHeaders.set("Referer", "https://discord.com/channels/@me");
    
    // Cloudflare固有のヘッダーなどが邪魔しないように一部削除（念のため）
    newHeaders.delete("cf-connecting-ip");
    newHeaders.delete("x-forwarded-for");
    newHeaders.delete("cf-ray");
    newHeaders.delete("cf-visitor");

    // 4. Discordへ転送 (ストリーミング)
    // request.body をそのまま渡すことで、FormDataの境界線などが壊れるのを防ぐ
    try {
      const response = await fetch(targetUrl, {
        method: request.method,
        headers: newHeaders,
        body: request.body, // ここが重要：解析せずにそのまま流す
        redirect: "follow",
      });

      // 5. レスポンスの処理
      // Discordからのレスポンスをそのまま返すが、CORSヘッダーだけ付け直す
      const newResHeaders = new Headers(response.headers);
      newResHeaders.set("Access-Control-Allow-Origin", "*");
      newResHeaders.set("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, PATCH, OPTIONS");
      newResHeaders.set("Access-Control-Allow-Headers", "*");
      newResHeaders.set("Access-Control-Expose-Headers", "*"); // 全てのヘッダーをJSから読めるようにする

      return new Response(response.body, {
        status: response.status,
        statusText: response.statusText,
        headers: newResHeaders,
      });

    } catch (e) {
      return new Response(JSON.stringify({ error: "Worker Proxy Error", details: e.message }), {
        status: 500,
        headers: {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*",
        },
      });
    }
  },
};
