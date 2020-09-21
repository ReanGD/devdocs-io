import * as vscode from 'vscode';


class Panel {
	id: number;
	panel: vscode.WebviewPanel;

    constructor() {
		this.id = 1;
		this.panel = vscode.window.createWebviewPanel(
			'devdocs',
			'devdocs',
			vscode.ViewColumn.Two,
			{
				enableScripts: true,
				retainContextWhenHidden: true
			}
		);
	}

	goto(url: string) {
		this.id++;
		const html = `
		<style>iframe { position: fixed; top: 0; left: 0; width: 100%; height: 100%; frameborder: 0; }</style>
		<iframe id=${this.id} src=${url} />`;

		this.panel.webview.html = html;
	}
}

class PanelStorage {
	panels: Panel[];

	constructor() {
		this.panels = [];
	}

	add(url: string) {
		let panel = new Panel();
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

class Settings {
	getURL() {
		return vscode.workspace.getConfiguration("devdocs-io").get("URL", "https://devdocs.io/").toString();
	}
}

export function activate(context: vscode.ExtensionContext) {
	let panels = new PanelStorage();
	let settings = new Settings();

	let searchCmd = vscode.commands.registerCommand('devdocs-io.search', () => {
		panels.last(settings.getURL());
	});

	let searchNewTabCmd = vscode.commands.registerCommand('devdocs-io.searchNewTab', () => {
		panels.add(settings.getURL());
	});

	context.subscriptions.push(searchCmd, searchNewTabCmd);
}

export function deactivate() {}

function showMessage(test: string) {
	vscode.window.showInformationMessage(test);
}
