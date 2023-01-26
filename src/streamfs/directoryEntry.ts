import { Entry } from "./entry";

export interface DirectoryEntry<T extends Entry> extends Entry {
    getChild(name: string): Promise<T | undefined>;
    getChildren(): Promise<T[]>;
    createFile(name: string, content: Uint8Array): Promise<T>;
    createDirectory(name: string): Promise<T>;
    rename(src: string, dst: string): Promise<T>;
    deleteChild(name: string): Promise<void>;
}
