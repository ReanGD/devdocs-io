import { URL } from 'url';
import * as zlib from 'zlib';
import * as stream from 'stream';
import * as settings from './settings';
import * as httpProxy from 'http-proxy';
import * as replaceStream from 'replacestream';
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

class Response {
    private proxyRes: IncomingMessage;
    private req: IncomingMessage;
    private res: ServerResponse;

    constructor(proxyRes: IncomingMessage, req: IncomingMessage, res: ServerResponse) {
        this.proxyRes = proxyRes;
        this.req = req;
        this.res = res;
    }

    private copyHeaders() {
        if (this.req.httpVersion === '1.0') {
            delete this.proxyRes.headers['transfer-encoding'];
            this.proxyRes.headers.connection = this.req.headers.connection || 'close';
        } else if (this.req.httpVersion !== '2.0' && !this.proxyRes.headers.connection) {
            this.proxyRes.headers.connection = this.req.headers.connection || 'keep-alive';
        }

        Object.keys(this.proxyRes.headers).forEach((key) => {
            var header = this.proxyRes.headers[key];
            if (header !== undefined) {
                this.res.setHeader(key.trim(), header);
            }
        });


        if (this.proxyRes.statusCode) {
            this.res.statusCode = this.proxyRes.statusCode;
        }

        if(this.proxyRes.statusMessage) {
            this.res.statusMessage = this.proxyRes.statusMessage;
        }
    }

    private decompessStream(contentEncoding: string | undefined): stream.Readable {
        this.res.setHeader('content-encoding', 'identity');
        switch (contentEncoding) {
            case 'br':
                return this.proxyRes.pipe(zlib.createBrotliDecompress());
            case 'gzip':
                return this.proxyRes.pipe(zlib.createGunzip());
            case 'deflate':
                return this.proxyRes.pipe(zlib.createInflate());
            default:
                return this.proxyRes;
          }
    }

    private processCommon(inStream: stream.Readable): stream.Readable {
        return inStream;
    }

    private processJs(inStream: stream.Readable): stream.Readable {
        return inStream.pipe(replaceStream('"production",', '"development",')).pipe(replaceStream('//docs.devdocs.io', '/docs'));
    }

    private processHtml(inStream: stream.Readable): stream.Readable {
        let cookie = new Cookie(this.req.headers);
        let mobileModeExpectedValue = settings.isMobileMode() ? "1" : "0";
        let mobileModeActualValue = cookie.getValue("override-mobile-detect");
        if (mobileModeActualValue !== mobileModeExpectedValue) {
            this.res.setHeader('Set-Cookie', `override-mobile-detect=${mobileModeExpectedValue}`);
        }

        let port = settings.getProxyPort();
        return inStream.pipe(replaceStream("https://devdocs.io", `http://localhost:${port}`)).pipe(replaceStream("cdn.devdocs.io", `localhost:${port}`));
    }

    process(): void {
        this.copyHeaders();
        let contentType = this.proxyRes.headers["content-type"];
        let contentEncoding = this.proxyRes.headers['content-encoding'];
        let outStream;
        if (contentType === undefined) {
            outStream = this.processCommon(this.proxyRes);
        } else if (contentType.startsWith("application/javascript")) {
            outStream = this.processJs(this.decompessStream(contentEncoding));
        } else if (contentType.startsWith("text/html")) {
            outStream = this.processHtml(this.decompessStream(contentEncoding));
        } else {
            outStream = this.processCommon(this.proxyRes);
        }

        outStream.pipe(this.res);
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
        let r = new Response(proxyRes, req, res);
        r.process();
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
