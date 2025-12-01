const { FusesPlugin } = require("@electron-forge/plugin-fuses");
const { FuseV1Options, FuseVersion } = require("@electron/fuses");
const path = require("path");

module.exports = {
  packagerConfig: {
    asar: true,
    icon: path.join(__dirname, "assets/icons/icon"),
  },
  rebuildConfig: {},
  makers: [
    {
      name: "@electron-forge/maker-squirrel",
      config: {
        name: "NCCSystem",
        author: "HungNC",
        description: "Phần mềm quản trị Rạp Chiếu Phim Quốc Gia",
        setupIcon: path.join(__dirname, "assets/icons/icon.ico"),
      },
    },
    {
      name: "@electron-forge/maker-zip",
      platforms: ["darwin"],
    },
    {
      name: "@electron-forge/maker-deb",
      config: {},
    },
    {
      name: "@electron-forge/maker-rpm",
      config: {},
    },
  ],
  plugins: [
    {
      name: "@electron-forge/plugin-auto-unpack-natives",
      config: {},
    },
    // Fuses are used to enable/disable various Electron functionality
    // at package time, before code signing the application
    new FusesPlugin({
      version: FuseVersion.V1,
      [FuseV1Options.RunAsNode]: false,
      [FuseV1Options.EnableCookieEncryption]: true,
      [FuseV1Options.EnableNodeOptionsEnvironmentVariable]: false,
      [FuseV1Options.EnableNodeCliInspectArguments]: false,
      [FuseV1Options.EnableEmbeddedAsarIntegrityValidation]: true,
      [FuseV1Options.OnlyLoadAppFromAsar]: false,
    }),
  ],
  hooks: {
    packageAfterCopy: async (_, buildPath) => {
      const path = require("path");
      const fse = require("fs-extra");

      try {
        const resourcesPath = path.join(buildPath, "..");

        await fse.copy(
          ".next/standalone",
          path.join(resourcesPath, ".next/standalone")
        );

        console.log("✔ Copied Next.js standalone into resources/");
      } catch (err) {
        console.error("❌ Failed to copy Next.js standalone:", err);
        throw err; // vẫn throw để Forge biết lỗi
      }
    },
  },
  publishers: [
    {
      name: "@electron-forge/publisher-bitbucket",
      config: {
        repository: {
          owner: "an-vui",
          name: "ncc-admin-app-new",
        },
        auth: {
          username: process.env.BITBUCKET_USERNAME || "",
          appPassword: process.env.BITBUCKET_APP_PASSWORD || "",
        },
        prerelease: false,
        draft: true,
      },
      platforms: ["win32"],
    },
  ],
};
