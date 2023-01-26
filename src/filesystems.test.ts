
import { describe, it } from "@jest/globals";
import { expect } from "chai";

import { getContentTypeForExtension, makeBytestreamDownloadResourceName, makeBytestreamUploadResourceName, makeInputContentFileNodeUri, makeInputContentName, makeInputExternalViewUrl, makeInputExternalWatchUrl, makeInputNodeUri, makeUserNodeUri, sha256Bytes } from "./filesystems";
import { Input, _build_stack_inputstream_v1beta1_Input_Status as InputStatus } from "./proto/build/stack/inputstream/v1beta1/Input";

describe('filesystems', () => {

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

    describe('makeInputExternalWatchUrl', () => {
        const testCases: {
            [key: string]: {
                input: Input,
                want: string,
            }
        } = {
            "example": {
                input: {
                    login: "user",
                    titleSlug: "my-title",
                },
                want: "/@user/my-title/view/watch",
            },
        };
        for (const name in testCases) {
            const tc = testCases[name];
            it(name, () => {
                const got = makeInputExternalWatchUrl(tc.input);
                expect(got.path).to.equal(tc.want);
            });
        }
    });

    describe('makeInputExternalViewUrl', () => {
        const testCases: {
            [key: string]: {
                input: Input,
                want: string,
            }
        } = {
            "example": {
                input: {
                    login: "user",
                    titleSlug: "my-title",
                },
                want: "/@user/my-title/view",
            },
        };
        for (const name in testCases) {
            const tc = testCases[name];
            it(name, () => {
                const got = makeInputExternalViewUrl(tc.input);
                expect(got.path).to.equal(tc.want);
            });
        }
    });

    describe('sha256Bytes', () => {
        const testCases: {
            [key: string]: {
                content: string,
                want: string,
            }
        } = {
            "empty string": {
                content: "",
                want: "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
            },
        };
        for (const name in testCases) {
            const tc = testCases[name];
            it(name, () => {
                const got = sha256Bytes(Buffer.from(tc.content));
                expect(got).to.equal(tc.want);
            });
        }
    });

    describe('makeInputContentName', () => {
        describe('positive', () => {
            const testCases: {
                [key: string]: {
                    input: Input,
                    want: string,
                }
            } = {
                "draft": {
                    input: {
                        titleSlug: "foo",
                        status: InputStatus.STATUS_DRAFT,
                    },
                    want: "foo.draft.md",
                },
                "published": {
                    input: {
                        titleSlug: "foo",
                        status: InputStatus.STATUS_PUBLISHED,
                    },
                    want: "foo.published.md",
                },
            };
            for (const name in testCases) {
                const tc = testCases[name];
                it(name, () => {
                    const got = makeInputContentName(tc.input);
                    expect(got).to.equal(tc.want);
                });
            }
        });
        describe('negative', () => {
            const testCases: {
                [key: string]: {
                    input: Input,
                    error: string,
                }
            } = {
                "degenerate": {
                    input: {
                        titleSlug: "foo",
                    },
                    error: "content status not supported: undefined",
                },
                "unknown": {
                    input: {
                        titleSlug: "foo",
                        status: InputStatus.STATUS_UNKNOWN,
                    },
                    error: "content status not supported: 0",
                },
            };
            for (const name in testCases) {
                const tc = testCases[name];
                it(name, () => {
                    expect(() => {
                        makeInputContentName(tc.input);
                    }).to.throw(tc.error);
                });
            }
        });
    });

    describe('makeInputContentFileNodeUri', () => {
        describe('positive', () => {
            const testCases: {
                [key: string]: {
                    input: Input,
                    want: string,
                }
            } = {
                "draft": {
                    input: {
                        login: "user",
                        title: "Title",
                        titleSlug: "title",
                        status: InputStatus.STATUS_DRAFT,
                    },
                    want: "stream:/user/Title/title.draft.md",
                },
                "published": {
                    input: {
                        login: "user",
                        title: "Title",
                        titleSlug: "title",
                        status: InputStatus.STATUS_PUBLISHED,
                    },
                    want: "stream:/user/Title/title.published.md",
                },
            };
            for (const name in testCases) {
                const tc = testCases[name];
                it(name, () => {
                    const got = makeInputContentFileNodeUri(tc.input);
                    expect(got.toString()).to.equal(tc.want);
                });
            }
        });
        describe('negative', () => {
            const testCases: {
                [key: string]: {
                    input: Input,
                    error: string,
                }
            } = {
                "no status": {
                    input: {
                    },
                    error: "content status not supported: undefined",
                },
            };
            for (const name in testCases) {
                const tc = testCases[name];
                it(name, () => {
                    expect(() => {
                        makeInputContentFileNodeUri(tc.input);
                    }).to.throw(tc.error);
                });
            }
        });
    });

    describe('makeInputNodeUri', () => {
        describe('positive', () => {
            const testCases: {
                [key: string]: {
                    input: Input,
                    want: string,
                }
            } = {
                "example": {
                    input: {
                        login: "user",
                        title: "Title",
                        titleSlug: "title",
                        status: InputStatus.STATUS_DRAFT,
                    },
                    want: "stream:/user/Title",
                },
            };
            for (const name in testCases) {
                const tc = testCases[name];
                it(name, () => {
                    const got = makeInputNodeUri(tc.input);
                    expect(got.toString()).to.equal(tc.want);
                });
            }
        });
    });

    describe('makeUserNodeUri', () => {
        describe('positive', () => {
            const testCases: {
                [key: string]: {
                    input: Input,
                    want: string,
                }
            } = {
                "example": {
                    input: {
                        login: "user",
                        status: InputStatus.STATUS_DRAFT,
                    },
                    want: "stream:/user",
                },
            };
            for (const name in testCases) {
                const tc = testCases[name];
                it(name, () => {
                    const got = makeUserNodeUri(tc.input);
                    expect(got.toString()).to.equal(tc.want);
                });
            }
        });
    });

    describe('makeBytestreamDownloadResourceName', () => {
        const testCases: {
            [key: string]: {
                sha256: string,
                size: number,
                want: string,
            }
        } = {
            "example": {
                sha256: "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
                size: 0,
                want: "/blobs/e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855/0",
            },
        };
        for (const name in testCases) {
            const tc = testCases[name];
            it(name, () => {
                const got = makeBytestreamDownloadResourceName(tc.sha256, tc.size);
                expect(got).to.equal(tc.want);
            });
        }
    });

    describe('makeBytestreamUploadResourceName', () => {
        const testCases: {
            [key: string]: {
                id: string,
                sha256: string,
                size: number,
                want: string,
            }
        } = {
            "example": {
                id: "uuid",
                sha256: "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
                size: 0,
                want: "/uploads/uuid/blobs/e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855/0",
            },
        };
        for (const name in testCases) {
            const tc = testCases[name];
            it(name, () => {
                const got = makeBytestreamUploadResourceName(tc.id, tc.sha256, tc.size);
                expect(got).to.equal(tc.want);
            });
        }
    });

});
