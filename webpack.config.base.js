const path = require("path");
const appVersion = require("./package.json").version;

module.exports = {
  entry: "./client/Index.ts",
  cache: {
    type: "filesystem",
    buildDependencies: {
      config: [__filename]
    }
  },
  module: {
    rules: [
      {
        test: /\.tsx?$/,
        use: "ts-loader",
        exclude: /node_modules/
      },
      {
        test: /\.md$/,
        type: "asset/source"
      }
    ]
  },
  resolve: {
    extensions: [".tsx", ".ts", ".js"],
    fallback: {
      path: require.resolve("path-browserify")
    }
  },
  output: {
    filename: "ImprovedInitiative." + appVersion + ".js",
    path: path.resolve(__dirname, "public", "js")
  }
};
