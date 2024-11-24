/*
 * MIT License
 *
 * Copyright (c) 2017 Hundredrabbits
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in all
 * copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
 * SOFTWARE.
 *
 */
/**
 * This file is extracted from: https://github.com/hundredrabbits/Ronin
 */
'use strict';

// In the real world, it didn’t matter if I was there or not.
// When I realized that, I was no longer afraid of losing my body.


// using _this_ keyword as a special type ╰(*°▽°*)╯
class Context {
  scope: any
  parent: any
  constructor(scope?: any, parent?: any) {
    this.scope = scope
    this.parent = parent
  }
  get(identifier?: string): string | undefined {
    if (identifier === undefined) { return undefined }
    if (identifier in this.scope) {
      return this.scope[identifier];
    }
    else if (this.parent !== undefined) {
      return this.parent.get(identifier);
    }
    return undefined
  };
}

enum TYPES { identifier, number, string, bool, symbol };

type Kind = {
  [x: string]: any;
  type: TYPES
  value: any | any[]
  host?: string
}

class Lain {
  context: Context
  lib: any

  constructor(lib?: any) {
    if (this.lib === void 0) { this.lib = {}; }
    this.context = new Context(0)
  }

  interpret(input: any, context: any | undefined = undefined): any {
    if (!input) {
      console.warn('Lain', context.scope);
      return null;
    }
    if (context === undefined) {
      return this.interpret(input, new Context(this.lib));
    }
    else if (input instanceof Array) {
      return this.interpretList(input, context);
    }
    else if (input.type === TYPES.identifier) {
      return context.get(input.value);
    }
    else if (input.type === TYPES.number || input.type === TYPES.symbol || input.type === TYPES.string || input.type === TYPES.bool) {
      return input.value;
    }
  };


  // var TYPES = { identifier: 0, number: 1, string: 2, bool: 3, symbol: 4 };
  special: any = {
    let: function (input: Kind[], context: Context): string {
      var letContext = input[1].reduce(function (acc: Kind, x: Kind) {
        acc.scope[x[0].value] = this.interpret(x[1], context);
        return acc;
      }, new Context({}, context));
      return this.interpret(input[2], letContext);
    },
    def: function (input: any, context: any) {
      if (input.length !== 3) {
        console.warn('Lain', 'Invalid definition.');
        return;
      }
      var identifier = input[1].host ? input[1].host : input[1].value;
      if (input[1].host) {
        if (!context.scope[identifier]) {
          context.scope[identifier] = {};
        }
        context.scope[identifier][input[1].value] = this.interpret(input[2], context);
        return context.scope[identifier][input[1].value];
      }
      console.log("This is the variable name: ", identifier);
      context.scope[identifier] = this.interpret(input[2], context);
      return context.scope[identifier];
    },
    add: function (input: Kind[], context: Context) {
      if (input.length !== 3) {
        console.warn('Lain', "Please provide more arguments for add function");
        return;
      }
      console.log(input);
      // we are cheking the input, cause it may that user wants to run the add function inside
      // another function (defn), because functions will run at runtime, we need to get the value
      // of them when we run the add function.
      var number1 = context.get(input[1].value) ? context.get(input[1].value) : input[1].value;
      var number3 = context.get(input[2].value) ? context.get(input[2].value) : input[2].value;
      return number1 + number3;
    },
    // call: function (input, context) {
    //   // if (input.length !== 3) { console.warn('Lain', "Please provide more arguments for add function"); return }
    //   const func = input[1].value
    //   console.log("The Function Name: ", context.get(func))
    //   return context.get(func)()
    //   // return 3
    // },
    defn: function (input: Kind[], context: Context) {
      var identifier = input[1].value;
      if (context.scope[identifier]) {
        console.warn('Lain', "Redefining function: ".concat(identifier));
      }
      var fnParams = input[2].type === TYPES.string && input[3] ? input[3] : input[2];
      // console.log("This is the parameter: ", fnParams[0].value, context.get(fnParams[0].value))
      var fnBody = input[2].type === TYPES.string && input[4] ? input[4] : input[3];
      context.scope[identifier] = function () {
        var lambdaArguments = arguments;
        var lambdaScope = fnParams.reduce(function (acc: Kind[], x: Kind, i: number) {
          acc[x.value] = lambdaArguments[i];
          return acc;
        }, {});
        return this.interpret(fnBody, new Context(lambdaScope, context));
      };
    },
    // idk if this function will work ...
    λ: function (input: Array<Kind>, context: Context): Function {
      return function (): any {
        var lambdaArguments = arguments;
        var lambdaScope = input[1].reduce(function (acc: Kind[], x: Kind, i: number) {
          acc[x.value] = lambdaArguments[i];
          return acc;
        }, {});
        return this.interpret(input[2], new Context(lambdaScope, context));
      };
    },
    if: function (input: Kind[], context: Context): string | [] {
      return this.interpret(input[1], context) ? this.interpret(input[2], context) : input[3] ? this.interpret(input[3], context) : [];
    }
  };
  interpretList(input: Kind[], context: Context): string[] | string {
    if (input.length > 0 && input[0].value in this.special) {
      return this.special[input[0].value](input, context);
    }
    var list = [];

    for (var i = 0; i < input.length; i++) {
      if (input[i].type === TYPES.symbol) {
        if (input[i].host) {
          var host = context.get(input[i].host);
          if (host) {
            list.push(host[input[i].value]);
          }
        }
        else {
          list.push(function (obj: Kind[]) {
            return obj[input[i].value];
          });
        }
      }
      else {
        list.push(this.interpret(input[i], context));
      }
    };
    return list[0] instanceof Function ? list[0].apply(this, list.slice(1)) : list;
  };

  categorize(input: string): Kind {
    if (!isNaN(parseFloat(input))) {
      return { type: TYPES.number, value: parseFloat(input) };
    }
    else if (input[0] === '"' && input.slice(-1) === '"') {
      return { type: TYPES.string, value: input.slice(1, -1) };
    }
    else if (input[0] === ':') {
      return { type: TYPES.symbol, value: input.slice(1) };
    }
    else if (input.indexOf(':') > 0) {
      return { type: TYPES.symbol, host: input.split(':')[0], value: input.split(':')[1] };
    }
    else if (input === 'true' || input === 'false') {
      return { type: TYPES.bool, value: input === 'true' };
    }
    else {
      return { type: TYPES.identifier, value: input };
    }
  };
  parenthesize(input: string[], list?: any): Kind[] {
    if (list === undefined) {
      return this.parenthesize(input, []);
    }
    var token = input.shift();
    if (token === undefined) {
      return list.pop();
    }
    else if (token === '(') {
      list.push(this.parenthesize(input, []));
      return this.parenthesize(input, list);
    }
    else if (token === ')') {
      return list;
    }
    else {
      return this.parenthesize(input, list.concat(this.categorize(token)));
    }
  };
  tokenize(input: string): string[] {
    var i = input.replace(/^[\s]*;.*\n?/gm, '').split('"');
    return i.map(function (x, i) {
      return i % 2 === 0 ? x.replace(/\(/g, ' ( ').replace(/\)/g, ' ) ') : x.replace(/ /g, '!ws!');
    }).join('"').trim().split(/\s+/).map(function (x) { return x.replace(/!ws!/g, ' '); });
  };
  run(input: string): string {
    // console.log(tokenize(input))
    console.log(this.parenthesize(this.tokenize(input)));
    return this.interpret(this.parenthesize(this.tokenize(input)));
  };
}
var lain = new Lain();
console.log(lain.run("( (defn ashkan (value) (add 3 3)) (ashkan 5) )"));
