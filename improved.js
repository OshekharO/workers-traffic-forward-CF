/**
 * Enhanced Cloudflare Worker Proxy with Multiple Features
 */

// Configuration - easily customizable
const CONFIG = {
  target: {
    protocol: 'https',      // 'http' or 'https'
    hostname: 'uncoder.eu.org',
    port: '',               // Leave empty for default ports
    basePath: '/test'       // Base path for all requests
  },
  security: {
    enableCORS: true,
    allowedMethods: ['GET', 'POST', 'PUT', 'DELETE', 'HEAD', 'OPTIONS'],
    timeout: 10000,         // 10 seconds
    maxBodySize: 10485760   // 10MB
  },
  caching: {
    enable: true,
    ttl: 3600               // 1 hour cache
  }
};

addEventListener('fetch', (event) => {
  event.respondWith(handleRequest(event.request));
});

async function handleRequest(request) {
  // Handle CORS preflight
  if (request.method === 'OPTIONS') {
    return handleCORSPreflight();
  }

  // Validate request method
  if (!CONFIG.security.allowedMethods.includes(request.method)) {
    return new Response('Method Not Allowed', { status: 405 });
  }

  // Validate request body size
  const contentLength = request.headers.get('content-length');
  if (contentLength && parseInt(contentLength) > CONFIG.security.maxBodySize) {
    return new Response('Payload Too Large', { status: 413 });
  }

  try {
    const targetUrl = buildTargetUrl(request.url);
    const proxyResponse = await fetchTarget(request, targetUrl);
    
    return createProxyResponse(proxyResponse);
    
  } catch (error) {
    return handleError(error);
  }
}

/**
 * Build the target URL from incoming request
 */
function buildTargetUrl(incomingUrl) {
  const url = new URL(incomingUrl);
  const { target } = CONFIG;
  
  const targetUrl = new URL(`${target.protocol}://${target.hostname}`);
  
  if (target.port) targetUrl.port = target.port;
  
  // Handle path construction
  let path = url.pathname;
  if (target.basePath && target.basePath !== '/') {
    path = `${target.basePath}${path === '/' ? '' : path}`;
  }
  targetUrl.pathname = path;
  targetUrl.search = url.search;
  
  return targetUrl;
}

/**
 * Fetch from target with enhanced options
 */
async function fetchTarget(originalRequest, targetUrl) {
  const headers = new Headers(originalRequest.headers);
  
  // Update headers for proxy
  headers.set('Host', CONFIG.target.hostname);
  headers.set('X-Forwarded-For', originalRequest.headers.get('cf-connecting-ip') || 'unknown');
  headers.set('X-Forwarded-Host', new URL(originalRequest.url).hostname);
  headers.set('X-Forwarded-Proto', new URL(originalRequest.url).protocol.replace(':', ''));
  
  // Remove Cloudflare specific headers
  ['cf-connecting-ip', 'cf-ray', 'cf-ipcountry', 'cf-visitor'].forEach(header => {
    headers.delete(header);
  });

  const fetchOptions = {
    method: originalRequest.method,
    headers: headers,
    redirect: 'manual'
  };

  // Add Cloudflare cache settings if enabled
  if (CONFIG.caching.enable && originalRequest.method === 'GET') {
    fetchOptions.cf = {
      cacheTtl: CONFIG.caching.ttl,
      cacheEverything: true
    };
  }

  // Include body for applicable methods
  if (!['GET', 'HEAD'].includes(originalRequest.method)) {
    fetchOptions.body = originalRequest.body;
  }

  return fetchWithTimeout(targetUrl.toString(), fetchOptions, CONFIG.security.timeout);
}

/**
 * Create the final response with proper headers
 */
function createProxyResponse(targetResponse) {
  const headers = new Headers(targetResponse.headers);
  
  // Add CORS headers if enabled
  if (CONFIG.security.enableCORS) {
    headers.set('Access-Control-Allow-Origin', '*');
    headers.set('Access-Control-Expose-Headers', '*');
  }
  
  // Security headers
  headers.set('X-Content-Type-Options', 'nosniff');
  headers.set('X-Frame-Options', 'SAMEORIGIN');
  headers.set('X-XSS-Protection', '1; mode=block');
  
  // Remove problematic headers
  ['content-security-policy', 'strict-transport-security'].forEach(header => {
    headers.delete(header);
  });

  return new Response(targetResponse.body, {
    status: targetResponse.status,
    statusText: targetResponse.statusText,
    headers: headers
  });
}

/**
 * Utility function for fetch with timeout
 */
async function fetchWithTimeout(url, options, timeout) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);
  
  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal
    });
    clearTimeout(timeoutId);
    return response;
  } catch (error) {
    clearTimeout(timeoutId);
    throw error;
  }
}

/**
 * Handle CORS preflight requests
 */
function handleCORSPreflight() {
  return new Response(null, {
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': CONFIG.security.allowedMethods.join(', '),
      'Access-Control-Allow-Headers': '*',
      'Access-Control-Max-Age': '86400',
      'Access-Control-Allow-Credentials': 'true'
    }
  });
}

/**
 * Handle errors gracefully
 */
function handleError(error) {
  console.error('Proxy Error:', error);
  
  const errorConfig = {
    'AbortError': { status: 504, message: 'Gateway Timeout' },
    'TypeError': { status: 502, message: 'Bad Gateway' }
  };
  
  const errorInfo = errorConfig[error.name] || { status: 500, message: 'Internal Server Error' };
  
  return new Response(errorInfo.message, {
    status: errorInfo.status,
    headers: { 
      'Content-Type': 'text/plain',
      'Access-Control-Allow-Origin': '*'
    }
  });
}
