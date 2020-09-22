import * as settings from './settings';
import * as httpProxy from 'http-proxy';
import { ServerResponse, IncomingMessage } from 'http';


let proxyServer: httpProxy | undefined = undefined;

function start(target: string, proxyPort: number): void {
    if (proxyServer !== undefined) {
        proxyServer.close();
        proxyServer = undefined;
    }

    proxyServer = httpProxy.createProxyServer({ target: target }).listen(proxyPort);

    proxyServer.on('proxyRes', function (proxyRes: IncomingMessage, req: IncomingMessage, res: ServerResponse) {
        let mobileCookie = (settings.isMobileMode()) ? 'override-mobile-detect=1' : 'override-mobile-detect=0';
        res.setHeader('Set-Cookie', [mobileCookie]);
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
