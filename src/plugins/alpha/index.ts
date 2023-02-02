import { IScanParams, SourcePlugin } from "../SourcePlugin";

class AlphaSourcePlugin extends SourcePlugin {
  getSourceName() {
    return "dev.lutria.source-c83fe81";
  }

  scanStream(params: IScanParams) {
    console.log(`Scanning stream with externalId: ${params.externalId}`);
  }
}

export default AlphaSourcePlugin;
