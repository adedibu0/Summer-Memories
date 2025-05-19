/** @type {import('next').NextConfig} */
const nextConfig = {
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    unoptimized: true,
  },
  webpack: (config, { isServer }) => {
    // Enable WebAssembly experiments
    config.experiments = {
      ...config.experiments,
      asyncWebAssembly: true,
      layers: true,
    };

    // Rule to handle .wasm files as assets
    config.module.rules.push({
      test: /\.wasm$/,
      type: "asset/resource", // Correctly specify type on the rule
      generator: {
        // Optional: customize the filename and path of the output .wasm file
        filename: isServer
          ? "../static/chunks/[name].[hash][ext]"
          : "static/chunks/[name].[hash][ext]", // Adjust path for server build
      },
    });

    // Add a general rule for wasm files if not handled by the above (might be needed for dependencies)
    config.module.rules.push({
      test: /\.wasm$/,
      type: "webassembly/async",
    });

    return config;
  },
};

export default nextConfig;
