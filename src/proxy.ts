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
    };

    proxyServer = httpProxy.createProxyServer(options).listen(proxyPort);
    proxyServer.on("proxyRes", function (proxyRes: IncomingMessage, req: IncomingMessage, res: ServerResponse) {
        let contentType = proxyRes.headers["content-type"];
        if (contentType === undefined) {
            return;
        }

        if (!contentType.startsWith("text/html")) {
            return;
        }

        let cookie = new Cookie(req.headers);
        let mobileModeExpectedValue = settings.isMobileMode() ? "1" : "0";
        let mobileModeActualValue = cookie.getValue("override-mobile-detect");
        if (mobileModeActualValue !== mobileModeExpectedValue) {
            res.setHeader('Set-Cookie', `override-mobile-detect=${mobileModeExpectedValue}`);
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
