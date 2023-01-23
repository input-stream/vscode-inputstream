module.exports = require('jest-mock-vscode');

/**
 * Enumeration of file types. The types `File` and `Directory` can also be
 * a symbolic links, in that case use `FileType.File | FileType.SymbolicLink` and
 * `FileType.Directory | FileType.SymbolicLink`.
 */
module.exports.FileType = {
    /**
     * The file type is unknown.
     */
    Unknown: 0,
    /**
     * A regular file.
     */
    File: 1,
    /**
     * A directory.
     */
    Directory: 2,
    /**
     * A symbolic link to a file.
     */
    SymbolicLink: 64
}
