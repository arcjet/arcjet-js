import { GenFile, GenMessage, GenService } from "@bufbuild/protobuf/codegenv2";
import { Message } from "@bufbuild/protobuf";

//#region test/eliza_pb.d.ts
/**
 * Describes the file eliza.proto.
 */
declare const file_eliza: GenFile;
/**
 * SayRequest is a single-sentence request.
 *
 * @generated from message connectrpc.eliza.v1.SayRequest
 */
type SayRequest = Message<"connectrpc.eliza.v1.SayRequest"> & {
  /**
   * @generated from field: string sentence = 1;
   */
  sentence: string;
};
/**
 * Describes the message connectrpc.eliza.v1.SayRequest.
 * Use `create(SayRequestSchema)` to create a new message.
 */
declare const SayRequestSchema: GenMessage<SayRequest>;
/**
 * SayResponse is a single-sentence response.
 *
 * @generated from message connectrpc.eliza.v1.SayResponse
 */
type SayResponse = Message<"connectrpc.eliza.v1.SayResponse"> & {
  /**
   * @generated from field: string sentence = 1;
   */
  sentence: string;
};
/**
 * Describes the message connectrpc.eliza.v1.SayResponse.
 * Use `create(SayResponseSchema)` to create a new message.
 */
declare const SayResponseSchema: GenMessage<SayResponse>;
/**
 * ConverseRequest is a single sentence request sent as part of a
 * back-and-forth conversation.
 *
 * @generated from message connectrpc.eliza.v1.ConverseRequest
 */
type ConverseRequest = Message<"connectrpc.eliza.v1.ConverseRequest"> & {
  /**
   * @generated from field: string sentence = 1;
   */
  sentence: string;
};
/**
 * Describes the message connectrpc.eliza.v1.ConverseRequest.
 * Use `create(ConverseRequestSchema)` to create a new message.
 */
declare const ConverseRequestSchema: GenMessage<ConverseRequest>;
/**
 * ConverseResponse is a single sentence response sent in answer to a
 * ConverseRequest.
 *
 * @generated from message connectrpc.eliza.v1.ConverseResponse
 */
type ConverseResponse = Message<"connectrpc.eliza.v1.ConverseResponse"> & {
  /**
   * @generated from field: string sentence = 1;
   */
  sentence: string;
};
/**
 * Describes the message connectrpc.eliza.v1.ConverseResponse.
 * Use `create(ConverseResponseSchema)` to create a new message.
 */
declare const ConverseResponseSchema: GenMessage<ConverseResponse>;
/**
 * IntroduceRequest asks Eliza to introduce itself to the named user.
 *
 * @generated from message connectrpc.eliza.v1.IntroduceRequest
 */
type IntroduceRequest = Message<"connectrpc.eliza.v1.IntroduceRequest"> & {
  /**
   * @generated from field: string name = 1;
   */
  name: string;
};
/**
 * Describes the message connectrpc.eliza.v1.IntroduceRequest.
 * Use `create(IntroduceRequestSchema)` to create a new message.
 */
declare const IntroduceRequestSchema: GenMessage<IntroduceRequest>;
/**
 * IntroduceResponse is one sentence of Eliza's introductory monologue.
 *
 * @generated from message connectrpc.eliza.v1.IntroduceResponse
 */
type IntroduceResponse = Message<"connectrpc.eliza.v1.IntroduceResponse"> & {
  /**
   * @generated from field: string sentence = 1;
   */
  sentence: string;
};
/**
 * Describes the message connectrpc.eliza.v1.IntroduceResponse.
 * Use `create(IntroduceResponseSchema)` to create a new message.
 */
declare const IntroduceResponseSchema: GenMessage<IntroduceResponse>;
/**
 * ElizaService provides a way to talk to Eliza, a port of the DOCTOR script
 * for Joseph Weizenbaum's original ELIZA program. Created in the mid-1960s at
 * the MIT Artificial Intelligence Laboratory, ELIZA demonstrates the
 * superficiality of human-computer communication. DOCTOR simulates a
 * psychotherapist, and is commonly found as an Easter egg in emacs
 * distributions.
 *
 * @generated from service connectrpc.eliza.v1.ElizaService
 */
declare const ElizaService: GenService<{
  /**
   * Say is a unary RPC. Eliza responds to the prompt with a single sentence.
   *
   * @generated from rpc connectrpc.eliza.v1.ElizaService.Say
   */
  say: {
    methodKind: "unary";
    input: typeof SayRequestSchema;
    output: typeof SayResponseSchema;
  };
  /**
   * Converse is a bidirectional RPC. The caller may exchange multiple
   * back-and-forth messages with Eliza over a long-lived connection. Eliza
   * responds to each ConverseRequest with a ConverseResponse.
   *
   * @generated from rpc connectrpc.eliza.v1.ElizaService.Converse
   */
  converse: {
    methodKind: "bidi_streaming";
    input: typeof ConverseRequestSchema;
    output: typeof ConverseResponseSchema;
  };
  /**
   * Introduce is a server streaming RPC. Given the caller's name, Eliza
   * returns a stream of sentences to introduce itself.
   *
   * @generated from rpc connectrpc.eliza.v1.ElizaService.Introduce
   */
  introduce: {
    methodKind: "server_streaming";
    input: typeof IntroduceRequestSchema;
    output: typeof IntroduceResponseSchema;
  };
}>;
//#endregion
export { ConverseRequest, ConverseRequestSchema, ConverseResponse, ConverseResponseSchema, ElizaService, IntroduceRequest, IntroduceRequestSchema, IntroduceResponse, IntroduceResponseSchema, SayRequest, SayRequestSchema, SayResponse, SayResponseSchema, file_eliza };