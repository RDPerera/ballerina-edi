const vscode = require('vscode');
const path = require('path');
const fs = require('fs');

/**
 * @param {vscode.ExtensionContext} context
 */
function activate(context) {
    console.log('Congratulations, your extension "ballerina-edi" is now active!');

    const disposable = vscode.commands.registerCommand('ballerina-edi.helloWorld', function () {
        vscode.window.showInformationMessage('Hello World from Ballerina EDI!');
    });

    const openEditorCommand = vscode.commands.registerCommand('ballerina-edi.openEditor', function () {
        const panel = vscode.window.createWebviewPanel(
            'ediSchemaEditor',
            'EDI Schema Editor',
            vscode.ViewColumn.One,
            {
                enableScripts: true
            }
        );

        const htmlFilePath = path.join(context.extensionPath, 'media', 'webview.html');
        panel.webview.html = getWebviewContent(htmlFilePath);

        // Handle messages from the webview
        panel.webview.onDidReceiveMessage(
            message => {
                switch (message.command) {
                    case 'alert':
                        vscode.window.showInformationMessage(message.text);
                        break;
                    case 'returnSchema':
                        // Handle the returned schema
                        console.log(message.schema);
                        vscode.window.showInformationMessage('Schema received');
                        break;
                    case 'saveSchema':
                        saveSchemaToFile(message.schema);
                        break;
                    case 'openSchema':
                        openSchemaFile(panel);
                        break;
                    case 'createNewSchema':
                        createNewSchemaFile(panel);
                        break;
                    case 'addReusableSegment':
                        addReusableSegment(panel);
                        break;
                    case 'addReferenceSegment':
                        addReferenceSegment(message.segmentRef, panel);
                        break;
                }
            },
            undefined,
            context.subscriptions
        );

        // Send the initial schema to the webview
        panel.webview.postMessage({ command: 'setSchema', schema: getInitialSchema() });
    });

    context.subscriptions.push(disposable);
    context.subscriptions.push(openEditorCommand);
}

function deactivate() {}

function getWebviewContent(htmlFilePath) {
    try {
        return fs.readFileSync(htmlFilePath, 'utf8');
    } catch (error) {
        console.error('Could not read the webview HTML file:', error);
        return '<html><body><h1>Error loading editor</h1></body></html>';
    }
}

function getInitialSchema() {
    const schemaPath = path.join(__dirname, 'defaultSchema.json');
    try {
        const schemaData = fs.readFileSync(schemaPath, 'utf8');
        return JSON.parse(schemaData);
    } catch (error) {
        console.error('Could not read the default schema:', error);
        return {
            name: "SimpleOrder",
            delimiters: { segment: "~", field: "*", component: ":", repetition: "^" },
            segments: [],
            segmentDefinitions: {}
        };
    }
}

function saveSchemaToFile(schema) {
    const options = {
        saveLabel: 'Save EDI Schema',
        filters: {
            'JSON files': ['json']
        }
    };

    vscode.window.showSaveDialog(options).then(fileUri => {
        if (fileUri) {
            fs.writeFile(fileUri.fsPath, JSON.stringify(schema, null, 4), (err) => {
                if (err) {
                    vscode.window.showErrorMessage('Error saving schema: ' + err.message);
                } else {
                    vscode.window.showInformationMessage('Schema saved successfully!');
                }
            });
        }
    });
}

function openSchemaFile(panel) {
    const options = {
        openLabel: 'Open EDI Schema',
        filters: {
            'JSON files': ['json']
        }
    };

    vscode.window.showOpenDialog(options).then(fileUri => {
        if (fileUri && fileUri[0]) {
            fs.readFile(fileUri[0].fsPath, 'utf8', (err, data) => {
                if (err) {
                    vscode.window.showErrorMessage('Error opening schema: ' + err.message);
                } else {
                    try {
                        const schema = JSON.parse(data);
                        panel.webview.postMessage({ command: 'setSchema', schema });
                    } catch (e) {
                        vscode.window.showErrorMessage('Invalid JSON format: ' + e.message);
                    }
                }
            });
        }
    });
}

function createNewSchemaFile(panel) {
    const options = {
        saveLabel: 'Create New EDI Schema',
        filters: {
            'JSON files': ['json']
        }
    };

    vscode.window.showSaveDialog(options).then(fileUri => {
        if (fileUri) {
            const newSchema = {
                name: "NewSchema",
                delimiters: { segment: "~", field: "*", component: ":", repetition: "^" },
                segments: [],
                segmentDefinitions: {}
            };
            fs.writeFile(fileUri.fsPath, JSON.stringify(newSchema, null, 4), (err) => {
                if (err) {
                    vscode.window.showErrorMessage('Error creating schema: ' + err.message);
                } else {
                    panel.webview.postMessage({ command: 'setSchema', schema: newSchema });
                    vscode.window.showInformationMessage('New schema created successfully!');
                }
            });
        }
    });
}

function addReusableSegment(panel) {
    const options = {
        prompt: 'Enter reusable segment name',
        placeHolder: 'E.g. NewReusableSegment'
    };

    vscode.window.showInputBox(options).then(value => {
        if (value) {
            schema.segmentDefinitions[value] = {
                code: value,
                tag: value,
                fields: []
            };
            panel.webview.postMessage({ command: 'setSchema', schema });
        }
    });
}

function addReferenceSegment(segmentRef, panel) {
    const options = {
        prompt: 'Enter segment reference',
        placeHolder: 'E.g. ISA_InterchangeControlHeader'
    };

    vscode.window.showInputBox(options).then(value => {
        if (value) {
            schema.segments.push({
                ref: value,
                minOccurances: 1,
                maxOccurances: 1
            });
            panel.webview.postMessage({ command: 'setSchema', schema });
        }
    });
}

module.exports = {
    activate,
    deactivate
};
