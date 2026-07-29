# Changelog

## 0.1.35

### Fixed

- Fixed `create-next-pro addlib library.module` reducing an existing `src/lib/<library>/index.ts` to only its most recently generated exports. Versions `0.1.20` through `0.1.34` are affected.
- Existing library indexes are now parsed with TypeScript and preserved byte for byte. The command only appends one direct value or type re-export when that change is unambiguous.
- Added exclusive locking, concurrent-change detection, rollback for newly created modules, and structured metadata describing the module, index, and export actions.

### Recovery for affected projects

The CLI cannot infer exports that were already removed from an index. Restore each affected `src/lib/<library>/index.ts` from version control, review the active modules that should remain public, and run the project checks before using `addlib` again.
