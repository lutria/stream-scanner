export interface IScanParams {
  externalId: string;
  externalType?: string;
  scanCursor?: string;
}

export abstract class SourcePlugin {
  options: any;
  abstract getSourceName(): string;
  abstract scanStream(params: IScanParams): void;
}
