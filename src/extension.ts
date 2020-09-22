import * as vscode from 'vscode';
import * as proxy from './proxy';
import * as settings from './settings';


class Panel {
	private id: number;
	private removed: boolean;
	private parent: PanelStorage;
	private panel: vscode.WebviewPanel;

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

	isRemoved(): boolean {
		return this.removed;
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
			<meta http-equiv="Content-Security-Policy" content="default-src * 'unsafe-inline' 'unsafe-eval' data: blob:;">
			<meta name="viewport" content="width=device-width, initial-scale=1.0">
			<title>devdocs.io</title>
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
	private panels: Panel[];

	constructor() {
		this.panels = [];
	}

	onDestroyPanel() {
		this.panels.forEach(function(item, index, object) {
			if (item.isRemoved()) {
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

export function activate(context: vscode.ExtensionContext) {
	settings.activate();
	proxy.activate();
	let panels = new PanelStorage();

	let searchCmd = vscode.commands.registerCommand('devdocs-io.search', () => {
		panels.last(settings.getProxyBaseURL());
	});

	let searchNewTabCmd = vscode.commands.registerCommand('devdocs-io.searchNewTab', () => {
		panels.add(settings.getProxyBaseURL());
	});

	context.subscriptions.push(searchCmd, searchNewTabCmd);
}

export function deactivate() {
	proxy.deactivate();
	settings.deactivate();
}

function showMessage(text: string) {
	vscode.window.showInformationMessage(text);
}
