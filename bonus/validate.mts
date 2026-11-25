import ts from 'typescript';
import { candidateLimit, resemblesCredential } from './paths.mts';

const imports = new Map([
  ['../../fixtures/ui.fixture', new Set(['test', 'expect'])],
  ['../../test-data/products', new Set(['cartProductNames'])],
  ['../../test-data/users', new Set(['standardUser', 'invalidPassword'])],
  ['../../test-data/customers', new Set(['validCustomer'])],
]);

const fixtures = new Set(['page', 'loginPage', 'inventoryPage', 'authenticatedPage', 'cartPage', 'checkoutPage']);
const bindableData = new Set(['name', 'price', 'quantity']);
const matchers = new Set(`
  toBe toEqual toStrictEqual toHaveLength toMatch toContain toContainEqual
  toHaveURL toHaveCount toHaveText toBeVisible toBeHidden toBeEditable toBeEnabled
  toHaveValue toBeGreaterThan toBeGreaterThanOrEqual toBeLessThan toBeLessThanOrEqual
`.trim().split(/\s+/));

// Raw Page and Locator capabilities are intentionally absent. This is a narrow
// candidate syntax policy, not an isolation boundary for executing JavaScript.
const properties = new Set(`
  open login form usernameInput passwordInput loginButton errorMessage
  inventoryList products cartButton cartBadge sortDropdown getProductSummaries getProduct
  sortProducts addProductToCart openCart addToCartButton removeButton productImageAt
  getProducts productByName removeProduct startCheckout cartList checkoutButton
  fillCustomerInfo continueToOverview overviewProductByName getItemTotal getTax getTotal
  finishOrder backToProducts title informationForm firstNameInput lastNameInput postalCodeInput
  continueButton overviewList overviewProducts itemTotal tax total finishButton successMessage backHomeButton
  backpack bikeLight username password name price quantity firstName lastName postalCode
  url map sort every length poll arrayContaining objectContaining not
`.trim().split(/\s+/));

export const candidateMembers = [...properties, ...matchers].join(', ');

const allowedSyntax = new Set<ts.SyntaxKind>([
  ts.SyntaxKind.Block, ts.SyntaxKind.VariableStatement, ts.SyntaxKind.VariableDeclarationList,
  ts.SyntaxKind.VariableDeclaration, ts.SyntaxKind.ExpressionStatement, ts.SyntaxKind.AwaitExpression,
  ts.SyntaxKind.CallExpression, ts.SyntaxKind.PropertyAccessExpression, ts.SyntaxKind.Identifier,
  ts.SyntaxKind.ArrowFunction, ts.SyntaxKind.AsyncKeyword, ts.SyntaxKind.Parameter,
  ts.SyntaxKind.EqualsGreaterThanToken, ts.SyntaxKind.ObjectBindingPattern, ts.SyntaxKind.BindingElement,
  ts.SyntaxKind.ParenthesizedExpression, ts.SyntaxKind.ObjectLiteralExpression, ts.SyntaxKind.PropertyAssignment,
  ts.SyntaxKind.ShorthandPropertyAssignment, ts.SyntaxKind.ArrayLiteralExpression,
  ts.SyntaxKind.StringLiteral, ts.SyntaxKind.NoSubstitutionTemplateLiteral, ts.SyntaxKind.NumericLiteral,
  ts.SyntaxKind.RegularExpressionLiteral, ts.SyntaxKind.TrueKeyword, ts.SyntaxKind.FalseKeyword,
  ts.SyntaxKind.ReturnStatement, ts.SyntaxKind.BinaryExpression, ts.SyntaxKind.MinusToken,
  ts.SyntaxKind.EqualsEqualsEqualsToken, ts.SyntaxKind.ExclamationEqualsEqualsToken,
  ts.SyntaxKind.LessThanToken, ts.SyntaxKind.LessThanEqualsToken, ts.SyntaxKind.GreaterThanToken,
  ts.SyntaxKind.GreaterThanEqualsToken, ts.SyntaxKind.AmpersandAmpersandToken, ts.SyntaxKind.BarBarToken,
]);

export class CandidateError extends Error {
  readonly stage: 'syntax' | 'static' | 'typecheck';

  constructor(stage: CandidateError['stage'], message: string) {
    super(`Candidate ${stage} failed. ${message}`);
    this.stage = stage;
  }
}

function describeDiagnostic(diagnostic: ts.Diagnostic, source: ts.SourceFile): string {
  const line = diagnostic.file === source && diagnostic.start !== undefined
    ? ` at line ${source.getLineAndCharacterOfPosition(diagnostic.start).line + 1}`
    : '';
  return `TS${diagnostic.code}${line}`;
}

function verifyStructure(source: ts.SourceFile): ts.CallExpression {
  const seen = new Set<string>();
  const statements = [...source.statements];
  const declaration = statements.pop();
  for (const statement of statements) {
    if (!ts.isImportDeclaration(statement) || !ts.isStringLiteral(statement.moduleSpecifier)
      || statement.attributes || statement.importClause?.name || statement.importClause?.isTypeOnly) {
      throw new CandidateError('static', 'Only supported named imports may precede the test.');
    }
    const allowed = imports.get(statement.moduleSpecifier.text);
    const bindings = statement.importClause?.namedBindings;
    if (!allowed || !bindings || !ts.isNamedImports(bindings) || !bindings.elements.length) {
      throw new CandidateError('static', 'Import source or form is prohibited.');
    }
    for (const binding of bindings.elements) {
      if (binding.propertyName || binding.isTypeOnly || !allowed.has(binding.name.text) || seen.has(binding.name.text)) {
        throw new CandidateError('static', 'Unexpected import binding.');
      }
      seen.add(binding.name.text);
    }
  }
  if (!seen.has('test') || !seen.has('expect') || !declaration || !ts.isExpressionStatement(declaration)
    || !ts.isCallExpression(declaration.expression)) {
    throw new CandidateError('static', 'Expected named fixture imports and one top-level test declaration.');
  }
  const call = declaration.expression;
  const [title, body] = call.arguments;
  if (!ts.isIdentifier(call.expression) || call.expression.text !== 'test' || call.arguments.length !== 2
    || !ts.isStringLiteral(title) || !title.text.trim() || !ts.isArrowFunction(body)
    || !body.modifiers?.some(modifier => modifier.kind === ts.SyntaxKind.AsyncKeyword)
    || !ts.isBlock(body.body) || body.parameters.length !== 1 || body.parameters[0].initializer) {
    throw new CandidateError('static', 'Expected a plain test with a literal title and async fixture callback.');
  }
  const parameter = body.parameters[0].name;
  if (!ts.isObjectBindingPattern(parameter) || !parameter.elements.length || parameter.elements.some(
    element => !ts.isIdentifier(element.name) || !fixtures.has(element.name.text)
      || element.propertyName || element.dotDotDotToken || element.initializer,
  )) {
    throw new CandidateError('static', 'Unsupported fixture binding.');
  }
  return call;
}

function assertionBinding(call: ts.CallExpression): ts.Identifier | undefined {
  const matcher = call.expression;
  if (!ts.isPropertyAccessExpression(matcher) || !matchers.has(matcher.name.text)) return;
  let subject = matcher.expression;
  if (ts.isPropertyAccessExpression(subject) && subject.name.text === 'not') subject = subject.expression;
  if (!ts.isCallExpression(subject)) return;
  let binding = subject.expression;
  if (ts.isPropertyAccessExpression(binding) && binding.name.text === 'poll') binding = binding.expression;
  if (ts.isIdentifier(binding) && binding.text === 'expect') return binding;
}

function isPrimitiveLiteral(node: ts.Expression | undefined): boolean {
  while (node && ts.isParenthesizedExpression(node)) node = node.expression;
  return !!node && (ts.isStringLiteralLike(node) || ts.isNumericLiteral(node)
    || node.kind === ts.SyntaxKind.TrueKeyword || node.kind === ts.SyntaxKind.FalseKeyword);
}

export function validateCandidate(code: string, file: string): void {
  if (Buffer.byteLength(code) > candidateLimit || !code.trim()) {
    throw new CandidateError('syntax', 'Expected nonempty TypeScript within the size limit.');
  }
  const source = ts.createSourceFile(file, code, ts.ScriptTarget.ES2022, true, ts.ScriptKind.TS);
  const syntax = ts.transpileModule(code, {
    fileName: file, reportDiagnostics: true, compilerOptions: { target: ts.ScriptTarget.ES2022 },
  }).diagnostics ?? [];
  if (syntax.length) throw new CandidateError('syntax', describeDiagnostic(syntax[0], source));
  if (source.referencedFiles.length || source.typeReferenceDirectives.length || source.libReferenceDirectives.length
    || /@(?:ts-(?:no(?:check)?|ignore|expect-error|check)|jsx)\b|^#!|source(?:Mapping)?URL\s*=/im.test(code)) {
    throw new CandidateError('static', 'Compiler and source-map directives are prohibited.');
  }
  if (resemblesCredential(code)) {
    throw new CandidateError('static', 'Output resembles a credential.');
  }
  const test = verifyStructure(source);
  const callback = test.arguments[1] as ts.ArrowFunction;
  function visit(node: ts.Node): void {
    if (!allowedSyntax.has(node.kind)) {
      const line = source.getLineAndCharacterOfPosition(node.getStart(source)).line + 1;
      throw new CandidateError('static', `Prohibited TypeScript construct (${ts.SyntaxKind[node.kind]}) at line ${line}.`);
    }
    if (ts.isPropertyAccessExpression(node) && !properties.has(node.name.text) && !matchers.has(node.name.text)) {
      throw new CandidateError('static', 'Property access is outside the supported UI test API.');
    }
    if (ts.isBindingElement(node) && node.parent !== callback.parameters[0].name
      && (!ts.isIdentifier(node.name) || !bindableData.has(node.name.text) || node.propertyName
        || node.dotDotDotToken || node.initializer)) {
      throw new CandidateError('static', 'Only simple product-data destructuring is supported inside the test.');
    }
    if ((ts.isPropertyAssignment(node) || ts.isShorthandPropertyAssignment(node))
      && (ts.isIdentifier(node.name) || ts.isStringLiteral(node.name))
      && ['timeout', '__proto__'].includes(node.name.text)) {
      throw new CandidateError('static', 'Explicit timeouts and prototype keys are prohibited.');
    }
    if (ts.isVariableDeclarationList(node) && !(node.flags & ts.NodeFlags.Const)) {
      throw new CandidateError('static', 'Only const declarations are supported.');
    }
    ts.forEachChild(node, visit);
  }
  visit(test);

  const options: ts.CompilerOptions = {
    target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.NodeNext, strict: true, noEmit: true, types: ['node'],
  };
  const host = ts.createCompilerHost(options);
  const originalGetSourceFile = host.getSourceFile.bind(host);
  const canonical = (name: string) => host.getCanonicalFileName(name.replaceAll('\\', '/'));
  host.getSourceFile = (name, version, onError, shouldCreateNewSourceFile) =>
    canonical(name) === canonical(file)
      ? source
      : originalGetSourceFile(name, version, onError, shouldCreateNewSourceFile);
  const program = ts.createProgram([file], options, host);
  const checker = program.getTypeChecker();
  let foundAssertion = false;
  function verifyBindings(node: ts.Node): void {
    if (ts.isCallExpression(node)) {
      const binding = assertionBinding(node);
      if (binding && checker.getSymbolAtLocation(binding)?.declarations?.some(ts.isImportSpecifier)) {
        if (ts.isCallExpression(binding.parent) && isPrimitiveLiteral(binding.parent.arguments[0])
          && isPrimitiveLiteral(node.arguments[0])) {
          throw new CandidateError('static', 'Assertions comparing only primitive literals are prohibited.');
        }
        foundAssertion = true;
      }
    }
    if (ts.isIdentifier(node)) {
      const { parent } = node;
      const propertyName = (ts.isPropertyAccessExpression(parent) || ts.isPropertyAssignment(parent)) && parent.name === node;
      if (!propertyName) {
        const symbol = ts.isShorthandPropertyAssignment(parent)
          ? checker.getShorthandAssignmentValueSymbol(parent)
          : checker.getSymbolAtLocation(node);
        if (!symbol?.declarations?.some(binding => binding.getSourceFile() === source)) {
          throw new CandidateError('static', 'Only local and approved imported bindings are available.');
        }
        if (node.text === 'test' && node !== test.expression && symbol.declarations.some(ts.isImportSpecifier)) {
          throw new CandidateError('static', 'The imported test function is reserved for the top-level declaration.');
        }
      }
    }
    ts.forEachChild(node, verifyBindings);
  }
  verifyBindings(test);
  if (!foundAssertion) throw new CandidateError('static', 'Expected a Playwright matcher call.');
  const diagnostics = ts.getPreEmitDiagnostics(program);
  if (diagnostics.length) {
    throw new CandidateError('typecheck', diagnostics.slice(0, 5).map(item => describeDiagnostic(item, source)).join(', '));
  }
}
