export * from '../src/jest-mock-vscode/src';

// /**
//  * Enumeration of file types. The types `File` and `Directory` can also be
//  * a symbolic links, in that case use `FileType.File | FileType.SymbolicLink` and
//  * `FileType.Directory | FileType.SymbolicLink`.
//  */
// export const enum FileType {
//     /**
//      * The file type is unknown.
//      */
//     'Unknown': 0,
//     /**
//      * A regular file.
//      */
//     'File': 1,
//     /**
//      * A directory.
//      */
//     'Directory': 2,
//     /**
//      * A symbolic link to a file.
//      */
//     'SymbolicLink': 64
// };



/**
 * Enumeration of file types. The types `File` and `Directory` can also be
 * a symbolic links, in that case use `FileType.File | FileType.SymbolicLink` and
 * `FileType.Directory | FileType.SymbolicLink`.
 */
export enum FileType {
    /**
     * The file type is unknown.
     */
    Unknown = 0,
    /**
     * A regular file.
     */
    File = 1,
    /**
     * A directory.
     */
    Directory = 2,
    /**
     * A symbolic link to a file.
     */
    SymbolicLink = 64
}


// /**
//  * A reference to one of the workbench colors as defined in https://code.visualstudio.com/docs/getstarted/theme-color-reference.
//  * Using a theme color is preferred over a custom color as it gives theme authors and users the possibility to change the color.
//  */
// export class ThemeColor {
//     /**
//      * Creates a reference to a theme color.
//      * @param id of the color. The available colors are listed in https://code.visualstudio.com/docs/getstarted/theme-color-reference.
//      */
//     constructor(public id: string) {
//     }
// }


// export class ThemeIcon {
//     /**
//      * Reference to an icon representing a file. The icon is taken from the current file icon theme or a placeholder icon is used.
//      */
//     static readonly File: ThemeIcon;

//     /**
//      * Reference to an icon representing a folder. The icon is taken from the current file icon theme or a placeholder icon is used.
//      */
//     static readonly Folder: ThemeIcon;

//     /**
//      * The id of the icon. The available icons are listed in https://code.visualstudio.com/api/references/icons-in-labels#icon-listing.
//      */
//     readonly id: string;

//     /**
//      * The optional ThemeColor of the icon. The color is currently only used in {@link TreeItem}.
//      */
//     readonly color?: ThemeColor | undefined;

//     /**
//      * Creates a reference to a theme icon.
//      * @param id id of the icon. The available icons are listed in https://code.visualstudio.com/api/references/icons-in-labels#icon-listing.
//      * @param color optional `ThemeColor` for the icon. The color is currently only used in {@link TreeItem}.
//      */
//     constructor(id: string, color?: ThemeColor) {
//         this.id = id;
//         this.color = color;
//     }
// }
