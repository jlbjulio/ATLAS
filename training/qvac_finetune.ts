import { readFile } from "node:fs/promises";

import { finetune, loadModel, unloadModel } from "@qvac/sdk";

type TrainingRequest = {
  modelPath: string;
  trainPath: string;
  validationPath: string;
  adapterPath: string;
  checkpointPath: string;
  modelConfig: Record<string, unknown>;
  options: Record<string, unknown>;
};

const requestPath = process.argv[2];
if (!requestPath) throw new Error("A training request path is required.");

const request = JSON.parse(
  await readFile(requestPath, "utf8"),
) as TrainingRequest;

let modelId: string | undefined;
try {
  modelId = await loadModel({
    modelSrc: request.modelPath,
    modelType: "llamacpp-completion",
    modelConfig: request.modelConfig,
  });
  const handle = finetune({
    modelId,
    options: {
      trainDatasetDir: request.trainPath,
      validation: { type: "dataset", path: request.validationPath },
      outputParametersDir: request.adapterPath,
      checkpointSaveDir: request.checkpointPath,
      ...request.options,
    },
  });
  const progressReader = (async () => {
    for await (const progress of handle.progressStream) {
      process.stdout.write(`ATLAS_PROGRESS ${JSON.stringify(progress)}\n`);
    }
  })();
  const result = await handle.result;
  await progressReader;
  process.stdout.write(`ATLAS_RESULT ${JSON.stringify(result)}\n`);
} finally {
  if (modelId) await unloadModel({ modelId, clearStorage: false });
}
