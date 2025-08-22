# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.5.0] - 2025-01-27

### Added
- **`useText` Hook**: New utility hook for declarative text content updates
  - `useText(element, textFunction, deps?)` - Set text content reactively with dependencies
  - Function receives element and returns text to display
  - Supports React-like useEffect behavior - runs on mount and when dependencies change
  - Integrated with chainable `with()` API for fluent composition
  - Comprehensive validation with graceful error handling

### Enhanced
- **Documentation**: Updated README with `useText` examples throughout
  - Replaced manual `textContent` assignments with cleaner `useText` calls
  - Added to API reference and declarative content hooks sections
  - Updated Quick Example and Advanced Patterns sections

### Technical
- Added comprehensive test suite with 17 passing tests
- Exported from main package and utility hooks index
- Follows existing hook patterns for consistency

## [0.4.2] - 2025-01-27

### Fixed
- **Auto-registration**: Fixed bundler auto-registration to properly handle componentPath limitations
  - Bundler environments now gracefully handle static analysis requirements
  - Node.js filesystem auto-registration continues to work with any componentPath
  - Improved debug messaging for environment-specific behavior

- **Default Export Support**: Added default export to enable `import HookTML from 'hooktml'` syntax
  - Default export provides access to all functions as object methods (e.g., `HookTML.start()`)
  - Maintains backward compatibility with named imports (e.g., `import { start } from 'hooktml'`)
  - Supports mixed import patterns for maximum flexibility

## [0.4.0] - 2025-07-24

### Added
- **Array Support for All Hooks**: All utility hooks now support arrays of elements with per-element logic
  - `useClasses(elements, { className: (el, index) => condition })` - Apply classes with element-specific functions
  - `useStyles(elements, { property: (el, index) => value })` - Apply styles with element-specific functions  
  - `useAttributes(elements, { attr: (el, index) => value })` - Set attributes with element-specific functions
  - `useEvents(elements, { event: (event, index) => handler })` - Event handlers receive both event and element index
- **Manual Dependencies**: All utility hooks now accept optional deps array for explicit reactivity control
  - `useClasses(elements, classMap, [signal])` - Control when classes update based on signals
  - `useStyles(elements, styleMap, [signal])` - Control when styles update based on signals
  - `useAttributes(elements, attrMap, [signal])` - Control when attributes update based on signals
  - `useEvents(elements, eventMap, [signal])` - Control when event handlers update based on signals

### Enhanced
- **Graceful Nil Handling**: All hooks now handle `null`/`undefined` elements gracefully with warnings instead of throwing errors
- **Memory Optimization**: WeakMap-based per-element tracking for automatic garbage collection
- **API Consistency**: All hooks follow the same patterns for array support and mixed condition types

### Technical
- Added `isHTMLElementArray` type guard for consistent array validation
- Enhanced test coverage with 290 total passing tests
- Improved documentation with array support examples

## [0.3.0] - 2025-07-08

### Added
- **Browser Script Tag Support**: HookTML can now be imported via `<script>` tag for direct HTML usage
  - Global build available at `index.global.js` - exposes `HookTML` global object
  - Browser build available at `index.browser.js` - optimized for browser environments
  - CDN-ready distribution for quick prototyping and development

### Enhanced
- **Multiple Export Formats**: Package now supports Node.js, browser, and global script environments
- **Improved Package Structure**: Clear separation between different build targets

### Technical
- Added `index.global.js` and `index.browser.js` build outputs
- Updated package.json exports for better module resolution
- Enhanced build pipeline for multiple distribution formats 
