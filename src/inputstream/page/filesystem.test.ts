
import { describe, it } from "@jest/globals";
import { expect } from "chai";
import { ClientContext, exportedForTesting, FileEntry, IFileUploader, sha256Bytes } from "./filesystem";
import { File } from "../../proto/build/stack/inputstream/v1beta1/File";
import { Input, _build_stack_inputstream_v1beta1_Input_Status as InputStatus } from "../../proto/build/stack/inputstream/v1beta1/Input";
import { TextDecoder } from "util";
import { User } from "../../proto/build/stack/auth/v1beta1/User";
import { InputsClientServer } from "../inputStreamServer";
import { BytestreamClientServer } from "../byteStreamServer";
import { InputsGRPCClient } from "../inputStreamClient";

const smallGif = Buffer.from([47, 49, 46, 38, 39, 61, 0x01, 0x00, 0x01, 0x00, 0x00, 0x00, 0x00, 21]);

describe('Filesystem', () => {
    it('should pass sanity check', () => { });

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
                const got = exportedForTesting.getContentTypeForExtension(tc.ext);
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
                const got = exportedForTesting.makeInputExternalWatchUrl(tc.input);
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
                const got = exportedForTesting.makeInputExternalViewUrl(tc.input);
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
                const got = exportedForTesting.sha256Bytes(Buffer.from(tc.content));
                expect(got).to.equal(tc.want);
            });
        }
    });

    describe('makeInputFileName', () => {
        const testCases: {
            [key: string]: {
                file: File,
                want: string,
            }
        } = {
            "degenerate": {
                file: {
                    name: "input.png",
                },
                want: "input.png",
            },
        };
        for (const name in testCases) {
            const tc = testCases[name];
            it(name, () => {
                const got = exportedForTesting.makeInputFileName(tc.file);
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
                    const got = exportedForTesting.makeInputContentName(tc.input);
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
                        exportedForTesting.makeInputContentName(tc.input);
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
                    const got = exportedForTesting.makeInputContentFileNodeUri(tc.input);
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
                        exportedForTesting.makeInputContentFileNodeUri(tc.input);
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
                    const got = exportedForTesting.makeInputNodeUri(tc.input);
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
                    const got = exportedForTesting.makeUserNodeUri(tc.input);
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
                const got = exportedForTesting.makeBytestreamDownloadResourceName(tc.sha256, tc.size);
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
                const got = exportedForTesting.makeBytestreamUploadResourceName(tc.id, tc.sha256, tc.size);
                expect(got).to.equal(tc.want);
            });
        }
    });

    describe('makeInputName', () => {
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
                },
                want: "Title",
            },
        };
        for (const name in testCases) {
            const tc = testCases[name];
            it(name, () => {
                const got = exportedForTesting.makeInputName(tc.input);
                expect(got).to.equal(tc.want);
            });
        }
    });

    describe('makeUserName', () => {
        const testCases: {
            [key: string]: {
                user: User,
                want: string,
            }
        } = {
            "example": {
                user: {
                    login: "user",
                },
                want: "user",
            },
        };
        for (const name in testCases) {
            const tc = testCases[name];
            it(name, () => {
                const got = exportedForTesting.makeUserName(tc.user);
                expect(got).to.equal(tc.want);
            });
        }
    });

    describe('makeUserProfileDir', () => {
        it("should pass", async () => {
            const got = exportedForTesting.makeUserProfileDir({
                login: "octocat",
                name: 'Octo Cat',
                email: 'octocat@example.com',
                avatarUrl: 'https://github.com/octocat.png'
            });
            expect(got.name).to.equal('.profile');
            expect(got.mtime).to.equal(0);
            expect(got.ctime).to.equal(0);
            expect(got.size).to.equal(1);

            const children = await got.getChildren();
            expect(children).to.have.length(1);

            const file = children[0] as FileEntry;
            expect(file.name).to.equal('config.json');
            expect(file.mtime).to.equal(0);
            expect(file.ctime).to.equal(0);
            expect(file.size).to.equal(0);

            const data = await file.getData();
            const text = new TextDecoder().decode(data);
            expect(JSON.parse(text)).to.deep.equal({
                "avatarUrl": "https://github.com/octocat.png",
                "email": "octocat@example.com",
                "name": "Octo Cat",
            });
        });
    });

    describe('InputFileNode', () => {
        const user: User = { login: 'octocat' };
        let bytestream: BytestreamClientServer;
        let inputs: InputsClientServer;
        let ctx: ClientContext;
        let uploader: IFileUploader;
        let inputFileNode: FileEntry;

        afterEach(() => {
            bytestream.server.forceShutdown();
            inputs.server.forceShutdown();
        });

        beforeEach(async () => {
            inputs = new InputsClientServer();
            bytestream = new BytestreamClientServer();
            await Promise.all([bytestream.connect(), inputs.connect()]);

            ctx = {
                user,
                inputsClient: new InputsGRPCClient(inputs.client),
                byteStreamClient: bytestream.client,
                wantFileProgress: false,
            };

            uploader = new exportedForTesting.InputNode(ctx, user, {
                id: '1',
                title: 'My Title',
                titleSlug: 'my-title',
                status: InputStatus.STATUS_DRAFT,
            });

            inputFileNode = new exportedForTesting.InputFileNode(
                'image.gif',
                ctx,
                uploader,
                {
                    name: 'image.gif',
                    size: smallGif.byteLength,
                    sha256: sha256Bytes(smallGif),
                },
            );

        });

        it("FileStat", async () => {
            expect(inputFileNode.name).to.equal('image.gif');
            expect(inputFileNode.mtime).to.equal(0);
            expect(inputFileNode.ctime).to.equal(0);
            expect(inputFileNode.size).to.equal(0);
        });

        it('getData reads from bytestream', async () => {
            const mtimeStart = inputFileNode.mtime;
            const want = smallGif;
            const resourceName = '/blobs/a7e5d18e9589d2575428a419626b56896c11bcf1e99e927c3296b1b9dd6dcb23/14';
            bytestream.service.readData.set(resourceName, [want]);
            const got = await inputFileNode.getData();
            expect(got).to.deep.equal(want);
            expect(inputFileNode.mtime).to.equal(mtimeStart);
        });

        it('setData writes to bytestream', async () => {
            const mtimeStart = inputFileNode.mtime;
            const resourceName = '/uploads/1/blobs/a7e5d18e9589d2575428a419626b56896c11bcf1e99e927c3296b1b9dd6dcb23/14';
            await inputFileNode.setData(smallGif);
            expect(Array.from(bytestream.service.writeData.keys())).to.deep.equal([resourceName]);
            const chunks = bytestream.service.writeData.get(resourceName);
            expect(chunks).to.have.length(1);
            const got = chunks![0];
            const want = smallGif;
            expect(want).to.deep.equal(got);
            expect(inputFileNode.mtime).to.be.greaterThan(mtimeStart);
        });

    });

});
