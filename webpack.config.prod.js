const TerserPlugin = require("terser-webpack-plugin");
const webpack = require("webpack");
const baseConfig = require("./webpack.config.base");
const merge = require("webpack-merge");

module.exports = merge(baseConfig, {
  mode: "production",
  cache: {
    buildDependencies: {
      config: [__filename]
    }
  },
  optimization: {
    minimize: true,
    minimizer: [new TerserPlugin()]
  },
  // webpack's default budget (244 KiB) targets typical sites optimizing for
  // page load over a real network. This app bundles React, lodash, moment,
  // etc. into one ~2 MiB entrypoint by design, which is fine for local/self-
  // hosted use and doesn't reflect a regression. Raised rather than disabled
  // so an unexpected further size jump still gets flagged.
  performance: {
    maxAssetSize: 3 * 1024 * 1024,
    maxEntrypointSize: 3 * 1024 * 1024
  },
  plugins: [
    new webpack.DefinePlugin({
      "process.env.NODE_ENV": JSON.stringify("production"),
      "process.env.VERSION": JSON.stringify(require("./package.json").version)
    })
  ]
});
