import { URL } from 'url';
import * as settings from './settings';
import * as httpProxy from 'http-proxy';
import { ServerResponse, IncomingMessage, IncomingHttpHeaders } from 'http';


let proxyServer: httpProxy | undefined = undefined;


class CookieValue {
    value: string;
    origin: string;

    constructor(value: string, origin: string) {
        this.value = value;
        this.origin = origin;
    }
}

class Cookie {
    storage: { [index:string] : CookieValue } = {};

    constructor(headers: IncomingHttpHeaders) {
        let cookieHeader = headers.cookie;
        if (cookieHeader === undefined) {
            return;
        }

        let parts: string[] = cookieHeader.split(";").filter((str: string) => { return typeof str === "string" && !!str.trim(); });
        parts.forEach((part) => {
            let sides = part.split("=");
            if (sides.length === 2) {
                this.storage[sides[0].trim()] = new CookieValue(sides[1].trim(), part.trim());
            } else {
                this.storage[part] = new CookieValue(part, part);
            }
        });
    }

    getValue(name: string): string | undefined {
        if (name in this.storage) {
            return this.storage[name].value;
        }

        return undefined;
    }

    toString(): string {
        return Object.values(this.storage)
            .map((property) => `${property.origin}`)
            .join("; ");
    }
}

function copyHeaders(proxyRes: IncomingMessage, req: IncomingMessage, res: ServerResponse) {
    if (req.httpVersion === '1.0') {
        delete proxyRes.headers['transfer-encoding'];
    }

    if (req.httpVersion === '1.0') {
        proxyRes.headers.connection = req.headers.connection || 'close';
    } else if (req.httpVersion !== '2.0' && !proxyRes.headers.connection) {
        proxyRes.headers.connection = req.headers.connection || 'keep-alive';
    }

    Object.keys(proxyRes.headers).forEach(function(key) {
        var header = proxyRes.headers[key];
        if (header !== undefined) {
            res.setHeader(key.trim(), header);
        }
    });


    if (proxyRes.statusCode) {
        res.statusCode = proxyRes.statusCode;
    }

    if(proxyRes.statusMessage) {
        res.statusMessage = proxyRes.statusMessage;
    }
}

function start(address: URL, proxyPort: number): void {
    if (proxyServer !== undefined) {
        proxyServer.close();
        proxyServer = undefined;
    }

    let isSecure = (address.protocol === "https:");
    let options: httpProxy.ServerOptions = {
        secure: isSecure ? false : undefined,
        target: address.toString(),
        changeOrigin: isSecure ? true : undefined,
        selfHandleResponse: true,
    };

    proxyServer = httpProxy.createProxyServer(options).listen(proxyPort);
    proxyServer.on("proxyRes", function (proxyRes: IncomingMessage, req: IncomingMessage, res: ServerResponse) {
        let contentType = proxyRes.headers["content-type"];
        if (contentType === undefined) {
            copyHeaders(proxyRes, req, res);
            proxyRes.pipe(res);
            return;
        }

        if (contentType.startsWith("text/html")) {
            copyHeaders(proxyRes, req, res);
            let cookie = new Cookie(req.headers);
            let mobileModeExpectedValue = settings.isMobileMode() ? "1" : "0";
            let mobileModeActualValue = cookie.getValue("override-mobile-detect");
            if (mobileModeActualValue !== mobileModeExpectedValue) {
                res.setHeader('Set-Cookie', `override-mobile-detect=${mobileModeExpectedValue}`);
            }
            proxyRes.pipe(res);
        }
    });
}

export function activate(): void {
    if (proxyServer !== undefined) {
        console.error("Double activation of the http proxy");
        return;
    }

    start(settings.getDevDocsURL(), settings.getProxyPort());
}

export function deactivate(): void {
    if (proxyServer === undefined) {
        console.error("Double deactivation of the http proxy");
        return;
    }

    proxyServer.close();
    proxyServer = undefined;
}
