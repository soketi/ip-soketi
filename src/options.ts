import { AppInterface } from './app-managers/app';
import { ConsumerOptions } from '@rxfork/sqs-consumer';
import { SQSClientConfig } from '@aws-sdk/client-sqs';

export interface Options {
    cors: {
        credentials: boolean;
        origin: string[];
        methods: string[];
        allowedHeaders: string[];
    };
    logs: {
        verbose: boolean;
        timestamps: boolean;
    };
    metrics: {
        enabled: boolean;
        server: {
            host: string;
            port: number;
        };
    };
    websockets: {
        appManagers: {
            cache: {
                enabled: boolean;
                ttl: number;
            };
            driver: 'array';
            drivers: {
                array: {
                    apps: AppInterface[];
                };
            };
        };
        cache: {
            driver: 'memory';
        };
        dns: {
            discovery: {
                host: string;
                port: number;
            };
            server: {
                host: string;
                port: number;
            };
        };
        http: {
            acceptTraffic: {
                memoryThreshold: number;
            };
            maxPayloadSizeInMb: number;
        };
        limits: {
            channels: {
                maxNameLength: number;
                cacheTtl: number;
            };
            events: {
                maxChannelsAtOnce: number;
                maxNameLength: number;
                maxPayloadInKb: number;
                maxBatchSize: number;
            };
            presence: {
                maxMembersPerChannel: number;
                maxMemberSizeInKb: number;
            };
        };
        queueManagers: {
            driver: 'sync'|'sqs';
            sqs: {
                region?: string;
                endpoint?: string;
                clientOptions?: SQSClientConfig;
                consumerOptions?: ConsumerOptions;
                url: string;
                processBatch: boolean;
                batchSize: number;
                pollingWaitTimeMs: number;
            },
        };
        rateLimiters: {
            driver: 'local';
        };
        server: {
            host: string;
            port: number;
        };
        webhooks: {
            batching: {
                enabled: boolean;
                duration: number;
            };
        };
    };
}
