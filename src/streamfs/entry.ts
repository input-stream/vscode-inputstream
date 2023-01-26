import { FileStat } from "vscode";

export interface Entry extends FileStat {
    name: string;
}
