
### Standard.js
This project respect the standard.js format


### Release procedure
 * run "npm test" and fix all the issues
 * Update the version in package.json
 * Add a new entry in CHANGELOG.md
 * git-commit -m 'Prepare release X.X.X'
 * git tag -a vX.X.X
 * git-push --follow-tags
 * npm publish
 * request a refresh on flows.nodered.org


###  NPM CheatSheet
 * npm test      to run all the tests
 * npm pack      to crete the package locally (use file list in package.json)
 * npm publish   to publish on npm (use .npmignore file)

