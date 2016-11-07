/**
 * @author Nicholas Hwang
 * @license MIT
 * @module transforms/react-addons-imports.js
 */

/**
 * Create partially bound function
 *
 * @param   {function} fn   Function to bind
 * @param   {...any}   args Arguments
 * @returns {function}      Partially bound function
 */
function partial(fn, ...args) {
  return fn.bind(fn, ...args);
}

/**
 * React addons name to import path
 *
 * @constant
 */
const ADDONS_IMPORTS = {
  'PureRenderMixin': 'react-addons-pure-render-mixin',
  'LinkedStateMixin': 'react-addons-linked-state-mixin',
  'CSSTransitionGroup': 'react-addons-css-transition-group',
  'shallowCompare': 'react-addons-shallow-compare',
  'TransitionGroup': 'react-addons-transition-group',
  'createFragment': 'react-addons-create-fragment',
  'Perf': 'react-addons-perf',

  // NOTE: Ignore for now
  // 'update': 'react-addons-update'
};

/**
 * React addons import path to name
 *
 * @constant
 */
const ADDONS_PATHS = Object
  .keys(ADDONS_IMPORTS)
  .reduce(
    (memo, key) => {
      return Object.assign({}, memo, {
        [ADDONS_IMPORTS[key]]: key
      });
    },
    {}
  );

/**
 * Check if object has own key
 *
 * @param   {object}  object Object to check key
 * @param   {string}  key    Key to check
 * @returns {boolean}        Whether object has key
 */
function has(object, key) {
  return {}.hasOwnProperty.call(object, key);
}

/**
 * React addons codemod
 *
 * @param   {object}   file            File information
 * @param   {object}   file.source     File source
 * @param   {object}   api             Codemod API
 * @param   {function} api.jscodeshift JSCodeShift API
 * @returns {object}                   Transformed source
 */
module.exports = (
  { source },
  { jscodeshift: j }
) => {
  const root = j(source);

  /**
   * Removes extraneous addon named imports
   *
   * @param   {ASTNode} node    AST node to traverse
   * @param   {object}  current Current addon usages
   * @returns {object}          Updated addon usages
   */
  const removeExtraneousAddonsImport = (node, current = {}) => {
    node
      .find(j.ImportDeclaration)
      .replaceWith(path => {
        const {
          value,
          value: {
            specifiers
          }
        } = path;

        const addons = specifiers.filter(
          ({ type, id: { name } }) => {
            return type === 'ImportSpecifier' && name === 'addons';
          }
        );

        if (!addons.length) {
          return value;
        }

        const imports = specifiers.reduce(
          (memo, specifier) => {
            const { type, id: { name } } = specifier;

            if (type === 'ImportSpecifier' && name === 'addons') {
              return memo;
            }

            return [...memo, specifier];
          },
          []
        );

        if (!imports.length) {
          return null;
        }

        return Object.assign({}, value, {
          specifiers: imports
        });
      });

    return current;
  };

  /**
   * Removes variable declarations of React addons
   *
   * @param   {ASTNode} node    AST node to traverse
   * @param   {object}  current Current addon usages
   * @returns {object}          Updated addon usages
   */
  const removeAddonVariableDeclarations = (node, current = {}) => {
    const used = Object.assign({}, current);

    node
      .find(j.VariableDeclaration)
      .forEach(path => {
        j(path.value)
          .find(j.Identifier)
          .filter(({ value: { name } }) => has(ADDONS_IMPORTS, name))
          .forEach(subpath => {
            const {
              value: {
                name
              },
              parentPath: {
                value: {
                  type: type
                }
              }
            } = subpath;

            if (['MemberExpression', 'PropertyPattern'].includes(type)) {
              used[name] = true;

              try {
                if (!j(path.value).find(j.CallExpression).size()) {
                  path.prune();
                }
              }catch (e) {} // eslint-disable-line
            }
          });
      });

    return used;
  };

  /**
   * Removes usages of React addons through nested access
   *
   * @param   {boolean} jsx     Whether to check JSX types
   * @param   {ASTNode} node    AST node to traverse
   * @param   {object}  current Current addon usages
   * @returns {object}          Updated addon usages
   */
  const removeReferences = (jsx, node, current = {}) => {
    const used = Object.assign({}, current);

    node
      .find(j[`${jsx ? 'JSX' : ''}Identifier`])
      .filter(({ value: { name } }) => has(ADDONS_IMPORTS, name))
      .forEach(path => {
        const {
          value: {
            name
          },
          parentPath,
          parentPath: {
            value: {
              type: type
            }
          }
        } = path;

        const MemberExpression = `${jsx ? 'JSX' : ''}MemberExpression`;

        if (has(ADDONS_IMPORTS, name) && type === MemberExpression) {
          used[name] = true;

          j(parentPath).replaceWith(() => {
            const builder = jsx ? 'jsxIdentifier' : 'identifier';
            return j[builder](name);
          });
        }
      });

    return used;
  };

  /**
   * Removes non-JSX usages of React addons through nested access
   *
   * @param   {ASTNode} node    AST node to traverse
   * @param   {object}  current Current addon usages
   * @returns {object}          Updated addon usages
   */
  const removeNestedReferences = partial(removeReferences, false);

  /**
   * Removes JSX usages of React addons through nested access
   *
   * @param   {ASTNode} node    AST node to traverse
   * @param   {object}  current Current addon usages
   * @returns {object}          Updated addon usages
   */
  const removeNestedJSXReferences = partial(removeReferences, true);

  /**
   * Add React addon imports
   *
   * @param   {ASTNode} node    AST node to traverse
   * @param   {object}  imports Used React addon imports
   * @returns {void}
   */
  const addReactAddonImports = (node, imports = {}) => {
    const used = Object.assign({}, imports);

    node
      .find(j.Program)
      .replaceWith(program => {
        const {
          value: original,
          value: {
            body
          }
        } = program;

        const [index] = body.reduce(
          ([memo, done], current, idx) => {
            if (done) {
              return [memo, done];
            }

            const { type } = current;

            switch (type) {
              case 'ExpressionStatement': {
                const { expression: { value } } = current;
                return [
                  value === 'use es6' ? idx : memo,
                  done
                ];
              }

              case 'ImportDeclaration': {
                const { source: { value } } = current;

                if (has(ADDONS_PATHS, value)) {
                  delete used[ADDONS_PATHS[value]];
                  return [idx, true];
                }

                const likeReact = /react/i.test(value);
                const isReact = /^react$/i.test(value);

                return [
                  likeReact ? idx : memo,
                  isReact ? true : done
                ];
              }

              default:
                return [memo, done];
            }
          },
          [0, false]
        );

        const addons = Object
          .keys(used)
          .map(addon => {
            return j.importDeclaration(
              [
                j.importDefaultSpecifier(
                  j.identifier(addon)
                )
              ],
              j.literal(ADDONS_IMPORTS[addon])
            );
          });

        return Object.assign({}, original, {
          body: [
            ...body.slice(0, index + 1),
            ...addons,
            ...body.slice(index + 1)
          ]
        });
      });
  };


  // Transform and get used React addons
  const transforms = [
    removeExtraneousAddonsImport,
    removeAddonVariableDeclarations,
    removeNestedReferences,
    removeNestedJSXReferences
  ];

  const used = transforms.reduce(
    (memo, transform) => transform(root, memo),
    {}
  );

  // Add React addon imports
  addReactAddonImports(root, used);

  // Source
  return root.toSource({
    quote: 'single',
    reuseWhitespace: false
  });
};

module.exports.parser = 'flow';
