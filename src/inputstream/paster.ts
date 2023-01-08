import * as vscode from 'vscode';
import * as os from "os";
import * as path from "path";
import * as fs from "fs-extra";
import { spawn } from "child_process";
import { CommandName } from './constants';
import { Container } from '../container';
import { Predefine } from './predefine';
import { FsRegistry } from './fsregistry';

// import * as clipboard from "clipboardy";

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
    targetFile?: vscode.Uri;
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
        const target = makeImageUri(uri, fs, ".png");
        return this.saveImage(uri, fs);
    }

    private async saveImage(target: vscode.Uri, fs: vscode.FileSystem) {

        const filename = await this.saveClipboardImage(target, fs);
        if (!filename) {
            return;
        }
        if (filename === "no image") {
            vscode.window.showInformationMessage(
                "There is not an image in the clipboard."
            );
            return;
        }

        const source = vscode.Uri.file(filename);
        await fs.copy(source, target);

        this.renderMarkdownLink({
            targetFile: target,
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

        if (renderText) {
            editor.edit((edit) => {
                let current = editor.selection;
                if (current.isEmpty) {
                    edit.insert(current.start, renderText!);
                } else {
                    edit.replace(current, renderText!);
                }
            });
        }
    }


    private renderMdFilePath(pasteImgContext: PasteImageContext): string | undefined {
        let editor = vscode.window.activeTextEditor;
        if (!editor) {
            return;
        }

        let fileUri = editor.document.uri;
        if (!fileUri) {
            return;
        }

        const basePath = path.dirname(fileUri.fsPath);
        const fsPath = pasteImgContext.targetFile?.fsPath;
        if (!fsPath) {
            return;
        }

        // relative will be add backslash characters so need to replace '\' to '/' here.
        let imageFilePath = this.encodePath(
            path.relative(basePath, fsPath)
        );

        // parse imageFilePath by rule again for appling lang_rule to image path
        let parseResult = this.parseRules(imageFilePath);
        if (typeof parseResult === "string") {
            return parseResult;
        }

        // "../../static/images/vscode-paste/cover.png".replace(new RegExp("(.*/static/)(.*)", ""), "/$2")
        let imgTag = pasteImgContext.imgTag;
        if (imgTag) {
            return `<img src='${imageFilePath}' ${getDimensionProps(
                imgTag.width,
                imgTag.height
            )}/>`;
        }
        return `![](${imageFilePath})  `;
    }

    private renderMdImageBase64(pasteImgContext: PasteImageContext): string | undefined {
        if (
            !pasteImgContext.targetFile?.fsPath ||
            !fs.existsSync(pasteImgContext.targetFile.fsPath)
        ) {
            return;
        }

        let renderText = base64EncodeFile(pasteImgContext.targetFile.fsPath);
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
            fs.removeSync(pasteImgContext.targetFile.fsPath);
        }

        return renderText;
    }

    /**
     * Encode path string.
     * encodeURI        : encode all characters to URL encode format
     * encodeSpaceOnly  : encode all space character to %20
     * none             : do nothing
     * @param filePath
     * @returns
     */
    encodePath(filePath: string): string {
        filePath = filePath.replace(/\\/g, "/");

        const encodePathConfig = this.getConfig().encodePath;

        if (encodePathConfig == "encodeURI") {
            filePath = encodeURI(filePath);
        } else if (encodePathConfig == "encodeSpaceOnly") {
            filePath = filePath.replace(/ /g, "%20");
        }
        return filePath;
    }

    getLanguageRules(languageId: string): any[] {
        const langRules = this.getConfig().lang_rules;

        if (languageId === "markdown") {
            return this.getConfig().rules;
        }

        // find lang rules
        for (const lang_rule of langRules) {
            if (lang_rule.hasOwnProperty(languageId)) {
                return lang_rule[languageId];
            }
        }

        // if not found then return empty
        return [];
    }

    /**
     * Parse content by rules
     * @param content content will be parse
     * @returns
     *  string: if content match rule, will return replaced string
     *  null: dismatch any rule
     */
    private parseRules(content: string): string | undefined {
        let editor = vscode.window.activeTextEditor;
        if (!editor) {
            return;
        }
        let languageId = editor.document.languageId;
        let rules = this.getLanguageRules(languageId);
        for (const rule of rules) {
            const re = new RegExp(rule.regex, rule.options);
            const reps = rule.replace;
            if (re.test(content)) {
                const newstr = content.replace(re, reps);
                return newstr;
            }
        }
        return;
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

    /**
     * Generate different Markdown content based on the value entered.
     * for example:
     * ./assets/test.png        => ![](./assets/test.png)
     * ./assets/test.png?200,10 => <img src="./assets/test.png" width="200" height="10"/>
     * ./assets/                => ![](![](data:image/png;base64,...)
     * ./assets/?200,10         => <img src="data:image/png;base64,..." width="200" height="10"/>
     *
     * @param inputVal
     * @returns
     */
    protected parsePasteImageContext(inputVal: string): PasteImageContext | undefined {
        if (!inputVal) {
            return;
        }

        inputVal = this.replacePredefinedVars(inputVal);

        // leading and trailing white space are invalid
        if (inputVal && inputVal.length !== inputVal.trim().length) {
            vscode.window.showErrorMessage(
                'The specified path is invalid: "' + inputVal + '"'
            );
            return;
        }

        // ! Maybe it is a bug in vscode.Uri.parse():
        // > vscode.Uri.parse("f:/test/images").fsPath
        // '/test/images'
        // > vscode.Uri.parse("file:///f:/test/images").fsPath
        // 'f:/test/image'
        //
        // So we have to add file:/// scheme. while input value contain a driver character
        if (inputVal.substring(1, 2) === ":") {
            inputVal = "file:///" + inputVal;
        }

        let pasteImgContext: PasteImageContext;

        let inputUri = vscode.Uri.parse(inputVal);

        const last_char = inputUri.fsPath.slice(inputUri.fsPath.length - 1);
        if (["/", "\\"].includes(last_char)) {
            pasteImgContext = {
                targetFile: newTemporaryFilename(),
                convertToBase64: true,
                removeTargetFileAfterConvert: true,
            };
            // While filename is empty(ex: /abc/?200,20),  paste clipboard to a temporay file, then convert it to base64 image to markdown.
        } else {
            pasteImgContext = {
                targetFile: inputUri,
                convertToBase64: false,
                removeTargetFileAfterConvert: false,
            };
        }

        let enableImgTagConfig = this.getConfig().enableImgTag;
        if (enableImgTagConfig && inputUri.query) {
            // parse `<filepath>[?width,height]`. for example. /abc/abc.png?200,100
            let ar = inputUri.query.split(",");
            if (ar) {
                pasteImgContext.imgTag = {
                    width: ar[0],
                    height: ar[1],
                };
            }
        }

        return pasteImgContext;
    }

    /**
       * Generate a path for target image.
       * @param extension extension of target image file.
       * @returns
       */
    private genTargetImagePath(extension: string = ".png"): string | undefined {
        // get current edit file path
        let editor = vscode.window.activeTextEditor;
        if (!editor) {
            return;
        }

        let fileUri = editor.document.uri;
        if (!fileUri) {
            return;
        }

        let filePath: string;
        switch (fileUri.scheme) {
            case "untitled": {
                vscode.window.showInformationMessage(
                    "Before pasting an image, you need to save the current edited file first."
                );
                return;
            }
            case "page": {
                filePath = path.basename(fileUri.fsPath);
            }
            default: {
                filePath = fileUri.fsPath;
            }
        }

        // get selection as image file name, need check
        const selection = editor.selection;
        const selectText = editor.document.getText(selection);

        if (selectText && !/^[^\\/:\*\?""<>|]{1,120}$/.test(selectText)) {
            vscode.window.showInformationMessage(
                "Your selection is not a valid file name!"
            );
            return;
        }

        // get image destination path
        let folderPathFromConfig = this.getConfig().path;

        folderPathFromConfig = this.replacePredefinedVars(folderPathFromConfig);

        if (
            folderPathFromConfig &&
            folderPathFromConfig.length !== folderPathFromConfig.trim().length
        ) {
            vscode.window.showErrorMessage(
                'The specified path is invalid: "' + folderPathFromConfig + '"'
            );
            return;
        }

        // image file name
        let imageFileName = "";
        let namePrefix = this.getConfig().namePrefix;
        let nameBase = this.getConfig().nameBase;
        let nameSuffix = this.getConfig().nameSuffix;
        if (!selectText) {
            imageFileName = namePrefix + nameBase + nameSuffix + extension;
            imageFileName = this.replacePredefinedVars(imageFileName);
        } else {
            imageFileName = selectText + extension;
        }

        // image output path
        let folderPath = path.dirname(filePath);
        let imagePath = "";

        // generate image path
        if (path.isAbsolute(folderPathFromConfig)) {
            // important: replace must be done at the end, path.join() will build a path with backward slashes (\)
            imagePath = path
                .join(folderPathFromConfig, imageFileName)
                .replace(/\\/g, "/");
        } else {
            // important: replace must be done at the end, path.join() will build a path with backward slashes (\)
            imagePath = path
                .join(folderPath, folderPathFromConfig, imageFileName)
                .replace(/\\/g, "/");
        }

        return imagePath;
    }


    /**
     * Replace all predefined variable.
     * @param str path
     * @returns
     */
    private replacePredefinedVars(str: string) {
        let predefine = new Predefine();
        return this.replaceRegPredefinedVars(str, predefine);
    }


    /**
     * Replace all predefined variable with Regexp.
     * @param str path
     * @returns
     */
    private replaceRegPredefinedVars(str: string, predefine: Predefine) {
        const regex = /(?<var>\$\{\s*(?<name>\w+)\s*(\|(?<param>.*?))?\})/gm;

        // let ret: string = str;
        // let m: RegExpExecArray | null;

        // while ((m = regex.exec(str)) !== null) {
        //     // This is necessary to avoid infinite loops with zero-width matches
        //     if (m.index === regex.lastIndex) {
        //         regex.lastIndex++;
        //     }
        //     if (!m.groups) {
        //         continue;
        //     }
        //     if (m.groups.name in predefine) {
        //         const replace = predefine[m.groups.name];
        //         ret = ret.replace(
        //             m.groups.var,
        //             predefine[m.groups.name](m.groups.param)
        //         );
        //     }
        // }

        // User may be input a path with backward slashes (\), so need to replace all '\' to '/'.
        return str.replace(/\\/g, "/");
    }

    protected getConfig(): vscode.WorkspaceConfiguration {
        let editor = vscode.window.activeTextEditor;
        if (!editor) {
            return vscode.workspace.getConfiguration("MarkdownPaste");
        }
        let fileUri = editor.document.uri;
        if (!fileUri) {
            return vscode.workspace.getConfiguration("MarkdownPaste");
        }
        return vscode.workspace.getConfiguration("MarkdownPaste", fileUri);
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
            console.log("getClipboardContentType", data);
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
            console.log(chunk);
            output += `${chunk}`;
        });

        process.stderr.on("data", (chunk) => {
            console.log(chunk);
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
 * prepare directory for specified file.
 * @param filePath
 */
async function prepareDirForFile(filePath: string): Promise<boolean> {
    let dirname = path.dirname(filePath);
    try {
        await fs.ensureDir(dirname);
        return true;
    } catch (error) {
        console.log(`failed while creating dir ${dirname}`, error);
        return false;
    }
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

async function makeImageUri(uri: vscode.Uri, fs: vscode.FileSystem, ext: string): Promise<vscode.Uri> {
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
        target = vscode.Uri.parse(`${uri.scheme}://${uri.authority}/${filepath}`);
        try {
            await fs.stat(target);
            iteration++; // file exists, keep going
        } catch (err) {
            break; // not does not exist
        }
    }

    return target;
}