import * as grpc from '@grpc/grpc-js';

import { NextCall } from '@grpc/grpc-js/build/src/client-interceptors';
import { FullListener, InterceptingListener, MessageListener } from '@grpc/grpc-js/build/src/call-interface';
import { TokenRefresher } from './grpc';

type NextCallback = (md: grpc.Metadata, listener: InterceptingListener | Partial<FullListener>) => void;
type NextStatus = (status: grpc.StatusObject) => void;
type NextMessage = (message: any) => void;


export function createClientCallRetryInterceptor(refreshToken: TokenRefresher, maxRetries = 3): grpc.Interceptor {
    return (options: grpc.InterceptorOptions, nextCall: NextCall): grpc.InterceptingCall => {
        let savedMetadata: grpc.Metadata;
        let savedSendMessage: any;
        let savedReceiveMessage: MessageListener;
        let savedMessageNext: NextMessage;

        const requester = new grpc.RequesterBuilder()
            .withStart((startMetadata: grpc.Metadata, _listener: InterceptingListener, nextCallback: NextCallback) => {
                savedMetadata = startMetadata;

                const newListener = new grpc.ListenerBuilder()
                    .withOnReceiveStatus((status: grpc.StatusObject, nextStatus: NextStatus) => {
                        let retries = 0;

                        const retry = (retriedMessage: any, retriedMetadata: grpc.Metadata) => {
                            retries++;
                            const newCall = nextCall(options);
                            newCall.start(retriedMetadata, {
                                onReceiveMessage: function (message: any) {
                                    savedReceiveMessage = message;
                                },
                                onReceiveStatus: (status: grpc.StatusObject) => {
                                    if (status.code !== grpc.status.OK) {
                                        if (retries <= maxRetries) {
                                            retry(retriedMessage, retriedMetadata);
                                        } else {
                                            savedMessageNext(savedReceiveMessage);
                                            nextStatus(status);
                                        }
                                    } else {
                                        savedMessageNext(savedReceiveMessage);
                                        nextStatus(status);
                                    }
                                }
                            });
                        };

                        if (status.code !== grpc.status.OK) {
                            retry(savedSendMessage, savedMetadata);
                        } else {
                            savedMessageNext(savedReceiveMessage);
                            nextStatus(status);
                        }

                    })
                    .withOnReceiveMessage((message: MessageListener, next: NextMessage) => {
                        savedReceiveMessage = message;
                        savedMessageNext = next;
                    })
                    .build();

                nextCallback(startMetadata, newListener);
            })
            .withSendMessage((message: any, next: NextMessage) => {
                savedSendMessage = message;
                next(message);
            })
            .build();

        return new grpc.InterceptingCall(nextCall(options), requester);
    };
}
