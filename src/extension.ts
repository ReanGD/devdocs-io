import * as vscode from 'vscode';


class Settings {
	getURL() {
		return vscode.workspace.getConfiguration("devdocs-io").get("URL", "https://devdocs.io/").toString();
	}

	getСolumn() {
		let column = vscode.workspace.getConfiguration("devdocs-io").get("column", "Beside").toString();
		switch(column) {
			case "Active":
				return vscode.ViewColumn.Active;
			case "Beside":
				return vscode.ViewColumn.Beside;
			case "First":
				return vscode.ViewColumn.One;
			case "Second":
				return vscode.ViewColumn.Two;
			case "Third":
				return vscode.ViewColumn.Three;
			default:
				return vscode.ViewColumn.Beside;
		}
	}
}

class Panel {
	id: number;
	removed: boolean;
	settings: Settings;
	parent: PanelStorage;
	panel: vscode.WebviewPanel;

    constructor(settings: Settings, parent: PanelStorage) {
		this.id = 1;
		this.removed = false;
		this.settings = settings;
		this.parent = parent;
		this.panel = vscode.window.createWebviewPanel(
			'devdocs.io',
			'devdocs.io',
			this.settings.getСolumn(),
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

		if (!this.removed) {
			this.panel.webview.html = html;
			this.panel.reveal(this.settings.getСolumn());
		}
	}
}

class PanelStorage {
	panels: Panel[];
	settings: Settings;

	constructor(settings: Settings) {
		this.panels = [];
		this.settings = settings;
	}

	onDestroyPanel() {
		this.panels.forEach(function(item, index, object) {
			if (item.removed) {
			  object.splice(index, 1);
			}
		});
	}

	add(url: string) {
		let panel = new Panel(this.settings, this);
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
	let settings = new Settings();
	let panels = new PanelStorage(settings);

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
