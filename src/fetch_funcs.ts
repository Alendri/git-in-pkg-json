import { exec } from 'child_process';
import * as vscode from 'vscode';
import * as semver from 'semver';
import axios from 'axios';


let version_regex = /(\w+).*(v(\d+)\.(\d+)\.(\d+))(\s|$)/g;
let url_regex = /https*:\/\/[\w\.\/-]+\.git/;

let github_base_url = "https://raw.githubusercontent.com";
let bitbucket_base_url = "https://bitbucket.org";

interface LooseObject {
    [key: string]: any;
}

interface TagAndHash {
    tag: string;
    hash: string;
}

class VersionTag {
    public version: string;
    public hash: string;
    public git: string;
    public host: "github" | "bitbucket";
    public package_json_url: string;

    constructor (tagAndHash: TagAndHash, public base_url: string, public key: string, public group: string) {
        this.version = tagAndHash.tag;
        this.hash = tagAndHash.hash;
        this.git = "git+" + base_url + "#" + this.version;
        this.host = base_url.includes("github") ? "github" : "bitbucket";

        let split_url = base_url.split("/");
        let user = split_url[3];
        let repo = split_url[4].substring(0, split_url[4].indexOf("."));

        if (this.host === "github") {
            this.package_json_url = [github_base_url, user, repo, this.hash, "package.json"].join("/");
        } else {
            this.package_json_url = [bitbucket_base_url, user, repo, "raw", this.hash, "package.json"].join("/");
        }
    }
}

function execPromise(cmd: string): Promise<string> {
    return new Promise((resolve, reject) => {
        exec(cmd, (err: Error, stdout: string, stderr: string) => {
            if (err) {
                return reject(new Error(cmd + ": " + stderr));
            }
            return resolve(stdout);
        });
    });
}

function fetchTags(git_uri: string): Promise<TagAndHash[]> {
    return execPromise("git ls-remote --tags " + git_uri).then((fetched_string) => {
        
        let tags: TagAndHash[] = [];
        let match = version_regex.exec(fetched_string);
        while (match !== null) {
            tags.push({ hash: match[1], tag: match[2] });
            match = version_regex.exec(fetched_string);
        }
        tags.sort((a, b) => { return semver.rcompare(a.tag, b.tag); });

        return tags;
    });
}



function fetchPackageJson(tag: VersionTag): Promise<object> {
    let cfg = {
        method: "GET",
        url: tag.package_json_url
    };
    return axios(cfg).then(res => res.data);
}

function addPeerDependenciesOfGits(json_doc: LooseObject, tags: VersionTag[]): Promise<LooseObject> {
    let promises: Promise<LooseObject>[] = [];
    tags.forEach((tag) => {
        let promise = fetchPackageJson(tag).then((package_json: LooseObject) => {
            // console.log(package_json);
            if (package_json.hasOwnProperty("peerDependencies")) {
                console.log("got peers");
                console.log(package_json.peerDependencies);
                
                return package_json.peerDependencies;
            }
            return {};
        });
        promises.push(promise);
    });

    if (json_doc.hasOwnProperty("dependencies") === false) {
        json_doc.dependencies = {};
    }
    return Promise.all(promises).then((peer_deps) => {
        let all_deps: LooseObject = Object.assign({}, json_doc.dependencies);
        peer_deps.forEach((deps) => {
            console.log("deps");
            console.log(deps);
            Object.keys(deps).forEach((key) => {
                let value = deps[key];
                if (all_deps.hasOwnProperty(key)) {
                    if (all_deps[key] !== value) {
                        if (all_deps[key][0] === "!") {
                            //There has already been a conflict.
                            all_deps[key] = all_deps[key] + " ------ " + value;
                        } else {
                            //First conflict for this key, prepend conflict message.
                            all_deps[key] = "!------ CONFLICT: " + all_deps[key] + " ------ " + value;
                        }
                    }
                } else {
                    all_deps[key] = value;
                }
            });
        });
        json_doc.dependencies = all_deps;
        return json_doc;
    }).catch((err) => {
        console.error(err);
        return json_doc;
    });
}

export function updateTags(editor: vscode.TextEditor, edit: vscode.TextEditorEdit, import_peer_dependencies: boolean = false): void {
    let full_text = editor.document.getText();
    let json_doc: LooseObject = JSON.parse(full_text);
    if (typeof json_doc !== "object") {
        return;
    }
    let dependency_keys = ["dependencies", "devDependencies", "peerDependencies"];
    let tags: VersionTag[] = [];
    let promises: Promise<any>[] = [];
    dependency_keys.forEach((dep_key) => {
        if (json_doc.hasOwnProperty(dep_key)) {
            if (typeof json_doc[dep_key] === "object") {
                Object.keys(json_doc[dep_key]).forEach((key) => {
                    let value: string = json_doc[dep_key][key];
                    let url_match = value.match(url_regex);
                    if (!url_match) {
                        return;
                    }
                    let url = url_match[0];
                    let promise = fetchTags(url).then((tags_and_hashes) => {
                        let tag: VersionTag = new VersionTag(tags_and_hashes[0], url, key, dep_key);
                        tags.push(tag);
                        
                        json_doc[dep_key][key] = tag.git;
                        if (value === tag.git) {
                            console.log(value.substring(value.lastIndexOf("/")) + " -> unchanged");
                        } else {
                            console.log(value.substring(value.lastIndexOf("/")) + " -> " + tag.version);
                        }
                    });
                    promises.push(promise);
                });
            }
        } else {
            console.log(dep_key + " not found.");
        }
    });
    Promise.all(promises).then(() => {
        //All found versions have been updated.
        const full_range = new vscode.Range(
            editor.document.positionAt(0),
            editor.document.positionAt(full_text.length)
        );
        if (import_peer_dependencies === false) {
            let new_text = JSON.stringify(json_doc, null, 4);
            editor.edit((edit_builder) => {
                edit_builder.replace(full_range, new_text);
            });
        } else {
            console.log("Adding peer dependencies of gits to dependencies.");
            addPeerDependenciesOfGits(json_doc, tags).then((updated_doc) => {
                let new_text = JSON.stringify(updated_doc, null, 4);
                editor.edit((edit_builder) => {
                    edit_builder.replace(full_range, new_text);
                });
            });
        }
        
        // edit.replace(full_range, new_text);
        //TODO: Find out how to use the TextEditorEdit?!
    });
}

export default class HttpCompletionItemProvider implements vscode.CompletionItemProvider {
    public async provideCompletionItems(document: vscode.TextDocument, position: vscode.Position, token: vscode.CancellationToken): Promise<vscode.CompletionItem[]> {

        let line = document.lineAt(position.line).text;
        // let line_end = line.length;

        let url_match = line.match(url_regex);
        if (!url_match) {
            return [];
        }
        console.log(line, url_match[0]);
        console.log(position.line, position.character);
        
        let tags = await fetchTags(url_match[0]);
        tags.splice(3);
        return tags.map((tagAndHash) => {
            let item = new vscode.CompletionItem(tagAndHash.tag);
            
            item.label = tagAndHash.tag;
            item.detail = `Version ` + tagAndHash;
            // item.textEdit = new vscode.TextEdit(new vscode.Range(position.line, 0, position.line, line_end), line.replace(replace_regex, ".git#" + tag));
            //TODO: Find out why below makes the completions not show.
            // item.range = new vscode.Range(position.line, 0, position.line, line_end);
            // item.insertText = line.replace(replace_regex, ".git#" + tag);
            console.log(item);
            return item;
        });
    }
}
