/**
 * Precision Math & Expression Evaluator for Calculator
 */

export type AngleMode = "DEG" | "RAD";

// Factorial calculation
export function factorial(n: number): number {
  if (n < 0 || !Number.isInteger(n)) return NaN;
  if (n === 0 || n === 1) return 1;
  if (n > 170) return Infinity; // Overflow in double precision
  let res = 1;
  for (let i = 2; i <= n; i++) {
    res *= i;
  }
  return res;
}

// Clean floating point errors (e.g. 0.1 + 0.2 = 0.30000000000000004 -> 0.3)
export function formatResult(value: number): string {
  if (isNaN(value)) return "Error";
  if (!isFinite(value)) return value > 0 ? "Infinity" : "-Infinity";

  // Check if it's very close to an integer
  const roundedInt = Math.round(value);
  if (Math.abs(value - roundedInt) < 1e-12) {
    return roundedInt.toString();
  }

  // To prevent precision noise like 0.30000000000000004
  const precisionStr = parseFloat(value.toPrecision(12)).toString();

  // If very large or tiny, use exponential notation nicely
  if (Math.abs(value) >= 1e15 || (Math.abs(value) < 1e-6 && value !== 0)) {
    return value.toExponential(6).replace(/\.?0+e/, "e");
  }

  return precisionStr;
}

/**
 * Tokenizer & Shunting-yard evaluator for arithmetic and scientific expressions
 */
export function evaluateExpression(
  expr: string,
  angleMode: AngleMode = "DEG"
): { result: number; formatted: string; error?: string } {
  try {
    if (!expr || expr.trim() === "") {
      return { result: 0, formatted: "0" };
    }

    // Replace display symbols with standard symbols
    let sanitized = expr
      .replace(/×/g, "*")
      .replace(/÷/g, "/")
      .replace(/−/g, "-")
      .replace(/π/g, "PI")
      .replace(/e(?![a-zA-Z])/g, "E");

    // Replace constants
    sanitized = sanitized
      .replace(/\bPI\b/g, Math.PI.toString())
      .replace(/\bE\b/g, Math.E.toString());

    // Prepare functions with angle mode consideration
    const degToRad = (x: number) => (x * Math.PI) / 180;
    const radToDeg = (x: number) => (x * 180) / Math.PI;

    const funcs: Record<string, (x: number) => number> = {
      sin: (x) => Math.sin(angleMode === "DEG" ? degToRad(x) : x),
      cos: (x) => {
        const rad = angleMode === "DEG" ? degToRad(x) : x;
        // Fix cos(90) = 0 instead of 6.12e-17
        const val = Math.cos(rad);
        return Math.abs(val) < 1e-12 ? 0 : val;
      },
      tan: (x) => {
        if (angleMode === "DEG" && (Math.abs(x) % 180 === 90)) {
          return NaN;
        }
        const rad = angleMode === "DEG" ? degToRad(x) : x;
        return Math.tan(rad);
      },
      asin: (x) => {
        const rad = Math.asin(x);
        return angleMode === "DEG" ? radToDeg(rad) : rad;
      },
      acos: (x) => {
        const rad = Math.acos(x);
        return angleMode === "DEG" ? radToDeg(rad) : rad;
      },
      atan: (x) => {
        const rad = Math.atan(x);
        return angleMode === "DEG" ? radToDeg(rad) : rad;
      },
      sqrt: (x) => (x < 0 ? NaN : Math.sqrt(x)),
      cbrt: (x) => Math.cbrt(x),
      ln: (x) => (x <= 0 ? NaN : Math.log(x)),
      log: (x) => (x <= 0 ? NaN : Math.log10(x)),
      abs: (x) => Math.abs(x),
      fact: (x) => factorial(Math.round(x)),
      exp: (x) => Math.exp(x),
    };

    // Shunting yard algorithm / safe parser
    // Tokenize
    const tokens: string[] = [];
    let i = 0;
    while (i < sanitized.length) {
      const char = sanitized[i];

      if (/\s/.test(char)) {
        i++;
        continue;
      }

      // Numbers (including decimals)
      if (/\d/.test(char) || (char === "." && /\d/.test(sanitized[i + 1] || ""))) {
        let numStr = "";
        while (i < sanitized.length && (/\d/.test(sanitized[i]) || sanitized[i] === ".")) {
          numStr += sanitized[i];
          i++;
        }
        tokens.push(numStr);
        continue;
      }

      // Words (functions)
      if (/[a-zA-Z]/.test(char)) {
        let word = "";
        while (i < sanitized.length && /[a-zA-Z0-9]/.test(sanitized[i])) {
          word += sanitized[i];
          i++;
        }
        tokens.push(word.toLowerCase());
        continue;
      }

      // Operators and parentheses
      if ("+-*/%^()!".includes(char)) {
        // Detect unary minus
        if (char === "-") {
          const prev = tokens[tokens.length - 1];
          if (
            tokens.length === 0 ||
            prev === "(" ||
            ["+", "-", "*", "/", "%", "^"].includes(prev)
          ) {
            tokens.push("neg");
            i++;
            continue;
          }
        }
        tokens.push(char);
        i++;
        continue;
      }

      // Unknown character
      return { result: NaN, formatted: "Error", error: `Invalid character: ${char}` };
    }

    // Convert tokens using precedence and output queue
    const precedence: Record<string, number> = {
      "+": 1,
      "-": 1,
      "*": 2,
      "/": 2,
      "%": 2,
      "^": 3,
      "neg": 4,
      "!": 5,
    };

    const isRightAssociative: Record<string, boolean> = {
      "^": true,
      "neg": true,
    };

    const outputQueue: string[] = [];
    const operatorStack: string[] = [];

    for (let t = 0; t < tokens.length; t++) {
      const token = tokens[t];

      if (!isNaN(Number(token))) {
        outputQueue.push(token);
      } else if (funcs[token]) {
        operatorStack.push(token);
      } else if (token === "!") {
        // Postfix operator
        outputQueue.push("!");
      } else if (precedence[token] !== undefined) {
        const o1 = token;
        while (operatorStack.length > 0) {
          const o2 = operatorStack[operatorStack.length - 1];
          if (
            o2 !== "(" &&
            funcs[o2] ||
            (precedence[o2] &&
              ((precedence[o2] > precedence[o1]) ||
                (precedence[o2] === precedence[o1] && !isRightAssociative[o1])))
          ) {
            outputQueue.push(operatorStack.pop()!);
          } else {
            break;
          }
        }
        operatorStack.push(o1);
      } else if (token === "(") {
        operatorStack.push(token);
      } else if (token === ")") {
        while (
          operatorStack.length > 0 &&
          operatorStack[operatorStack.length - 1] !== "("
        ) {
          outputQueue.push(operatorStack.pop()!);
        }
        if (operatorStack.length === 0) {
          return { result: NaN, formatted: "Error", error: "Mismatched parentheses" };
        }
        operatorStack.pop(); // Pop '('

        // If the stack has a function on top, pop it to output
        if (
          operatorStack.length > 0 &&
          funcs[operatorStack[operatorStack.length - 1]]
        ) {
          outputQueue.push(operatorStack.pop()!);
        }
      } else {
        return { result: NaN, formatted: "Error", error: `Unknown token: ${token}` };
      }
    }

    while (operatorStack.length > 0) {
      const op = operatorStack.pop()!;
      if (op === "(" || op === ")") {
        return { result: NaN, formatted: "Error", error: "Mismatched parentheses" };
      }
      outputQueue.push(op);
    }

    // Evaluate RPN
    const evalStack: number[] = [];

    for (const token of outputQueue) {
      if (!isNaN(Number(token))) {
        evalStack.push(Number(token));
      } else if (token === "neg") {
        if (evalStack.length < 1) return { result: NaN, formatted: "Error" };
        const val = evalStack.pop()!;
        evalStack.push(-val);
      } else if (token === "!") {
        if (evalStack.length < 1) return { result: NaN, formatted: "Error" };
        const val = evalStack.pop()!;
        evalStack.push(factorial(val));
      } else if (funcs[token]) {
        if (evalStack.length < 1) return { result: NaN, formatted: "Error" };
        const val = evalStack.pop()!;
        evalStack.push(funcs[token](val));
      } else {
        if (evalStack.length < 2) return { result: NaN, formatted: "Error" };
        const b = evalStack.pop()!;
        const a = evalStack.pop()!;
        switch (token) {
          case "+":
            evalStack.push(a + b);
            break;
          case "-":
            evalStack.push(a - b);
            break;
          case "*":
            evalStack.push(a * b);
            break;
          case "/":
            if (b === 0) return { result: NaN, formatted: "Cannot divide by 0" };
            evalStack.push(a / b);
            break;
          case "%":
            evalStack.push(a % b);
            break;
          case "^":
            evalStack.push(Math.pow(a, b));
            break;
          default:
            return { result: NaN, formatted: "Error" };
        }
      }
    }

    if (evalStack.length !== 1) {
      return { result: NaN, formatted: "Error", error: "Malformed expression" };
    }

    const finalVal = evalStack[0];
    return {
      result: finalVal,
      formatted: formatResult(finalVal),
    };
  } catch (err: unknown) {
    return {
      result: NaN,
      formatted: "Error",
      error: err instanceof Error ? err.message : "Calculation error",
    };
  }
}
