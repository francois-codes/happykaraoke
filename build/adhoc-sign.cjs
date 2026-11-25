// Ad hoc signature of the macOS app (afterPack hook).
//
// Without a Developer ID certificate, electron-builder skips code signing and the
// app keeps the stock Electron linker signature, which no longer matches the
// renamed bundle. With the quarantine flag set by the browser, macOS then reports
// the app as "damaged" and users have to run `xattr -c` in the Terminal.
//
// A consistent ad hoc signature turns that into the regular "unidentified
// developer" warning, which can be bypassed from System Settings
// (Privacy & Security → Open Anyway). If a real Developer ID is configured later,
// electron-builder signs after this hook and replaces this signature.
const { execFileSync } = require('node:child_process');
const path = require('node:path');

/** @param {import('app-builder-lib').AfterPackContext} context */
exports.default = async function adhocSign(context) {
  if (context.electronPlatformName !== 'darwin') return;

  const appPath = path.join(
    context.appOutDir,
    `${context.packager.appInfo.productFilename}.app`,
  );

  console.log(`  • ad hoc signing  path=${appPath}`);
  execFileSync('codesign', ['--force', '--deep', '--sign', '-', appPath], {
    stdio: 'inherit',
  });
  execFileSync('codesign', ['--verify', '--deep', '--strict', appPath], {
    stdio: 'inherit',
  });
};
