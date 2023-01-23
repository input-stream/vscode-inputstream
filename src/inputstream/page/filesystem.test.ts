
import { describe, it } from "@jest/globals";
import { expect } from "chai";
import { getContentTypeForExtension } from "./filesystem";


describe('Filesystem', () => {
    it('should pass sanity check', () => { });

    // case '.apng':
    //     return 'image/apng';
    // case '.avif':
    //     return 'image/avif';
    // case '.gif':
    //     return 'image/gif';
    // case '.jpeg':
    //     return 'image/jpeg';
    // case '.jpg':
    //     return 'image/jpeg';
    // case '.png':
    //     return 'image/png';
    // case '.svg':
    //     return 'image/svg+xml';
    // case '.webp':
    //     return 'image/webp';

    describe('getContentTypeForExtension', () => {
        const testCases: {
            [key: string]: {
                ext: string,
                want: string,
            }
        } = {
            ".apng": { want: "image/apng", ext: ".apng" },
            ".avif": { want: "image/avif", ext: ".avif" },
            ".gif": { want: "image/gif", ext: ".gif" },
            ".jpeg": { want: "image/jpeg", ext: ".jpeg" },
            ".jpg": { want: "image/jpeg", ext: ".jpg" },
            ".png": { want: "image/png", ext: ".png" },
            ".svg": { want: "image/svg+xml", ext: ".svg" },
            ".webp": { want: "image/webp", ext: ".webp" },
        };
        for (const name in testCases) {
            const tc = testCases[name];
            it(name, () => {
                const got = getContentTypeForExtension(tc.ext);
                expect(got).to.equal(tc.want);
            });
        }
    });
});