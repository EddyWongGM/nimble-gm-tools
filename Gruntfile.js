const webpack = require("webpack");

const appVersion = require("./package.json").version;

module.exports = function (grunt) {
  grunt.loadNpmTasks("grunt-ts");
  grunt.loadNpmTasks("grunt-webpack");
  grunt.loadNpmTasks("grunt-contrib-less");
  grunt.loadNpmTasks("grunt-contrib-watch");

  grunt.initConfig({
    pkg: grunt.file.readJSON("package.json"),
    ts: {
      server: {
        tsconfig: "./server/tsconfig.json"
      }
    },
    webpack: {
      options: {
        keepalive: false
      },
      dev: require("./webpack.config.dev")
    },
    less: {
      default: {
        files: {
          ["public/css/improved-initiative." + appVersion + ".css"]: [
            "lesscss/improved-initiative.less"
          ]
        }
      }
    },
    watch: {
      tsserver: {
        files: "server/**/*.ts",
        tasks: ["ts:server"]
      },
      lesscss: {
        files: "lesscss/**/*.less",
        tasks: ["less"]
      }
    }
  });

  // grunt-webpack forces webpack's own `cache` option to false outside of
  // watch mode (it only supports an in-memory cache meant for its own watch
  // runs, which can't help a one-shot build in a fresh process each time).
  // Running webpack directly here lets webpack.config.base.js's persistent
  // filesystem cache actually take effect, which is what makes repeat
  // production builds fast.
  grunt.registerTask(
    "webpack-prod",
    "Run the production webpack build with persistent caching.",
    function () {
      const done = this.async();
      const compiler = webpack(require("./webpack.config.prod"));
      compiler.run((runErr, stats) => {
        if (runErr) {
          done(runErr);
          return;
        }
        grunt.log.writeln(stats.toString({ colors: true }));
        const hasErrors = stats.hasErrors();
        // Cache is normally flushed to disk after an idle timeout; close()
        // flushes it immediately so it's ready for the next run.
        compiler.close((closeErr) => {
          if (closeErr) {
            done(closeErr);
          } else if (hasErrors) {
            done(new Error("webpack build failed"));
          } else {
            done();
          }
        });
      });
    }
  );

  grunt.registerTask("build_dev", ["webpack:dev", "ts:server", "less"]);
  grunt.registerTask("build_min", ["webpack-prod", "ts:server", "less"]);
  grunt.registerTask("server_watch", ["ts:server", "watch"]);
  grunt.registerTask("default", ["build_dev", "watch"]);
};
