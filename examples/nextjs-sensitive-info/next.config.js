/** @type {import('next').NextConfig} */
const nextConfig = {
  // The Rampart backend loads a native ONNX runtime and reads bundled model
  // weights from disk, so it must not be bundled by the server build.
  serverExternalPackages: [
    "@arcjet/sensitive-info-rampart",
    "@huggingface/transformers",
    "onnxruntime-node",
  ],
}

module.exports = nextConfig
