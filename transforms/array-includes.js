/**
 * @author Nicholas Hwang
 * @license MIT
 * @module transforms/array-includes.js
 */

/**
 * Flipped operator mappings
 *
 * @constant
 * @private
 */
const FLIPPED_OPERATORS = {
  '<': '>',
  '>': '<',
  '<=': '>=',
  '>=': '<='
};

/**
 * Array#indexOf -> Array#includes codemod
 *
 * @param   {object}   file            File information
 * @param   {object}   file.source     File source
 * @param   {object}   file.path       File path
 * @param   {object}   api             Codemod API
 * @param   {function} api.jscodeshift JSCodeShift API
 * @returns {object}                   Transformed source
 */
module.exports = (
  { source, path: filename },
  { jscodeshift: j }
) => {
  const root = j(source);

  /**
   * Node uses Array#indexOf
   *
   * @param   {ASTNode} node AST node to check
   * @returns {boolean}      Whether indexOf is used
   * @private
   */
  const usesIndexOf = node => {
    return node.type === 'CallExpression'
      && node.callee.type === 'MemberExpression'
      && node.callee.property.type === 'Identifier'
      && node.callee.property.name === 'indexOf';
  };

  /**
   * Whether node is the number -1
   *
   * @param   {ASTNode} node AST node to check
   * @returns {boolean}      Whether node is -1
   * @private
   */
  const isNegativeOne = node => {
    return node.type === 'UnaryExpression'
      && node.argument.type === 'Literal'
      && node.argument.value === 1;
  };

  /**
   * Whether node is the number 0
   *
   * @param   {ASTNode} node AST node to check
   * @returns {boolean}      Whether node is 0
   * @private
   */
  const isZero = node => {
    return node.type === 'Literal'
      && node.value === 0;
  };

  /**
   * Whether node is 0 or -1
   *
   * @param   {ASTNode} node AST node to check
   * @returns {boolean}      Whether node is 0 or -1
   * @private
   */
  const isNegativeOneOrZero = node => {
    return isNegativeOne(node) || isZero(node);
  };

  /**
   * Flip binary operator
   *
   * @param   {string} operator Binary operator
   * @returns {string}          Flipped binary operator
   * @private
   */
  const flip = operator => {
    return {}.hasOwnProperty.call(FLIPPED_OPERATORS, operator)
      ? FLIPPED_OPERATORS[operator]
      : operator;
  };

  /**
   * Whether expression is valid for replacement
   *
   * @param   {ASTNode} node     AST node to check
   * @param   {string}  operator Binary operator
   * @returns {boolean}          Whether expression is valid
   * @private
   */
  const isValidExpression = (node, operator) => {
    return isZero(node)
      ? ['<', '>='].includes(operator)
      : ['===', '!==', '>'].includes(operator);
  };

  /**
   * Whether to use the negated expression
   *
   * @param   {ASTNode} literal  Numerical AST node
   * @param   {string}  operator Binary operator
   * @returns {boolean}          Whether to use the negated expression
   */
  const isNegatedExpression = (literal, operator) => {
    return isZero(literal)
      ? operator === '<'
      : operator === '===';
  };

  /**
   * Create Array#includes expression
   *
   * @param   {ASTNode} caller    Call expression node
   * @param   {ASTNode} literal   Literal node
   * @param   {string}  operator  Binary operator
   * @returns {ASTNode}           Array#includes expression
   * @private
   */
  const createIncludesExpression = (caller, literal, operator) => {
    const {
      callee: {
        object: array
      },
      arguments: args
    } = caller;

    if (args.length !== 1) {
      throw new Error(
        `incorrect usage of 'indexOf' in ${filename}`
      );
    }

    const [value] = args;

    const expression = j.callExpression(
      j.memberExpression(
        array,
        j.identifier('includes')
      ),
      [value]
    );

    return isNegatedExpression(literal, operator)
      ? j.unaryExpression('!', expression)
      : expression;
  };

  /**
    * Replace inclusive check Array#indexOf with Array#includes
    *
    * @param   {ASTNode} node AST node to traverse
    * @returns {void}
    * @private
    */
  const replaceIndexOfWithIncludes = node => {
    node
      .find(j.BinaryExpression)
      .replaceWith(path => {
        const {
          value,
          value: {
            left,
            right,
            operator
          }
        } = path;

        if (usesIndexOf(left) && isNegativeOneOrZero(right)) {
          if (isValidExpression(right, operator)) {
            return createIncludesExpression(left, right, operator);
          }
        } else if (usesIndexOf(right) && isNegativeOneOrZero(left)) {
          const flippedOperator = flip(operator);
          if (isValidExpression(left, flippedOperator)) {
            return createIncludesExpression(right, left, flippedOperator);
          }
        }

        return value;
      });
  };

  // Transform
  replaceIndexOfWithIncludes(root);

  // Source
  return root.toSource({
    quote: 'single',
    reuseWhitespace: false
  });
};

module.exports.parser = 'flow';
