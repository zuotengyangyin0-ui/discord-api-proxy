export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    // パスから不要な接頭辞を消してDiscord APIのURLを構築
    const targetUrl = 'https://discord.com' + url.pathname.replace('/avoidcord', '') + url.search;

    // プリフライト（OPTIONS）リクエストへの回答
    if (request.method === "OPTIONS") {
      return new Response(null, {
        headers: {
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, PATCH, OPTIONS",
          "Access-Control-Allow-Headers": "*",
          "Access-Control-Max-Age": "86400",
        },
      });
    }

    const newRequestHeaders = new Headers(request.headers);
    newRequestHeaders.set('Origin', 'https://discord.com');
    newRequestHeaders.set('Referer', 'https://discord.com/channels/@me');
    // 公式クライアントに近いUser-Agentを強制
    newRequestHeaders.set('User-Agent', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');

    try {
      let body = request.body;
      const contentType = request.headers.get("content-type") || "";

      // 送信データがJSONの場合、中身をログに出すか再構築して50006を防ぐ
      if (request.method === "POST" && contentType.includes("application/json")) {
        const rawJson = await request.json();
        // nonceがなければ付与し、確実に文字列として送る
        if (!rawJson.nonce) rawJson.nonce = Date.now().toString();
        body = JSON.stringify(rawJson);
      }

      const response = await fetch(targetUrl, {
        method: request.method,
        headers: newRequestHeaders,
        body: body,
        redirect: 'follow'
      });

      // レスポンスヘッダーの構築（CORSを許可）
      const newResHeaders = new Headers(response.headers);
      newResHeaders.set("Access-Control-Allow-Origin", "*");
      newResHeaders.set("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, PATCH, OPTIONS");
      newResHeaders.set("Access-Control-Allow-Headers", "*");
      // ブラウザでのエラーを防ぐため一部を削除
      newResHeaders.delete("content-encoding");

      return new Response(response.body, {
        status: response.status,
        statusText: response.statusText,
        headers: newResHeaders,
      });

    } catch (e) {
      return new Response(JSON.stringify({ error: e.message }), { 
        status: 500,
        headers: { "Access-Control-Allow-Origin": "*" }
      });
    }
  }
};
