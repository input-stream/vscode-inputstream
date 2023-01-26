import { Entry } from "./entry";

export interface FileEntry extends Entry {
    getData(): Promise<Uint8Array>;
    setData(data: Uint8Array): Promise<void>;
}
