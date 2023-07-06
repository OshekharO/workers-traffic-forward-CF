addEventListener('fetch', async (event) => {
  try {
    const url = new URL(event.request.url);
    url.protocol = 'http'; // It is recommended to use 'http' protocol instead of 'https' to avoid weird problems
    url.hostname = 'uncoder.eu.org'; // In domain name, don't add http or https prefix, just the direct domain name
    url.port = '80'; // Port with http service
    url.pathname = '/test'; // Optional, turn the specific directory into the root directory, you don't need to delete or change it directly
    const request = new Request(url, event.request);
    const response = await fetch(request);
    event.respondWith(response);
  } catch (error) {
    event.respondWith(new Response(`An error occurred: ${error.message}`, { status: 500 }));
  }
});
