import AWS from 'aws-sdk';
import axios from 'axios';
import { OpenAI } from "openai";
import { Readable } from 'stream';
import { DalleMediaGeneratorConfig } from "../config";
import { MediaGenerator } from "./media-generator";

export class DalleImageGenerator implements MediaGenerator {
    private openai: OpenAI;
    private s3: AWS.S3;
    private bucketName: string;

    constructor(config: DalleMediaGeneratorConfig) {
        this.openai = new OpenAI({
            apiKey: config.apiKey,
        });

        AWS.config.update({
            accessKeyId: config.awsAccessKeyId,
            secretAccessKey: config.awsSecretAccessKey,
            region: config.awsRegion
        });
        this.bucketName = config.awsBucketName;

        this.s3 = new AWS.S3();
    }

    getKeyword(): string {
        return "IMAGE";
    }

    async generateMediaUrl(query: string): Promise<string | null> {
        const imageResponse = await this.openai.images.generate({
            model: "dall-e-3",
            prompt: query,
            size: "1024x1024", // could also be "1792x1024"
        });

        const imageUrl = imageResponse.data[0].url!;
        const image = await axios.get(imageUrl, { responseType: 'arraybuffer' });
        const s3Params = {
            Bucket: this.bucketName,
            Key: `${Date.now()}.jpg`,
            Body: Readable.from(image.data)
        };

        const uploadResult = await this.s3.upload(s3Params).promise();
        return uploadResult.Location;
    }
}