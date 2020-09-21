import * as vscode from 'vscode';


class Settings {
	getURL() {
		return vscode.workspace.getConfiguration("devdocs-io").get("URL", "https://devdocs.io/").toString();
	}
}

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
			'devdocs',
			'devdocs',
			vscode.ViewColumn.Two,
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
		this.id++;
		const html = `
		<style>iframe { position: fixed; top: 0; left: 0; width: 100%; height: 100%; frameborder: 0; }</style>
		<iframe id=${this.id} src=${url} />`;

		if (!this.removed) {
			this.panel.webview.html = html;
		}
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
