
import { it } from "@jest/globals";
import { expect } from "chai";

import { _build_stack_inputstream_v1beta1_Input_Status as InputStatus } from "../proto/build/stack/inputstream/v1beta1/Input";
import { User } from "../proto/build/stack/auth/v1beta1/User";
import { BytestreamServer } from "../byteStreamServer";
import { InputsServer } from "../inputsServer";
import { NodeContext } from "./node";
import { InputNode } from "./inputNode";
import { FileEntry } from "./fileEntry";
import { InputFileNode } from "./inputFileNode";
import { InputsGrpcNodeClient } from "../inputsClient";
import { sha256Bytes } from "../filesystems";
import { VSCodeWindow } from "../context";
import { TextEditor } from "vscode";

const smallGif = Buffer.from([47, 49, 46, 38, 39, 61, 0x01, 0x00, 0x01, 0x00, 0x00, 0x00, 0x00, 21]);

describe('InputFileNode', () => {
    const user: User = { login: 'octocat' };
    let bytestream: BytestreamServer;
    let inputs: InputsServer;
    let ctx: NodeContext;
    let uploader: InputNode;
    let inputFileNode: FileEntry;
    let window: VSCodeWindow;

    afterEach(() => {
        bytestream.server.forceShutdown();
        inputs.server.forceShutdown();
    });

    beforeEach(async () => {
        inputs = new InputsServer();
        bytestream = new BytestreamServer();
        await Promise.all([bytestream.connect(), inputs.connect()]);

        window = {
            activeTextEditor: jest.fn() as unknown as TextEditor,
            setStatusBarMessage: jest.fn(),
            showInformationMessage: jest.fn(),
            showWarningMessage: jest.fn(),
            showErrorMessage: jest.fn(),
            registerUriHandler: jest.fn(),
            registerFileDecorationProvider: jest.fn(),
            createTreeView: jest.fn(),
            createWebviewPanel: jest.fn(),
        };

        ctx = {
            inputsClient: new InputsGrpcNodeClient(inputs.client),
            byteStreamClient: bytestream.client,
            notifyFileChanges: jest.fn(),
            window: window,
        };

        uploader = new InputNode(ctx, user, {
            id: '1',
            login: 'foo',
            title: 'My Title',
            titleSlug: 'my-title',
            status: InputStatus.STATUS_DRAFT,
        });
        uploader.wantFileProgress = false;

        inputFileNode = new InputFileNode(
            ctx,
            uploader,
            { login: 'foo', title: 'untitled' },
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

