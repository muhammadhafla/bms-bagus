declare module 'pdfmake/build/pdfmake' {
  const pdfMake: {
    vfs: Record<string, string>;
    createPdf: (docDefinition: any) => {
      getBuffer: (callback: (buffer: Buffer) => void) => void;
      open: () => void;
      print: () => void;
      download: (filename?: string) => void;
    };
  };
  export default pdfMake;
}

declare module 'pdfmake/build/vfs_fonts' {
  const pdfFonts: {
    pdfMake?: {
      vfs: Record<string, string>;
    };
  };
  export default pdfFonts;
}