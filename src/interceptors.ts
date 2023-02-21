import * as grpc from '@grpc/grpc-js';

import { CancelRequester, CloseRequester, FullRequester, MessageRequester, MetadataRequester, NextCall } from '@grpc/grpc-js/build/src/client-interceptors';
import { FullListener, InterceptingListener, MessageListener, MetadataListener, StatusListener } from '@grpc/grpc-js/build/src/call-interface';
import { ClientContext } from './grpc';


export class AuthorizationBearerInterceptor {
    private static counter = 0;

    constructor(
        private ctx: ClientContext,
        private maxRetries: number,
    ) {
    }

    public get entrypoint(): grpc.Interceptor {
        return this.intercept.bind(this);
    }

    private intercept(options: grpc.InterceptorOptions, nextCall: NextCall): grpc.InterceptingCall {
        const id = ++AuthorizationBearerInterceptor.counter;
        const intercept = new AuthorizationBearerIntercept(
            this.ctx,
            this.maxRetries,
            id,
            options,
            nextCall);
        return intercept.call();
    }
}

class AuthorizationBearerIntercept implements FullRequester, FullListener {
    private originalMetadata: grpc.Metadata | undefined;
    private originalRequest: any | undefined;
    private originalListener: InterceptingListener | undefined;
    private retryCount = 0;

    constructor(
        private ctx: ClientContext,
        private maxRetries: number,
        private id: number,
        private options: grpc.InterceptorOptions,
        private nextCall: NextCall,
    ) {
    }

    private log(message?: any, ...optionalParams: any[]): void {
        // console.log(`AuthorizationBearerInterceptor[${this.id}][${this.options.method_definition.path}]: ${message}`, ...optionalParams);
    }

    public call(): grpc.InterceptingCall {
        this.log(`<initial call>`);
        return new grpc.InterceptingCall(this.nextCall(this.options), this);
    }

    public get start(): MetadataRequester {
        this.log(`AuthorizationBearerInterceptor.start()`);
        return this.handleStartMetadata.bind(this);
    }

    public get sendMessage(): MessageRequester {
        this.log(`.sendMessage()`);
        return this.handleSendMessage.bind(this);
    }

    public get halfClose(): CloseRequester {
        this.log(`.halfClose()`);
        return this.handleHalfClose.bind(this);
    }

    public get cancel(): CancelRequester {
        this.log(`.cancel()`);
        return this.handleCancel.bind(this);
    }

    private setAuthorizationMetadata(md: grpc.Metadata, token: string | undefined): void {
        if (token) {
            md.set('Authorization', 'Bearer ' + token);
            this.log(`added bearer token: ${token}`);
        }
    }

    private handleStartMetadata(metadata: grpc.Metadata, listener: InterceptingListener, nextMetadata: (metadata: grpc.Metadata, listener: InterceptingListener | grpc.Listener) => void): void {
        this.log(`.handleStartMetadata(${metadata.toJSON()})`);

        this.originalMetadata = metadata;
        this.originalListener = listener;

        this.setAuthorizationMetadata(metadata, this.ctx.accessToken());

        nextMetadata(metadata, this);
    }

    private handleSendMessage(message: any, next: (message: any) => void): void {
        this.originalRequest = message;
        this.log(`.handleSendMessage(${JSON.stringify(message)})`);
        next(message);
    }

    private handleHalfClose(next: () => void): void {
        this.log(`.handleHalfClose()`);
        next();
    }

    private handleCancel(next: () => void): void {
        this.log(`.handleCancel()`);
        next();
    }

    public get onReceiveMetadata(): MetadataListener {
        this.log(`.onReceiveMetadata()`);
        return this.handleReceiveMetadata.bind(this);
    }

    public get onReceiveMessage(): MessageListener {
        this.log(`.onReceiveMessage()`);
        return this.handleReceiveMessage.bind(this);
    }

    public get onReceiveStatus(): StatusListener {
        this.log(`.onReceiveStatus()`);
        return this.handleStatus.bind(this);
    }

    private handleReceiveMetadata(metadata: grpc.Metadata, next: (metadata: grpc.Metadata) => void): void {
        this.log(`.handleReceiveMetadata(${metadata.toJSON()})`);
        next(metadata);
    }

    private handleReceiveMessage(message: any, next: (message: any) => void): void {
        this.log(`.handleReceiveMessage(${JSON.stringify(message)})`);
        next(message);
    }

    private handleStatus(status: grpc.StatusObject, next: (status: grpc.StatusObject) => void): void {
        this.log(`.handleStatus(${JSON.stringify(status)})`);
        if (status.code !== grpc.status.UNAUTHENTICATED || this.retryCount > this.maxRetries) {
            next(status);
            return;
        }
        this.retryCount++;
        this.ctx.refreshAccessToken().then((token: string | undefined) => {
            this.retryCall(token);
        }).catch((err) => {
            console.log(`token refresh error:`, err);
            next(status);
        });
    }

    private retryCall(token: string | undefined) {
        const md = new grpc.Metadata();
        if (this.originalMetadata) {
            md.merge(this.originalMetadata);
        }
        this.setAuthorizationMetadata(md, token);

        const newCall = this.nextCall(this.options);
        newCall.start(md, this.originalListener);
        newCall.sendMessage(this.originalRequest);
        newCall.halfClose();
    }
}
