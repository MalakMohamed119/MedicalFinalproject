/***************************************************************************************************
 * APPLICATION IMPORTS
 */

/**
 * Zone JS is required by default for Angular itself.
 */
import 'zone.js/dist/zone';  // Included with Angular CLI.

/**
 * Add global to window, assigning the value of window itself.
 */
// @ts-ignore
type GlobalThis = typeof globalThis;
declare const global: GlobalThis;

// @ts-ignore
window.global = window;

/**
 * Import the animation module
 */
import 'zone.js/plugins/zone-patch-rxjs';
import 'zone.js/plugins/zone-patch-promise-test';

/**
 * Add support for global error handling
 */
import './zone-flags';

/**
 * Add support for Web Animations
 */
import 'web-animations-js';

/**
 * Support for IE11
 */
import 'classlist.js';

/**
 * Support for IE11 in Angular Material
 */
import 'core-js/es/array';
import 'core-js/es/reflect';

/**
 * Support for IE11 in Angular animations
 */
import 'web-animations-js';  // Run `npm install --save web-animations-js`.

/**
 * Support for IE11 in Angular forms
 */
import 'core-js/es/object/assign';
import 'core-js/es/object/entries';
import 'core-js/es/object/values';

/**
 * Support for IE11 in Angular HTTP
 */
import 'core-js/es/promise';
import 'core-js/es/set';

/**
 * Support for IE11 in Angular Router
 */
import 'core-js/es/string';

/**
 * Support for IE11 in Angular animations
 */
import 'web-animations-js';

/**
 * Support for IE11 in Angular forms
 */
import 'classlist.js';

/**
 * Support for IE11 in Angular animations
 */
import 'web-animations-js';
