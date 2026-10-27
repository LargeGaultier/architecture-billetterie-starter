import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { basename, dirname, relative, resolve, sep } from 'node:path';
import { createScanner, SyntaxKind } from 'typescript/unstable/ast';

const root = resolve('src');
const domain = resolve(root, 'domain');
const application = resolve(root, 'application');
const queries = resolve(application, 'queries');
const dto = resolve(application, 'dto');
const ports = resolve(application, 'ports');
const readPorts = new Set(['QueryHandler', 'Clock', 'EventReader', 'ReservationReader', 'PaymentAttemptReader', 'UserReader', 'SessionReader']);
const inside = (file, directory) => file.startsWith(`${directory}${sep}`);
const files = directory => readdirSync(directory, { withFileTypes: true }).flatMap(entry =>
  entry.isDirectory() ? files(resolve(directory, entry.name))
    : entry.name.endsWith('.ts') ? [resolve(directory, entry.name)] : []);
const violations = [];
let imports = 0;

for (const file of [...files(domain), ...files(application)]) {
  const source = readFileSync(file, 'utf8');
  const scanner = createScanner(true, undefined, source);
  const tokens = [];
  for (let kind = scanner.scan(); kind !== SyntaxKind.EndOfFile; kind = scanner.scan()) {
    tokens.push({ kind, text: scanner.getTokenText(), value: scanner.getTokenValue(), start: scanner.getTokenStart() });
  }
  const check = token => {
    const specifier = token.value;
    imports++;
    const target = resolve(dirname(file), specifier.replace(/\.js$/, '.ts'));
    const allowed = specifier.startsWith('.') && existsSync(target)
      && (inside(target, domain) || (inside(file, application) && inside(target, application)));
    if (!allowed) {
      const line = source.slice(0, token.start).split('\n').length;
      violations.push(`${relative(process.cwd(), file)}:${line} dépend de ${specifier}`);
    } else if (inside(file, queries) && !(inside(target, domain) || inside(target, dto) || inside(target, queries)
      || (inside(target, ports) && readPorts.has(basename(target, '.ts'))))) {
      violations.push(`${relative(process.cwd(), file)} : une requête dépend de ${specifier}, hors de ses contrats de lecture`);
    } else if (inside(file, dto) && !(inside(target, domain) || inside(target, dto))) {
      violations.push(`${relative(process.cwd(), file)} : un DTO dépend d'une orchestration ${specifier}`);
    }
  };
  // Le scanner TypeScript 7 ignore commentaires et chaînes ordinaires ; seules
  // les déclarations de modules et les appels import/require sont contrôlés.
  for (let index = 0; index < tokens.length; index++) {
    const token = tokens[index];
    const next = tokens[index + 1];
    if ((token.text === 'import' || token.text === 'require') && next?.text === '(') {
      if (tokens[index + 2]?.kind === SyntaxKind.StringLiteral && tokens[index + 3]?.text === ')') check(tokens[index + 2]);
      else violations.push(`${relative(process.cwd(), file)} : dépendance dynamique non vérifiable`);
    } else if (token.text === 'import' && next?.kind === SyntaxKind.StringLiteral) {
      check(next);
    } else if (token.text === 'import' || token.text === 'export') {
      for (let cursor = index + 1; cursor < tokens.length && tokens[cursor].text !== ';'; cursor++) {
        if (tokens[cursor].text === 'from' && tokens[cursor + 1]?.kind === SyntaxKind.StringLiteral) {
          check(tokens[cursor + 1]);
          break;
        }
      }
    }
  }
}

if (violations.length) {
  console.error(violations.join('\n'));
  process.exitCode = 1;
} else {
  console.log(`Architecture vérifiée : ${files(domain).length} fichiers domaine, ${files(application).length} fichiers application, ${imports} imports internes autorisés.`);
  if (existsSync(queries)) console.log('CQRS vérifié : les requêtes importent uniquement les contrats de lecture, DTO et règles du domaine.');
}
