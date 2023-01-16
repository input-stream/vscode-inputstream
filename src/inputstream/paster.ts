import * as crypto from 'crypto';
import * as fs from "fs-extra";
import * as os from "os";
import * as path from "path";
import * as vscode from 'vscode';
import { spawn } from "child_process";
import { CommandName } from './constants';
import { Container } from '../container';
import { Predefine } from './predefine';
import { FsRegistry } from './fsregistry';
import { uuid } from 'vscode-common';

//
// Adapted from
// https://github.com/telesoho/vscode-markdown-paste-image/blob/master/src/paster.ts
// LICENSE: MIT
//
// The original does not work with virtual FS, so forked part of the code here
// unless I can get support upstreamed.
//

type Platform = "darwin" | "win32" | "win10" | "linux" | "wsl";

enum ClipboardType {
    Unknown = -1,
    Html = 0,
    Text = 1,
    Image = 2,
}

type PasteImageContext = {
    target?: vscode.Uri;
    convertToBase64: boolean;
    removeTargetFileAfterConvert: boolean;
    imgTag?: {
        width: string;
        height: string;
    } | null;
}

export class Paster implements vscode.Disposable {
    private disposables: vscode.Disposable[] = [];

    constructor(private fsregistry: FsRegistry) {
        this.registerCommands();
    }

    protected registerCommands() {
        this.disposables.push(
            vscode.commands.registerCommand(
                CommandName.ImagePaste,
                this.handleCommandPaste, this,
            ),
        );
    }

    public async handleCommandPaste() {
        const clipboardType = await this.getClipboardContentType();

        const editor = vscode.window.activeTextEditor;
        if (!editor) {
            return;
        }
        const uri = editor.document.uri;
        if (!uri) {
            return;
        }
        const fs = this.fsregistry.getFsForURI(uri)
        if (!fs) {
            return;
        }

        switch (clipboardType) {
            // case ClipboardType.Html:
            //   const html = await this.pasteTextHtml();
            //   console.log(html);
            //   const markdown = toMarkdown(html);
            //   Paster.writeToEditor(markdown);
            //   break;
            // case ClipboardType.Text:
            //   const text = await this.pasteTextPlain();
            //   if (text) {
            //     let newContent = Paster.parse(text);
            //     Paster.writeToEditor(newContent);
            //   }
            //   break;
            case ClipboardType.Image:
                return this.handleCommandPasteImage(uri, fs);
            default:
                // // Probably missing script to support type detection
                // const textContent = clipboard.readSync();
                // // If clipboard has text, paste it
                // if (textContent) {
                //     Paster.writeToEditor(textContent);
                // } else {
                //     // No text in clipboard, attempt to paste image
                //     Paster.pasteImage();
                // }
                throw new Error(`unimplemented paste clipboard type: ${clipboardType}`);
        }
    }

    private async handleCommandPasteImage(uri: vscode.Uri, fs: vscode.FileSystem) {
        const imageUri = await makeImageUri(uri, fs, ".png", "image/png");
        return this.saveImage(imageUri, fs);
    }

    private async saveImage(imageUri: vscode.Uri, fs: vscode.FileSystem) {
        const sourceFilename = await this.saveClipboardImage(imageUri, fs);
        if (!sourceFilename) {
            return;
        }
        if (sourceFilename === "no image") {
            vscode.window.showInformationMessage(
                "There is not an image in the clipboard."
            );
            return;
        }
        const sourceUri = vscode.Uri.file(sourceFilename);

        const editor = vscode.window.activeTextEditor;
        if (!editor) {
            return;
        }

        let docUri = editor.document.uri;
        if (!docUri) {
            return;
        }
        // dirname will have leading slash from fsPath
        const dirname = path.dirname(docUri.fsPath);
        const basename = path.basename(sourceUri.fsPath);
        const resourceName = bytestreamResourceName(sourceUri, uuid.generateUuid());

        const targetAuthority = 'file.input.stream';
        const targetFilename = `${dirname}/${basename}`;
        const targetQuery = `fileContentType=image/png&resourceName=${resourceName}`;
        const targetUri = vscode.Uri.parse(`https://${targetAuthority}${targetFilename}?${targetQuery}`);

        try {
            await fs.copy(sourceUri, targetUri);
        } catch (e) {
            if (e instanceof Error) {
                vscode.window.showErrorMessage(e.message);
            }
        }

        this.renderMarkdownLink({
            target: targetUri,
            removeTargetFileAfterConvert: false,
            convertToBase64: false,
        });
    }

    public renderMarkdownLink(pasteImgContext: PasteImageContext) {
        const editor = vscode.window.activeTextEditor;
        if (!editor) {
            return;
        }

        let renderText: string | undefined;
        if (pasteImgContext.convertToBase64) {
            renderText = this.renderMdImageBase64(pasteImgContext);
        } else {
            renderText = this.renderMdFilePath(pasteImgContext);
        }
        if (!renderText) {
            return;
        }

        editor.edit((edit) => {
            let current = editor.selection;
            if (current.isEmpty) {
                edit.insert(current.start, renderText!);
            } else {
                edit.replace(current, renderText!);
            }
        });
    }

    private renderMdFilePath(pasteImgContext: PasteImageContext): string | undefined {
        const uri = pasteImgContext.target;
        if (!uri) {
            return
        }
        const href = `${uri.scheme}://${uri.authority}${uri.path}`;

        let imgTag = pasteImgContext.imgTag;
        if (imgTag) {
            return `<img src='${href}' ${getDimensionProps(
                imgTag.width,
                imgTag.height
            )}/>`;
        }

        return `![${uri.path}](${href})\n`;
    }

    private renderMdImageBase64(pasteImgContext: PasteImageContext): string | undefined {
        if (
            !pasteImgContext.target?.fsPath ||
            !fs.existsSync(pasteImgContext.target.fsPath)
        ) {
            return;
        }

        let renderText = base64EncodeFile(pasteImgContext.target.fsPath);
        let imgTag = pasteImgContext.imgTag;
        if (imgTag) {
            renderText = `<img src='data:image/png;base64,${renderText}' ${getDimensionProps(
                imgTag.width,
                imgTag.height
            )}/>`;
        } else {
            renderText = `![](data:image/png;base64,${renderText})  `;
        }

        if (pasteImgContext.removeTargetFileAfterConvert) {
            fs.removeSync(pasteImgContext.target.fsPath);
        }

        return renderText;
    }

    /**
     * Save image from clipboard and get stdout.  The stdout should indicate the
     * name of the file written or 'no image' if failed.
     */
    private async saveClipboardImage(target: vscode.Uri, fs: vscode.FileSystem): Promise<string> {
        const script = {
            win32: "win32_save_clipboard_png.ps1",
            darwin: "mac.applescript",
            linux: "linux_save_clipboard_png.sh",
            wsl: "win32_save_clipboard_png.ps1",
            win10: "win32_save_clipboard_png.ps1",
        };

        const tmp = newTemporaryFilename('clip-', '.png')
        const fsPath = await wslSafe(tmp.fsPath);

        return this.runScript(script, [fsPath]);
    }

    private async getClipboardContentType() {
        const script = {
            linux: "linux_get_clipboard_content_type.sh",
            win32: "win32_get_clipboard_content_type.ps1",
            darwin: "darwin_get_clipboard_content_type.applescript",
            wsl: "win32_get_clipboard_content_type.ps1",
            win10: "win32_get_clipboard_content_type.ps1",
        };

        try {
            let data = await this.runScript(script, []);
            if (data == "no xclip") {
                vscode.window.showInformationMessage(
                    "You need to install xclip command first."
                );
                return;
            }
            let types = data.split(/\r\n|\n|\r/);

            return this.getClipboardType(types);
        } catch (e) {
            return ClipboardType.Unknown;
        }
    }

    /**
     * Run shell script.
     * @param script
     * @param args
     * @param callback
     * @returns stdout of process
     */
    private async runScript(
        script: Record<Platform, string | null>,
        args: string[] = [],
    ) {
        let platform = getCurrentPlatform();
        const scriptName = script[platform];
        if (!scriptName) {
            throw new Error(`No script exists for ${platform}`);
        }
        const scriptPath = Container.scriptPath(scriptName);

        let shell = "";
        let command = [];

        switch (platform) {
            case "win32":
            case "win10":
            case "wsl":
                // Windows
                command = [
                    "-noprofile",
                    "-noninteractive",
                    "-nologo",
                    "-sta",
                    "-executionpolicy",
                    "bypass",
                    "-windowstyle",
                    "hidden",
                    "-file",
                    await wslSafe(scriptPath),
                ].concat(args);
                shell =
                    platform == "wsl"
                        ? "/mnt/c/Windows/System32/WindowsPowerShell/v1.0/powershell.exe"
                        : "powershell";
                break;
            case "darwin":
                // Mac
                shell = "osascript";
                command = [scriptPath].concat(args);
                break;
            case "linux":
                // Linux
                shell = "sh";
                command = [scriptPath].concat(args);
                break;
        }

        return runScript(shell, command).then((stdout) => stdout.trim());
    }

    private getClipboardType(types: string[]) {
        if (!types) {
            return ClipboardType.Unknown;
        }

        const detectedTypes = new Set();
        let platform = getCurrentPlatform();
        console.log("platform", platform);
        switch (platform) {
            case "linux":
                for (const type of types) {
                    switch (type) {
                        case "image/png":
                            detectedTypes.add(ClipboardType.Image);
                            break;
                        case "text/html":
                            detectedTypes.add(ClipboardType.Html);
                            break;
                        default:
                            detectedTypes.add(ClipboardType.Text);
                            break;
                    }
                }
                break;
            case "win32":
            case "win10":
            case "wsl":
                for (const type of types) {
                    switch (type) {
                        case "PNG":
                        case "Bitmap":
                        case "DeviceIndependentBitmap":
                            detectedTypes.add(ClipboardType.Image);
                            break;
                        case "HTML Format":
                            detectedTypes.add(ClipboardType.Html);
                            break;
                        case "Text":
                        case "UnicodeText":
                            detectedTypes.add(ClipboardType.Text);
                            break;
                    }
                }
                break;
            case "darwin":
                for (const type of types) {
                    switch (type) {
                        case "Text":
                            detectedTypes.add(ClipboardType.Text);
                            break;
                        case "HTML":
                            detectedTypes.add(ClipboardType.Html);
                        case "Image":
                            detectedTypes.add(ClipboardType.Image);
                    }
                }
                break;
        }

        // Set priority based on which to return type
        const priorityOrdering = [
            ClipboardType.Image,
            ClipboardType.Html,
            ClipboardType.Text,
        ];
        for (const type of priorityOrdering)
            if (detectedTypes.has(type)) return type;
        // No known types detected
        return ClipboardType.Unknown;
    }

    /**
     * @override
     */
    public dispose() {
        for (const disposable of this.disposables) {
            disposable.dispose();
        }
        this.disposables.length = 0;
    }

}


/**
 * Run command and get stdout.
 * 
 * @param shell
 * @param options
 */
function runScript(
    shell: string,
    options: string[],
    timeout = 10000
): Promise<string> {
    return new Promise((resolve, reject) => {
        let errorTriggered = false;
        let output = "";
        let errorMessage = "";
        let process = spawn(shell, options, { timeout });

        process.stdout.on("data", (chunk) => {
            output += `${chunk}`;
        });

        process.stderr.on("data", (chunk) => {
            errorMessage += `${chunk}`;
        });

        process.on("exit", (code, signal) => {
            if (process.killed) {
                console.log("Process took too long and was killed");
            }
            if (!errorTriggered) {
                if (code === 0) {
                    resolve(output.trim());
                } else {
                    reject(errorMessage);
                }
            }
        });

        process.on("error", (error) => {
            errorTriggered = true;
            reject(error);
        });
    });
}

function getCurrentPlatform(): Platform {
    const platform = process.platform;
    if (isWsl(platform)) {
        return "wsl";
    }
    if (platform === "win32") {
        const currentOS = os.release().split(".")[0];
        if (currentOS === "10") {
            return "win10";
        } else {
            return "win32";
        }
    } else if (platform === "darwin") {
        return "darwin";
    } else {
        return "linux";
    }
};

function isWsl(platform: string): boolean {
    return false
}

async function wslSafe(script: string): Promise<string> {
    return script;
}

/**
 * Temporary file name
 */
function newTemporaryFilename(prefix = "markdown_paste", suffix = ""): vscode.Uri {
    let tempDir = fs.mkdtempSync(path.join(os.tmpdir(), prefix));
    const now = new Date().toISOString().slice(0, 10) + suffix;
    return vscode.Uri.parse(path.join(tempDir, now));
}

/**
 * Encode local file data to base64 encoded string
 * @param file
 * @returns base64 code string
 */
function base64EncodeFile(filename: string) {
    const bitmap = fs.readFileSync(filename);
    return Buffer.from(bitmap).toString("base64");
}

function getDimensionProps(width: any, height: any): string {
    const widthProp = width === undefined ? "" : `width='${width}'`;
    const heightProp = height === undefined ? "" : `height='${height}'`;
    return [widthProp, heightProp].join(" ").trim();
}

async function makeImageUri(uri: vscode.Uri, fs: vscode.FileSystem, ext: string, contentType: string): Promise<vscode.Uri> {
    const now = new Date().toISOString().slice(0, 10);
    const dirname = path.dirname(uri.path);

    let iteration = 0;
    let target: vscode.Uri;
    while (true) {
        if (iteration > 1000) {
            throw new Error(`too many attempts while trying to create image filename`);
        }
        let basename = now;
        if (iteration > 0) {
            basename += "." + String(iteration);
        }
        basename += ext;
        const filepath = path.join(dirname, basename);
        target = vscode.Uri.parse(`${uri.scheme}://${uri.authority}/${filepath}?contentType=${contentType}`);
        try {
            await fs.stat(target);
            iteration++; // file exists, keep going
        } catch (err) {
            break; // not does not exist
        }
    }

    return target;
}

function bytestreamResourceName(source: vscode.Uri, id: string): string {
    const fileBuffer = fs.readFileSync(source.fsPath);
    const sha256 = sha256Bytes(fileBuffer);
    const size = fileBuffer.length;
    return `/uploads/${id}/blobs/${sha256}/${size}`;
}

function sha256Bytes(buf: Buffer): string {
    const hashSum = crypto.createHash('sha256');
    hashSum.update(buf);
    const hex = hashSum.digest('hex');
    return hex;
}
