// TODO: Finish abstracting over protobuf and don't re-export
export * from "./gen/es/decide/v1alpha1/decide_pb.js";
export * from "./gen/es/decide/v1alpha1/decide_connect.js";

export { Timestamp, proto3 } from "@bufbuild/protobuf";
export {
  createPromiseClient,
  createRouterTransport,
  type Transport,
} from "@connectrpc/connect";
