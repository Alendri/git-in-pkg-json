# Functions for using git repos in package.json
VS Code extension with functions for managing git-repo imports in package.json.

Created primarily to fetch tags of format `vX.X.X` from git repos imported using the `git+[your-repo-here].git`-format. Since those repos are available through npm serverices the editor cannot fetch the latest version. This extension is meant to solve that.

This extension is useful if you are dependent on git repos in your package.json and that repo tags its releases with semver-formated versions.

## Usage
**Version suggest**  
> Placing the cursor on the line of a git-import in the package.json and initiating code suggestion (default Ctrl+Space) will suggest the latest version of the repo.

**Update Git Imports**  
Command `updateGitImports` named `Update Git Imports`.  
> Will fetch the latest version tags for all git repo imports found in *dependencies*, *devDependencies* and *peerDependencies* and update them to the latest version.

**Update Git Imports and Peer Dependencies - EXPERIMENTAL**  
Command `updateGitImportsAndPeerDependencies` names `Update Git Imports and add their Peer Dependencies`.  
>Will fetch version tags and update them, but also fetch the respective package.json manifests and add their listed *peerDependencies* to the local *dependencies* list.

>NOTE: Since multiple packages might have the same peerDependency package with different versions they might conflict, in which case *!---- CONFLICT* is prepended to the value.

## Known bugs
- The version suggest does not correctly replace the currently specified version, if any.
