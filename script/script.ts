import * as ts from 'typescript';
import * as fs from 'fs';

async function run(filePath: string) {
  const sourceCode = fs.readFileSync(filePath, 'utf-8');
  const sourceFile = ts.createSourceFile(
    filePath,
    sourceCode,
    ts.ScriptTarget.Latest,
  );

  ts.forEachChild(sourceFile, visit);
}

function visit(node: ts.Node) {
  if (!ts.isClassDeclaration(node)) {
    return;
  }

  const classDecorators =
    node.modifiers?.filter((modifier) => ts.isDecorator(modifier)) || [];

  let version: string | undefined;
  let apiPath: string | undefined;
  for (const decorator of classDecorators) {
    const expression = decorator.expression;
    if (ts.isCallExpression(expression)) {
      // 컨트롤러 데코레이터 정보 읽어오기
      if (isControllerDecorator(expression)) {
        apiPath = extractPathArgument(expression);
        const properties = extractObjectLiteralProperties(expression);
        version = properties.version;
        apiPath = properties.path;
      }

      // 메서드 데코레이터 정보 읽어오기
    }
  }

  console.log(version);
  console.log(apiPath);
}

// 특정 데코레이터가 Controller인지 확인하는 함수
function isControllerDecorator(callExpression: ts.CallExpression): boolean {
  if (ts.isIdentifier(callExpression.expression)) {
    return callExpression.expression.escapedText === 'Controller';
  }
  return false;
}

// 문자열 인자 추출 함수
function extractPathArgument(
  callExpression: ts.CallExpression,
): string | undefined {
  const argument = callExpression.arguments.find((arg) =>
    ts.isStringLiteral(arg),
  );
  return argument ? (argument as ts.StringLiteral).text : undefined;
}

// ObjectLiteralExpression에서 속성 추출 함수
function extractObjectLiteralProperties(callExpression: ts.CallExpression): {
  version?: string;
  path?: string;
} {
  const objectLiteralExpression = callExpression.arguments.find((arg) =>
    ts.isObjectLiteralExpression(arg),
  );
  if (!objectLiteralExpression) {
    return {};
  }

  const properties: { version?: string; path?: string } = {};
  const propertyAssignments = objectLiteralExpression.properties.filter(
    (property) => ts.isPropertyAssignment(property),
  );

  for (const propertyAssignment of propertyAssignments) {
    const propertyName = propertyAssignment.name;
    const initializer = propertyAssignment.initializer;

    if (ts.isIdentifier(propertyName) && ts.isStringLiteral(initializer)) {
      const name = propertyName.escapedText;
      if (name === 'version') {
        properties.version = initializer.text;
      } else if (name === 'path') {
        properties.path = initializer.text;
      }
    }
  }

  return properties;
}

run('src/app.controller.ts');
