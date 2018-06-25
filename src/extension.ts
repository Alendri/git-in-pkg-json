'use strict';

import * as vscode from 'vscode';
import fetchTags, { updateTags } from './fetch_funcs';

export function activate(context: vscode.ExtensionContext) {

    const documentSelector: vscode.DocumentFilter = { language: 'json', scheme: 'file' };

    context.subscriptions.push(vscode.languages.registerCompletionItemProvider(documentSelector, new fetchTags(), ':', '\"'));

    
    let disposable = vscode.commands.registerTextEditorCommand('extension.updateGitImports', (editor, edit) => {
        updateTags(editor, edit);
    });
    context.subscriptions.push(disposable);


    disposable = vscode.commands.registerTextEditorCommand('extension.updateGitImportsAndPeerDependencies', (editor, edit) => {
        updateTags(editor, edit, true);
    });
    context.subscriptions.push(disposable);
}

// this method is called when your extension is deactivated
export function deactivate() {
}