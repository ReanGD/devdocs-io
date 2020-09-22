import * as vscode from 'vscode';

export function activate(): void {
}

export function deactivate(): void {
}

export function getURL(): string {
    return vscode.workspace.getConfiguration("devdocs-io").get("URL", "https://devdocs.io/").toString();
}

export function getСolumn(): vscode.ViewColumn {
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
