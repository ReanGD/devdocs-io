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
		panel.webview.html = getWebviewContent("http://localhost:9292/cpp/memory/shared_ptr");
	});

	context.subscriptions.push(searchCmd);
}

export function deactivate() {}

function getWebviewContent(url: string) {
	const html = `
	<style>iframe { position: fixed; top: 0; left: 0; width: 100%; height: 100%; frameborder: 0; }</style>
	<iframe src=${url} />`;

	return html;
}
