const SPOTIFY_CLIENT_ID = ""; // use ur own client id
const SPOTIFY_CLIENT_SECRET = ""; // use ur own client secret
const REDIRECT_URI = chrome.identity.getRedirectURL();
const SCOPES = "user-top-read";

export async function getOrRefreshValidToken() {
  return new Promise((resolve) => {
    chrome.storage.local.get([
      'spotify_access_token', 
      'spotify_refresh_token', 
      'spotify_token_expires_at'
    ], async function(result) {
      
      if (!result.spotify_access_token) {
        const newLiveToken = await launchOAuthFlow();
        resolve(newLiveToken);
        return;
      }

      if (Date.now() > (result.spotify_token_expires_at - 60000)) {
        console.log("Access token expired. Initiating background refresh flow...");
        
        if (result.spotify_refresh_token) {
          const newToken = await refreshAccessToken(result.spotify_refresh_token);
          resolve(newToken);
        } else {
          resolve(null);
        }
      } else {
        // Token is still green and active!
        resolve(result.spotify_access_token);
      }
    });
  });
}

async function launchOAuthFlow() {
  console.log(`Redirect URI: ${REDIRECT_URI}`)
  
  const authUrl = `https://accounts.spotify.com/authorize` +
    `?client_id=${SPOTIFY_CLIENT_ID}` +
    `&response_type=code` +
    `&redirect_uri=${encodeURIComponent(REDIRECT_URI)}` +
    `&scope=${encodeURIComponent(SCOPES)}` +
    `&show_dialog=true`;


  chrome.identity.launchWebAuthFlow({
    url: authUrl,
    interactive: true
  }, function (redirectUrl) {
    
    if (chrome.runtime.lastError || !redirectUrl) {
      console.error("Authorization failed or was canceled:", chrome.runtime.lastError?.message);
      return;
    }

    const urlObj = new URL(redirectUrl);
    const authCode = urlObj.searchParams.get('code');

    if (authCode) {
      console.log(`Auth code: ${authCode}`);
      
      exchangeCodeForTokens(authCode, REDIRECT_URI);
    } else {
      console.error("Authorization code missing from redirect URL.");
    }
  });
}

async function exchangeCodeForTokens(authCode, redirectUri) {
  const tokenUrl = 'https://accounts.spotify.com/api/token';
  
  const basicAuth = btoa(`${SPOTIFY_CLIENT_ID}:${SPOTIFY_CLIENT_SECRET}`);

  const bodyParams = new URLSearchParams({
    grant_type: 'authorization_code',
    code: authCode,
    redirect_uri: redirectUri
  });

  try {
    const response = await fetch(tokenUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${basicAuth}`,
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: bodyParams.toString()
    });

    if (!response.ok) {
      const err = await response.json();
      throw new Error(`Token Exchange Failed: ${JSON.stringify(err)}`);
    }

    const data = await response.json();
    
    // Save both tokens and calculate exact expiry timestamp
    const expirationTime = Date.now() + (data.expires_in * 1000);

    chrome.storage.local.set({
      spotify_access_token: data.access_token,
      spotify_refresh_token: data.refresh_token,
      spotify_token_expires_at: expirationTime
    }, () => {
      console.log("Step 2 Complete: Both tokens securely saved to local storage.");
    });

  } catch (error) {
    console.error("Error during token exchange:", error);
  }
}

async function refreshAccessToken(refreshToken) {
  const tokenUrl = 'https://accounts.spotify.com/api/token';
  const basicAuth = btoa(`${CLIENT_ID}:${CLIENT_SECRET}`);

  const bodyParams = new URLSearchParams({
    grant_type: 'refresh_token',
    refresh_token: refreshToken
  });

  try {
    const response = await fetch(tokenUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${basicAuth}`,
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: bodyParams.toString()
    });

    if (!response.ok) {
      throw new Error("Failed to refresh token");
    }

    const data = await response.json();
    const expirationTime = Date.now() + (data.expires_in * 1000);

    const updatedStorage = {
      spotify_access_token: data.access_token,
      spotify_token_expires_at: expirationTime
    };
    if (data.refresh_token) {
      updatedStorage.spotify_refresh_token = data.refresh_token;
    }

    await chrome.storage.local.set(updatedStorage);
    console.log("Step 4 Complete: Access token refreshed successfully.");
    return data.access_token;

  } catch (error) {
    console.error("Error refreshing access token:", error);
    return null;
  }
}

export async function logout() {
  await chrome.storage.session.remove(["spotify_access_token", "spotify_refresh_token", "spotify_token_expires_at"]);
}
