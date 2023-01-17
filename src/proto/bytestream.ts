import type * as grpc from '@grpc/grpc-js';
import type { MessageTypeDefinition } from '@grpc/proto-loader';

import type { ByteStreamClient as _google_bytestream_ByteStreamClient, ByteStreamDefinition as _google_bytestream_ByteStreamDefinition } from './google/bytestream/ByteStream';

type SubtypeConstructor<Constructor extends new (...args: any) => any, Subtype> = {
  new(...args: ConstructorParameters<Constructor>): Subtype;
};

export interface ProtoGrpcType {
  google: {
    api: {
      CustomHttpPattern: MessageTypeDefinition
      Http: MessageTypeDefinition
      HttpRule: MessageTypeDefinition
    }
    bytestream: {
      /**
       * #### Introduction
       * 
       * The Byte Stream API enables a client to read and write a stream of bytes to
       * and from a resource. Resources have names, and these names are supplied in
       * the API calls below to identify the resource that is being read from or
       * written to.
       * 
       * All implementations of the Byte Stream API export the interface defined here:
       * 
       * * `Read()`: Reads the contents of a resource.
       * 
       * * `Write()`: Writes the contents of a resource. The client can call `Write()`
       * multiple times with the same resource and can check the status of the write
       * by calling `QueryWriteStatus()`.
       * 
       * #### Service parameters and metadata
       * 
       * The ByteStream API provides no direct way to access/modify any metadata
       * associated with the resource.
       * 
       * #### Errors
       * 
       * The errors returned by the service are in the Google canonical error space.
       */
      ByteStream: SubtypeConstructor<typeof grpc.Client, _google_bytestream_ByteStreamClient> & { service: _google_bytestream_ByteStreamDefinition }
      QueryWriteStatusRequest: MessageTypeDefinition
      QueryWriteStatusResponse: MessageTypeDefinition
      ReadRequest: MessageTypeDefinition
      ReadResponse: MessageTypeDefinition
      WriteRequest: MessageTypeDefinition
      WriteResponse: MessageTypeDefinition
    }
    protobuf: {
      BoolValue: MessageTypeDefinition
      BytesValue: MessageTypeDefinition
      DescriptorProto: MessageTypeDefinition
      DoubleValue: MessageTypeDefinition
      EnumDescriptorProto: MessageTypeDefinition
      EnumOptions: MessageTypeDefinition
      EnumValueDescriptorProto: MessageTypeDefinition
      EnumValueOptions: MessageTypeDefinition
      FieldDescriptorProto: MessageTypeDefinition
      FieldOptions: MessageTypeDefinition
      FileDescriptorProto: MessageTypeDefinition
      FileDescriptorSet: MessageTypeDefinition
      FileOptions: MessageTypeDefinition
      FloatValue: MessageTypeDefinition
      GeneratedCodeInfo: MessageTypeDefinition
      Int32Value: MessageTypeDefinition
      Int64Value: MessageTypeDefinition
      MessageOptions: MessageTypeDefinition
      MethodDescriptorProto: MessageTypeDefinition
      MethodOptions: MessageTypeDefinition
      OneofDescriptorProto: MessageTypeDefinition
      OneofOptions: MessageTypeDefinition
      ServiceDescriptorProto: MessageTypeDefinition
      ServiceOptions: MessageTypeDefinition
      SourceCodeInfo: MessageTypeDefinition
      StringValue: MessageTypeDefinition
      UInt32Value: MessageTypeDefinition
      UInt64Value: MessageTypeDefinition
      UninterpretedOption: MessageTypeDefinition
    }
  }
}

