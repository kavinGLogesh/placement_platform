declare module 'mammoth' {
  const mammoth: any;
  export default mammoth;
  export function extractRawText(options: { buffer: Buffer }): Promise<{ value: string; messages: any[] }>;
  export function convertToHtml(options: { buffer: Buffer }): Promise<{ value: string; messages: any[] }>;
}
