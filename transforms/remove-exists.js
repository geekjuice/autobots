/**
 * @author Nicholas Hwang
 * @license MIT
 * @module transforms/remove-exists.js
 */

/**
 * Import path of `exists` method
 *
 * @constant
 */
const IMPORT_PATH = 'DashboardUI/lib/utils';

/**
 * Name of `exists` method
 *
 * @constant
 */
const NAMED_IMPORT = 'exists';

/**
 * Remove `exists` codemod
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
    * Removes extraneous `exists` named imports
    *
    * @param   {ASTNode} node AST node to traverse
    * @returns {boolean}      Whether exists was imported
    * @private
    */
  const removeExtraneousExistsImports = node => {
    let imported = false;

    node
      .find(j.ImportDeclaration, {
        source: {
          value: IMPORT_PATH
        }
      })
      .replaceWith(path => {
        const {
          value,
          value: {
            specifiers
          }
        } = path;

        const { length } = specifiers.filter(
          ({ type, id: { name } }) => {
            return type === 'ImportSpecifier' && name === NAMED_IMPORT;
          }
        );

        imported = imported || length > 0;

        if (!length) {
          return value;
        }

        const imports = specifiers.reduce(
          (memo, specifier) => {
            const { type, id: { name } } = specifier;

            if (type === 'ImportSpecifier' && name === NAMED_IMPORT) {
              return memo;
            }

            return [...memo, specifier];
          },
          []
        );

        if (!imports.length) {
          return null;
        }

        return { ...value, specifiers: imports };
      });

    return imported;
  };

  /**
    * Removes negated usages of `exists` method
    *
    * @param   {ASTNode} node AST node to traverse
    * @returns {void}
    * @private
    */
  const removeNegatedExistsUsages = node => {
    node
      .find(j.UnaryExpression, {
        argument: {
          type: 'CallExpression',
          callee: {
            type: 'Identifier',
            name: NAMED_IMPORT
          }
        }
      })
      .replaceWith(path => {
        const {
          value: {
            argument: {
              arguments: args
            }
          }
        } = path;

        if (args.length !== 1) {
          throw new Error(
            `incorrect usage of 'exists' in ${filename}`
          );
        }

        const [arg] = args;

        return j.binaryExpression(
          '==',
          arg,
          j.literal(null)
        );
      });
  };

  /**
    * Removes usages of `exists` method
    *
    * @param   {ASTNode} node AST node to traverse
    * @returns {void}
    * @private
    */
  const removeExistsUsages = node => {
    node
      .find(j.CallExpression, {
        callee: {
          type: 'Identifier',
          name: NAMED_IMPORT
        }
      })
      .replaceWith(path => {
        const {
          value: {
            arguments: args
          }
        } = path;

        if (args.length !== 1) {
          throw new Error(
            `incorrect usage of 'exists' in ${filename}`
          );
        }

        const [arg] = args;

        return j.binaryExpression(
          '!=',
          arg,
          j.literal(null)
        );
      });
  };

  // Transform
  if (removeExtraneousExistsImports(root)) {
    removeNegatedExistsUsages(root);
    removeExistsUsages(root);
  }

  // Source
  return root.toSource({
    quote: 'single',
    reuseWhitespace: false
  });
};

module.exports.parser = 'flow';
