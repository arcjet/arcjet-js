import { createConfig } from "@arcjet/rollup-config";

export default createConfig(import.meta.url, {
  plugins: [
    {
      name: "externalize-protobuf",
      // This externalizes the auto-generated protobuf code so it is not
      // processed by rollup
      resolveId(source) {
        if (
          source === "./proto/decide/v1alpha1/decide_pb.js" ||
          source === "../proto/decide/v1alpha1/decide_pb.js"
        ) {
          return { id: source, external: true };
        }

        return null;
      },
    },
  ],
});
