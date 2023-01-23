
import { describe, it } from "@jest/globals";
import { makeImageContentType } from "./filesystem";

interface testCase {
    contentType: string
    want: string
}

describe('Filesystem', () => {
    it('should pass', () => {

    });

    describe('makeImageContentType', () => {
        const testCases: { [key: string]: testCase } = {
            "degenerate": {
                contentType: "image/png",
                want: "png"
            },
        };
        for (const name in testCases) {
            const tc = testCases[name];
            it(name, () => {
                const got = makeImageContentType(tc.contentType);
                // expect(got).to.equal(tc.want);
            });
        }
    });
});