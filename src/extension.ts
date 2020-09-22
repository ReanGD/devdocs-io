import * as vscode from 'vscode';
import * as httpProxy from 'http-proxy';
import * as settings from './settings';


class Panel {
	id: number;
	removed: boolean;
	parent: PanelStorage;
	panel: vscode.WebviewPanel;

    constructor(parent: PanelStorage) {
		this.id = 1;
		this.removed = false;
		this.parent = parent;
		this.panel = vscode.window.createWebviewPanel(
			'devdocs.io',
			'devdocs.io',
			settings.getСolumn(),
			{
				enableScripts: true,
				retainContextWhenHidden: true
			}
		);

		this.panel.onDidDispose(
			() => {
				this.removed = true;
				this.parent.onDestroyPanel();
			}, null
		);
	}

	goto(url: string) {
		if (this.removed) {
			return;
		}
		this.id++;
		const html = `
		<!DOCTYPE html>
		<html lang="en">
		<head>
			<meta charset="UTF-8">
			<meta name="viewport" content="width=device-width, initial-scale=1.0">
			<title>Devdocs</title>
			<style>iframe { position: fixed; top: 0; left: 0; width: 100%; height: 100%; frameborder: 0; }</style>
		</head>
		<body>
			<iframe id=${this.id} src=${url} />
		</body>
		</html>`;

		this.panel.webview.html = html;
		this.panel.reveal(settings.getСolumn());
	}
}

class PanelStorage {
	panels: Panel[];

	constructor() {
		this.panels = [];
	}

	onDestroyPanel() {
		this.panels.forEach(function(item, index, object) {
			if (item.removed) {
			  object.splice(index, 1);
			}
		});
	}

	add(url: string) {
		let panel = new Panel(this);
		panel.goto(url);
		this.panels.push(panel);
	}

	last(url: string) {
		let len = this.panels.length;
		if (len === 0) {
			this.add(url);
		} else {
			this.panels[len - 1].goto(url);
		}
	}
}

class Proxy {
	proxyServer: httpProxy | undefined;

	constructor() {
		this.proxyServer = undefined;
	}

	start() {
		this.stop();
		this.proxyServer = httpProxy.createProxyServer({ target: settings.getURL() }).listen(8000);
	}

	stop() {
		if (this.proxyServer !== undefined) {
			this.proxyServer.close();
			this.proxyServer = undefined;
		}
	}
}

export function activate(context: vscode.ExtensionContext) {
	settings.activate();
	let proxy = new Proxy();
	let panels = new PanelStorage();

	proxy.start();

	let searchCmd = vscode.commands.registerCommand('devdocs-io.search', () => {
		panels.last("http://localhost:8000");
	});

	let searchNewTabCmd = vscode.commands.registerCommand('devdocs-io.searchNewTab', () => {
		panels.add("http://localhost:8000");
	});

	context.subscriptions.push(searchCmd, searchNewTabCmd);
}

export function deactivate() {
	settings.deactivate();
}

function showMessage(test: string) {
	vscode.window.showInformationMessage(test);
}
