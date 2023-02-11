/**
 * @see{https://github.com/gitpod-io/gitpod/blob/961a3c33ede85089fa85e7a7e7427cd0a5fc08c3/components/gitpod-protocol/src/util/grpc.ts#L70}
 * for an example of a metrics-collecting interceptor.
 */
import * as grpc from '@grpc/grpc-js';

import { CancelRequester, CloseRequester, FullRequester, MessageRequester, MetadataRequester, NextCall } from '@grpc/grpc-js/build/src/client-interceptors';
import { FullListener, InterceptingListener, MessageListener, MetadataListener, StatusListener } from '@grpc/grpc-js/build/src/call-interface';

type NextCallback = (md: grpc.Metadata, listener: InterceptingListener | Partial<FullListener>) => void;
type NextStatus = (status: grpc.StatusObject) => void;
type NextMessage = (message: any) => void;

export class BaseInterceptorFactory {
    private static counter = 0;

    constructor() {
    }

    public get entrypoint(): grpc.Interceptor {
        return this.intercept.bind(this);
    }

    private intercept(options: grpc.InterceptorOptions, nextCall: NextCall): grpc.InterceptingCall {
        const id = ++BaseInterceptorFactory.counter;
        const interceptor = new BaseInterceptor(id, options, nextCall);
        return interceptor.call();
    }
}

class BaseInterceptor implements FullRequester, FullListener {

    constructor(
        protected id: number,
        protected options: grpc.InterceptorOptions,
        protected nextCall: NextCall,
    ) {
    }

    private log(message?: any, ...optionalParams: any[]): void {
        console.log(`[${this.id}][${this.options.method_definition.path}]: ${message}`, ...optionalParams);
    }

    public call(): grpc.InterceptingCall {
        this.log(`<initial call>`);
        return new grpc.InterceptingCall(this.nextCall(this.options), this);
    }

    public get start(): MetadataRequester {
        this.log(`.start()`);
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

    private handleStartMetadata(metadata: grpc.Metadata, _listener: InterceptingListener, nextMetadata: (metadata: grpc.Metadata, listener: InterceptingListener | grpc.Listener) => void): void {
        this.log(`.handleStartMetadata(${metadata.toJSON()})`);
        nextMetadata(metadata, this);
    }

    private handleSendMessage(message: any, next: (message: any) => void): void {
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
        next(status);
    }
}


// class Interceptor implements FullRequester, FullListener {
//     private initialMetadata: grpc.Metadata | undefined;
//     private initialListener: InterceptingListener | undefined;
//     private initialNextMessage: NextMessage | undefined;
//     private initialNextCall: NextCall | undefined;

//     constructor() {
//     }

//     public intercept(options: grpc.InterceptorOptions, nextCall: NextCall): grpc.InterceptingCall {
//         this.initialNextCall = nextCall;
//         return new grpc.InterceptingCall(nextCall(options), this);
//     }

//     public get start(): MetadataRequester {
//         return this.handleStartMetadata.bind(this);
//     }

//     public get sendMessage(): MessageRequester {
//         return this.handleSendMessage.bind(this);
//     }

//     public get halfClose(): CloseRequester {
//         return this.handleHalfClose.bind(this);
//     }

//     public get cancel(): CancelRequester {
//         return this.handleCancel.bind(this);
//     }

//     private handleStartMetadata(metadata: grpc.Metadata, listener: InterceptingListener, nextMetadata: (metadata: grpc.Metadata, listener: InterceptingListener | grpc.Listener) => void): void {
//         this.initialMetadata = metadata;
//         this.initialListener = listener;

//         nextMetadata(metadata, this);
//     }

//     private handleSendMessage(message: any, next: (message: any) => void): void {
//         this.initialNextMessage = next;
//         next(message);
//     }

//     private handleHalfClose(next: () => void): void {
//         next();
//     }

//     private handleCancel(next: () => void): void {
//         next();
//     }

//     public get onReceiveMetadata(): MetadataListener {
//         return this.handleReceiveMetadata.bind(this);
//     }

//     public get onReceiveMessage(): MessageListener {
//         return this.handleReceiveMessage.bind(this);
//     }

//     public get onReceiveStatus(): StatusListener {
//         return this.handleStatus.bind(this);
//     }

//     private handleReceiveMetadata(metadata: grpc.Metadata, next: (metadata: grpc.Metadata) => void): void {
//         next(metadata);
//     }

//     private handleReceiveMessage(message: any, next: (message: any) => void): void {
//         next(message);
//     }

//     private handleStatus(status: grpc.StatusObject, next: (status: grpc.StatusObject) => void): void {
//         next(status);
//     }
// }

// export function createClientCallRetryInterceptor(refreshToken: TokenRefresher, maxRetries = 3): grpc.Interceptor {
//     return (options: grpc.InterceptorOptions, nextCall: NextCall): grpc.InterceptingCall => {
//         let savedMetadata: grpc.Metadata;
//         let savedSendMessage: any;
//         let savedReceiveMessage: MessageListener;
//         let savedMessageNext: NextMessage;

//         const requester = new grpc.RequesterBuilder()
//             .withStart((startMetadata: grpc.Metadata, _listener: InterceptingListener, nextCallback: NextCallback) => {
//                 savedMetadata = startMetadata;

//                 const newListener = new grpc.ListenerBuilder()
//                     .withOnReceiveStatus((status: grpc.StatusObject, nextStatus: NextStatus) => {
//                         let retries = 0;

//                         const retry = (retriedMessage: any, retriedMetadata: grpc.Metadata) => {
//                             retries++;
//                             const newCall = nextCall(options);
//                             newCall.start(retriedMetadata, {
//                                 onReceiveMessage: function (message: any) {
//                                     savedReceiveMessage = message;
//                                 },
//                                 onReceiveStatus: (status: grpc.StatusObject) => {
//                                     if (status.code !== grpc.status.OK) {
//                                         if (retries <= maxRetries) {
//                                             retry(retriedMessage, retriedMetadata);
//                                         } else {
//                                             savedMessageNext(savedReceiveMessage);
//                                             nextStatus(status);
//                                         }
//                                     } else {
//                                         savedMessageNext(savedReceiveMessage);
//                                         nextStatus(status);
//                                     }
//                                 }
//                             });
//                         };

//                         switch (status.code) {
//                             case grpc.status.OK:
//                                 savedMessageNext(savedReceiveMessage);
//                                 nextStatus(status);
//                                 break;
//                             case grpc.status.UNAUTHENTICATED:
//                                 await refreshToken()
//                                 break;
//                             default:
//                                 retry(savedSendMessage, savedMetadata);
//                         }
//                     })
//                     .withOnReceiveMessage((message: MessageListener, next: NextMessage) => {
//                         savedReceiveMessage = message;
//                         savedMessageNext = next;
//                     })
//                     .build();

//                 nextCallback(startMetadata, newListener);
//             })
//             .withSendMessage((message: any, next: NextMessage) => {
//                 savedSendMessage = message;
//                 next(message);
//             })
//             .build();

//         return new grpc.InterceptingCall(nextCall(options), requester);
//     };
// }
