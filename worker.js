addEventListener(
    "fetch",event => {
        let url=new URL(event.request.url);
        url.protocol="http";     //Protocol, http or https, it is recommended to http otherwise there will be some weird problems
        url.hostname="connectvip.ml";     //In domain name, don't add http or https prefix, just direct domain name
        url.port="10010";     //Port with http service
        url.pathname="/test";     //Optional, turn the Xiaoji specific directory into the root directory, you don't need to delete or change it directly/
        let request=new Request(url,event.request);
        event. respondWith(
            fetch(request)
        )
    }
)

// Copyright @ Saksham Shekher
