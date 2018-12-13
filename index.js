const ansi = require('ansi-colors');
const debug = require('debug')('get-meta-file');
const dedent = require('dedent');
const findUpsync = require('findup-sync');
const fs = require('fs');
const path = require('path');
const prompt = require('prompt-sync')();
const tildify = require('tildify');
const util = require('util');

const CWD_NOT_META =
  ansi.yellow('warn: ') +
  'The current directory is' +
  ansi.underline(' not ') +
  'a meta repo';

const warnMissing = cwd => dedent`
  ${CWD_NOT_META}:
    ${ansi.gray(tildify(cwd))}

  And none of your ancestors are meta repos, either.
`;

module.exports = function(options = {}) {
  options.warn = options.warn !== false;

  const cwd = process.cwd();
  const inMetaRepo = fs.existsSync('.meta');
  const metaPath = inMetaRepo
    ? path.resolve('.meta')
    : findUpsync('.meta', { cwd });

  if (!metaPath) {
    if (options.warn) console.warn(warnMissing(cwd));
    return {};
  }

  if (options.confirmInMetaRepo && !inMetaRepo) {
    console.log(dedent`
      ${CWD_NOT_META}:
        ${ansi.gray(tildify(cwd))}

      The closest meta repo is:
        ${ansi.gray(tildify(metaPath))}

      Would you like to:
        - continue in the closest meta repo? ${ansi.green('[y/enter]')}
        - continue in the current directory? ${ansi.green('[c]')}
        - cancel and exit? ${ansi.green('[x]')}

    `);

    const answer = prompt(message).toLowerCase() || 'y';
    answer === 'x' && process.exit(0);
    answer === 'y' && process.chdir(path.dirname(metaPath));
  }

  try {
    debug(`attempting to load .meta file with module.exports format at ${metaPath}`); // prettier-ignore
    const meta = require(metaPath);
    debug(`.meta file found at ${metaPath}`);
    if (meta) return meta;
  } catch (e) {
    debug(`no module.exports format .meta file found at ${metaPath}: ${e}`);
  }

  let buffer = null;
  try {
    debug(`attempting to load .meta file with json format at ${metaPath}`);
    buffer = fs.readFileSync(metaPath);
    debug(`.meta file found at ${metaPath}`);
  } catch (e) {
    debug(`no .meta file found at ${metaPath}: ${e}`);
  }

  if (buffer) {
    try {
      const meta = JSON.parse(buffer.toString());
      debug(`.meta file contents parsed: ${util.inspect(meta, null, Infinity)}`); // prettier-ignore
      return meta;
    } catch (e) {
      debug(`error parsing .meta JSON: ${e}`);
    }
  }

  if (options.warn) console.warn(warnMissing(cwd));
  return {};
};

module.exports.getFileLocation = function() {
  return findUpsync('.meta', { cwd: process.cwd() });
};
