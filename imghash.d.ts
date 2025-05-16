declare module "imghash" {
  function hashRaw(
    buffer: Buffer,
    size?: number,
    format?: string
  ): Promise<string>;
  export default { hashRaw };
}
