const fs = require('fs');
const path = require('path');
const resolve = (dir) => path.resolve(__dirname, dir);
// copy release package.json to dist
const packageJsonOrigin = resolve('../package.release.json');
const packageJsonTarget = resolve('../dist/package.json');
fs.copyFileSync(packageJsonOrigin, packageJsonTarget);
// README file
const readme = resolve('../README.md');
const readmeTar = resolve('../dist/README.md');
fs.copyFileSync(readme, readmeTar);
// CHANGELOG file
const change = resolve('../CHANGELOG.md');
const changeTar = resolve('../dist/CHANGELOG.md');
fs.copyFileSync(change, changeTar);
// LICENSE file
const license = resolve('../LICENSE');
const licenseTar = resolve('../dist/LICENSE');
fs.copyFileSync(license, licenseTar);
// dev environment dir
const dist = resolve('../dist/');
const devDir = resolve('../../node_modules/map-ui/')
fs.cp(dist, devDir, { recursive: true }, (err) => {
  if (err) {
    console.log('build error \n')
    console.error(err)
  } else {
    console.log('map-ui')
    console.log('build success!')
  }
})