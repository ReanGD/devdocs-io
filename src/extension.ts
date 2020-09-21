import * as vscode from 'vscode';

export function activate(context: vscode.ExtensionContext) {
	let searchCmd = vscode.commands.registerCommand('devdocs-io.search', () => {
		const panel = vscode.window.createWebviewPanel(
			'devdocs',
			'devdocs',
			vscode.ViewColumn.Two,
			{
				enableScripts: true,
				retainContextWhenHidden: true
			}
		);
		const devdocsURL = vscode.workspace.getConfiguration("devdocs-io").get("URL", "https://devdocs.io/").toString();
		panel.webview.html = getWebviewContent(devdocsURL);
	});

	context.subscriptions.push(searchCmd);
}

export function deactivate() {}

function showMessage(test: string) {
	vscode.window.showInformationMessage(test);
}

function getWebviewContent(url: string) {
	const html = `
	<style>iframe { position: fixed; top: 0; left: 0; width: 100%; height: 100%; frameborder: 0; }</style>
	<iframe src=${url} />`;

	return html;
}
