const fs = require('fs');
const Babel = require('babel-standalone');
const package = require('./package.json');

const headerCodeRaw = fs.readFileSync('./src/header.user.js', 'utf8');
const appCodeRaw = fs.readFileSync('./src/App.jsx', 'utf8');

const appCodeX = appCodeRaw.replace(/(import.+?;)/mg, '// $1');
const headerCode = headerCodeRaw.replace(/%version%/, package.version);

const { code } = Babel.transform(appCodeX, {
  presets: [ 'es2015', 'es2016', 'react' ]
});

const codeWithHeader = `${headerCode}

(function flyInkVkConversationStatistics() {
${code}
})();
`;

fs.writeFileSync(`./build/${package.name}.user.js`, codeWithHeader);
