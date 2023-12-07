import { createConfig } from "@arcjet/rollup-config";

export default createConfig(import.meta.url, {
  plugins: [
    {
      name: "externalize-protobuf",
      // This externalizes the auto-generated protobuf code so it is not
      // processed by rollup
      resolveId(source) {
        if (source.startsWith("./gen/es/decide/v1alpha1/decide_pb")) {
          return {
            id: "./gen/es/decide/v1alpha1/decide_pb.js",
            external: true,
          };
        }
        if (source.startsWith("./gen/es/decide/v1alpha1/decide_connect")) {
          return {
            id: "./gen/es/decide/v1alpha1/decide_connect.js",
            external: true,
          };
        }
        return null;
      },
    },
  ],
});
