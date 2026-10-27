import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { basename, relative, dirname, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createScanner, SyntaxKind } from 'typescript/unstable/ast';

const inside = (file, directory) => file.startsWith(directory + sep);
const files = directory => !existsSync(directory) ? [] : readdirSync(directory, { withFileTypes: true }).flatMap(entry =>
  entry.isDirectory() ? files(resolve(directory, entry.name)) : entry.name.endsWith('.ts') ? [resolve(directory, entry.name)] : []);
const readPorts = new Set(['QueryHandler', 'Clock', 'EventReader', 'ReservationReader', 'PaymentAttemptReader', 'UserReader', 'SessionReader']);
const tableOwner = new Map([['users', 'identity'], ['events', 'ticketing'], ['reservations', 'ticketing'], ['payment_attempts', 'ticketing']]);

export function analyzeProject(projectRoot) {
  const root = resolve(projectRoot, 'src');
  const modulesRoot = resolve(root, 'modules');
  const shared = resolve(root, 'shared');
  const sharedDomain = resolve(shared, 'domain');
  const sharedApplication = resolve(shared, 'application');
  const modules = !existsSync(modulesRoot) ? [] : readdirSync(modulesRoot, { withFileTypes: true })
    .filter(entry => entry.isDirectory()).map(entry => ({ name: entry.name, root: resolve(modulesRoot, entry.name) }));
  const owner = file => modules.find(module => inside(file, module.root));
  const allFiles = files(root);
  const violations = [];
  const dependencies = new Map(modules.map(module => [module.name, new Set()]));
  let imports = 0;
  if (modules.length < 2) violations.push('[MODULES] Au moins deux capacités sont attendues.');

  for (const file of allFiles) {
    const source = readFileSync(file, 'utf8');
    const current = owner(file);
    const isTest = current && inside(file, resolve(current.root, 'tests'));
    const isUnit = current && inside(file, resolve(current.root, 'tests/unit'));
    const scanner = createScanner(true, undefined, source);
    const tokens = [];
    for (let kind = scanner.scan(); kind !== SyntaxKind.EndOfFile; kind = scanner.scan()) {
      tokens.push({ kind, text: scanner.getTokenText(), value: scanner.getTokenValue(), start: scanner.getTokenStart() });
    }
    const report = (code, token, message) => {
      const line = source.slice(0, token.start).split('\n').length;
      violations.push(`[${code}] ${relative(projectRoot, file)}:${line} ${message}`);
    };
    const check = token => {
      imports++;
      const specifier = token.value;
      const core = current && ['domain', 'application', 'contracts'].some(layer => inside(file, resolve(current.root, layer)));
      const sharedCore = inside(file, sharedDomain) || inside(file, sharedApplication);
      if (!specifier.startsWith('.')) {
        if (core || sharedCore) report('CLEAN', token, `dépend de la bibliothèque technique ${specifier}`);
        if (isUnit && !['node:assert/strict', 'node:test'].includes(specifier)) report('UNIT_INFRA', token, `un test en mémoire importe ${specifier}`);
        return;
      }
      const target = resolve(dirname(file), specifier.replace(/\.js$/, '.ts'));
      if (!existsSync(target) || !statSync(target).isFile()) { report('MISSING', token, `cible absente ${specifier}`); return; }
      const destination = owner(target);
      if (inside(file, shared) && !inside(target, shared)) {
        report('SHARED', token, `le partage dépend du métier ${specifier}`); return;
      }
      if (destination && destination !== current) {
        const publicEntry = target === resolve(destination.root, 'index.ts');
        const setupEntry = target === resolve(destination.root, 'setup.ts') && file === resolve(root, 'migrate.ts');
        const testEntry = target === resolve(destination.root, 'testing.ts') && file === resolve(root, 'integrations/PaymentSimulator.ts');
        if (!publicEntry && !setupEntry && !testEntry) report('PRIVATE_IMPORT', token, `accède à l'intérieur de ${destination.name} : ${specifier}`);
        if (current && !isTest) dependencies.get(current.name).add(destination.name);
      }
      if (current && !isTest && !inside(target, current.root) && !inside(target, shared)
        && !(destination && target === resolve(destination.root, 'index.ts'))) {
        report('MODULE_ESCAPE', token, `sort de son module via ${specifier}`);
      }
      if (current) {
        const domain = resolve(current.root, 'domain');
        const application = resolve(current.root, 'application');
        const contracts = resolve(current.root, 'contracts');
        const dto = resolve(application, 'dto');
        const queries = resolve(application, 'queries');
        const ports = resolve(application, 'ports');
        if (inside(file, domain) && !(inside(target, domain) || inside(target, sharedDomain))) report('CLEAN', token, 'le domaine dépend du dehors');
        if (inside(file, application) && !(inside(target, application) || inside(target, domain) || inside(target, sharedDomain) || inside(target, sharedApplication))) report('CLEAN', token, 'l application dépend d un adaptateur ou d un autre module');
        if (inside(file, contracts) && !(inside(target, contracts) || inside(target, application) || inside(target, domain) || inside(target, sharedDomain) || inside(target, sharedApplication))) report('CLEAN', token, 'un contrat public dépend d un détail technique');
        if (inside(file, queries) && !(inside(target, domain) || inside(target, sharedDomain) || inside(target, dto) || inside(target, queries)
          || ((inside(target, ports) || inside(target, resolve(sharedApplication, 'ports'))) && readPorts.has(basename(target, '.ts'))))) report('CQRS_READ', token, `requête hors contrat de lecture : ${specifier}`);
        if (inside(file, dto) && !(inside(target, domain) || inside(target, sharedDomain) || inside(target, dto))) report('DTO', token, 'un DTO dépend d une orchestration');
        if (isUnit && !(inside(target, application) || inside(target, domain) || inside(target, contracts)
          || inside(target, resolve(current.root, 'tests/unit')) || inside(target, sharedDomain) || inside(target, sharedApplication))) report('UNIT_INFRA', token, `un test en mémoire importe un détail technique ${specifier}`);
      }
      if (inside(file, sharedDomain) && !inside(target, sharedDomain)) report('CLEAN', token, 'le domaine commun dépend du dehors');
      if (inside(file, sharedApplication) && !(inside(target, sharedDomain) || inside(target, sharedApplication))) report('CLEAN', token, 'les contrats communs dépendent de la technique');
    };
    for (let index = 0; index < tokens.length; index++) {
      const token = tokens[index];
      const next = tokens[index + 1];
      if ((token.text === 'import' || token.text === 'require') && next?.text === '(') {
        if (tokens[index + 2]?.kind === SyntaxKind.StringLiteral && tokens[index + 3]?.text === ')') check(tokens[index + 2]);
        else report('DYNAMIC', token, 'dépendance dynamique non vérifiable');
      } else if (token.text === 'import' && next?.kind === SyntaxKind.StringLiteral) check(next);
      else if (token.text === 'import' || token.text === 'export') {
        for (let cursor = index + 1; cursor < tokens.length && tokens[cursor].text !== ';'; cursor++) {
          if (tokens[cursor].text === 'from' && tokens[cursor + 1]?.kind === SyntaxKind.StringLiteral) { check(tokens[cursor + 1]); break; }
        }
      }
      if (current && !isTest && inside(file, resolve(current.root, 'adapters/postgres'))
        && (token.kind === SyntaxKind.StringLiteral || token.text.startsWith('`'))) {
        for (const match of String(token.value).matchAll(/\b(?:FROM|JOIN|INTO|UPDATE|TABLE)\s+(?:public\.)?"?(users|events|reservations|payment_attempts)\b/gi)) {
          if (tableOwner.get(match[1].toLowerCase()) !== current.name) report('DATA_OWNER', token, `${current.name} accède à la table étrangère ${match[1]}`);
        }
      }
    }
  }
  const visited = new Set();
  const stack = [];
  const walk = module => {
    if (stack.includes(module)) { violations.push(`[CYCLE] ${[...stack, module].join(' -> ')}`); return; }
    if (visited.has(module)) return;
    stack.push(module);
    for (const target of dependencies.get(module) ?? []) walk(target);
    stack.pop(); visited.add(module);
  };
  for (const module of modules) walk(module.name);
  const stats = modules.map(module => ({ name: module.name,
    productionFiles: allFiles.filter(file => inside(file, module.root) && !inside(file, resolve(module.root, 'tests'))).length,
    testFiles: allFiles.filter(file => inside(file, resolve(module.root, 'tests'))).length }));
  return { violations, imports, modules: stats, dependencies: Object.fromEntries([...dependencies].map(([name, targets]) => [name, [...targets].sort()])) };
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const result = analyzeProject(process.cwd());
  if (result.violations.length) { console.error(result.violations.join('\n')); process.exitCode = 1; }
  else {
    console.log(`Architecture vérifiée : ${result.modules.length} modules, ${result.imports} imports, aucun accès privé, cycle ou port d'écriture dans les requêtes.`);
    for (const module of result.modules) console.log(`${module.name} : ${module.productionFiles} sources et ${module.testFiles} fichiers de tests colocalisés.`);
    console.log('Dépendances directes entre modules : ' + JSON.stringify(result.dependencies));
  }
}
