'use strict';
// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode';
import fetchTags, { updateTags } from './fetch_funcs';

// this method is called when your extension is activated
// your extension is activated the very first time the command is executed
export function activate(context: vscode.ExtensionContext) {

    // Use the console to output diagnostic information (console.log) and errors (console.error)
    // This line of code will only be executed once when your extension is activated
    console.log('Congratulations, your extension "tag-fetcher" is now active!');

    const documentSelector: vscode.DocumentFilter = { language: 'json', scheme: 'file' };

    context.subscriptions.push(vscode.languages.registerCompletionItemProvider(documentSelector, new fetchTags(), ':', '\"'));

    // The command has been defined in the package.json file
    // Now provide the implementation of the command with  registerCommand
    // The commandId parameter must match the command field in package.json
    // let disposable = vscode.commands.registerCommand('extension.sayHello', () => {
    //     // The code you place here will be executed every time your command is executed

    //     // Display a message box to the user
    //     let editor = vscode.window.activeTextEditor;
    //     if (!editor) {
    //         return;
    //     }
    //     let url_regex = /https*:\/\/[\w\.\/-]+\.git/;

    //     let selection = editor.selection.start;
    //     let line = editor.document.lineAt(selection.line).text;
    //     let url_match = line.match(url_regex);
    //     let url = "";
    //     if (!url_match) {
    //         url = "https://bitbucket.org/allbin/allbin-bar.git";
    //         // return;
    //     } else {
    //         url = url_match[0];
    //     }
        
    //     fetchTags(url).then((tags) => {
    //         console.log(tags);
    //         vscode.
    //     }).catch((err) => {
    //         console.error(err);
    //     });
    //     vscode.window.showInformationMessage('Hello World!');
    // });
    // context.subscriptions.push(disposable);
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