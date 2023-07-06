# W-T-F

This service worker acts as a proxy that modifies incoming requests to be sent to a different server than the one specified in the original request URL.

The service worker listens to fetch events, makes changes to the request URL, and then makes a new request to the modified URL.

## How it Works

The `fetch` event listener in the service worker intercepts every network request made by your site. For each request, it changes the protocol, hostname, port, and path of the URL, and then makes a new request to the modified URL.

In this specific example, it changes the protocol to 'http', the hostname to 'connectvip.ml', the port to '10010', and the path to '/test'. The modified request is then sent to the server at http://uncoder.eu.org:80/test.

If the fetch request fails (for example, due to network issues), it responds with an HTTP 500 response and a body containing the error message.

## Note

Keep in mind that this is a basic example and does not include caching or other advanced service worker features. Depending on your needs, you may need to adjust the code or add additional functionality.
