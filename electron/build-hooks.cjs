const {rcedit} = require('rcedit');
const path = require('path');

exports.default = async function(context) {
  if (context.electronPlatformName !== 'win32') return;

  const projectDir = context.packager?.projectDir 
    ?? context.packager?.info?.projectDir;

  const exePath = path.join(
    context.appOutDir,
    'Criminal Investigation Assistant.exe'
  );


  await rcedit(exePath, {
    icon: path.join(projectDir, 'build', 'icon.ico'),
    'version-string': {
      FileDescription: 'Criminal Investigation Assistant',
      ProductName: 'Criminal Investigation Assistant',
      CompanyName: 'Aetheron',
      LegalCopyright: 'Copyright © 2026 AETHERON Team',
      OriginalFilename: 'Criminal Investigation Assistant.exe',
    },
    'file-version': '1.0.0.0',
    'product-version': '1.0.0.0',
  });
};