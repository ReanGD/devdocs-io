import { URL } from 'url';
import * as vscode from 'vscode';


export function activate(): void {
}

export function deactivate(): void {
}

export function getDevDocsURL(): URL {
    return new URL(vscode.workspace.getConfiguration("devdocs-io").get<string>("url", "https://devdocs.io/"));
}

export function getProxyPort(): number {
    return vscode.workspace.getConfiguration("devdocs-io").get<number>("proxy_port", 12785);
}

export function getProxyBaseURL(): string {
    let port = getProxyPort();
    return `http://localhost:${port}`;
}

export function isMobileMode(): boolean {
    return vscode.workspace.getConfiguration("devdocs-io").get<boolean>("mobile_mode", true);
}

export function getСolumn(): vscode.ViewColumn {
    let column = vscode.workspace.getConfiguration("devdocs-io").get<string>("column", "Beside");
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
