//#region test/import-with-global.d.ts
//#region test/import-with-global.d.ts
declare function importWithGlobal(target: string, global: Record<string, unknown>): Promise<any>; //#endregion
//#endregion
export { importWithGlobal };