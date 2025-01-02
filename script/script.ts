import * as ts from 'typescript';
import * as fs from 'fs';
import { TypeChecker } from 'typescript';

const httpMethods = ['Get', 'Post', 'Delete', 'Patch', 'Put'];

async function run(filePath: string) {
  const program = ts.createProgram([filePath], {});
  const checker = program.getTypeChecker();

  ts.forEachChild(program.getSourceFile(filePath), (node) => visit(node, checker));
}
function visit(node: ts.Node, checker: TypeChecker) {
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

  const methods = node.members.filter((member) => ts.isMethodDeclaration(member));
  for (const method of methods) {
    let httpMethod: string | undefined;
    if (!ts.isIdentifier(method.name)) {
      continue;
    }
    const methodName = method.name.escapedText.toString();
    let apiPaths: string[] = [];
    extractParameterData(method, checker);

    const methodDecorators = method.modifiers.filter((modifier) =>
      ts.isDecorator(modifier),
    );
    for (const methodDecorator of methodDecorators) {
      const expression = methodDecorator.expression;
      if (!ts.isCallExpression(expression)) {
        continue;
      }

      const data = expression.expression;

      // http method 데코레이터
      if (ts.isIdentifier(data)) {
        if (httpMethods.includes(data.escapedText.toString())) {
          httpMethod = data.escapedText.toString();
        }
      }

      const stringLiteral = expression.arguments.find((arg) => ts.isStringLiteral(arg));
      const arrayLiteralExpression = expression.arguments.find((arg) => ts.isArrayLiteralExpression(arg));
      if (stringLiteral) {
        apiPaths = [stringLiteral.text];
      } else if (arrayLiteralExpression) {
        const stringLiterals = arrayLiteralExpression.elements.filter((element) => ts.isStringLiteral(element));
        apiPaths = stringLiterals.map((stringLiteral) => stringLiteral.text);
      } else {
        apiPaths = ['/'];
      }
    }

    console.log(methodName);
    console.log(httpMethod);
    console.log(apiPaths);
  }
}

function extractParameterData(
  method: ts.MethodDeclaration,
  checker: ts.TypeChecker,
) {
  const parameters = method.parameters;
  for (const parameter of parameters) {
    // console.log(parameter);
    if (parameter.type) {
      const type = checker.getTypeFromTypeNode(parameter.type);
      console.log(type.symbol);
      const typeString = checker.typeToString(type);
      console.log(typeString);
    }
  }
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
