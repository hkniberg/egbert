import { DalleMediaGeneratorConfig, parseConfig } from "../config";
import { DalleImageGenerator } from "../media-generators/dalle-image-generator";

// Get the command line argument
const query = process.argv[2];

// Load the config file
const config = parseConfig("config/config.json5");

// Find the DalleImageGeneratorConfig in the config file
if (!config.mediaGenerators) {
    throw new Error("mediaGenerators not found in the config file");
}
const generatorConfig = config.mediaGenerators.find(generator => generator.type === "dalle");
if (!generatorConfig) {
    throw new Error("Dalle generator not found in the config file");
}
const dalleConfig = generatorConfig.typeSpecificConfig as DalleMediaGeneratorConfig;
// Create a new DalleImageGenerator with the config
const generator = new DalleImageGenerator(dalleConfig);

// Generate the image URL and log it
generator.generateMediaUrl(query).then(url => console.log(url));
